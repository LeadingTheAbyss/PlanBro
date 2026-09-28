'use client';
import { useEffect, useRef } from 'react';

export function ContrailCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Puffy 3D cloud brush
    const brushSize = 128;
    const brushCanvas = document.createElement('canvas');
    brushCanvas.width = brushSize;
    brushCanvas.height = brushSize;
    const bCtx = brushCanvas.getContext('2d')!;
    
    // Helper to draw soft volumetric spheres
    const drawPuff = (x: number, y: number, r: number, rColor: number, gColor: number, bColor: number, alpha: number) => {
      const grad = bCtx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${rColor}, ${gColor}, ${bColor}, ${alpha})`);
      grad.addColorStop(1, `rgba(${rColor}, ${gColor}, ${bColor}, 0)`);
      bCtx.fillStyle = grad;
      bCtx.beginPath();
      bCtx.arc(x, y, r, 0, Math.PI * 2);
      bCtx.fill();
    };

    // Core white clusters
    drawPuff(64, 64, 40, 255, 255, 255, 0.4);
    drawPuff(44, 54, 35, 255, 255, 255, 0.3);
    drawPuff(84, 54, 35, 255, 255, 255, 0.3);
    
    // Top highlight (sunlight)
    drawPuff(64, 40, 30, 255, 255, 255, 0.6);
    
    // Bottom shadow for 3D depth
    drawPuff(64, 88, 35, 180, 200, 220, 0.3);
    drawPuff(44, 80, 30, 180, 200, 220, 0.2);
    drawPuff(84, 80, 30, 180, 200, 220, 0.2);

    let points: { x: number, y: number, spawnTime: number, sizeMult: number }[] = [];
    const MAX_LIFETIME_MS = 3000; // 3 seconds exact lifespan
    let animationFrameId: number;
    
    let lastE1X = 0;
    let lastE1Y = 0;
    let lastE2X = 0;
    let lastE2Y = 0;
    let firstFrame = true;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // These vars are written every frame via el.style.setProperty() by the plane's
      // render loop, so reading them straight off the inline style (which is what's
      // actually authoritative here) is equivalent to — but much cheaper than —
      // getComputedStyle(), which resolves the full cascade just to hand back the
      // same inline value.
      const inlineStyle = document.documentElement.style;

      const px1 = parseFloat(inlineStyle.getPropertyValue('--e1-x')) || 50;
      const py1 = parseFloat(inlineStyle.getPropertyValue('--e1-y')) || 50;

      const px2 = parseFloat(inlineStyle.getPropertyValue('--e2-x')) || 50;
      const py2 = parseFloat(inlineStyle.getPropertyValue('--e2-y')) || 50;
      
      const screenE1X = (px1 / 100) * canvas.width;
      const screenE1Y = (py1 / 100) * canvas.height;
      
      const screenE2X = (px2 / 100) * canvas.width;
      const screenE2Y = (py2 / 100) * canvas.height;

      if (firstFrame) {
        lastE1X = screenE1X;
        lastE1Y = screenE1Y;
        lastE2X = screenE2X;
        lastE2Y = screenE2Y;
        firstFrame = false;
      }

      const now = performance.now();

      // Distance moved since last frame (using engine 1 as reference for density)
      const dx1 = screenE1X - lastE1X;
      const dy1 = screenE1Y - lastE1Y;
      
      const dx2 = screenE2X - lastE2X;
      const dy2 = screenE2Y - lastE2Y;
      
      const dist = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      
      // Spawn puffs every N pixels to ensure fluffy chunks, not a dense laser line
      const pixelsPerPuff = 8;
      const numPuffs = Math.max(1, Math.floor(dist / pixelsPerPuff));

      for (let i = 1; i <= numPuffs; i++) {
        const t = i / numPuffs;
        
        // Interpolate Engine 1
        const interpE1X = lastE1X + dx1 * t;
        const interpE1Y = lastE1Y + dy1 * t;
        
        // Interpolate Engine 2
        const interpE2X = lastE2X + dx2 * t;
        const interpE2Y = lastE2Y + dy2 * t;
        
        // We push two separate puff points per engine to allow them to drift independently if we want later
        points.push({ 
          x: interpE1X, 
          y: interpE1Y, 
          spawnTime: now, 
          sizeMult: 0.8 + Math.random() * 0.4 
        });
        
        points.push({ 
          x: interpE2X, 
          y: interpE2Y, 
          spawnTime: now, 
          sizeMult: 0.8 + Math.random() * 0.6 // More size variation for organic look
        });
      }

      lastE1X = screenE1X;
      lastE1Y = screenE1Y;
      
      lastE2X = screenE2X;
      lastE2Y = screenE2Y;
      
      // Filter out fully dissipated puffs
      points = points.filter(p => (now - p.spawnTime) < MAX_LIFETIME_MS);

      // Draw from oldest (index 0) to newest (end of array)
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const ageMs = now - p.spawnTime;
        
        // Opacity drops based strictly on its physical age
        // age 0 = progress 1 (solid). age MAX_LIFETIME_MS = progress 0 (invisible).
        const progress = Math.max(0, 1 - (ageMs / MAX_LIFETIME_MS));
        
        // Puffs expand as they age (growing roughly 40px per second)
        const size = Math.max(10, (15 + (ageMs / 1000) * 40) * p.sizeMult);
        
        // Softly fading out towards the end of the tail
        const opacity = Math.min(1, Math.pow(progress, 1.5));
        ctx.globalAlpha = opacity;
        
        // Draw puff
        ctx.drawImage(brushCanvas, p.x - size/2, p.y - size/2, size, size);
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    let isVisible = true;
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        // Reset reference points so we don't draw a massive line connecting where the plane was vs is
        firstFrame = true;
        render();
      } else {
        cancelAnimationFrame(animationFrameId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    render();

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-[20] pointer-events-none contrail-canvas"
    />
  );
}
