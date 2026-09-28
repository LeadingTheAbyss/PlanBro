'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { User } from 'lucide-react';

interface Coordinate {
  id: string;
  lat: number;
  lng: number;
  type: 'origin' | 'destination';
  name: string;
}

interface AnimatedJourneyMapProps {
  coords: Coordinate[];
  isActive: boolean;
}

function JourneyOverlay({ coords, isActive }: AnimatedJourneyMapProps) {
  const map = useMap();
  const [nodes, setNodes] = useState<any[]>([]);
  const [visitedCount, setVisitedCount] = useState(0);

  useEffect(() => {
    if (coords.length === 0) return;

    const updateProjection = () => {
      const projectedNodes = coords.map(c => {
        const p = map.latLngToContainerPoint([c.lat, c.lng]);
        return { ...c, x: p.x, y: p.y };
      });
      setNodes(projectedNodes);
    };

    const applyUpdates = () => {
      map.invalidateSize();
      if (coords.length > 1) {
        const bounds = L.latLngBounds(coords.map(c => [c.lat, c.lng]));
        map.fitBounds(bounds, { 
          padding: [60, 60], 
          maxZoom: 10, 
          animate: false 
        });
      } else if (coords.length === 1) {
        map.setView([coords[0].lat, coords[0].lng], 6, { animate: false });
      }
      updateProjection();
    };

    const timeout = setTimeout(applyUpdates, 100);
    const timeout2 = setTimeout(applyUpdates, 500);
    const timeout3 = setTimeout(applyUpdates, 1500);
    
    map.on('move', updateProjection);
    map.on('zoom', updateProjection);
    map.on('resize', updateProjection);
    window.addEventListener('resize', () => {
      map.invalidateSize();
      updateProjection();
    });

    return () => {
      clearTimeout(timeout);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      map.off('move', updateProjection);
      map.off('zoom', updateProjection);
      map.off('resize', updateProjection);
    };
  }, [map, coords]);

  // Sequential Animation Logic
  useEffect(() => {
    if (!isActive || nodes.length === 0) {
      setVisitedCount(0);
      return;
    }

    // Start walking after a short delay
    const timer = setInterval(() => {
      setVisitedCount(prev => {
        if (prev < nodes.length - 1) {
          return prev + 1;
        }
        clearInterval(timer);
        return prev;
      });
    }, 1500); // 1.5 seconds per city

    return () => clearInterval(timer);
  }, [isActive, nodes.length]);

  if (nodes.length === 0) return null;

  // Current position of the character
  const currentPos = nodes[visitedCount] || nodes[0];

  return (
    <div className="absolute inset-0 z-[1000] pointer-events-none">
      <svg className="w-full h-full opacity-100 mix-blend-screen">
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5B942" />
            <stop offset="100%" stopColor="#FF8A00" />
          </linearGradient>

          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur1" />
            <feGaussianBlur stdDeviation="8" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* The Track (Visited Lines) */}
        {nodes.map((node, i) => {
          if (i === 0) return null;
          const prevNode = nodes[i - 1];
          const isVisited = i <= visitedCount;
          
          return (
            <path
              key={`line-${i}`}
              d={`M ${prevNode.x} ${prevNode.y} L ${node.x} ${node.y}`}
              fill="none"
              stroke={isVisited ? "var(--gold)" : "rgba(255, 255, 255, 0.1)"}
              strokeWidth={isVisited ? "2.5" : "1"}
              strokeDasharray={isVisited ? "none" : "4 6"}
              className="transition-colors duration-500"
            />
          );
        })}

        {/* Cities */}
        {nodes.map((node, i) => {
          const isVisited = i <= visitedCount;
          const isCurrent = i === visitedCount;
          return (
            <g key={`city-${i}`} transform={`translate(${node.x}, ${node.y})`}>
              {isVisited ? (
                <>
                  {isCurrent && <circle r="20" fill="none" stroke="url(#goldGradient)" strokeWidth="1.5" className="dest-pulse" />}
                  <circle r="8" fill="url(#goldGradient)" filter="url(#glow)" />
                  <circle r="3" fill="#fff" />
                  {/* Tick mark for previously visited cities */}
                  {i < visitedCount && (
                     <path d="M-2 0 L-0.5 2 L3 -2" fill="none" stroke="#05061A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </>
              ) : (
                <>
                  <circle r="5" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                  <circle r="2" fill="rgba(255,255,255,0.5)" />
                </>
              )}
              
              <text 
                y={20}
                className={`text-label transition-opacity duration-500 ${isVisited ? 'opacity-100 font-bold' : 'opacity-40'}`}
                textAnchor="middle"
                fill={isVisited ? "#F5B942" : "#fff"}
              >
                {node.name}
              </text>
            </g>
          );
        })}

        {/* Walking Character */}
        {currentPos && (
          <g 
            transform={`translate(${currentPos.x}, ${currentPos.y})`} 
            style={{ transition: 'transform 1.5s linear' }}
          >
            {/* Bounce animation container */}
            <g className="walking-bounce">
              {/* Drop Shadow */}
              <ellipse cx="0" cy="12" rx="10" ry="4" fill="rgba(0,0,0,0.6)" filter="blur(2px)" />
              
              {/* 3D Bubble Shell (Removed for 3D model to stand out) */}
              <circle r="16" fill="#FF3D7F" opacity="0.3" filter="url(#glow)" />
              
              {/* 3D Model Image */}
              <image 
                href="/api/avatar?v=3" 
                x="-25" y="-35" width="50" height="50" 
                preserveAspectRatio="xMidYMid meet"
                className="drop-shadow-2xl"
              />
            </g>
          </g>
        )}
      </svg>
      
      <style jsx global>{`
        .dest-pulse {
          animation: dest-ripple 2s cubic-bezier(0.1, 0, 0.1, 1) infinite;
        }
        @keyframes dest-ripple {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        .text-label {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          text-shadow: 0 4px 12px rgba(0,0,0,1), 0 1px 3px rgba(0,0,0,0.8);
          pointer-events: none;
        }

        .walking-bounce {
          animation: walk-bounce 0.4s ease-in-out infinite alternate;
        }
        @keyframes walk-bounce {
          0% { transform: translateY(0) rotate(-5deg); }
          100% { transform: translateY(-8px) rotate(5deg); }
        }

        .leaflet-tile {
          border: none !important;
          outline: 1px solid transparent !important;
        }
      `}</style>
    </div>
  );
}

export default function AnimatedJourneyMap({ coords, isActive }: AnimatedJourneyMapProps) {
  if (!isActive && coords.length === 0) return null;

  return (
    <div className="absolute inset-0 w-full h-full bg-[#050505]">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      
      <MapContainer 
        center={[20.5937, 78.9629]} 
        zoom={5} 
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        attributionControl={false}
        className="w-full h-full"
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={18}
        />
        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 z-[500] bg-black/40 pointer-events-none" />
        
        <JourneyOverlay coords={coords} isActive={isActive} />
      </MapContainer>
    </div>
  );
}
