'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { ItineraryStop } from '@/data/blogData';
import { MapPin, Compass, Navigation } from 'lucide-react';

const MapWithNoSSR = dynamic(() => import('./BlogVisualMapInner'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-80 bg-[#1A2234] animate-pulse flex flex-col items-center justify-center rounded-[32px] text-neutral-400 font-bold text-xs">
      <Compass className="animate-spin text-[#FF8A3D] mb-2" size={28} />
      <span>Loading Indian Expedition Satellite Route...</span>
    </div>
  )
});

interface BlogVisualMapProps {
  stops: ItineraryStop[];
  city?: string;
}

export function BlogVisualMap({ stops, city }: BlogVisualMapProps) {
  if (!stops || stops.length === 0) return null;

  return (
    <div className="my-10 rounded-[32px] overflow-hidden border-4 border-white shadow-2xl bg-neutral-900 relative">
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#1F2937] to-[#111827] text-white flex flex-wrap items-center justify-between gap-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#FF8A3D] text-[#1F2937] flex items-center justify-center font-black shadow-sm shrink-0">
            <Navigation size={18} className="rotate-[45deg]" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm sm:text-base text-white tracking-tight leading-tight">
              Interactive Visual Journey Map • {city || 'India'}
            </h4>
            <p className="text-[11px] text-[#FFD166] font-bold mt-0.5 flex items-center gap-1">
              <span>💡 Click on any location marker on the map to jump directly to where it’s talked about!</span>
            </p>
          </div>
        </div>
        <div className="px-3.5 py-1.5 rounded-full bg-white/10 text-white font-black text-xs uppercase tracking-wider">
          {stops.length} Milestones Mapped
        </div>
      </div>

      <div className="w-full h-[360px] sm:h-[420px] relative">
        <MapWithNoSSR stops={stops} />
      </div>
    </div>
  );
}
