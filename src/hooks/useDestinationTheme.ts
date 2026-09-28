'use client';

import { useState, useEffect } from 'react';
import { THEME_STYLES, getThemeForCity, getImageUrlForCity } from '@/lib/destinationThemes';
import { useTripStore } from '@/store/tripStore';

export function useDestinationTheme(cityOverride?: string) {
  const storeDestination = useTripStore((s) => s.destination);
  const destination = cityOverride !== undefined ? cityOverride : storeDestination;
  const currentTheme = getThemeForCity(destination);
  const baseTheme = THEME_STYLES[currentTheme] || THEME_STYLES.default;
  
  const activeTheme = {
    ...baseTheme,
    imageUrl: typeof window !== 'undefined' ? 
      getImageUrlForCity(destination, baseTheme.imageUrl) 
      : baseTheme.imageUrl
  };

  const [dynamicBg, setDynamicBg] = useState<string | null>(null);

  useEffect(() => {
    if (!activeTheme.imageUrl || activeTheme.imageUrl.includes('default')) {
      setDynamicBg(null);
      return;
    }

    const img = new Image();
    /*
    img.crossOrigin = 'Anonymous' tells the browser to fetch that image 
    via a CORS request (no cookies/credentials sent) instead of a normal 
    opaque cross-origin load. That's needed here because if you later draw 
    the image onto a <canvas> (e.g. to sample its colors/pixels), the canvas 
    gets "tainted" and throws a security error on getImageData/toDataURL 
    unless the image was loaded with CORS and the server responded with the 
    right Access-Control-Allow-Origin header.
    */
    img.crossOrigin = 'Anonymous';
    img.src = activeTheme.imageUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = Math.min(img.width, 200); // Downscale for speed
      canvas.height = Math.min(img.height, 200);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      try {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        
        if (count > 0) {
          const avgR = r / count;
          const avgG = g / count;
          const avgB = b / count;
          
          // Blend the average color with white (75% white) to guarantee a light, joyful, pastel aesthetic!
          const blendFactor = 0.75;
          const pastelR = Math.floor(avgR + (255 - avgR) * blendFactor);
          const pastelG = Math.floor(avgG + (255 - avgG) * blendFactor);
          const pastelB = Math.floor(avgB + (255 - avgB) * blendFactor);
          
          setDynamicBg(`rgba(${pastelR}, ${pastelG}, ${pastelB}, 1)`);
        }
      } catch (e) {
        console.warn("Could not extract image color. Please try again later.", e);
      }
    };
  }, [activeTheme.imageUrl]);

  return {
    activeTheme,
    dynamicBg,
    currentTheme,
    destination
  };
}
