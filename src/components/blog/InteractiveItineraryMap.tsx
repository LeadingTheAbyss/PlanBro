'use client';

import React, { useState } from 'react';
import { ItineraryStop } from '@/data/blogData';
import { MapPin, Compass, ChevronRight, ExternalLink } from 'lucide-react';

interface InteractiveItineraryMapProps {
  stops: ItineraryStop[];
  destinationCity?: string;
}

export function InteractiveItineraryMap({ stops, destinationCity }: InteractiveItineraryMapProps) {
  const [activeDay, setActiveDay] = useState<number>(stops[0]?.day || 1);

  if (!stops || stops.length === 0) return null;

  const handleJumpToDay = (day: number) => {
    setActiveDay(day);
    const el = document.getElementById(`itinerary-day-${day}`) || document.getElementById(`stop-${day}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-[#FF8A3D]', 'bg-[#FFF9E6]/90', 'transition-all', 'duration-500');
      setTimeout(() => el.classList.remove('ring-4', 'ring-[#FF8A3D]', 'bg-[#FFF9E6]/90'), 2000);
    }
  };

  return (
    <div className="my-14 flex flex-col lg:flex-row gap-8 items-start">
      
      {/* Minimalist Left Sidebar Table of Contents (Like Img 3) */}
      <div className="w-full lg:w-72 shrink-0 lg:sticky lg:top-28 z-20">
        <div className="p-6 rounded-3xl bg-[#FFF9E6]/70 border border-[#FF8A3D]/25 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#FF8A3D]/20 pb-3">
            <span className="text-xs font-black uppercase tracking-widest text-[#D45B0C] flex items-center gap-1.5">
              <span>ON THIS EXPEDITION</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#FF8A3D] text-[#1F2937] font-black text-[10px]">
              {stops.length} Days
            </span>
          </div>

          <p className="text-[11px] text-[#6B7280] font-semibold">
            Select a milestone below or click any marker on the map to jump straight to its story details.
          </p>

          <ul className="space-y-2 pt-1">
            {stops.map((stop) => {
              const isSelected = stop.day === activeDay;
              return (
                <li key={stop.day}>
                  <button
                    onClick={() => handleJumpToDay(stop.day)}
                    className={`w-full text-left p-3 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-between group transition-all ${
                      isSelected 
                        ? 'bg-[#1F2937] text-white shadow-md pl-4' 
                        : 'text-[#374151] hover:bg-white/80 hover:text-[#D45B0C]'
                    }`}
                  >
                    <span className="truncate pr-2 flex items-center gap-2">
                      <span className="text-base">{stop.highlightIcon || '📍'}</span>
                      <span>Day {stop.day}: {stop.title}</span>
                    </span>
                    <ChevronRight size={14} className={`shrink-0 transition-transform ${isSelected ? 'text-[#FFD166] translate-x-0.5' : 'text-[#9CA3AF] group-hover:translate-x-0.5'}`} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Right Column: Clean Milestone Logs */}
      <div className="w-full flex-1 space-y-6">
        <div className="pb-2 border-b border-neutral-200">
          <h3 className="text-xl sm:text-2xl font-black text-[#1F2937]">
            Full Expedition Breakdown ({destinationCity || 'India'})
          </h3>
          <p className="text-xs text-[#6B7280] font-medium mt-1">
            Detailed traveler observations, scenic pass elevations, and regional culinary advice for every step of the journey.
          </p>
        </div>

        <div className="space-y-6">
          {stops.map((stop) => (
            <div 
              key={stop.day} 
              id={`itinerary-day-${stop.day}`}
              onClick={() => setActiveDay(stop.day)}
              className={`p-6 sm:p-8 rounded-[28px] border-2 transition-all duration-300 shadow-md cursor-pointer ${
                activeDay === stop.day
                  ? 'bg-white border-[#FF8A3D] shadow-[0_15px_35px_rgba(255,138,61,0.15)] ring-2 ring-[#FF8A3D]/30'
                  : 'bg-white/90 border-neutral-200 hover:border-[#FF8A3D]/60'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1F2937] text-white text-xs font-black tracking-wider">
                  <span>Day {stop.day}</span>
                  <span>•</span>
                  <span className="text-[#FFD166] flex items-center gap-1">
                    <MapPin size={12} fill="currentColor" />
                    <span>{stop.location || stop.title}</span>
                  </span>
                </div>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.location || stop.title + ' ' + (destinationCity || 'India'))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-neutral-100 hover:bg-[#FFD166] text-[#1F2937] text-xs font-bold transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>Open in Google Maps</span>
                  <ExternalLink size={12} />
                </a>
              </div>

              <h4 className="text-xl font-extrabold text-[#1F2937] mb-2 leading-tight">
                {stop.title}
              </h4>

              <p className="text-sm sm:text-base text-[#4B5563] leading-relaxed font-normal">
                {stop.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
