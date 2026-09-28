'use client';

import React, { useRef, useEffect } from 'react';

export function ContrailSVG() {
  const containerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef<SVGFEOffsetElement>(null);

  useEffect(() => {
    let dy = 0;
    let animationId: number;

    const animate = () => {
      // Flow the smoke downwards at a high speed to simulate engine exhaust
      dy += 10; 
      // Seamlessly loop every 1500px (the height of our noise tile)
      if (dy >= 1500) dy -= 1500;

      if (offsetRef.current) {
        offsetRef.current.setAttribute('dy', dy.toString());
      }

      // Read CSS variables exported by the 3D plane render loop
      const computedStyle = getComputedStyle(document.documentElement);
      const xStr = computedStyle.getPropertyValue('--plane-tail-x');
      const yStr = computedStyle.getPropertyValue('--plane-tail-y');
      const angleStr = computedStyle.getPropertyValue('--plane-angle');

      if (xStr && yStr && angleStr && containerRef.current) {
        const x = parseFloat(xStr);
        const y = parseFloat(yStr);
        // We subtract 90 because our trail SVG is drawn pointing straight down (Y axis)
        const angle = parseFloat(angleStr) - 90;

        // Use transform translate3d instead of left/top to avoid Chromium SVG culling and layout thrashing
        // We use vw/vh to convert the percentage coordinates to viewport coordinates.
        // The container is 150px wide, so we subtract 75px (50%) to center it horizontally.
        containerRef.current.style.transform = `translate3d(calc(${x}vw - 75px), calc(${y}vh), 0) rotate(${angle}deg)`;
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed z-20 pointer-events-none"
      style={{
        width: '150px',
        height: '1500px',
        left: '0',
        top: '0',
        transformOrigin: '50% 0',
        willChange: 'transform'
      }}
    >
      <svg
        viewBox="-75 -20 150 1540"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <linearGradient id="trailGradientSVG" x1="0" y1="0" x2="0" y2="1500" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 1)" />
            <stop offset="5%" stopColor="rgba(255, 255, 255, 0.95)" />
            <stop offset="30%" stopColor="rgba(255, 255, 255, 0.5)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
          </linearGradient>

          <filter id="chemtrailSVG" x="-100%" y="-10%" width="300%" height="120%">
            {/* Generate a static Volumetric Noise buffer that is twice the height (3000px).
                We start it at y="-1500" so we can scroll it down seamlessly. 
                baseFrequency perfectly loops over 150x1500 (3 periods by 15 periods per 1500px block) */}
            <feTurbulence 
              type="fractalNoise" 
              baseFrequency="0.02 0.01" 
              numOctaves="5" 
              stitchTiles="stitch"
              x="0" y="-1500" width="150" height="3000"
              result="staticNoise" 
            />
            
            {/* Translate the double-height noise field to simulate fluid flow. 
                We avoid feTile because it frequently crashes or gets culled in Chromium! */}
            <feOffset 
              ref={offsetRef}
              in="staticNoise" 
              dx="0" 
              dy="0" 
              result="movingNoise" 
            />
            
            {/* Displace the base shape using the FLOWING noise to give it wispy, moving edges */}
            <feDisplacementMap 
              in="SourceGraphic" 
              in2="movingNoise" 
              scale="50" 
              xChannelSelector="R" 
              yChannelSelector="G" 
              result="displaced"
            />
            
            {/* Extract an alpha mask from the moving noise to carve rolling holes into the trail */}
            <feColorMatrix 
              type="matrix" 
              values="0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 0 1
                      3 0 0 0 -0.8" 
              in="movingNoise" 
              result="noiseAlpha" 
            />
            
            {/* Mask the displaced gradient with the thick noise alpha for internal cloud texture */}
            <feComposite 
              operator="in" 
              in="displaced" 
              in2="noiseAlpha" 
              result="cloud" 
            />
            
            {/* Soften everything slightly */}
            <feGaussianBlur in="cloud" stdDeviation="2.5" result="glow" />
            
            {/* Merge the core and the glow for a luminous vapor effect */}
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="cloud" />
            </feMerge>
          </filter>
        </defs>

        {/* 
          The path starts slightly negative (Y=-10) to completely overlap the tail cone and remove any gap.
          It expands outwards heavily to 1500px to simulate massive vapor dissipation across the entire screen.
        */}
        <path
          d="M -2 -10 L 2 -10 L 60 1500 L -60 1500 Z"
          fill="url(#trailGradientSVG)"
          filter="url(#chemtrailSVG)"
        />
      </svg>
    </div>
  );
}
