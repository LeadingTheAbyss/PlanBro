'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ItineraryStop } from '@/data/blogData';

if (typeof window !== 'undefined') {
  (L.Browser as any).any3d = false;
  (L.Browser as any).webkit3d = false;
  (L.Browser as any).gecko3d = false;
}

interface BlogVisualMapInnerProps {
  stops: ItineraryStop[];
  onStopClick?: (day: number, title: string) => void;
}

const createNumberedStopIcon = (day: number, name: string) => L.divIcon({
  className: '',
  html: `
    <div class="relative flex items-center justify-center w-7 h-7 rounded-full bg-[#FF8A3D] text-[#1F2937] font-black text-xs border-2 border-white shadow-xl hover:scale-110 transition-transform cursor-pointer z-50">
      ${day}
      <div class="absolute left-full ml-2 text-white text-xs font-black whitespace-nowrap bg-black/80 px-2 py-0.5 rounded-md drop-shadow-md border border-white/20 pointer-events-none">
        📍 ${name.split(',')[0]}
      </div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function MapBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.flyToBounds(bounds, { paddingBottomRight: [140, 60], paddingTopLeft: [60, 60], maxZoom: 13, duration: 1.5 });
    }
  }, [map, positions]);

  return null;
}

const getDynamicCoords = (stopLocation?: string, idx: number = 0): [number, number] => {
  if (!stopLocation) return [15.2993 + (idx * 0.05), 74.1240 + (idx * 0.04)];
  const lower = stopLocation.toLowerCase();
  if (lower.includes('goa') || lower.includes('ghats') || lower.includes('panjim') || lower.includes('anjuna')) {
    return [15.4989 + (idx * 0.04), 73.8278 + (idx * 0.03)];
  }
  if (lower.includes('mumbai') || lower.includes('bandra')) return [19.0760 + (idx * 0.02), 72.8777 + (idx * 0.02)];
  if (lower.includes('delhi')) return [28.6139 + (idx * 0.03), 77.2090 + (idx * 0.03)];
  if (lower.includes('kerala') || lower.includes('kochi') || lower.includes('munnar')) return [9.9312 + (idx * 0.03), 76.2673 + (idx * 0.03)];
  if (lower.includes('jaipur') || lower.includes('rajasthan')) return [26.9124 + (idx * 0.03), 75.7873 + (idx * 0.03)];
  if (lower.includes('rishikesh') || lower.includes('uttarakhand')) return [30.0869 + (idx * 0.03), 78.2676 + (idx * 0.03)];
  if (lower.includes('spiti') || lower.includes('kunzum') || lower.includes('kaza')) return [32.2276 + (idx * 0.05), 78.0418 + (idx * 0.04)];
  return [15.2993 + (idx * 0.05), 74.1240 + (idx * 0.04)];
};

export default function BlogVisualMapInner({ stops, onStopClick }: BlogVisualMapInnerProps) {
  const positions: [number, number][] = stops.map((s, idx) => {
    if (s.coordinates && s.coordinates.lat && s.coordinates.lng) {
      return [s.coordinates.lat, s.coordinates.lng];
    }
    return getDynamicCoords(s.location || s.title, idx);
  });

  const center: [number, number] = positions[0] || [15.2993, 74.1240];

  const handleMarkerClick = (day: number, title: string) => {
    if (onStopClick) {
      onStopClick(day, title);
    } else {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
      let el = document.getElementById(`blog-section-${slug}`) || document.getElementById(`blog-section-${day}`);
      if (!el) {
        // Fallback: try to scroll down to the rich article renderer wrapper by scrolling the modal content a bit
        const allHeadings = document.querySelectorAll('h2[id^="blog-section-"], h3[id^="blog-section-"]');
        if (allHeadings.length > 0 && day <= allHeadings.length) {
          el = allHeadings[day - 1] as HTMLElement;
        } else if (allHeadings.length > 0) {
           // Fallback to the first section if day index out of bounds
           el = allHeadings[0] as HTMLElement;
        }
      }
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-[#FF8A3D]', 'bg-[#FFF9E6]/80', 'transition-all', 'duration-500', 'rounded-xl');
        setTimeout(() => el.classList.remove('ring-4', 'ring-[#FF8A3D]', 'bg-[#FFF9E6]/80', 'rounded-xl'), 2500);
      } else {
         window.scrollBy({ top: 500, behavior: 'smooth' }); // Hard fallback scroll if no headings exist
      }
    }
  };

  return (
    <MapContainer 
      center={center} 
      zoom={11} 
      zoomControl={false}
      attributionControl={false}
      className="w-full h-full bg-[#111]"
    >
      {/* High resolution satellite imagery layer */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={18}
        crossOrigin="anonymous"
      />
      
      {positions.length > 1 && (
        <Polyline 
          positions={positions} 
          pathOptions={{ color: '#FFD166', weight: 4, dashArray: '8, 8', opacity: 0.85, lineJoin: 'round' }} 
        />
      )}

      {stops.map((stop, idx) => {
        const pos = positions[idx];
        return (
          <Marker 
            key={`${stop.day}-${idx}`} 
            position={pos}
            icon={createNumberedStopIcon(stop.day, stop.location || stop.title)}
            eventHandlers={{
              click: () => handleMarkerClick(stop.day, stop.title)
            }}
          />
        );
      })}

      <MapBounds positions={positions} />
    </MapContainer>
  );
}
