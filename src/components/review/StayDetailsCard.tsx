'use client';

import React from 'react';
import { Hotel } from '@/types/trip';
import { Calendar, Bed, Users } from 'lucide-react';
import Link from 'next/link';

interface StayDetailsCardProps {
  hotel: Hotel;
  checkInDate: string | null;
  checkOutDate: string | null;
  paxCount: number;
}

export default function StayDetailsCard({ hotel, checkInDate, checkOutDate, paxCount }: StayDetailsCardProps) {
  const nights = (hotel as any).nights || 1;
  const rooms = Math.ceil(paxCount / 3);
  const totalCost = rooms * hotel.pricePerNight * nights;

  // Format date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[#222222] rounded-2xl flex flex-col md:flex-row overflow-hidden shadow-sm">
      {/* Hotel Image */}
      <div className="md:w-72 h-48 md:h-auto relative shrink-0 bg-zinc-100 dark:bg-zinc-900">
        {hotel.imageUrl && (
          <img
            src={`/api/proxy-image?url=${encodeURIComponent(hotel.imageUrl)}`}
            alt={hotel.name}
            crossOrigin="anonymous"
            className="w-full h-full object-cover absolute inset-0 z-10"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div className="absolute inset-0 z-0 w-full h-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-950 flex items-center justify-center text-zinc-500 dark:text-zinc-600 font-medium">
          No Image
        </div>
      </div>

      {/* Details Area */}
      <div className="flex-1 p-6 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-4 mb-6">
          <div className="w-full sm:w-auto pr-0 sm:pr-4">
            <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{hotel.name}</span>
              <span className="text-yellow-500 text-sm shrink-0">{'★'.repeat(Math.round(hotel.rating || 5))}</span>
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{(hotel as any).location || 'City Center, Destination'}</p>
          </div>
          <Link
            href="/plan/hotels"
            className="shrink-0 px-4 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            View Details
          </Link>
        </div>

        {/* Stats Row */}
        <div className="mt-auto grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-zinc-200 dark:border-[#222]">

          <div>
            <div className="text-[11px] text-zinc-500 mb-1 flex items-center gap-1.5"><Calendar size={12}/> Check-in</div>
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{formatDate(checkInDate)}</div>
          </div>

          <div>
            <div className="text-[11px] text-zinc-500 mb-1 flex items-center gap-1.5"><Calendar size={12}/> Check-out</div>
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{formatDate(checkOutDate)}</div>
          </div>

          <div>
            <div className="text-[11px] text-zinc-500 mb-1 flex items-center gap-1.5"><Calendar size={12}/> Duration</div>
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{nights} Nights</div>
          </div>

          <div>
            <div className="text-[11px] text-zinc-500 mb-1 flex items-center gap-1.5"><Bed size={12}/> Rooms</div>
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{rooms} {rooms === 1 ? 'Room' : 'Rooms'}</div>
          </div>

          <div className="col-span-2 md:col-span-1 text-center md:text-right mt-2 md:mt-0 md:ml-auto">
            <div className="text-[11px] text-zinc-500 mb-1">Total Cost</div>
            <div className="text-xl font-bold text-zinc-900 dark:text-white">₹{totalCost.toLocaleString('en-IN')}</div>
            <div className="text-xs text-zinc-500 mt-0.5">₹{Math.round(totalCost / nights).toLocaleString('en-IN')} / night</div>
          </div>

        </div>
      </div>
    </div>
  );
}
