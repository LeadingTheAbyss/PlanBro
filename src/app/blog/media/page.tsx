'use client';

import React, { useState, useEffect } from 'react';
import { Article } from '@/data/blogData';
import { BlogNavbar } from '@/components/blog/BlogNavbar';
import { MediaFeed } from '@/components/blog/MediaFeed';
import { CinematicLoader } from '@/components/CinematicLoader';
import { useCacheStore } from '@/store/cacheStore';
import { BlogFooter } from '@/components/blog/BlogFooter';
import { BlogThemeContext } from '@/context/BlogThemeContext';

export default function BlogMediaPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const cache = useCacheStore();

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const cached = cache.getCache('blogs');
      if (cached && cached.length > 0) {
        setArticles(cached);
      }

      try {
        fetch('/api/blogs')
          .then(async res => {
            if (!res.ok) throw new Error('API Error');
            return res.json();
          })
          .then(data => {
            if (!Array.isArray(data)) throw new Error('Invalid data format');
            setArticles(data);
            cache.setCache('blogs', data);
          })
          .catch(e => {
            console.error(e);
            if (!cache.getCache('blogs')) setArticles([]);
          })
          .finally(() => setIsFetching(false));
      } catch (e) {
        if (!cache.getCache('blogs')) setArticles([]);
        setIsFetching(false);
      }
    }
  }, []);

  const isLoading = isMounted && articles.length === 0 && isFetching;

  return (
    <BlogThemeContext.Provider value={{ isDark, toggleDark: () => setIsDark(!isDark) }}>
    <div className={`min-h-screen font-sans overflow-x-hidden relative transition-colors duration-500 ${isDark ? 'bg-[#0a0a0a] text-zinc-100 selection:bg-[#FF8A3D]/30' : 'bg-[#FFF7F0] text-[#1F2937] selection:bg-[#FF8A3D]/20'}`}>
      <CinematicLoader 
        isLoading={isLoading} 
        category="places" 
        customLabel="Curating Your Perfect Visual Feed" 
        minDisplayMs={11000}
      />
      
      {/* Top Travel Journal Navbar */}
      <BlogNavbar />

      {/* The Visual Feed */}
      <MediaFeed articles={articles} />

      {/* Travel Journal Footer */}
      <BlogFooter />
    </div>
    </BlogThemeContext.Provider>
  );
}
