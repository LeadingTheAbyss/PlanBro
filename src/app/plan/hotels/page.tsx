'use client';

import React, { useEffect, useState } from 'react';
import { useTripStore } from '@/store/tripStore';
import { useBudgetStore } from '@/store/budgetStore';
import { useCacheStore } from '@/store/cacheStore';
import { useItineraryStore } from '@/store/itineraryStore';
import { useFetchQueue } from '@/store/fetchQueueStore';
import { Hotel, Place } from '@/types/trip';
import { api } from '@/lib/api';
import { ArrowRight, CheckCircle2, Circle, AlertCircle, MapPin, ShieldCheck, Star, Eye, Calendar, Bed, Maximize, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CinematicLoader } from '@/components/CinematicLoader';
import { useDestinationTheme } from '@/hooks/useDestinationTheme';

export default function HotelsPage() {
  const router = useRouter();
  const trip = useTripStore();
  const budget = useBudgetStore();
  const itinerary = useItineraryStore();
  const { activeTheme } = useDestinationTheme();

  const fetchQueue = useFetchQueue();
  const cache = useCacheStore();
  
  const hotels = (cache.cache['hotels'] || []) as Hotel[];
  const task = fetchQueue.tasks.find(t => t.id === 'hotels-main');
  const loading = !!trip.destination && !hotels.length && (!task || task.status === 'idle' || task.status === 'loading');
  const [sortBy, setSortBy] = useState<'best' | 'closest' | 'budget'>('best');
  const [maximizedImage, setMaximizedImage] = useState<{url: string, name: string} | null>(null);

  // Haversine formula to calculate distance in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Calculate nights
  const calculateNights = () => {
    if (!trip.startDate || !trip.endDate) return 3; // default fallback
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const nights = calculateNights();

  useEffect(() => {
    if (!trip.destination) return;
    
    if (hotels.length === 0 && (!task || task.status === 'idle' || task.status === 'cache_miss' || task.status === 'error')) {
      fetchQueue.enqueueTask({ id: 'hotels-main', category: 'hotels', priority: 0, isLive: true });
      fetchQueue.bumpPriority('hotels-main');
    } else if (task && task.status === 'loading') {
      fetchQueue.bumpPriority('hotels-main');
    }
  }, [trip.destination, hotels.length, task?.status]);

  // Preload itinerary tutorial videos
  useEffect(() => {
    const preloadVideo = (url: string) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'video';
      link.href = url;
      document.head.appendChild(link);
    };
    preloadVideo('/itinerary_1.mp4');
    preloadVideo('/itinerary_5.mp4');
  }, []);

  const handleSelectHotel = (hotel: Hotel) => {
    const rooms = Math.ceil(trip.passengers.length / 3);

    // Toggle off if already selected
    if (trip.selectedHotel?.id === hotel.id) {
      budget.refundExpense('hotel', hotel.pricePerNight * rooms * nights);
      trip.setHotel(null);
      budget.recalcBudget();
      return;
    }

    // Remove old hotel cost if exists
    if (trip.selectedHotel) {
      budget.refundExpense('hotel', trip.selectedHotel.pricePerNight * rooms * nights);
    }

    const hotelWithNights = { ...hotel, nights: nights, rooms: rooms };

    // Set new hotel
    trip.setHotel(hotelWithNights);

    // Charge new hotel
    budget.addExpense('hotel', hotel.pricePerNight * rooms * nights);

    budget.recalcBudget();
  };

  // Handle Escape key to close maximized image
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMaximizedImage(null); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [maximizedImage]);

  return (
    <>
      {maximizedImage && (
        <div 
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setMaximizedImage(null)}
        >
          <button
            onClick={() => setMaximizedImage(null)}
            className="absolute top-20 right-6 z-[210] bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors backdrop-blur-md"
          >
            <X size={24} />
          </button>
          <img 
            src={maximizedImage.url} 
            alt={maximizedImage.name} 
            className="w-full h-full object-contain p-4" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
      <div className={`min-h-screen bg-transparent pt-10 px-4 transition-colors duration-300 ${activeTheme.text}`}>
      <div className="max-w-4xl mx-auto space-y-12 pb-24">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold mb-2">Hotel Selection</h1>
            <p className="text-inherit">
              Where will you stay for {nights} nights in {trip.destination || 'the destination'}?
            </p>
          </div>
        </div>

        {/* Cinematic loader overlay — shown while hotels are being fetched */}
        <CinematicLoader
          isLoading={loading}
          category="hotels"
          destination={trip.destination}
        />

        {loading ? null : hotels.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-border rounded-xl text-center text-muted-foreground">
            No hotels found. Go back to Setup and enter a destination.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex gap-2 text-sm">
              <button
                onClick={() => setSortBy('best')}
                className={`${sortBy === 'best' ? 'bg-blue-600 text-white border-blue-600' : 'bg-current/10 text-inherit opacity-80 border-current/20 hover:bg-current/20 hover:opacity-100'} font-medium px-4 py-2 rounded-lg border transition-colors`}
              >
                Best Overall
              </button>
              <button
                onClick={() => setSortBy('closest')}
                className={`${sortBy === 'closest' ? 'bg-blue-600 text-white border-blue-600' : 'bg-current/10 text-inherit opacity-80 border-current/20 hover:bg-current/20 hover:opacity-100'} font-medium px-4 py-2 rounded-lg border transition-colors`}
              >
                Closest to Places
              </button>
              <button
                onClick={() => setSortBy('budget')}
                className={`${sortBy === 'budget' ? 'bg-blue-600 text-white border-blue-600' : 'bg-current/10 text-inherit opacity-80 border-current/20 hover:bg-current/20 hover:opacity-100'} font-medium px-4 py-2 rounded-lg border transition-colors`}
              >
                Budget
              </button>
            </div>

            <div className="space-y-4">
              {(() => {
                let processedHotels = [...hotels].map(h => {
                  if (itinerary.selectedPlaces.length > 0) {
                    const totalDistance = itinerary.selectedPlaces.reduce((sum, place) => {
                       return sum + calculateDistance(h.coordinates[0], h.coordinates[1], place.lat || 0, place.lng || 0);
                    }, 0);
                    return { ...h, distanceToCluster: Number((totalDistance / itinerary.selectedPlaces.length).toFixed(1)) };
                  }
                  return h;
                });

                if (sortBy === 'closest') {
                  processedHotels.sort((a, b) => a.distanceToCluster - b.distanceToCluster);
                } else if (sortBy === 'budget') {
                  processedHotels.sort((a, b) => a.pricePerNight - b.pricePerNight);
                } else {
                  processedHotels.sort((a, b) => b.rating - a.rating);
                }

                const rooms = Math.ceil(trip.passengers.length / 3);

                return processedHotels.map((hotel) => {
                  const isSelected = trip.selectedHotel?.id === hotel.id;
                  const totalCost = rooms * hotel.pricePerNight * nights;
                  const remainingAfter = budget.remaining + (isSelected ? 0 : (trip.selectedHotel ? (trip.selectedHotel.pricePerNight * rooms * nights) : 0)) - totalCost;

                  return (
                    <div
                      key={hotel.id}
                      onClick={() => handleSelectHotel(hotel)}
                      className={`
                        relative flex flex-col md:flex-row overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 shadow-sm
                        ${isSelected
                          ? `${activeTheme.card} ${activeTheme.text} border-2 border-primary ring-4 ring-primary/20 shadow-2xl shadow-primary/20 scale-[1.02] z-10`
                          : `border border-border/60 ${activeTheme.card} ${activeTheme.text} hover:opacity-90 hover:shadow-xl hover:border-foreground/20`
                        }
                      `}
                    >
                      {isSelected && (
                        <div className="absolute top-3 left-3 z-20 bg-background rounded-full p-0.5 shadow-md">
                          <CheckCircle2 className="text-primary w-7 h-7 fill-background" />
                        </div>
                      )}

                      {/* Hotel Image */}
                      <div className="md:w-72 h-48 md:h-auto relative shrink-0 bg-muted flex items-center justify-center overflow-hidden group">
                        {hotel.imageUrl && (
                          <>
                            <img 
                              src={hotel.imageUrl} 
                              alt={hotel.name} 
                              draggable={false}
                              className="w-full h-full object-cover absolute inset-0 z-10 cursor-pointer select-none" 
                              onClick={(e) => { e.stopPropagation(); setMaximizedImage({ url: hotel.imageUrl as string, name: hotel.name }); }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <button 
                              onClick={(e) => { e.stopPropagation(); setMaximizedImage({ url: hotel.imageUrl as string, name: hotel.name }); }}
                              className="absolute top-4 left-4 z-[100] bg-black/40 hover:bg-black/60 backdrop-blur-md text-white p-2 rounded-full transition-colors shadow-lg opacity-100 sm:opacity-0 group-hover:opacity-100 pointer-events-none sm:pointer-events-auto"
                            >
                              <Maximize size={18} />
                            </button>
                          </>
                        )}
                        <div className="text-muted-foreground/30 font-bold text-xl uppercase tracking-widest rotate-[-15deg] absolute z-0 pointer-events-none">
                          Hotel
                        </div>
                      </div>

                      {/* Details Area */}
                      <div className="flex-1 p-5 md:p-6 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <h3 className={`text-xl font-bold leading-tight mb-1 flex items-center gap-2 ${isSelected ? 'text-primary drop-shadow-sm' : 'text-inherit'}`}>
                                {hotel.name}
                                <span className="text-sm font-bold text-inherit inline-flex items-center gap-1">
                                  <Star size={15} className="fill-yellow-500 text-yellow-500" /> {hotel.rating}
                                </span>
                              </h3>
                              
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                                <div className="flex items-center gap-1.5 text-sm text-inherit opacity-70 font-medium">
                                  <MapPin size={14} className="text-inherit opacity-50" />
                                  {itinerary.selectedPlaces.length > 0 
                                      ? `${hotel.distanceToCluster || 2.5} km from the places you wish to visit` 
                                      : 'No food spots or places selected yet'}
                                </div>
                                </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-2xl font-bold text-inherit tracking-tight mb-1">
                                ₹{totalCost.toLocaleString('en-IN')}
                              </div>
                              <div className="text-xs font-medium text-inherit">
                                ₹{hotel.pricePerNight.toLocaleString('en-IN')} / night
                              </div>
                            </div>
                          </div>
                          
                          {/* Warnings if budget tight */}
                          {remainingAfter < 0 && !isSelected && (
                            <div className="mt-3 text-xs font-bold text-red-500/90 flex items-center gap-1.5 bg-red-500/10 px-2.5 py-1.5 rounded-md inline-flex w-max">
                              <AlertCircle size={14} /> Exceeds budget by ₹{Math.abs(remainingAfter).toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>

                        {/* Bottom Stats Row (Like StayDetailsCard) */}
                        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/50">
                          <div>
                            <div className="text-[11px] text-inherit opacity-70 mb-1 flex items-center gap-1.5">
                              <Calendar size={12}/> Duration
                            </div>
                            <div className="text-sm font-semibold text-inherit">{nights} {nights === 1 ? 'Night' : 'Nights'}</div>
                          </div>
                          <div>
                            <div className="text-[11px] text-inherit opacity-70 mb-1 flex items-center gap-1.5">
                              <Bed size={12}/> Rooms
                            </div>
                            <div className="text-sm font-semibold text-inherit">{rooms} {rooms === 1 ? 'Room' : 'Rooms'}</div>
                          </div>
                          <div>
                            <div className="text-[11px] text-inherit opacity-70 mb-1 flex items-center gap-1.5">
                              <CheckCircle2 size={12}/> Comfort
                            </div>
                            <div className="text-sm font-semibold text-inherit">{hotel.comfortScore}/10</div>
                          </div>
                          <div>
                            <div className="text-[11px] text-inherit opacity-70 mb-1 flex items-center gap-1.5">
                              <ShieldCheck size={12}/> Safety
                            </div>
                            <div className="text-sm font-semibold text-inherit">{hotel.safetyScore}/10</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              })()}
            </div>
          </div>
        )}

        {/* CONTINUATION */}
        <div className="flex justify-between items-center pt-6 border-t border-current/10">
          <button
            onClick={() => router.push('/plan/food')}
            className="text-inherit opacity-70 hover:opacity-100 font-medium transition-opacity text-sm"
          >
            ← Back to Food
          </button>
          <button
            onClick={() => router.push('/plan/itinerary')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-transform hover:-translate-y-1"
          >
            Build Itinerary <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
