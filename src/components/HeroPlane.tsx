'use client';

import React, { useRef, useEffect } from 'react';

export const HeroPlane = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  const filterRef = useRef<SVGFETurbulenceElement>(null);
  
  // Animate the fractal noise to make it "roil"
  useEffect(() => {
    let frame = 0;
    let animationId: number;
    const animate = () => {
      if (filterRef.current) {
        frame += 1;
        // Slowly shifting the baseFrequency creates a roiling/boiling effect
        // It's a hack to animate turbulence without SMIL
        const freqX = 0.015 + Math.sin(frame * 0.01) * 0.002;
        const freqY = 0.03 + Math.cos(frame * 0.01) * 0.005;
        filterRef.current.setAttribute('baseFrequency', `${freqX} ${freqY}`);
      }
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div ref={ref} className="fixed top-1/2 left-1/2 z-50 w-[120px] h-[300px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" {...props}>
      <svg
        viewBox="-100 0 300 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-[800px] overflow-visible"
        style={{ filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.5))' }}
      >
        <defs>
          <linearGradient id="trailGradient" x1="50" y1="120" x2="50" y2="700" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
            <stop offset="15%" stopColor="rgba(200, 220, 255, 0.6)" />
            <stop offset="50%" stopColor="rgba(150, 180, 255, 0.2)" />
            <stop offset="100%" stopColor="rgba(100, 150, 255, 0)" />
          </linearGradient>

          <filter id="chemtrail" x="-100%" y="-20%" width="300%" height="200%">
            {/* The SVG turbulence for the organic roiling cloud texture */}
            <feTurbulence 
              ref={filterRef}
              type="fractalNoise" 
              baseFrequency="0.015 0.03" 
              numOctaves="4" 
              seed="5"
              result="noise" 
            />
            
            {/* Displace the actual path shape using the noise */}
            <feDisplacementMap 
              in="SourceGraphic" 
              in2="noise" 
              scale="45" 
              xChannelSelector="R" 
              yChannelSelector="G" 
              result="displaced" 
            />
            
            {/* Add blur for a fluffy vapor look */}
            <feGaussianBlur in="displaced" stdDeviation="6" result="blurred" />

            {/* Increase contrast and opacity slightly for the cloud density */}
            <feColorMatrix type="matrix" values="
              1 0 0 0 0.1
              0 1 0 0 0.1
              0 0 1 0 0.2
              0 0 0 2 0" />
          </filter>

          <filter id="glowOrb" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="15" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- TRAIL --- */}
        {/* The trail originates exactly at the tail point (y=120) and expands outwards downwards */}
        <path
          d="M 46 120 L 54 120 L 80 700 L 20 700 Z"
          fill="url(#trailGradient)"
          filter="url(#chemtrail)"
        />

        {/* --- GLOW ORBS --- */}
        <circle cx="20" cy="80" r="15" fill="#3b82f6" opacity="0.6" filter="url(#glowOrb)" />
        <circle cx="80" cy="80" r="15" fill="#8b5cf6" opacity="0.6" filter="url(#glowOrb)" />
        <circle cx="50" cy="50" r="25" fill="#ffffff" opacity="0.2" filter="url(#glowOrb)" />

        {/* --- PLANE GRAPHIC --- */}
        <g id="airplane">
          {/* Main Fuselage */}
          <path 
            d="M 50 10 
               C 56 10, 60 20, 62 40 
               L 62 100 
               C 62 115, 56 120, 50 125 
               C 44 120, 38 115, 38 100 
               L 38 40 
               C 40 20, 44 10, 50 10 Z" 
            fill="#ffffff" 
          />
          
          {/* Main Wings */}
          <path 
            d="M 38 50 
               C 30 55, 10 70, 0 85 
               L 0 95 
               L 38 80 Z" 
            fill="#e5e7eb" 
          />
          <path 
            d="M 62 50 
               C 70 55, 90 70, 100 85 
               L 100 95 
               L 62 80 Z" 
            fill="#e5e7eb" 
          />

          {/* Tail Wings */}
          <path 
            d="M 40 105 L 20 115 L 20 120 L 42 115 Z" 
            fill="#d1d5db" 
          />
          <path 
            d="M 60 105 L 80 115 L 80 120 L 58 115 Z" 
            fill="#d1d5db" 
          />
          
          {/* Vertical Stabilizer (Tail) */}
          <path 
            d="M 48 100 L 52 100 L 51 120 L 49 120 Z" 
            fill="#9ca3af" 
          />

          {/* Dotted Centerline down the fuselage */}
          <line 
            x1="50" y1="25" 
            x2="50" y2="105" 
            stroke="#9ca3af" 
            strokeWidth="1.5" 
            strokeDasharray="4 4" 
            opacity="0.5" 
          />

          {/* Red-Tipped Nose */}
          <path 
            d="M 50 10 
               C 53 10, 54 13, 54.5 16
               L 45.5 16
               C 46 13, 47 10, 50 10 Z" 
            fill="#ef4444" 
          />

          {/* Cockpit Windows */}
          <path 
            d="M 47 22 L 53 22 L 54.5 28 L 45.5 28 Z" 
            fill="#111827" 
            opacity="0.9" 
          />
        </g>
      </svg>
    </div>
  );
});

HeroPlane.displayName = 'HeroPlane';
