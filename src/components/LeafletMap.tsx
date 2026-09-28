'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

import { Plane, Train, Bus, Car } from 'lucide-react';

interface LeafletMapProps {
  coords: Coordinate[];
  routes: Route[];
  isMaximized?: boolean;
  themeImageUrl?: string;
  themeGlowColor?: string;
}

function RouteOverlay({ coords, routes, themeImageUrl, themeGlowColor }: LeafletMapProps) {
  const map = useMap();
  const [nodes, setNodes] = useState<any[]>([]);
  const [paths, setPaths] = useState<any[]>([]);

  useEffect(() => {
    if (coords.length === 0) return;

    const updateProjection = () => {
      const projectedNodes = coords.map(c => {
        // Translate GPS coordinates directly into on-screen pixel coordinates
        const p = map.latLngToContainerPoint([c.lat, c.lng]);
        return { ...c, x: p.x, y: p.y };
      });

      const projectedPaths = routes.map((r, i) => {
        const start = map.latLngToContainerPoint([r.start.lat, r.start.lng]);
        const end = map.latLngToContainerPoint([r.end.lat, r.end.lng]);
        
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        
        // Increased curve multiplier (from 0.25 to 0.4) so the line arcs higher and is much easier to see on short trips
        const pcx = (start.x + end.x) / 2 - (dy * 0.4);
        const pcy = (start.y + end.y) / 2 + (dx * 0.4);

        const d = `M ${start.x} ${start.y} Q ${pcx} ${pcy} ${end.x} ${end.y}`;
        
        return { id: r.id, d, start, end, delay: i * 0.4, mode: r.mode };
      });

      setNodes(projectedNodes);
      setPaths(projectedPaths);
    };

    const applyUpdates = () => {
      // Force Leaflet to recalculate its DOM size. In Next.js, dynamically imported
      // components often misreport their size on the first render frame, causing extreme projection drift.
      map.invalidateSize();

      // Frame the camera gracefully around the cities
      if (coords.length > 1) {
        const bounds = L.latLngBounds(coords.map(c => [c.lat, c.lng]));
        // Increased maxZoom to 12 so it can zoom in beautifully on close cities inside India.
        // Added much smaller uniform padding so the map can zoom in closer.
        map.fitBounds(bounds, { 
          padding: [40, 40], 
          maxZoom: 10, 
          animate: false 
        });
      } else if (coords.length === 1) {
        map.setView([coords[0].lat, coords[0].lng], 6, { animate: false });
      }

      updateProjection();
    };

    // A tiny timeout allows the DOM/CSS to fully resolve before we calculate absolute pixels
    const timeout = setTimeout(applyUpdates, 100);
    
    const handleResize = () => {
      map.invalidateSize();
      updateProjection();
    };
    
    // Keep SVG synced if the map moves, zooms, or resizes
    map.on('move', updateProjection);
    map.on('zoom', updateProjection);
    map.on('resize', updateProjection);
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeout);
      map.off('move', updateProjection);
      map.off('zoom', updateProjection);
      map.off('resize', updateProjection);
      window.removeEventListener('resize', handleResize);
    };
  }, [map, coords, routes]);

  return (
    <div className="absolute inset-0 z-[1000] pointer-events-none">
      <svg className="w-full h-full opacity-100 mix-blend-screen">
        <defs>
          <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f2fe" />
            <stop offset="100%" stopColor="#4facfe" />
          </linearGradient>

          <filter id="hyperGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur1" />
            <feGaussianBlur stdDeviation="8" result="blur2" />
            <feGaussianBlur stdDeviation="15" result="blur3" />
            <feMerge>
              <feMergeNode in="blur3" />
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <clipPath id="avatarClip">
            <circle r="30" />
          </clipPath>
        </defs>

        {/* The Track */}
        {paths.map(path => (
          <path
            key={`track-${path.id}`}
            d={path.d}
            fill="none"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="1.5"
            className="transition-all duration-1000"
          />
        ))}

        {/* Animated Icons instead of Comet Aura/Core */}
        {paths.map(path => {
          // If no mode or cross route, fallback to original comet
          if (!path.mode || path.mode === 'cross') {
             return (
               <g key={`comet-${path.id}`}>
                 <path d={path.d} fill="none" stroke="url(#neonGradient)" strokeWidth="6" filter="url(#hyperGlow)" className="energy-flow" />
                 <path d={path.d} fill="none" stroke="#ffffff" strokeWidth="2" filter="url(#subtleGlow)" className="energy-flow" />
               </g>
             );
          }

          return (
            <g key={`icon-${path.id}`}>
              {/* Glow aura */}
              <circle r="18" fill="none"
                stroke={path.mode === 'flight' ? '#3b82f6' : path.mode === 'train' ? '#f97316' : path.mode === 'bus' ? '#22c55e' : '#a855f7'}
                strokeWidth="12" opacity="0.25" filter="url(#hyperGlow)"
              />
              {/* 3D bubble shell */}
              <circle r="14"
                fill={path.mode === 'flight' ? '#1d4ed8' : path.mode === 'train' ? '#c2410c' : path.mode === 'bus' ? '#15803d' : '#7e22ce'}
                opacity="0.95"
              />
              {/* Shine highlight */}
              <ellipse cx="-4" cy="-5" rx="5" ry="3" fill="white" opacity="0.25" />
              {/* Icon itself — centered at 0,0 via translate */}
              <g transform="translate(-8, -8)">
                {path.mode === 'flight' && <Plane size={16} className="text-white" style={{ color: 'white', fill: 'white' }} />}
                {path.mode === 'train' && <Train size={16} style={{ color: 'white' }} />}
                {path.mode === 'bus' && <Bus size={16} style={{ color: 'white' }} />}
                {(path.mode === 'cab' || path.mode === 'car') && <Car size={16} style={{ color: 'white' }} />}
              </g>
              <animateMotion dur="3s" repeatCount="indefinite" path={path.d} rotate={path.mode === 'flight' ? 'auto' : '0'} />
            </g>
          );
        })}

        {/* Living Nodes */}
        {nodes.map(node => {
          const destNode = nodes.find(n => n.type === 'destination');
          const isWest = destNode && node.lng < destNode.lng;
          const isEast = destNode && node.lng >= destNode.lng;

          const textX = node.type === 'origin' && destNode ? (isWest ? -15 : 15) : 0;
          const textY = node.type === 'origin' ? (destNode ? 4 : 16) : (themeImageUrl ? 50 : 24);
          const anchor = node.type === 'origin' && destNode ? (isWest ? 'end' : 'start') : 'middle';

          return (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
            {node.type === 'destination' ? (
              themeImageUrl ? (
                <g className="transition-all duration-1000">
                  {/* Outer Glow Ring */}
                  <circle r="38" fill="none" stroke={themeGlowColor || "url(#neonGradient)"} strokeWidth="6" filter="url(#subtleGlow)" opacity="0.6" className="dest-pulse" />
                  <circle r="34" fill="none" stroke="#ffffff" strokeWidth="3" filter="url(#hyperGlow)" opacity="0.8" />
                  {/* Image Avatar */}
                  <g clipPath="url(#avatarClip)">
                     <image href={themeImageUrl} x="-30" y="-30" width="60" height="60" preserveAspectRatio="xMidYMid slice" />
                  </g>
                </g>
              ) : (
                <>
                  <circle className="dest-pulse" r="25" fill="none" stroke="url(#neonGradient)" strokeWidth="1.5" filter="url(#subtleGlow)" />
                  <circle className="dest-bloom" r="16" fill="url(#neonGradient)" opacity="0.4" filter="url(#hyperGlow)" />
                  <circle r="3.5" fill="#ffffff" filter="url(#subtleGlow)" />
                </>
              )
            ) : (
              <>
                <circle className="origin-bloom" r="10" fill="rgba(79, 172, 254, 0.2)" filter="url(#subtleGlow)" />
                <circle r="2.5" fill="#ffffff" />
              </>
            )}
            
            <text 
              x={textX}
              y={textY}
              className="text-label"
              textAnchor={anchor}
            >
              {node.name}
            </text>
          </g>
        )})}
      </svg>
      
      <style jsx global>{`
        .energy-flow {
          stroke-dasharray: 20 80; /* 20% dash, 80% gap. Total length 100 */
          /* Continuous linear animation creates a seamless "liquid" flow that instantly loops */
          animation: liquid-flow 1.5s linear infinite;
        }

        @keyframes liquid-flow {
          from { stroke-dashoffset: 100; }
          to { stroke-dashoffset: 0; }
        }

        .dest-pulse {
          animation: dest-ripple 4s cubic-bezier(0.1, 0, 0.1, 1) infinite;
        }
        .dest-bloom {
          animation: dest-breathe 4s ease-in-out infinite alternate;
        }

        @keyframes dest-ripple {
          0% { transform: scale(0.3); opacity: 1; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes dest-breathe {
          0% { transform: scale(0.9); opacity: 0.6; }
          100% { transform: scale(1.1); opacity: 1; }
        }

        .origin-bloom {
          animation: origin-breathe 3s ease-in-out infinite alternate;
        }
        
        @keyframes origin-breathe {
          0% { transform: scale(0.85); opacity: 0.4; }
          100% { transform: scale(1.15); opacity: 1; }
        }

        .text-label {
          fill: rgba(255, 255, 255, 0.95);
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 3px;
          text-transform: uppercase;
          text-shadow: 0 4px 16px rgba(0,0,0,1);
          pointer-events: none;
        }

        /* Fix for Leaflet sub-pixel tile gaps (the thin grid lines) 
           Forcing width/height creates a blurry anti-aliased edge. 
           Using a transparent outline forces the browser to render the edges solidly without gaps. */
        .leaflet-tile {
          border: none !important;
          outline: 1px solid transparent !important;
        }
      `}</style>
    </div>
  );
}

export default function LeafletMap({ coords, routes, isMaximized = false, themeImageUrl, themeGlowColor }: LeafletMapProps) {
  return (
    <div className="absolute inset-0 w-full h-full bg-[#050505]">
      {/* Explicitly load Leaflet CSS via CDN to prevent Next.js CSS import bugs from breaking tile layouts */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      
      {/* 
        We use the Esri World Imagery satellite provider for a stunning 4K photorealistic view.
        When maximized, we allow zooming and dragging for exploration.
      */}
      <MapContainer 
        key={isMaximized ? 'maximized' : 'minimized'}
        center={[20.5937, 78.9629]} 
        zoom={5} 
        zoomControl={isMaximized}
        dragging={isMaximized}
        scrollWheelZoom={isMaximized}
        doubleClickZoom={isMaximized}
        touchZoom={isMaximized}
        attributionControl={false}
        className="w-full h-full"
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={18}
        />
        
        {/* Removed cinematic dark filter to reveal bright 4K satellite colors */}
        
        <RouteOverlay coords={coords} routes={routes} themeImageUrl={themeImageUrl} themeGlowColor={themeGlowColor} />
      </MapContainer>
    </div>
  );
}
