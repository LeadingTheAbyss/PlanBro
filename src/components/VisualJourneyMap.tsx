'use client';

import React, { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Place, Hotel } from '@/types/trip';
import { Clock, Map, Car, X, Bike } from 'lucide-react';
import { useItineraryStore } from '@/store/itineraryStore';
import { useTripStore } from '@/store/tripStore';

const MapWithNoSSR = dynamic(() => import('./VisualJourneyMapInner'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-zinc-100 dark:bg-[#111] flex items-center justify-center text-zinc-500 font-medium">Loading Map...</div>
});

interface VisualJourneyMapProps {
  dayNumber: number;
  date: string;
  places: Place[];
  hotel: Hotel | null;
  paxCount: number;
  onClose: () => void;
  hideMap?: boolean;
  isPdfMode?: boolean;
}

// Haversine formula
function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI/180);
  const dLon = (lon2 - lon1) * (Math.PI/180); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}

function calculateCost(distanceKm: number, timeMins: number, paxCount: number) {
  if (paxCount === 1 && distanceKm < 5) {
    // Rapido Bike Unit Economics
    // ₹35 Base (includes first 2 km), ₹15.00/km (after 2 km), ₹0.22/min Time Fare
    let distanceCost = 0;
    if (distanceKm > 2) {
      distanceCost = (distanceKm - 2) * 15;
    }
    const totalFare = 35 + distanceCost + (timeMins * 0.22);
    return {
      type: 'bike',
      service: 'Rapido Bike',
      cost: Math.round(totalFare)
    };
  } else if (paxCount <= 4) {
    // Uber Go Unit Economics
    // ₹40 Base, ₹7/km (First 20 km) / ₹14/km (Thereafter), ₹1.50/min
    let distanceCost = 0;
    if (distanceKm <= 20) {
      distanceCost = distanceKm * 7;
    } else {
      distanceCost = (20 * 7) + ((distanceKm - 20) * 14);
    }
    const totalFare = 40 + distanceCost + (timeMins * 1.50);
    return {
      type: 'cab',
      service: 'Uber Go',
      cost: Math.round(totalFare)
    };
  } else if (paxCount <= 6) {
    // Uber XL Unit Economics
    let distanceCost = distanceKm * 12;
    const totalFare = 60 + distanceCost + (timeMins * 2.50);
    return {
      type: 'cab',
      service: 'Uber XL (SUV)',
      cost: Math.round(totalFare)
    };
  } else {
    // Multiple Cabs for large groups
    const cabsNeeded = Math.ceil(paxCount / 4);
    let distanceCost = distanceKm <= 20 ? distanceKm * 7 : (20 * 7) + ((distanceKm - 20) * 14);
    const costPerCab = 40 + distanceCost + (timeMins * 1.50);
    return {
      type: 'cab',
      service: `${cabsNeeded}x Uber Go`,
      cost: Math.round(costPerCab * cabsNeeded)
    };
  }
}

export default function VisualJourneyMap({ 
  dayNumber, date, places, hotel, paxCount = 1, onClose, hideMap, isPdfMode = false
}: VisualJourneyMapProps) {
  
  const placesKey = places.map(p => `${p.id}-${p.lat || 0}-${p.lng || 0}`).join(',');
  const hotelKey = hotel ? `${hotel.id}-${hotel.lat || hotel.coordinates?.[0] || 0}-${hotel.lng || hotel.coordinates?.[1] || 0}` : '';

  const selectedTransports = useTripStore(state => state.selectedTransports);

  const transportArrivalForThisDay = useMemo(() => {
    if (!selectedTransports || selectedTransports.length === 0) return null;
    let latestArrival: Date | null = null;
    
    for (const st of selectedTransports) {
      if (!st.transport?.arrival) continue;
      try {
        const timePart = st.transport.arrival.split(',')[1]?.trim();
        if (!timePart) continue;
        const [hours, minutes] = timePart.split(':').map(Number);
        
        if (dayNumber === 1) {
          const d = new Date();
          d.setHours(hours, minutes, 0, 0);
          if (!latestArrival || d > latestArrival) {
            latestArrival = d;
          }
        }
      } catch (err) {
        console.error("Failed to parse arrival time", err);
      }
    }
    return latestArrival;
  }, [selectedTransports, dayNumber]);

  // Construct the full journey array (Hotel -> Places -> Hotel)
  const fullJourney = useMemo(() => {
    const journey: any[] = [];
    
    // Attempt to extract hotel coordinates
    let hotelLat = hotel?.lat;
    let hotelLng = hotel?.lng;
    if (!hotelLat && hotel?.coordinates) {
      hotelLat = hotel.coordinates[0];
      hotelLng = hotel.coordinates[1];
    }

    const validHotel = hotel && hotelLat && hotelLng ? {
      id: `hotel-start`,
      name: hotel.name,
      category: 'Hotel',
      lat: hotelLat,
      lng: hotelLng,
      visitDurationHours: 0,
      isHotel: true,
      displayLabel: 'H'
    } as any : null;

    if (validHotel) journey.push(validHotel);
    
    let placeCounter = 1;
    places.filter(p => p.lat && p.lng).forEach(p => {
      journey.push({ ...p, isHotel: false, displayLabel: placeCounter++ });
    });
    
    if (validHotel && places.length > 0) {
      journey.push({ ...validHotel, id: `hotel-end`, displayLabel: 'H' });
    } else if (!validHotel && places.length > 0) {
      // Just use places if hotel has no coords
      let pc = 1;
      return places.filter(p => p.lat && p.lng).map(p => ({ ...p, isHotel: false, displayLabel: pc++ }));
    }

    return journey;
  }, [placesKey, hotelKey]);

  // Format helpers
  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const formatDuration = (mins: number) => {
    if (mins < 60) return `${Math.round(mins)} min`;
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const [routeMatrix, setRouteMatrix] = useState<any>(null);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);

  useEffect(() => {
    if (fullJourney.length < 2) return;
    
    let isMounted = true;
    const fetchRoutes = async () => {
      setIsLoadingRoutes(true);
      try {
        const coords = fullJourney.map(p => ({ lat: p.lat, lng: p.lng }));
        const res = await fetch('/api/route-matrix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origins: coords, destinations: coords })
        });
        if (!res.ok) throw new Error("Matrix fetch failed");
        const data = await res.json();
        if (isMounted && data.rows) {
          setRouteMatrix(data);
        }
      } catch (err) {
        console.error("Failed to fetch route matrix:", err);
      } finally {
        if (isMounted) setIsLoadingRoutes(false);
      }
    };
    
    fetchRoutes();
    return () => { isMounted = false; };
  }, [fullJourney]);
  // Compute timeline data
  const { timelineItems, totalTravelMins, totalDistance, totalEstCost } = useMemo(() => {
    let current = new Date();
    if (transportArrivalForThisDay) {
      // Start 2 hours after arrival
      current = new Date(transportArrivalForThisDay.getTime() + 2 * 60 * 60 * 1000);
    } else {
      current.setHours(9, 0, 0, 0); // 9:00 AM default start
    }

    let tMins = 0;
    let tDist = 0;
    let tCost = 0;

    const items = fullJourney.map((place, index) => {
      const startTime = formatTime(current);
      const visitMins = (place.visitDurationHours || (place.isHotel ? 0 : 1)) * 60;
      
      // advance time by visit duration
      current = new Date(current.getTime() + visitMins * 60000);
      
      let travelMins = 0;
      let travelDistance = 0;
      let commuteCost = null;
      let commuteType = 'cab';
      let commuteService = '';

      const nextPlace = fullJourney[index + 1];
      if (nextPlace) {
        if (routeMatrix && routeMatrix.rows && routeMatrix.rows[index] && routeMatrix.rows[index].elements[index + 1]) {
          const element = routeMatrix.rows[index].elements[index + 1];
          if (element.status === "OK") {
            travelDistance = element.distance.value / 1000.0;
            // Use duration_in_traffic if available, else fallback to standard duration
            const durationObj = element.duration_in_traffic || element.duration;
            travelMins = Math.round(durationObj.value / 60.0);
          } else {
            // Fallback to haversine if Google failed for this leg
            travelDistance = getDistanceInKm(place.lat, place.lng, nextPlace.lat, nextPlace.lng);
            travelMins = Math.round(travelDistance * 2);
          }
        } else {
          // Fallback while loading
          travelDistance = getDistanceInKm(place.lat, place.lng, nextPlace.lat, nextPlace.lng);
          travelMins = Math.round(travelDistance * 2);
        }
        
        if (travelMins < 5) travelMins = 5; // minimum 5 mins travel time

        // Calculate Cost
        const pricing = calculateCost(travelDistance, travelMins, paxCount);
        commuteCost = pricing.cost;
        commuteType = pricing.type;
        commuteService = pricing.service;
        
        tCost += commuteCost;
        tMins += travelMins;
        tDist += travelDistance;
        
        // advance time by travel duration to NEXT place
        current = new Date(current.getTime() + travelMins * 60000);
      }

      return {
        place,
        index,
        startTime,
        visitDurationStr: visitMins > 0 ? formatDuration(visitMins) : '',
        travelMins,
        travelDistanceStr: travelDistance > 0 ? travelDistance.toFixed(1) : '',
        commuteCost,
        commuteType,
        commuteService,
        isLast: index === fullJourney.length - 1
      };
    });

    return { timelineItems: items, totalTravelMins: tMins, totalDistance: tDist, totalEstCost: tCost };
  }, [fullJourney, routeMatrix]);

  const updateDayExacts = useItineraryStore(state => state.updateDayExacts);

  useEffect(() => {
    if (!isLoadingRoutes && routeMatrix) {
      updateDayExacts(dayNumber, totalTravelMins, totalDistance, totalEstCost);
    }
  }, [isLoadingRoutes, routeMatrix, totalTravelMins, totalDistance, totalEstCost, dayNumber, updateDayExacts]);

  const googleMapsUrl = useMemo(() => {
    if (fullJourney.length === 0) return '#';
    const origin = `${fullJourney[0].lat},${fullJourney[0].lng}`;
    const destination = `${fullJourney[fullJourney.length - 1].lat},${fullJourney[fullJourney.length - 1].lng}`;
    const waypoints = fullJourney.slice(1, -1).map(p => `${p.lat},${p.lng}`).join('|');
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypoints) url += `&waypoints=${waypoints}`;
    return url;
  }, [fullJourney]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0a0a0a] text-zinc-900 dark:text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-[#222]">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Day {dayNumber} Visual Journey</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {(() => {
              const d = new Date(date);
              if (isNaN(d.getTime())) return date;
              return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            })()}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 px-6 py-4 border-b border-zinc-200 dark:border-[#222] bg-zinc-50 dark:bg-[#111] text-xs font-medium text-zinc-700 dark:text-zinc-300">
        <div className="flex items-center gap-2">
          <Map size={14} className="text-zinc-500" />
          <span>{places.length} Stops</span>
        </div>
        <div className="flex items-center gap-2">
          <Car size={14} className="text-zinc-500" />
          <div className="flex flex-col">
            <span>{isLoadingRoutes ? "Loading..." : `${totalDistance.toFixed(1)} km`}</span>
            <span className="text-[10px] text-zinc-500">Total Distance</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-zinc-500" />
          <div className="flex flex-col">
            <span>{isLoadingRoutes ? "Loading..." : formatDuration(totalTravelMins)}</span>
            <span className="text-[10px] text-zinc-500">Total Travel Time</span>
          </div>
        </div>
      </div>

      {/* Map Area */}
      {!hideMap && (
        <div className="h-[35%] w-full relative shrink-0 border-b border-zinc-200 dark:border-[#222]">
          <MapWithNoSSR places={fullJourney} />
        </div>
      )}

      {/* Timeline List */}
      <div className={`flex-1 ${isPdfMode ? 'overflow-hidden' : 'overflow-y-auto'} p-6 space-y-0 relative`}>
        {transportArrivalForThisDay && (
          <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl text-xs text-orange-400/90 leading-relaxed">
            🔔 <strong>Late Arrival Adjustment:</strong> Your transport arrives at{" "}
            <strong>
              {transportArrivalForThisDay.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </strong>
            . We have automatically adjusted your sightseeing start time by adding{" "}
            <strong>2 hours</strong> for hotel check-in and rest.
          </div>
        )}
        {timelineItems.map((item) => (
          <div key={`${item.place.id}-${item.index}`} className="relative group">
            {/* Connection Line */}
            {!item.isLast && (
              <div className="absolute top-6 left-[62px] bottom-[-24px] w-px bg-zinc-300 dark:bg-zinc-800 group-hover:bg-zinc-400 dark:group-hover:bg-zinc-600 transition-colors z-0"></div>
            )}

            {/* Place Row */}
            <div className="flex items-start gap-4 relative z-10">
              <div className="w-16 pt-1 text-xs text-zinc-500 dark:text-zinc-400 text-right shrink-0">{item.startTime}</div>

              {item.place.isHotel ? (
                <div className="w-6 h-6 rounded-full bg-zinc-700 dark:bg-zinc-800 text-white flex items-center justify-center text-[10px] font-bold border-[3px] border-white dark:border-[#0a0a0a] shrink-0 z-10 mt-0.5">
                  H
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold border-[3px] border-white dark:border-[#0a0a0a] shrink-0 z-10 mt-0.5">
                  {/* Account for hotel at start to keep numbering correct for places */}
                  {item.index}
                </div>
              )}

              <div className="flex-1 pb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-zinc-800 dark:text-zinc-200">{item.place.name}</h4>
                    <p className="text-xs text-zinc-500 capitalize">{item.place.category || 'Explore'}</p>
                  </div>
                  {item.visitDurationStr && (
                    <span className="text-xs text-zinc-500">{item.visitDurationStr}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Travel Segment */}
            {!item.isLast && (
              <div className="flex items-center justify-between relative z-10 ml-[84px] pb-6 text-xs text-zinc-500">
                <div className="flex items-center gap-4">
                  <div className="bg-white dark:bg-[#0a0a0a] py-1">
                    {item.commuteType === 'bike' ? <Bike size={14} className="text-blue-500 dark:text-blue-400" /> : <Car size={14} className="text-green-600 dark:text-green-400" />}
                  </div>
                  <div className="flex flex-col">
                    <span>{`${formatDuration(item.travelMins)} (${item.travelDistanceStr} km)`}</span>
                    <span className="text-[10px]">Recommended: {item.commuteType === 'bike' ? 'Bike Ride' : 'Cab'}</span>
                  </div>
                </div>
                <div className="font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded">
                  ₹{item.commuteCost}
                </div>
              </div>
            )}
          </div>
        ))}
        {fullJourney.length === 0 && (
          <div className="text-center text-zinc-500 text-sm mt-10">No places scheduled for this day.</div>
        )}
      </div>

      {/* Bottom Action */}
      {!isPdfMode && (
        <div className="p-4 border-t border-zinc-200 dark:border-[#222] bg-zinc-50 dark:bg-[#111] shrink-0">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-sm font-medium"
          >
            <Map size={16} />
            Open in Google Maps
          </a>
        </div>
      )}
    </div>
  );
}
