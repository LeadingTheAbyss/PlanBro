'use client';
import { useEffect, useRef } from 'react';

// Pre-generate building data so it's consistent
const BUILDINGS = Array.from({ length: 350 }).map(() => ({
  x: Math.random(), 
  y: Math.random() * Math.random(), // cluster near horizon
  w: Math.random() * 0.015 + 0.005, 
  h: Math.random() * 0.2 + 0.05, 
  onTime: Math.random() * 100 
}));

export function CityCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const computedStyle = getComputedStyle(document.documentElement);
      const px = (parseFloat(computedStyle.getPropertyValue('--plane-x')) || 50) / 100 * canvas.width;
      const py = (parseFloat(computedStyle.getPropertyValue('--plane-y')) || 50) / 100 * canvas.height;

      const time = Date.now() * 0.005;

      const horizonY = canvas.height * 0.65;

      ctx.fillStyle = 'rgba(255, 220, 150, 1)';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(255, 200, 100, 0.8)';

      for (let i = 0; i < BUILDINGS.length; i++) {
        const b = BUILDINGS[i];
        
        const bx = b.x * canvas.width;
        // Distribute below horizon, projecting upwards
        const by = horizonY + (b.y * canvas.height * 0.1) - (b.h * canvas.height); 
        const bw = b.w * canvas.width;
        const bh = b.h * canvas.height;

        // Center of building for distance calc
        const cx = bx + bw/2;
        const cy = by + bh/2;
        const dist = Math.hypot(px - cx, py - cy);
        
        // Illumination factor (wake up as plane gets near)
        let active = Math.max(0, 1 - dist / (canvas.width * 0.25));
        
        if (active > 0.05) {
           // Flicker
           active *= 0.6 + Math.sin(time + b.onTime) * 0.4;
           
           ctx.globalAlpha = active; 
           
           // Building light
           ctx.fillRect(bx, by, bw, bh);
           
           // Water reflection (dimmer, blurrier, mirrored down)
           const reflectionY = horizonY + (horizonY - by) - bh;
           ctx.globalAlpha = active * 0.2; 
           ctx.fillRect(bx, reflectionY + bh, bw, bh); // Draw downwards
        }
      }
      
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full z-[10] pointer-events-none mix-blend-screen"
    />
  );
}
