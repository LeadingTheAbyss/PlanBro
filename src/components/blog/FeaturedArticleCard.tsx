'use client';

import React from 'react';
import { Article } from '@/data/blogData';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, ArrowUpRight, Bookmark, Share2, Heart, Eye, MessageSquare } from 'lucide-react';
import { ImageCarousel } from '@/components/blog/ImageCarousel';
import { useBlogTheme } from '@/context/BlogThemeContext';

interface FeaturedArticleCardProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
}

export function FeaturedArticleCard({ articles, onSelectArticle }: FeaturedArticleCardProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const blogTheme = useBlogTheme();
  const isDark = blogTheme?.isDark || false;
  
  React.useEffect(() => {
    if (activeIndex >= articles.length) setActiveIndex(0);
  }, [articles, activeIndex]);

  const article = articles[activeIndex] || articles[0];
  const [likes, setLikes] = React.useState(article?.likes ?? 0);
  const [liked, setLiked] = React.useState(false);

  React.useEffect(() => {
    if (article) {
      setLikes(article.likes ?? 0);
      setLiked(false);
    }
  }, [article]);

  const toggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (liked) {
      setLikes(l => l - 1);
      setLiked(false);
    } else {
      setLikes(l => l + 1);
      setLiked(true);
    }
  };

  if (!article) return null;

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev === articles.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev === 0 ? articles.length - 1 : prev - 1));
  };

  return (
    <section className="py-12 px-4 md:px-8 max-w-7xl mx-auto relative group">
        <div>
          <h2 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${isDark ? 'text-zinc-100' : 'text-[#1F2937]'}`}>
            Trending Blogs
          </h2>
          <p className={`text-sm font-medium mt-0.5 ${isDark ? 'text-zinc-400' : 'text-[#6B7280]'}`}>The most loved stories from our community</p>
        </div>

      <motion.div
        whileHover={{ y: -6 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        onClick={() => onSelectArticle(article)}
        className={`group cursor-pointer rounded-[36px] p-4 sm:p-6 md:p-8 border-2 shadow-[0_20px_60px_-15px_rgba(255,138,61,0.18)] hover:shadow-[0_30px_70px_-10px_rgba(255,138,61,0.3)] transition-all relative overflow-hidden ${isDark ? 'bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border-zinc-700' : 'bg-gradient-to-r from-[#FFF3E6] via-white to-[#FFF7F0] border-[#FF8A3D]/20'}`}
      >
        {/* Subtle decorative internal gradient border */}
        <div className={`absolute inset-0 rounded-[36px] border pointer-events-none z-20 ${isDark ? 'border-zinc-700/50' : 'border-white/80'}`}></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left: Large Photo with zoom effect */}
          <div className="lg:col-span-7 relative h-[340px] sm:h-[440px] rounded-[28px] overflow-hidden shadow-lg bg-black">
            {article.videoUrl && (article.mediaType === 'article' || article.videoUrl.match(/\.(mp4|webm|ogg)$/i)) ? (
              <video 
                src={article.videoUrl} 
                autoPlay loop muted playsInline 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
            ) : article.imageUrls && article.imageUrls.length > 1 ? (
              <ImageCarousel 
                urls={article.imageUrls} 
                alt={article.title} 
                className="w-full h-full"
              />
            ) : (
              <img 
                src={article.imageUrl} 
                alt={article.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            
            {/* Top Badge overlay */}
            <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-4 py-1.5 rounded-full font-extrabold text-xs uppercase tracking-wider backdrop-blur-md shadow-md flex items-center gap-1.5 bg-white/95 text-[#D45B0C]`}>
                  <span>{article.categoryIcon}</span>
                  <span>{article.category}</span>
                </span>
                {article.city && (
                  <span className="px-4 py-1.5 rounded-full font-black text-xs backdrop-blur-md shadow-md bg-[#1F2937]/95 text-white flex items-center gap-1">
                    <span>📍</span>
                    <span>{article.city}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={toggleLike}
                  className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-md ${liked ? 'bg-rose-500 text-white scale-110' : 'bg-white/90 hover:bg-white text-[#1F2937]'}`}
                  title="Like story"
                >
                  <Heart size={16} fill={liked ? "currentColor" : "none"} />
                </button>
              </div>
            </div>

            {/* Bottom Floating Author Quick Tag on mobile */}
            <div className="absolute bottom-5 left-5 right-5 lg:hidden text-white flex items-center justify-between">
              <span className="text-xs font-bold text-white/90 flex items-center gap-1.5">
                <Clock size={13} className="text-[#FFD166]" />
                {article.readingTime}
              </span>
              <span className="text-xs font-bold bg-[#FF8A3D] px-3 py-1 rounded-full">Read Story &rarr;</span>
            </div>
          </div>

          {/* Right: Editorial Content */}
          <div className="lg:col-span-5 flex flex-col justify-between h-full py-2 lg:pl-2">
            
            <div>
              <div className="hidden lg:flex items-center gap-3 text-xs font-extrabold uppercase tracking-widest text-[#D45B0C] mb-4">
                <span>{article.date}</span>
                <span>•</span>
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-[#1F2937]'}`}>
                  <Clock size={13} className="text-[#FF8A3D]" />
                  {article.readingTime}
                </span>
              </div>

              <h3 className={`font-extrabold text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-tight mb-5 transition-colors ${isDark ? 'text-zinc-100 group-hover:text-[#FF8A3D]' : 'text-[#1F2937] group-hover:text-[#D45B0C]'}`}>
                {article.title}
              </h3>

              <p className={`text-sm sm:text-base leading-relaxed font-normal mb-6 ${isDark ? 'text-zinc-400' : 'text-[#4B5563]'}`}>
                {article.excerpt}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs font-extrabold text-[#6B7280] mb-6">
                <span className="px-3 py-1 rounded-full bg-[#1F2937] text-[#FFD166] font-black flex items-center gap-1 shadow-sm">
                  <span>✈️ Adopted for {article.timesPlanned || 254} itineraries!</span>
                </span>
                <span className="flex items-center gap-1.5 text-rose-600">
                  <Heart size={15} className={liked ? 'fill-current' : ''} />
                  <span>{likes} Likes</span>
                </span>
                <span className="flex items-center gap-1.5 text-[#0284C7]">
                  <Eye size={15} />
                  <span>{article.views?.toLocaleString() || '0'} Views</span>
                </span>
                <span className="flex items-center gap-1.5 text-[#D45B0C]">
                  <MessageSquare size={15} />
                  <span>{article.comments?.length || article.commentsCount || '0'} Comments</span>
                </span>
              </div>
            </div>

            {/* Author profile & CTA Arrow */}
            <div className={`pt-6 border-t flex items-center justify-between ${isDark ? 'border-zinc-700' : 'border-[#FF8A3D]/20'}`}>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3">
                  <img 
                    src={article.author.avatar} 
                    alt={article.author.name} 
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-[#FF8A3D]/30 shadow"
                  />
                  <div>
                    <h4 className={`font-bold text-sm leading-none flex items-center gap-1.5 ${isDark ? 'text-zinc-200' : 'text-[#1F2937]'}`}>
                      <span>{article.author.name}</span>
                      {article.collaborators && article.collaborators.length > 0 && (
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-black">
                          + {article.collaborators[0].name} (Collab)
                        </span>
                      )}
                    </h4>
                    <p className={`text-xs font-medium mt-1 ${isDark ? 'text-zinc-500' : 'text-[#6B7280]'}`}>{article.author.role}</p>
                  </div>
                </div>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-[#1F2937] group-hover:bg-[#FF8A3D] text-white flex items-center justify-center transition-all group-hover:scale-105 shadow-md">
                <ArrowUpRight size={22} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>

            </div>

          </div>
        </div>
      </motion.div>

      {/* Navigation Arrows */}
      {articles.length > 1 && (
        <>
          <button 
            onClick={handlePrev}
            className={`absolute left-0 md:-left-4 top-1/2 mt-6 -translate-y-1/2 w-12 h-12 rounded-full border-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-center hover:bg-[#FF8A3D] hover:text-white hover:border-[#FF8A3D] hover:scale-110 transition-all z-30 opacity-100 md:opacity-0 group-hover:opacity-100 ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-white border-[#FF8A3D]/20 text-[#1F2937]'}`}
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={handleNext}
            className={`absolute right-0 md:-right-4 top-1/2 mt-6 -translate-y-1/2 w-12 h-12 rounded-full border-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-center hover:bg-[#FF8A3D] hover:text-white hover:border-[#FF8A3D] hover:scale-110 transition-all z-30 opacity-100 md:opacity-0 group-hover:opacity-100 ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-white border-[#FF8A3D]/20 text-[#1F2937]'}`}
          >
            <ChevronRight size={24} />
          </button>

          {/* Indicator Dots */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2.5 z-20">
            {articles.map((_, idx) => (
              <button 
                key={idx} 
                onClick={(e) => { e.stopPropagation(); setActiveIndex(idx); }}
                className={`h-2.5 rounded-full transition-all border border-[#FF8A3D]/30 ${idx === activeIndex ? 'bg-[#FF8A3D] w-8' : 'bg-[#FF8A3D]/30 w-2.5 hover:bg-[#FF8A3D]/60'}`} 
              />
            ))}
          </div>
        </>
      )}

    </section>
  );
}
