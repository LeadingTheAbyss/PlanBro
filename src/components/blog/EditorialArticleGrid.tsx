'use client';

import React, { useState } from 'react';
import { Article } from '@/data/blogData';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Bookmark, Heart, ArrowUpRight, Check, Eye, MessageSquare, Flame } from 'lucide-react';
import { ImageCarousel } from '@/components/blog/ImageCarousel';
import Link from 'next/link';
import { useBlogTheme } from '@/context/BlogThemeContext';

interface EditorialArticleGridProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
  selectedCategory: string;
  onDeleteArticle?: (article: Article) => void;
  isAdmin?: boolean;
  title?: string;
}

type SortMode = 'default' | 'newest' | 'likes' | 'controversial' | 'views';

export function EditorialArticleGrid({ articles, onSelectArticle, selectedCategory, onDeleteArticle, isAdmin, title = "Trending Blogs" }: EditorialArticleGridProps) {
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>('default');
  const [visibleCount, setVisibleCount] = useState(6);
  const blogTheme = useBlogTheme();
  const isDark = blogTheme?.isDark || false;

  const toggleLike = (e: React.MouseEvent, id: string, initialLikes: number = 0) => {
    e.stopPropagation();
    const currentCount = likes[id] ?? initialLikes;
    setLikes(prev => ({ ...prev, [id]: currentCount + 1 }));
  };

  // Sort articles according to the active filter
  const sortedArticles = [...articles].sort((a, b) => {
    if (sortBy === 'newest') {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Descending
    }
    if (sortBy === 'likes') {
      const aLikes = likes[a.id] ?? a.likes ?? 0;
      const bLikes = likes[b.id] ?? b.likes ?? 0;
      return bLikes - aLikes;
    }
    if (sortBy === 'controversial') {
      return (b.controversialScore ?? 0) - (a.controversialScore ?? 0);
    }
    if (sortBy === 'views') {
      return (b.views ?? 0) - (a.views ?? 0);
    }
    return 0; // Default order
  });

  return (
    <section className="py-6 px-4 md:px-8 max-w-7xl mx-auto relative">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[9999] bg-[#1F2937] text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-3 font-bold text-xs sm:text-sm"
          >
            <div className="w-6 h-6 rounded-full bg-[#7ED957] text-[#1F2937] flex items-center justify-center font-extrabold">
              <Check size={14} />
            </div>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {title && <h2 className={`text-3xl font-black tracking-tight ${isDark ? 'text-zinc-100' : 'text-[#1F2937]'}`}>{title}</h2>}
      </div>

      {/* Sorting Navigation Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 p-4 rounded-2xl shadow-xs transition-colors ${isDark ? 'bg-zinc-900/80 border border-zinc-800' : 'bg-[#FFF3E6]/60 border border-[#FF8A3D]/20'}`}>
        <div className={`text-sm font-extrabold flex items-center gap-2 ${isDark ? 'text-zinc-300' : 'text-[#1F2937]'}`}>
          <span>Explore stories by:</span>
          {sortBy === 'controversial' && <span className="text-[11px] px-2 py-0.5 rounded bg-rose-200 text-rose-800 font-bold animate-pulse">Hot Debates</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSortBy('default')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all flex items-center gap-1 ${
              sortBy === 'default'
                ? (isDark ? 'bg-zinc-100 text-zinc-900 shadow-md scale-105' : 'bg-[#1F2937] text-white shadow-md scale-105')
                : (isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700' : 'bg-white text-[#4B5563] hover:bg-[#FFF3E6] border border-[#FF8A3D]/20')
            }`}
          >
            <span>🔥 Trending</span>
          </button>
          <button
            onClick={() => setSortBy('newest')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all flex items-center gap-1 ${
              sortBy === 'newest'
                ? 'bg-purple-600 text-white shadow-md scale-105'
                : 'bg-white text-[#4B5563] hover:bg-purple-50 border border-purple-200'
            }`}
          >
            <span>✨ Newest</span>
          </button>
          <button
            onClick={() => setSortBy('likes')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              sortBy === 'likes'
                ? 'bg-rose-500 text-white shadow-md scale-105'
                : 'bg-white text-[#4B5563] hover:bg-rose-50 border border-rose-200'
            }`}
          >
            <span>❤️ Most Likes</span>
          </button>
          <button
            onClick={() => setSortBy('controversial')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              sortBy === 'controversial'
                ? 'bg-amber-600 text-white shadow-md scale-105'
                : 'bg-white text-[#4B5563] hover:bg-amber-50 border border-amber-200'
            }`}
          >
            <span>🌶️ Controversial</span>
          </button>
          <button
            onClick={() => setSortBy('views')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              sortBy === 'views'
                ? 'bg-[#0284C7] text-white shadow-md scale-105'
                : 'bg-white text-[#4B5563] hover:bg-sky-50 border border-sky-200'
            }`}
          >
            <span>👁️ Most Views</span>
          </button>
        </div>
      </div>

      {sortedArticles.length === 0 ? (
        <div className={`text-center py-20 rounded-[32px] shadow-sm my-8 p-6 ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-[#FF8A3D]/20'}`}>
          <p className="text-4xl mb-3">🧭</p>
          <h3 className={`text-xl font-bold ${isDark ? 'text-zinc-200' : 'text-[#1F2937]'}`}>No stories or videos found yet.</h3>
          <p className={`text-sm mt-1 mb-6 ${isDark ? 'text-zinc-500' : 'text-[#6B7280]'}`}>Be the first explorer to share a travel story or video!</p>
          <a
            href="/blog/write"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#1F2937] hover:bg-[#FF8A3D] text-white font-black text-xs uppercase tracking-wider shadow-md transition-all"
          >
            <span>+ Post Story or Video</span>
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 pt-2">
          {sortedArticles.map((article, idx) => {
            // Asymmetrical editorial sizing: every 1st and 4th item gets wider 7-col treatment on desktop
            const isWide = idx % 3 === 0;
            const spanClass = isWide ? 'md:col-span-7' : 'md:col-span-5';
            const heightClass = isWide ? 'h-[280px] sm:h-[340px]' : 'h-[240px] sm:h-[280px]';

            const likeCount = likes[article.id] ?? article.likes ?? 0;
            const commentCount = article.comments?.length ?? article.commentsCount ?? 0;
            const viewCount = article.views?.toLocaleString() ?? '0';

            return (
              <motion.div
                key={article.id || `article-${idx}`}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, delay: Math.min(idx * 0.08, 0.4) }}
                whileHover={{ y: -7 }}
                onClick={() => onSelectArticle(article)}
                className={`${spanClass} group cursor-pointer flex flex-col rounded-[32px] overflow-hidden border-2 shadow-[0_15px_40px_-15px_rgba(31,41,55,0.12)] transition-all duration-300 relative ${isDark ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:shadow-zinc-900/50' : 'bg-white border-[#FF8A3D]/15 hover:border-[#FF8A3D]/70 hover:shadow-[0_25px_50px_-12px_rgba(255,138,61,0.25)]'}`}
              >
                {/* Gradient Accent Border on top */}
                <div className="h-1.5 w-full bg-gradient-to-r from-[#FF8A3D] via-[#FFB347] to-[#FFD166] opacity-80 group-hover:opacity-100 transition-opacity"></div>

                {/* Card Image Cover */}
                <div className={`relative ${heightClass} overflow-hidden bg-black`}>
                  {article.videoUrl && (article.mediaType === 'article' || article.videoUrl.match(/\.(mp4|webm|ogg)$/i)) ? (
                    <video
                      src={article.videoUrl}
                      autoPlay loop muted playsInline
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
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
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                      loading="lazy"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity pointer-events-none"></div>
                  
                  {/* Category Badge, Video Badge & Bookmark / Admin Delete */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-3 py-1 rounded-full font-extrabold text-[11px] uppercase tracking-wider backdrop-blur-md bg-white/95 text-[#D45B0C] shadow-sm flex items-center gap-1">
                        <span>{article.categoryIcon}</span>
                        <span>{article.category}</span>
                      </span>
                      {article.mediaType && article.mediaType !== 'article' && (
                        <span className="px-3 py-1 rounded-full font-black text-[11px] backdrop-blur-md bg-purple-600 text-white shadow-sm flex items-center gap-1">
                          <span>{article.mediaType === 'short' ? '📱 Short' : '🎥 Video'}</span>
                        </span>
                      )}
                      {article.city && (
                        <span className="px-3 py-1 rounded-full font-black text-[11px] backdrop-blur-md bg-[#1F2937]/90 text-white shadow-sm flex items-center gap-1">
                          <span>📍</span>
                          <span>{article.city}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isAdmin && (
                        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md rounded-full px-1 py-1 shadow-sm">
                          <Link
                            href={`/blog/write?edit=${article.id || article.slug}`}
                            onClick={(e) => e.stopPropagation()}
                            className="w-8 h-8 rounded-full bg-[#1F2937] hover:bg-[#D45B0C] text-white flex items-center justify-center shadow-md transition-transform hover:scale-110"
                            title="Edit Post (Admin)"
                          >
                            <span className="text-[13px]">✏️</span>
                          </Link>
                          {onDeleteArticle && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete post "${article.title}"?`)) {
                                  onDeleteArticle(article);
                                }
                              }}
                              className="w-8 h-8 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-transform hover:scale-110"
                              title="Delete Post (Admin)"
                            >
                              <span className="text-[13px]">🗑️</span>
                            </button>
                          )}
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Date & Reading time badge floating at bottom right of image */}
                  <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-extrabold flex items-center gap-1.5">
                    <Clock size={12} className="text-[#FFB347]" />
                    <span>{article.readingTime || (article as any).readTime || '5 Min Read'}</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className={`p-6 sm:p-7 flex flex-col flex-1 justify-between ${isDark ? 'bg-gradient-to-b from-zinc-900 to-zinc-950' : 'bg-gradient-to-b from-white to-[#FFF7F0]/30'}`}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold uppercase tracking-widest text-[#D45B0C]">
                        {article.date}
                      </span>
                      {(article.controversialScore ?? 0) > 40 && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                          <span>🌶️ Hot Take</span>
                        </span>
                      )}
                    </div>

                    <h3 className={`font-extrabold text-xl sm:text-2xl tracking-tight leading-snug mb-3 transition-colors line-clamp-2 ${isDark ? 'text-zinc-100 group-hover:text-[#FF8A3D]' : 'text-[#1F2937] group-hover:text-[#D45B0C]'}`}>
                      {article.title}
                    </h3>

                    <p className={`text-xs sm:text-sm leading-relaxed font-normal mb-4 line-clamp-3 ${isDark ? 'text-zinc-400' : 'text-[#4B5563]'}`}>
                      {article.excerpt}
                    </p>

                    {/* Structured Meta-Data mini tags */}
                    {(article.budget || article.accommodation || article.bestSeason || article.transportMode) && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-4">
                        {article.budget && (
                          <span className="px-2.5 py-1 rounded-lg bg-[#FF8A3D]/10 border border-[#FF8A3D]/25 text-[#D45B0C] text-[10px] font-black tracking-wide">
                            💰 {article.budget}
                          </span>
                        )}
                        {article.accommodation && (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-black tracking-wide">
                            🏡 {article.accommodation}
                          </span>
                        )}
                        {article.bestSeason && (
                          <span className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-[10px] font-black tracking-wide">
                            📅 {article.bestSeason}
                          </span>
                        )}
                        {article.transportMode && (
                          <span className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-[10px] font-black tracking-wide">
                            🚀 {article.transportMode}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Author Footer & Engagement Stats */}
                  <div className={`pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isDark ? 'border-zinc-800' : 'border-[#FF8A3D]/15'}`}>
                    
                    <div className="flex items-center gap-2.5">
                      <img
                        src={article.author.avatar}
                        alt={article.author.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FF8A3D]/20 shadow-xs"
                      />
                      <div className="text-left">
                        <h4 className={`font-extrabold text-xs leading-none flex items-center gap-1 ${isDark ? 'text-zinc-200' : 'text-[#1F2937]'}`}>
                          <span>{article.author.name}</span>
                          {article.collaborators && article.collaborators.length > 0 && (
                            <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-black">+1 Collab</span>
                          )}
                        </h4>
                        <p className={`text-[11px] font-semibold mt-1 ${isDark ? 'text-zinc-500' : 'text-[#6B7280]'}`}>{article.author.role}</p>
                      </div>
                    </div>

                    {/* Stats: Likes, Views, Comments, Times Planned */}
                    <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
                      <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[#1F2937] to-black text-[#FFD166] font-extrabold text-[11px] flex items-center gap-1 shadow-sm" title="Travelers who used this blog to plan their itinerary">
                        <span>✈️ Planned {article.timesPlanned || 0}x</span>
                      </span>
                      <button
                        onClick={(e) => toggleLike(e, article.id, article.likes)}
                        className="px-2.5 py-1 rounded-full bg-[#FFF1F2] hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1 transition-colors border border-rose-200/60"
                        title="Like story"
                      >
                        <Heart size={13} className="text-[#E11D48]" fill="currentColor" />
                        <span>{likeCount}</span>
                      </button>
                      <span className="px-2.5 py-1 rounded-full bg-[#EEF7FF] text-[#0284C7] font-bold text-xs flex items-center gap-1 border border-sky-200/60" title="Total Views">
                        <Eye size={13} />
                        <span>{viewCount}</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-[#FFF3E6] text-[#D45B0C] font-bold text-xs flex items-center gap-1 border border-amber-200/60" title="Comments">
                        <MessageSquare size={13} />
                        <span>{commentCount}</span>
                      </span>
                    </div>

                  </div>
                </div>

              </motion.div>
            );
          }).slice(0, visibleCount)}
        </div>
      )}

      {/* Show More Button */}
      {sortedArticles.length > visibleCount && (
        <div className="flex justify-center mt-12 mb-8">
          <button
            onClick={() => setVisibleCount(prev => prev + 6)}
            className={`px-8 py-3.5 rounded-full border-2 font-black uppercase tracking-widest text-xs transition-all shadow-md hover:shadow-lg ${isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-white' : 'bg-white border-[#1F2937] text-[#1F2937] hover:bg-[#1F2937] hover:text-white'}`}
          >
            Show More
          </button>
        </div>
      )}

    </section>
  );
}
