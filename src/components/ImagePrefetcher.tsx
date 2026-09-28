'use client';

import { useEffect } from 'react';

const THEME_IMAGES = [
  '/api/theme-image?theme=desert',
  '/api/theme-image?theme=beach',
  '/api/theme-image?theme=jungle',
  '/api/theme-image?theme=mountains',
  '/api/theme-image?theme=backwaters',
  '/api/theme-image?theme=heritage',
  '/api/theme-image?theme=metropolis',
  '/api/theme-image?theme=skyscrapers'
];

export default function ImagePrefetcher() {
  useEffect(() => {
    // Eagerly load all theme background images into browser cache
    // so that when a user types a city, the map pin background updates instantly without flickering
    THEME_IMAGES.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  }, []);

  return null;
}
