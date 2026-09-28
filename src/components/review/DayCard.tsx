'use client';

import React from 'react';
import { Map, Clock, MapPin, Car } from 'lucide-react';
import { Place } from '@/types/trip';

interface DayCardProps {
  dayNumber: number;
  date: string;
  places: Place[];
  hotel?: any;
  paxCount?: number;
  totalCost: number; // Entry fees
  exactTravelMins?: number;
  exactDistanceKm?: number;
  exactCommuteCost?: number;
  isSelected: boolean;
  onSelect: () => void;
}

// Haversine formula
function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI/180);
  const dLon = (lon2 - lon1) * (Math.PI/180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function calculateCost(distanceKm: number, timeMins: number, paxCount: number) {
  if (distanceKm < 3 && paxCount <= 2) {
    return Math.round(35 + Math.max(0, distanceKm - 2) * 15 + (timeMins * 0.22));
  } else if (paxCount > 4) {
    return Math.round(60 + (Math.min(distanceKm, 20) * 14) + (Math.max(0, distanceKm - 20) * 20) + (timeMins * 2.50));
  } else {
    const fare = 40 + (Math.min(distanceKm, 20) * 7) + (Math.max(0, distanceKm - 20) * 14) + (timeMins * 1.50);
    return Math.round(fare * Math.ceil(paxCount / 4));
  }
}

export default function DayCard({
  dayNumber, date, places, hotel, paxCount = 1, totalCost,
  exactTravelMins, exactDistanceKm, exactCommuteCost,
  isSelected, onSelect
}: DayCardProps) {

  // Format the date like "14 July"
  const formatDayDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Estimate travel time and commute cost on the fly (FALLBACK)
  let estTravelMins = 0;
  let estDistanceKm = 0;
  let estCommuteCost = 0;

  const fullJourney = [];
  if (hotel?.lat && hotel?.lng) fullJourney.push(hotel);
  fullJourney.push(...places.filter(p => p.lat && p.lng));
  if (hotel?.lat && hotel?.lng && places.length > 0) fullJourney.push(hotel);

  for (let i = 0; i < fullJourney.length - 1; i++) {
    const current = fullJourney[i];
    const next = fullJourney[i + 1];
    const dist = getDistanceInKm(current.lat, current.lng, next.lat, next.lng);
    let mins = Math.round(dist * 2);
    if (mins < 5) mins = 5;

    estDistanceKm += dist;
    estTravelMins += mins;
    estCommuteCost += calculateCost(dist, mins, paxCount);
  }

  // Use Exact Google Data if available (synced from VisualJourneyMap)
  const displayMins = exactTravelMins ?? estTravelMins;
  const displayDistanceKm = exactDistanceKm ?? estDistanceKm;
  const displayCommuteCost = exactCommuteCost ?? estCommuteCost;

  const formatDuration = (mins: number) => {
    if (!mins) return '0h';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h === 0) return `${m}m Travel`;
    return m > 0 ? `${h}h ${m}m Travel` : `${h}h Travel`;
  };

  const finalTotalCost = totalCost + displayCommuteCost;

  return (
    <div className={`bg-white dark:bg-[#111111] border ${isSelected ? 'border-green-500/50' : 'border-zinc-200 dark:border-[#222222] hover:border-zinc-300 dark:hover:border-[#333]'} rounded-2xl p-5 flex flex-col h-full transition-all`}>

      {/* Header */}
      <div className="mb-4">
        <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Day {dayNumber}</h4>
        <div className="inline-block px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mt-2">
          {formatDayDate(date)}
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2.5 mb-6">
        <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
          <MapPin size={14} className="text-zinc-500 shrink-0" />
          <span>{places.length} Stops</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
          <Car size={14} className="text-zinc-500 shrink-0" />
          <span>{displayDistanceKm.toFixed(1)} km</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
          <Clock size={14} className="text-zinc-500 shrink-0" />
          <span>{formatDuration(displayMins)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
          <span className="text-zinc-500 shrink-0 font-medium">₹</span>
          <span>{finalTotalCost.toLocaleString('en-IN')} Est. Expense</span>
        </div>
      </div>

      {/* Action Button at the bottom */}
      <div className="mt-auto pt-4">
        <button
          onClick={onSelect}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
            isSelected
              ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
              : 'border-zinc-300 dark:border-[#333] text-zinc-700 dark:text-zinc-300 hover:text-green-600 dark:hover:text-green-400 hover:border-green-500/30'
          }`}
        >
          <Map size={16} />
          Visual Journey
        </button>
      </div>

    </div>
  );
}
