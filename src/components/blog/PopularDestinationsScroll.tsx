'use client';

import React, { useRef } from 'react';
import { POPULAR_DESTINATIONS } from '@/data/blogData';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, MapPin, Compass, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function PopularDestinationsScroll() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.7;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const startTripPlanning = (destination: string) => {
    router.push(`/plan/setup?dest=${encodeURIComponent(destination)}`);
  };

  return (
    <section className="py-16 my-8 bg-[#FFF3E6]/60 border-y border-[#FF8A3D]/20 overflow-hidden relative">
      
      {/* Background Decorative Gradient */}
      <div className="absolute top-1/2 -right-20 w-96 h-96 rounded-full bg-[#FFB347]/15 blur-[100px] pointer-events-none"></div>
      <div className="absolute top-0 left-10 w-72 h-72 rounded-full bg-[#6EC6FF]/10 blur-[80px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        {/* Header & Scroll Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF8A3D]/10 border border-[#FF8A3D]/30 mb-3">
              <Compass size={14} className="text-[#FF8A3D] animate-spin-slow" />
              <span className="text-xs font-black uppercase tracking-widest text-[#D45B0C]">
                Trending Indian Escapes
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#1F2937] tracking-tight">
              Popular Indian Destinations
            </h2>
            <p className="text-base text-[#6B7280] font-medium mt-1 max-w-xl">
              From misty high-altitude Spiti monasteries to sun-soaked Goan coves and traditional Kashmiri houseboats, explore where explorers are heading across India.
            </p>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <button
              onClick={() => handleScroll('left')}
              aria-label="Scroll left"
              className="w-11 h-11 rounded-full bg-white text-[#1F2937] border border-[#FF8A3D]/30 hover:border-[#FF8A3D] hover:bg-[#FF8A3D] hover:text-white flex items-center justify-center shadow-sm transition-all duration-200"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={() => handleScroll('right')}
              aria-label="Scroll right"
              className="w-11 h-11 rounded-full bg-white text-[#1F2937] border border-[#FF8A3D]/30 hover:border-[#FF8A3D] hover:bg-[#FF8A3D] hover:text-white flex items-center justify-center shadow-sm transition-all duration-200"
            >
              <ChevronRight size={22} />
            </button>
          </div>
        </div>

        {/* Horizontal Card Track */}
        <div
          ref={scrollRef}
          className="flex items-stretch gap-6 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory no-scrollbar scroll-smooth"
        >
          {POPULAR_DESTINATIONS.map((dest, i) => (
            <motion.div
              key={dest.id}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="snap-start shrink-0 w-[280px] sm:w-[320px] h-[400px] rounded-[32px] overflow-hidden relative group cursor-pointer border-2 border-white shadow-[0_15px_35px_-10px_rgba(255,138,61,0.25)] bg-[#1F2937]"
              onClick={() => startTripPlanning(dest.name)}
            >
              {/* Destination Photo */}
              <img
                src={dest.imageUrl}
                alt={dest.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent transition-opacity group-hover:opacity-90"></div>



              {/* Bottom Details & Hover Action */}
              <div className="absolute bottom-6 left-6 right-6 text-white z-10 flex flex-col justify-end">
                <h3 className="text-3xl font-black tracking-tight leading-none text-white drop-shadow-md group-hover:text-[#FFD166] transition-colors mb-2">
                  {dest.name}
                </h3>
                <p className="text-xs text-white/80 font-medium leading-relaxed line-clamp-2 mb-4">
                  {dest.tagline}
                </p>

                <div className="pt-3 border-t border-white/20 flex items-center justify-between font-extrabold text-xs text-[#FFD166] group-hover:text-white transition-colors">
                  <span>Plan Itinerary Here</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
