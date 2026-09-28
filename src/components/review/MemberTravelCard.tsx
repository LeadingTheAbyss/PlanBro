'use client';

import React from 'react';
import { Passenger, TransportOption } from '@/types/trip';
import { MapPin, Calendar, Plane, Train, Bus, Car } from 'lucide-react';
import { UserAvatar } from '../UserAvatar'; // Make sure this path works or create a local fallback

interface MemberTravelCardProps {
  passengers: Passenger[];
  transport: TransportOption | null;
  isPrimary: boolean;
}

export default function MemberTravelCard({ passengers = [], transport, isPrimary, ...props }: MemberTravelCardProps & { passenger?: any }) {
  // Hot-reload fallback: if old code passes `passenger`, wrap it in an array
  if (passengers.length === 0 && props.passenger) {
    passengers = [props.passenger];
  }
  
  // Format dates / times safely
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      
      const datePart = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
      const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      return `${datePart}, ${timePart}`;
    } catch {
      return dateStr;
    }
  };

  const getTransportIcon = (type?: string) => {
    switch (type) {
      case 'flight': return <Plane size={14} className="text-zinc-500 dark:text-zinc-400" />;
      case 'train': return <Train size={14} className="text-zinc-500 dark:text-zinc-400" />;
      case 'bus': return <Bus size={14} className="text-zinc-500 dark:text-zinc-400" />;
      case 'cab':
      case 'car': return <Car size={14} className="text-zinc-500 dark:text-zinc-400" />;
      default: return <Plane size={14} className="text-zinc-500 dark:text-zinc-400" />;
    }
  };

  // Extract airport/station codes if possible. E.g. "Delhi (DEL)" -> "DEL"
  const cleanName = (name: string) => name.split('(')[0].trim();

  const getCode = (name: string) => {
    const city = cleanName(name).split(',')[0].trim().toLowerCase();
    const codes: Record<string, string> = {
      lucknow: 'LKO',
      delhi: 'DEL',
      'new delhi': 'NDLS',
      mumbai: 'BOM',
      bangalore: 'BLR',
      bengaluru: 'BLR',
      hyderabad: 'HYD',
      chennai: 'MAA',
      kolkata: 'CCU',
      pune: 'PNQ',
      jaipur: 'JAI',
      ahmedabad: 'AMD',
      chandigarh: 'IXC',
      goa: 'GOI',
      patna: 'PAT',
      patiala: 'PTA',
      sangli: 'SLI',
    };
    if (codes[city]) return codes[city];
    
    const match = name.match(/\(([A-Z]{3,4})\)/);
    if (match) return match[1];
    
    return cleanName(name).substring(0, 3).toUpperCase();
  };

  const getTransportName = () => {
    if (!transport) return 'Not Available';
    let provider = (transport as any).provider;
    if (provider) {
      if (provider.toLowerCase().includes('uber go')) return 'Cab';
      if (provider.toLowerCase().includes('uber')) return 'Premium Cab';
      if (provider.toLowerCase().includes('(fallback)')) return 'Not Available';
      return provider;
    }
    
    // Fallback for ugly IDs in old state
    let name = transport.id;
    if (name.includes('fallback')) return 'Not Available';
    if (name.startsWith('cab_')) {
      const parts = name.split('_');
      if (parts.length >= 2) return `${parts[1].charAt(0).toUpperCase() + parts[1].slice(1)} Cab`;
      return 'Private Cab';
    }
    if (name.startsWith('bus_')) return 'Premium AC Bus';
    if (name.startsWith('tr_') || name.startsWith('t2_')) return 'Superfast Express';
    
    return name;
  };

  // Format the grouped names (e.g., "Kartikey, Apoorv and Ayush")
  const getGroupedNames = () => {
    if (passengers.length === 0) return 'Passenger';
    if (passengers.length === 1) return passengers[0].name;
    if (passengers.length === 2) return `${passengers[0].name} and ${passengers[1].name}`;
    
    const allButLast = passengers.slice(0, -1).map(p => p.name).join(', ');
    const last = passengers[passengers.length - 1].name;
    return `${allButLast} and ${last}`;
  };

  return (
    <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[#222222] rounded-2xl p-5 flex flex-col h-full hover:border-zinc-300 dark:hover:border-[#333] transition-colors">

      {/* Header: Avatar(s) + Name(s) */}
      <div className="flex flex-col mb-6 gap-3">
        <div className="flex items-center -space-x-3">
          {passengers.map((pax, i) => (
            <div key={pax.id} className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white dark:border-[#111] relative z-10" style={{ zIndex: 10 - i }}>
               <UserAvatar user={{ name: pax.name } as any} className="w-full h-full text-sm" />
            </div>
          ))}
        </div>
        <span className="font-semibold text-zinc-900 dark:text-zinc-100 leading-tight text-sm line-clamp-2">{getGroupedNames()}</span>
      </div>

      {/* Route (Vertical Layout) */}
      <div className="flex flex-col mb-6 relative">
        {/* Origin */}
        <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 min-w-0 z-10">
          <MapPin size={14} className="text-[#e83e8c] shrink-0" />
          <span className="truncate">{transport?.source ? `${cleanName(transport.source)} (${getCode(transport.source)})` : 'Origin'}</span>
        </div>

        {/* Dotted Line */}
        <div className="absolute left-[6.5px] top-[14px] bottom-[14px] w-[1px] border-l-[1.5px] border-dashed border-zinc-300 dark:border-zinc-700"></div>

        {/* Destination */}
        <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 min-w-0 z-10 mt-4">
          <MapPin size={14} className="text-green-500 shrink-0" />
          <span className="truncate">{transport?.destination ? `${cleanName(transport.destination)} (${getCode(transport.destination)})` : 'Destination'}</span>
        </div>
      </div>

      {/* Transport Details */}
      <div className="mt-auto space-y-4">
        <div className="flex items-start gap-2 border-t border-zinc-200 dark:border-[#222] pt-4 min-w-0">
          <div className="shrink-0 mt-0.5">
            {getTransportIcon(transport?.type)}
          </div>
          <div className="-mt-0.5 min-w-0 flex-1">
            <div className={`text-sm font-medium truncate ${getTransportName() === 'Not Available' ? 'text-red-500 dark:text-red-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
              {getTransportName()}
            </div>
            {getTransportName() !== 'Not Available' && (
              <div className="text-[11px] text-zinc-500 capitalize">{transport?.type || 'Booked'}</div>
            )}
          </div>
        </div>

        {getTransportName() !== 'Not Available' && transport?.departure && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 min-w-0">
            <Calendar size={12} className="shrink-0" />
            <span className="truncate">{formatDateTime(transport?.departure)}</span>
          </div>
        )}
      </div>

    </div>
  );
}
