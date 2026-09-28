'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageCarouselProps {
  urls?: string[];
  fallbackUrl?: string;
  alt: string;
  className?: string;
}

export function ImageCarousel({ urls, fallbackUrl, alt, className = "" }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const activeUrls = urls && urls.length > 0 ? urls : fallbackUrl ? [fallbackUrl] : [];

  if (activeUrls.length === 0) {
    return <div className={`bg-neutral-200 flex items-center justify-center ${className}`}>No Media</div>;
  }

  // If there's only one image, just render it normally without arrows or dots
  if (activeUrls.length === 1) {
    const url = activeUrls[0];
    const isVideo = url.match(/\.(mp4|webm|ogg)$/i);
    return (
      <div className={`relative ${className}`}>
        {isVideo ? (
          <video src={url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
        ) : (
          <img src={url} alt={alt} className="w-full h-full object-cover" loading="lazy" />
        )}
      </div>
    );
  }

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === activeUrls.length - 1 ? 0 : prev + 1));
  };

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? activeUrls.length - 1 : prev - 1));
  };

  const currentUrl = activeUrls[currentIndex];
  const isVideo = currentUrl.match(/\.(mp4|webm|ogg)$/i);

  return (
    <div className={`relative group overflow-hidden ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0"
        >
          {isVideo ? (
            <video src={currentUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
          ) : (
            <img src={currentUrl} alt={`${alt} - ${currentIndex + 1}`} className="w-full h-full object-cover" loading="lazy" />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows (Visible on Hover) */}
      <div className="absolute inset-y-0 left-0 flex items-center px-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={goPrev}
          className="p-1 sm:p-1.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm shadow-md transition-all active:scale-95"
          aria-label="Previous image"
        >
          <ChevronLeft size={20} />
        </button>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center px-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={goNext}
          className="p-1 sm:p-1.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm shadow-md transition-all active:scale-95"
          aria-label="Next image"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Indicator Dots */}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 z-10">
        {activeUrls.map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(idx);
            }}
            className={`transition-all duration-300 rounded-full shadow-sm ${
              idx === currentIndex
                ? 'w-4 h-1.5 bg-[#FF8A3D] opacity-100'
                : 'w-1.5 h-1.5 bg-white/70 hover:bg-white opacity-60'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
