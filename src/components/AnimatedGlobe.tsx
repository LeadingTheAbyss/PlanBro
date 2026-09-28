'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';

// Dynamically import Leaflet map to prevent SSR window errors
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-[#050505] animate-pulse flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin opacity-50" />
    </div>
  ),
});

interface AnimatedGlobeProps {
  passengers: { city: string }[];
  destination: string;
  mode?: string; // fallback single mode
  routeModes?: Record<string, string>; // city -> mode mapping
  isMaximized?: boolean;
  themeImageUrl?: string;
  themeGlowColor?: string;
}


interface Coordinate {
  id: string;
  lat: number;
  lng: number;
  type: 'origin' | 'destination';
  name: string;
}

interface Route {
  id: string;
  start: Coordinate;
  end: Coordinate;
  mode?: string;
}

export default function AnimatedGlobe({ passengers, destination, mode, routeModes, isMaximized, themeImageUrl, themeGlowColor }: AnimatedGlobeProps) {
  const [coords, setCoords] = useState<Coordinate[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!destination) {
      setCoords([]);
      setRoutes([]);
      return;
    }

    const fetchCoords = async () => {
      try {
        const uniqueCities = Array.from(new Set(passengers.map(p => p.city).filter(Boolean)));
        
        let destCoord: Coordinate | null = null;
        const newCoords: Coordinate[] = [];
        
        const destPromise = api.searchCity(destination);
        const srcPromises = uniqueCities.map(async (city) => {
          const res = await api.searchCity(city);
          return { city, res };
        });

        // Fetch destination and all sources concurrently to cut loading time in half
        const [destRes, ...srcResponses] = await Promise.all([destPromise, ...srcPromises]);

        if (destRes && destRes.length > 0 && destRes[0].lat !== undefined) {
          const lat = Number(destRes[0].lat);
          const lng = Number(destRes[0].lng);
          destCoord = { id: `dest-${destination}`, lat, lng, type: 'destination', name: destination };
          newCoords.push(destCoord);
        }

        const newRoutes: Route[] = [];

        for (const { city, res } of srcResponses) {
          if (res && res.length > 0 && res[0].lat !== undefined) {
            const lat = Number(res[0].lat);
            const lng = Number(res[0].lng);
            const originCoord: Coordinate = { id: `orig-${city}`, lat, lng, type: 'origin', name: city };
            newCoords.push(originCoord);

            if (destCoord && city !== destination) {
              newRoutes.push({
                id: `route-${city}-${destination}`,
                start: originCoord,
                end: destCoord,
                mode: routeModes?.[city] ?? mode
              });
            }
          }
        }
        
        setCoords(newCoords);
        setRoutes(newRoutes);
      } catch (error) {
        console.error('Failed to fetch coordinates', error);
      }
    };
    
    fetchCoords();
  }, [JSON.stringify(passengers), destination, mode, JSON.stringify(routeModes)]);

  if (!isClient) return <div className="absolute inset-0 bg-[#050505]" />;

  return (
    <div className="absolute inset-0 w-full h-full bg-[#050505] overflow-hidden">
      <LeafletMap coords={coords} routes={routes} isMaximized={isMaximized} themeImageUrl={themeImageUrl} themeGlowColor={themeGlowColor} />
    </div>
  );
}
