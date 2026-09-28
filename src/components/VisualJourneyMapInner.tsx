'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Place } from '@/types/trip';

// CRITICAL FIX: Force Leaflet to use left/top positioning instead of CSS 3D transforms.
// html-to-image completely fails to parse Leaflet's translate3d() math, causing
// all map tiles and markers to squish into the top-left corner in the PDF!
if (typeof window !== 'undefined') {
  (L.Browser as any).any3d = false;
  (L.Browser as any).webkit3d = false;
  (L.Browser as any).gecko3d = false;
}

interface VisualJourneyMapInnerProps {
  places: Place[];
}

const createNumberedIcon = (label: string | number, name: string, isHotel: boolean) => L.divIcon({
  className: '',
  html: `
    <div class="relative flex items-center justify-center w-6 h-6 rounded-full ${isHotel ? 'bg-zinc-800' : 'bg-green-500'} text-white font-bold text-[10px] border-2 border-black/80 shadow-md backdrop-blur-sm z-50">
      ${label}
      <div class="absolute left-full ml-2 text-white text-[11px] font-bold whitespace-nowrap drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pointer-events-none" style="text-shadow: 0px 2px 4px rgba(0,0,0,0.9), 0px 0px 2px rgba(0,0,0,0.9);">
        ${name}
      </div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapEffects({ places }: { places: Place[] }) {
  const map = useMap();

  useEffect(() => {
    if (places.length > 0) {
      const validPlaces = places.filter(p => p.lat && p.lng);
      if (validPlaces.length > 0) {
        const bounds = L.latLngBounds(validPlaces.map(p => [p.lat!, p.lng!]));
        // Increased maxZoom to 16 (from 14) so the map zooms in much closer when places are tightly clustered
        // Increased right padding to prevent labels from being cut off on the edge
        map.fitBounds(bounds, { paddingBottomRight: [120, 50], paddingTopLeft: [50, 50], maxZoom: 14, animate: true });
      }
    }
  }, [map, places]);

  return null;
}

export default function VisualJourneyMapInner({ places }: VisualJourneyMapInnerProps) {
  const validPlaces = places.filter(p => p.lat && p.lng);
  
  // Jaipur fallback for empty/invalid coords if we want a mock map, or just show world map.
  const defaultCenter: [number, number] = validPlaces.length > 0 ? [validPlaces[0].lat!, validPlaces[0].lng!] : [26.9124, 75.7873];
  const positions: [number, number][] = validPlaces.map(p => [p.lat!, p.lng!]);

  return (
    <MapContainer 
      center={defaultCenter} 
      zoom={12} 
      zoomControl={false}
      attributionControl={false}
      className="w-full h-full bg-[#111]"
    >
      {/* ArcGIS Satellite tile layer */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={18}
        crossOrigin="anonymous"
      />
      
      {positions.length > 1 && (
        <Polyline 
          positions={positions} 
          pathOptions={{ color: '#22c55e', weight: 3, dashArray: '6, 6', opacity: 0.7, lineJoin: 'round' }} 
        />
      )}

      {validPlaces.map((place: any, idx) => (
        <Marker 
          key={`${place.id}-${idx}`} 
          position={[place.lat!, place.lng!]}
          icon={createNumberedIcon(place.displayLabel || (idx + 1), place.name, place.isHotel)}
        />
      ))}

      <MapEffects places={validPlaces} />
    </MapContainer>
  );
}
