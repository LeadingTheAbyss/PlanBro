'use client';
import { useEffect, useRef } from 'react';

const AIRPORTS = [
  { code: 'JFK', x: 25, y: 40 },
  { code: 'LHR', x: 45, y: 35 },
  { code: 'DXB', x: 60, y: 50 },
  { code: 'BOM', x: 70, y: 55 },
  { code: 'HND', x: 85, y: 45 },
  { code: 'SYD', x: 90, y: 80 }
];

const ROUTES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
  [0, 2], [1, 4], [2, 5]
];

export function RouteMapCanvas() {
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

      // Draw Routes
      ROUTES.forEach(([i, j]) => {
        const p1 = AIRPORTS[i];
        const p2 = AIRPORTS[j];
        const x1 = (p1.x / 100) * canvas.width;
        const y1 = (p1.y / 100) * canvas.height;
        const x2 = (p2.x / 100) * canvas.width;
        const y2 = (p2.y / 100) * canvas.height;

        // Calculate distance to plane (midpoint approximation)
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const dist = Math.hypot(px - midX, py - midY);
        
        // Illumination factor
        const active = Math.max(0.05, Math.pow(1 - Math.min(dist / (canvas.width * 0.4), 1), 2));

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        
        // Simple curve by raising the control point
        const cx = (x1 + x2) / 2;
        // Curve direction based on points
        const cy = Math.min(y1, y2) - Math.abs(x1 - x2) * 0.2; 
        
        ctx.quadraticCurveTo(cx, cy, x2, y2);

        ctx.strokeStyle = `rgba(255, 200, 100, ${active * 0.6})`;
        ctx.lineWidth = 1 + active * 2;
        ctx.shadowBlur = active * 15;
        ctx.shadowColor = 'rgba(255, 200, 100, 1)';
        ctx.stroke();
      });

      // Draw Airports
      const time = Date.now() * 0.003;
      AIRPORTS.forEach(ap => {
        const x = (ap.x / 100) * canvas.width;
        const y = (ap.y / 100) * canvas.height;
        const dist = Math.hypot(px - x, py - y);
        const active = Math.max(0.2, Math.pow(1 - Math.min(dist / (canvas.width * 0.3), 1), 2));

        // Node dot
        ctx.beginPath();
        ctx.arc(x, y, 2 + active * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 220, 150, ${0.4 + active * 0.6})`;
        ctx.shadowBlur = active * 20;
        ctx.shadowColor = 'rgba(255, 200, 100, 1)';
        ctx.fill();

        // Pulse ring
        if (active > 0.1) {
           const pulse = (Math.sin(time + ap.x) + 1) / 2; // 0 to 1, offset by position
           ctx.beginPath();
           ctx.arc(x, y, 4 + pulse * 12, 0, Math.PI * 2);
           ctx.strokeStyle = `rgba(255, 200, 100, ${(1 - pulse) * active * 0.8})`;
           ctx.lineWidth = 1;
           ctx.stroke();
        }

        // Label
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + active * 0.7})`;
        ctx.shadowBlur = 0;
        ctx.fillText(ap.code, x + 10, y + 4);
      });

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
      className="absolute inset-0 w-full h-full z-[10] pointer-events-none"
    />
  );
}
