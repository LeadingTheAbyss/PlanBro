'use client';

import React from 'react';
import { CATEGORIES } from '@/data/blogData';
import { motion } from 'framer-motion';

interface CategoryPillsProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryPills({ selectedCategory, onSelectCategory }: CategoryPillsProps) {
  return (
    <section id="articles-section" className="pt-8 pb-4 px-4 md:px-8 max-w-7xl mx-auto scroll-mt-20">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#1F2937] tracking-tight flex items-center gap-2">
            <span>Explore by Travel Style</span>
            <span className="text-sm px-2.5 py-1 rounded-full bg-[#FFD166]/30 text-[#B45309] font-bold">11 Topics</span>
          </h2>
          <p className="text-sm text-[#6B7280] font-medium mt-1">Select a category to filter stories crafted for your PlanBro adventures</p>
        </div>
        
        {selectedCategory !== 'All Stories' && (
          <button
            onClick={() => onSelectCategory('All Stories')}
            className="self-start sm:self-auto text-xs font-bold text-[#FF8A3D] hover:underline flex items-center gap-1 bg-white/80 px-3 py-1.5 rounded-full border border-[#FF8A3D]/30 shadow-xs transition-all"
          >
            <span>Reset filter ({selectedCategory})</span>
          </button>
        )}
      </div>

      {/* Pill Track */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.label || (selectedCategory === 'All Stories' && cat.slug === 'all');
          return (
            <button
              key={cat.slug}
              onClick={() => onSelectCategory(cat.label)}
              className={`relative group shrink-0 px-4 py-2.5 rounded-full text-xs font-extrabold flex items-center gap-2 transition-all duration-300 ${
                isSelected
                  ? 'bg-[#1F2937] text-white shadow-[0_6px_20px_rgba(31,41,55,0.3)] scale-[1.03] border-2 border-white'
                  : 'bg-white hover:bg-[#FFF3E6] text-[#4B5563] hover:text-[#1F2937] border border-[#FF8A3D]/20 shadow-xs hover:shadow-md'
              }`}
            >
              <span className="text-base leading-none group-hover:scale-125 transition-transform duration-300 inline-block">
                {cat.icon}
              </span>
              <span>{cat.label}</span>
              
              {isSelected && (
                <motion.span
                  layoutId="activeCategoryIndicator"
                  className="absolute inset-0 rounded-full border-2 border-[#FF8A3D] pointer-events-none"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}
            </button>
          );
        })}
      </div>

    </section>
  );
}
