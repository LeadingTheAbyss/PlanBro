'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, Plane, MapPin, Cloud } from 'lucide-react';

export function BlogHero() {
  const scrollToArticles = () => {
    const el = document.getElementById('articles-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const [stats, setStats] = React.useState({ writers: 12, cities: 28 });

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      fetch('/api/blogs')
        .then(res => res.json())
        .then(customBlogs => {
          if (!Array.isArray(customBlogs)) return;
          const uniqueWriters = new Set(customBlogs.map((b: any) => b.author?.username).filter(Boolean));
          const uniqueCities = new Set(customBlogs.map((b: any) => b.city).filter(Boolean));
          if (uniqueWriters.size > 0 || uniqueCities.size > 0) {
            setStats({
              writers: 12 + uniqueWriters.size,
              cities: 28 + uniqueCities.size
            });
          }
        })
        .catch(e => console.error('Failed to fetch blogs for hero stats', e));
    }
  }, []);

  return (
    <section className="relative overflow-hidden pt-8 pb-20 md:pt-16 md:pb-32 px-4 md:px-8 max-w-7xl mx-auto">
      
      {/* Background Ambient Warm Blobs */}
      <div className="absolute top-4 left-1/4 w-96 h-96 rounded-full bg-[#FF8A3D]/15 blur-[100px] pointer-events-none -z-10 animate-pulse"></div>
      <div className="absolute top-20 right-10 w-96 h-96 rounded-full bg-[#FFD166]/20 blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 left-10 w-80 h-80 rounded-full bg-[#6EC6FF]/15 blur-[100px] pointer-events-none -z-10"></div>
      <div className="absolute top-1/3 left-2/3 w-72 h-72 rounded-full bg-[#7ED957]/15 blur-[100px] pointer-events-none -z-10"></div>

      {/* Decorative Dotted Flight Path SVG Background */}
      <div className="absolute inset-0 pointer-events-none -z-10 opacity-40 overflow-hidden flex items-center justify-center">
        <svg className="w-full h-full min-w-[1200px]" viewBox="0 0 1200 600" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M -50 480 C 250 150, 600 550, 1250 120"
            stroke="#FF8A3D"
            strokeWidth="3"
            strokeDasharray="12 12"
            strokeLinecap="round"
            className="animate-[dash_30s_linear_infinite]"
          />
          <path
            d="M 100 80 C 450 350, 800 50, 1150 480"
            stroke="#6EC6FF"
            strokeWidth="2"
            strokeDasharray="8 8"
            className="opacity-60"
          />
        </svg>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
        
        {/* Left Column: Editorial Headline & Copy */}
        <div className="lg:col-span-7 flex flex-col items-start text-left max-w-2xl">
          


          {/* Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-black text-5xl sm:text-6xl lg:text-7xl tracking-[-0.03em] leading-[1.05] text-[#1F2937] mb-6"
          >
            PlanBro in words. <br />
            <span className="bg-gradient-to-r from-[#FF8A3D] via-[#FFB347] to-[#D97706] bg-clip-text text-transparent">
              Stories that make you want to pack your bags.
            </span>
          </motion.h1>

          {/* Supporting copy */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg md:text-xl text-[#4B5563] font-medium leading-relaxed mb-10 max-w-xl"
          >
            Immerse yourself in handpicked dispatches from untouched Konkan coastlines, snow-draped Himalayan mountain passes, and aromatic old-city bazaars. Curated for Indian explorers who crave unforgettable regional adventures over routine.
          </motion.p>

          {/* Action CTA + Stats mini banner */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto"
          >
            <button
              onClick={scrollToArticles}
              className="group flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-[#1F2937] hover:bg-[#FF8A3D] text-white font-black text-base uppercase tracking-wider shadow-[0_10px_30px_rgba(31,41,55,0.25)] hover:shadow-[0_15px_35px_rgba(255,138,61,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              <span>Explore Articles</span>
              <ArrowDown size={18} className="text-[#FFD166] group-hover:text-white group-hover:translate-y-1 transition-transform" />
            </button>

            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/60 backdrop-blur-sm border border-[#FF8A3D]/20 sm:ml-2">
              <div className="flex -space-x-2">
                <img className="w-8 h-8 rounded-full ring-2 ring-[#FFF7F0] object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt="Editor 1" />
                <img className="w-8 h-8 rounded-full ring-2 ring-[#FFF7F0] object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt="Editor 2" />
                <img className="w-8 h-8 rounded-full ring-2 ring-[#FFF7F0] object-cover" src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&q=80" alt="Editor 3" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-[#1F2937] leading-none">{stats.writers}+ Writers</p>
                <p className="text-[10px] text-[#6B7280] font-semibold mt-0.5">Live across {stats.cities} cities in India</p>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Right Column: Magazine Collage with Floating Decorative Badges */}
        <div className="lg:col-span-5 relative flex items-center justify-center mt-6 lg:mt-0">
          
          {/* Main Hero Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 2 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-20 w-[290px] sm:w-[360px] h-[400px] sm:h-[480px] rounded-[32px] overflow-hidden shadow-[0_25px_60px_-15px_rgba(255,138,61,0.35)] border-[6px] border-white bg-white group"
          >
            <img 
              src="https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=900&q=80" 
              alt="Spiti Valley High Altitude" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <span className="px-3 py-1 rounded-full bg-[#FF8A3D] text-white text-[10px] font-black uppercase tracking-widest inline-block mb-2 shadow-sm">
                Featured Cover
              </span>
              <h3 className="font-extrabold text-xl sm:text-2xl leading-tight tracking-tight drop-shadow-md">
                Beyond Spiti Valley: High Monasteries & Butter Tea
              </h3>
              <p className="text-xs text-white/80 font-medium mt-1">By Rohan D’Souza · 9 min read</p>
            </div>
          </motion.div>

          {/* Secondary Layered Card Behind */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.85, rotate: 8 }}
            animate={{ opacity: 0.85, scale: 0.92, rotate: -8 }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="absolute -left-4 sm:-left-12 -top-6 w-[260px] sm:w-[320px] h-[360px] sm:h-[440px] rounded-[32px] overflow-hidden shadow-2xl border-[6px] border-white bg-white z-10 hidden sm:block pointer-events-none"
          >
            <img 
              src="https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80" 
              alt="Divar Island Goa" 
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Floating Sticker 1: Tiny Plane & Flight Path */}
          <motion.div 
            animate={{ y: [0, -12, 0], rotate: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
            className="absolute -top-8 right-2 sm:right-6 z-30 bg-white px-4 py-2.5 rounded-2xl shadow-[0_12px_35px_rgba(0,0,0,0.12)] border border-[#FF8A3D]/20 flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-full bg-[#EEF7FF] flex items-center justify-center text-[#2563EB]">
              <Plane size={16} className="rotate-[45deg]" />
            </div>
            <div className="text-left">
              <p className="text-[10px] uppercase font-black text-[#6B7280]">Travel Status</p>
              <p className="text-xs font-bold text-[#1F2937]">Incredible India</p>
            </div>
          </motion.div>

          {/* Floating Sticker 2: Map Pin */}
          <motion.div 
            animate={{ y: [0, 10, 0], x: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.7 }}
            className="absolute bottom-12 -left-6 sm:-left-10 z-30 bg-[#1F2937] text-white px-4 py-3 rounded-2xl shadow-xl border border-white/20 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-[#FF8A3D] flex items-center justify-center text-white shadow">
              <MapPin size={18} className="animate-bounce" />
            </div>
            <div>
              <p className="text-[11px] uppercase font-bold text-[#FFD166] tracking-wider">Hidden Gem</p>
              <p className="text-xs font-extrabold">Chitkul, Spiti Valley</p>
            </div>
          </motion.div>

          {/* Floating Sticker 3: Luggage Tag / Passport */}
          <motion.div 
            animate={{ y: [0, -8, 0], rotate: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut", delay: 1.2 }}
            className="absolute -bottom-6 right-8 z-30 bg-gradient-to-r from-[#FF8A3D] to-[#FFB347] text-[#1F2937] px-4 py-2 rounded-xl shadow-[0_8px_20px_rgba(255,138,61,0.4)] border-2 border-white font-extrabold text-xs flex items-center gap-2"
          >
            <span>🇮🇳</span>
            <span>Incredible India!</span>
          </motion.div>

          {/* Decorative Floating Clouds */}
          <motion.div
            animate={{ x: [0, 15, 0] }}
            transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
            className="absolute -top-10 -left-6 z-0 text-[#6EC6FF]/40 hidden md:block pointer-events-none"
          >
            <Cloud size={64} fill="currentColor" />
          </motion.div>

        </div>
      </div>
    </section>
  );
}
