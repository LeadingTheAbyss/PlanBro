'use client';

import React, { useState, useEffect } from 'react';
import { Article, Comment } from '@/data/blogData';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Eye, MessageSquare, Heart, Share2, Bookmark, MapPin, Plane, Send, ArrowLeft, MoreHorizontal, Pencil, Trash2, Check, User, Users, DollarSign, Calendar, Home, Navigation, Link as LinkIcon, ThumbsUp, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { calculateProgressiveMetrics } from '@/lib/blogMetrics';
import { isAdminEmail } from '@/lib/admin';
import { useRouter } from 'next/navigation';
import { InteractiveItineraryMap } from './InteractiveItineraryMap';
import { BlogVisualMap } from './BlogVisualMap';
import { RichArticleRenderer } from './RichArticleRenderer';
import { useAuthStore } from '@/store/authStore';
import { readUserProfile } from '@/lib/profileStorage';

interface ArticleReaderModalProps {
  article: Article | null;
  onClose: () => void;
}

export function ArticleReaderModal({ article, onClose }: ArticleReaderModalProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(article?.likes || 0);
  const [shared, setShared] = useState(false);
  const [comments, setComments] = useState<Comment[]>(article?.comments || []);
  const [newComment, setNewComment] = useState('');
  const [currentUser, setCurrentUser] = useState<string>('');
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState<boolean>(false);
  const [viewsCount, setViewsCount] = useState(0);
  const [timesPlanned, setTimesPlanned] = useState(article?.timesPlanned || 0);
  
  // Custom comment fields for admins
  const [customCommentName, setCustomCommentName] = useState('');
  const [customCommentAvatar, setCustomCommentAvatar] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const parsedProfile = readUserProfile(user?.id) || {};

        // Username from profile (used for author matching)
        const myUsername = parsedProfile.username || user?.username || '';

        // Email from authStore = server-verified source of truth
        const myEmail = user?.email || parsedProfile.email || '';

        const currentIsAdmin = isAdminEmail(myEmail);

        setCurrentUser(myUsername);
        setIsCurrentUserAdmin(currentIsAdmin);
      } catch (e) {}
    }
  }, [user]);

  const handleDelete = () => {
    if (!article) return;
    if (confirm(`Are you sure you want to delete "${article.title}"?`)) {
      if (typeof window !== 'undefined') {
        fetch(`/api/blogs/${article.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        }).catch(e => console.error(e));
      }
      onClose();
      // To trigger a re-render in the parent, we reload the page if it's the blog page
      if (window.location.pathname === '/blog') {
        window.location.reload();
      } else {
        router.push('/blog');
      }
    }
  };

  const handleShare = async () => {
    if (!article) return;
    const url = `${window.location.origin}/blog/u/${encodeURIComponent(article.author.username || 'user')}/${encodeURIComponent(article.slug)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt,
          url
        });
        return;
      } catch (e) {
        console.error('Error sharing:', e);
      }
    }
    navigator.clipboard.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 2500);
  };

  useEffect(() => {
    if (article) {
      // Apply progressive metrics
      const metrics = calculateProgressiveMetrics(article);
      
      setLikesCount(metrics.likesCount);
      setViewsCount(metrics.viewsCount);
      setTimesPlanned(article.timesPlanned || 0);
      setComments(article.comments || []);
    }
  }, [article]);

  if (!article) return null;

  const toggleLike = () => {
    if (liked) {
      setLikesCount(l => l - 1);
      setLiked(false);
    } else {
      setLikesCount(l => l + 1);
      setLiked(true);
    }
  };

  const handlePlanItinerary = () => {
    setTimesPlanned(c => c + 1);
    onClose();
    router.push(`/plan/setup?prompt=${encodeURIComponent(`Plan an Indian journey inspired by "${article.title}" in ${article.city}`)}`);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setCustomCommentAvatar(data.url);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    const finalName = isCurrentUserAdmin && customCommentName.trim() ? customCommentName.trim() : (user?.name || 'Fellow Indian Explorer');
    const finalAvatar = isCurrentUserAdmin && customCommentAvatar 
      ? customCommentAvatar 
      : isCurrentUserAdmin && customCommentName.trim() 
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(customCommentName.trim())}&background=random&color=fff&size=100`
        : (user?.picture || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80");
    
    const added: Comment = {
      id: `c-${Date.now()}`,
      author: finalName,
      avatar: finalAvatar,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      content: newComment.trim(),
      likes: 1,
    };
    
    const updatedComments = [added, ...comments];
    setComments(updatedComments);
    
    if (typeof window !== 'undefined' && article) {
      fetch(`/api/blogs/${article.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: updatedComments })
      }).catch(e => console.error(e));
    }
    
    setNewComment('');
    if (isCurrentUserAdmin) {
      setCustomCommentName('');
      setCustomCommentAvatar('');
    }
  };

  const toggleCommentLike = (id: string) => {
    setComments(comments.map(c => c.id === id ? { ...c, likes: c.likes + 1 } : c));
  };

  const activeCollabs = (article.collaborators || []).filter(c => !c.status || c.status === 'approved');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-6xl bg-[#FFF7F0] text-[#1F2937] rounded-3xl sm:rounded-[40px] overflow-hidden shadow-2xl border border-white/40 my-8 flex flex-col max-h-[92vh]"
        >
          {/* Top Sticky Bar */}
          <div className="sticky top-0 z-20 px-6 py-4 bg-white/90 backdrop-blur-md border-b border-[#FF8A3D]/15 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto py-1">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${article.categoryBadgeBg}`}>
                {article.categoryIcon} {article.category}
              </span>
              {article.city && (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-[#1F2937] text-white flex items-center gap-1">
                  <span>📍</span>
                  <span>{article.city}</span>
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 flex items-center gap-1 shrink-0">
                ⚡ Used by {timesPlanned} planners
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={toggleLike}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-extrabold transition-all ${
                  liked ? 'bg-rose-500 border-rose-600 text-white shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50 text-[#1F2937]'
                }`}
              >
                <Heart size={14} fill={liked ? "currentColor" : "none"} className={liked ? "text-white" : "text-rose-500"} />
                <span>{likesCount}</span>
              </button>

              {(isCurrentUserAdmin || (currentUser && article?.author?.username === currentUser)) && (
                <>
                  <Link
                    href={`/blog/write?edit=${article?.id || article?.slug}`}
                    className="p-2 rounded-full border bg-white border-gray-200 hover:bg-[#FF8A3D] hover:text-white hover:border-[#FF8A3D] text-[#1F2937] transition-all shadow-sm"
                    title="Edit Article"
                  >
                    <span className="text-[13px] leading-none flex">✏️</span>
                  </Link>
                  <button
                    onClick={handleDelete}
                    className="p-2 rounded-full border bg-white border-gray-200 hover:bg-rose-600 hover:text-white hover:border-rose-600 text-[#1F2937] transition-all shadow-sm"
                    title="Delete Article"
                  >
                    <span className="text-[13px] leading-none flex">🗑️</span>
                  </button>
                </>
              )}

              <button
                onClick={handleShare}
                className="p-2 rounded-full border bg-white border-gray-200 hover:bg-gray-50 text-[#1F2937] transition-all relative"
                title="Share Article"
              >
                <Share2 size={15} />
                {shared && (
                  <span className="absolute -bottom-8 right-0 bg-black text-white text-[10px] py-1 px-2 rounded-md font-bold shadow-lg whitespace-nowrap z-50">
                    Copied!
                  </span>
                )}
              </button>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-[#1F2937] text-white hover:bg-black transition-colors flex items-center justify-center ml-2 shadow-md"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Scrollable Modal Content */}
          <div className="overflow-y-auto p-6 sm:p-10 space-y-8">
            
            {/* Title & Stats */}
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4 text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-[#D45B0C] mb-4">
                <span className="bg-[#FFF3E6] px-2 py-1 rounded-md">{article.date}</span>
                <span className="flex items-center gap-1.5 text-[#6B7280] bg-gray-100 px-2 py-1 rounded-md">
                  <Clock size={13} className="text-[#FF8A3D]" />
                  {article.readingTime}
                </span>
                <span className="flex items-center gap-1.5 text-[#0284C7] bg-sky-50 px-2 py-1 rounded-md">
                  <Eye size={13} />
                  {viewsCount.toLocaleString()} views
                </span>
                <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
                  <MessageSquare size={13} />
                  {comments.length} comments
                </span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#1F2937] leading-[1.15] mb-6">
                {article.title}
              </h1>

              {/* Author & Collaborator Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href={`/u/${encodeURIComponent(article.author.username || 'nomad')}`}
                  onClick={onClose}
                  className="p-4 rounded-3xl bg-[#FFF3E6] border border-[#FF8A3D]/25 flex items-center gap-4 hover:bg-amber-50 transition-all shadow-xs group"
                >
                  <img src={article.author.avatar} alt={article.author.name} className="w-13 h-13 rounded-full object-cover ring-2 ring-white shadow-md group-hover:scale-105 transition-transform" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm sm:text-base text-[#1F2937] leading-tight">{article.author.name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#FF8A3D] text-white font-bold uppercase">Author</span>
                    </div>
                    <p className="text-xs font-bold text-[#D45B0C]">@{article.author.username || 'writer'}</p>
                    <p className="text-[11px] text-[#6B7280] font-medium mt-0.5">{article.author.role}</p>
                  </div>
                </Link>

                {activeCollabs.map((collab, idx) => (
                  <Link
                    key={idx}
                    href={`/u/${encodeURIComponent(collab.username)}`}
                    onClick={onClose}
                    className="p-4 rounded-3xl bg-[#EEF7FF] border border-blue-200 flex items-center gap-4 hover:bg-blue-50 transition-all shadow-xs group"
                  >
                    <img src={collab.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80'} alt={collab.name} className="w-13 h-13 rounded-full object-cover ring-2 ring-white shadow-md group-hover:scale-105 transition-transform" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm sm:text-base text-[#1F2937] leading-tight">{collab.name}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#0284C7] text-white font-bold uppercase">Companion</span>
                      </div>
                      <p className="text-xs font-bold text-[#0284C7]">@{collab.username}</p>
                      <p className="text-[11px] text-[#6B7280] font-medium mt-0.5">Approved Co-Author</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Structured Meta-data Grid (Optional - only displayed if specified by author) */}
            {(article.budget || article.bestSeason || article.accommodation || article.transportMode) && (
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {article.budget && (
                  <div className="px-3 py-2 sm:p-4 rounded-xl sm:rounded-3xl bg-white border border-[#FF8A3D]/25 shadow-xs flex flex-col justify-center flex-1 min-w-[130px] sm:min-w-[180px]">
                    <span className="text-[9px] sm:text-[11px] font-extrabold uppercase text-[#D45B0C] flex items-center gap-1 mb-0.5 sm:mb-1">
                      <DollarSign size={12} className="text-[#FF8A3D]" />
                      <span>Budget Tier</span>
                    </span>
                    <span className="font-black text-[10px] sm:text-sm text-[#1F2937] leading-tight">{article.budget}</span>
                  </div>
                )}
                {article.bestSeason && (
                  <div className="px-3 py-2 sm:p-4 rounded-xl sm:rounded-3xl bg-white border border-[#FF8A3D]/25 shadow-xs flex flex-col justify-center flex-1 min-w-[130px] sm:min-w-[180px]">
                    <span className="text-[9px] sm:text-[11px] font-extrabold uppercase text-[#D45B0C] flex items-center gap-1 mb-0.5 sm:mb-1">
                      <Calendar size={12} className="text-emerald-600" />
                      <span>Best Season</span>
                    </span>
                    <span className="font-black text-[10px] sm:text-sm text-[#1F2937] leading-tight">{article.bestSeason}</span>
                  </div>
                )}
                {article.accommodation && (
                  <div className="px-3 py-2 sm:p-4 rounded-xl sm:rounded-3xl bg-white border border-[#FF8A3D]/25 shadow-xs flex flex-col justify-center flex-1 min-w-[130px] sm:min-w-[180px]">
                    <span className="text-[9px] sm:text-[11px] font-extrabold uppercase text-[#D45B0C] flex items-center gap-1 mb-0.5 sm:mb-1">
                      <Home size={12} className="text-sky-600" />
                      <span>Stay Vibe</span>
                    </span>
                    <span className="font-black text-[10px] sm:text-sm text-[#1F2937] leading-tight">{article.accommodation}</span>
                  </div>
                )}
                {article.transportMode && (
                  <div className="px-3 py-2 sm:p-4 rounded-xl sm:rounded-3xl bg-white border border-[#FF8A3D]/25 shadow-xs flex flex-col justify-center flex-1 min-w-[130px] sm:min-w-[180px]">
                    <span className="text-[9px] sm:text-[11px] font-extrabold uppercase text-[#D45B0C] flex items-center gap-1 mb-0.5 sm:mb-1">
                      <Navigation size={12} className="text-purple-600" />
                      <span>Transit Mode</span>
                    </span>
                    <span className="font-black text-[10px] sm:text-sm text-[#1F2937] leading-tight">{article.transportMode}</span>
                  </div>
                )}
              </div>
            )}

            {/* Cover photo */}
            <div className="rounded-[32px] overflow-hidden shadow-xl border-4 border-white max-h-[460px] bg-neutral-100">
              <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
            </div>

            {/* Interactive Visual Journey Satellite Map (#7) */}
            {article.itineraryStops && article.itineraryStops.length > 0 && (
              <BlogVisualMap stops={article.itineraryStops} city={article.city} />
            )}


            {/* Article prose content (Rich Platforms Renderer) */}
            <div className="pt-2">
              <RichArticleRenderer content={article.content} excerpt={article.excerpt} city={article.city} />
            </div>

            {/* Video Player Display (if post contains video) */}
            {article.videoUrl && (
              <div className={`my-6 rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-black ${article.mediaType === 'short' ? 'max-w-md mx-auto aspect-[9/16]' : 'w-full aspect-video'}`}>
                {article.videoUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                  <video src={article.videoUrl} controls className="w-full h-full object-cover" />
                ) : (
                  <iframe
                    src={article.videoUrl.includes('youtube.com/watch?v=') 
                      ? `https://www.youtube.com/embed/${article.videoUrl.split('v=')[1]?.split('&')[0]}` 
                      : article.videoUrl.includes('youtu.be/') 
                      ? `https://www.youtube.com/embed/${article.videoUrl.split('youtu.be/')[1]?.split('?')[0]}`
                      : article.videoUrl.includes('youtube.com/shorts/')
                      ? `https://www.youtube.com/embed/${article.videoUrl.split('shorts/')[1]?.split('?')[0]}`
                      : article.videoUrl}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
            )}

            {/* Minimalist Bottom Action */}
            <div className="py-6 flex items-center justify-center">
              <button
                onClick={handlePlanItinerary}
                className="px-8 py-3.5 rounded-2xl bg-[#1F2937] hover:bg-[#FF8A3D] text-white font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <Plane size={16} />
                <span>Plan this itinerary</span>
              </button>
            </div>

            {/* Discussion & Comments */}
            <div className="pt-8 border-t-2 border-[#FF8A3D]/20">
              <h3 className="text-2xl font-black text-[#1F2937] mb-6 flex items-center gap-2">
                <MessageSquare className="text-[#FF8A3D]" size={24} />
                <span>Discussion ({comments.length})</span>
              </h3>
              
              <div className="mb-8 p-5 rounded-2xl bg-white border border-[#FF8A3D]/20 shadow-xs flex flex-col gap-3">
                {isCurrentUserAdmin && (
                  <div className="flex flex-col sm:flex-row gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <span className="text-xs font-bold text-indigo-800 uppercase tracking-widest w-full sm:w-auto shrink-0 flex items-center">Admin Controls</span>
                    <input
                      type="text"
                      value={customCommentName}
                      onChange={(e) => setCustomCommentName(e.target.value)}
                      placeholder="Custom Name (optional)"
                      className="px-3 py-2 rounded-lg bg-white border border-indigo-200 text-sm flex-1"
                    />
                  <div className="flex-1 flex gap-2 w-full">
                    <input
                      type="text"
                      value={customCommentAvatar}
                      onChange={(e) => setCustomCommentAvatar(e.target.value)}
                      placeholder="Avatar URL or Upload"
                      className="px-3 py-2 rounded-lg bg-white border border-indigo-200 text-sm flex-1"
                    />
                    <div className="relative overflow-hidden inline-block bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-2 text-xs font-bold shrink-0 cursor-pointer flex items-center justify-center">
                      Upload
                      <input type="file" accept="image/*" className="absolute left-0 top-0 opacity-0 cursor-pointer h-full w-full" onChange={handleAvatarUpload} />
                    </div>
                  </div>
                </div>
                )}
                <form onSubmit={handleAddComment} className="flex items-center gap-3 w-full">
                  <img
                    src={isCurrentUserAdmin && customCommentAvatar 
                      ? customCommentAvatar 
                      : isCurrentUserAdmin && customCommentName.trim()
                        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(customCommentName.trim())}&background=random&color=fff&size=100`
                        : (user?.picture || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80")
                    }
                    alt="Your avatar"
                    className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-[#FF8A3D]/30"
                  />
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Ask a question or leave a tip for fellow travelers..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#FFF7F0] border border-[#FF8A3D]/25 focus:outline-none text-sm font-bold text-[#1F2937]"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="px-6 py-2.5 rounded-xl bg-[#1F2937] hover:bg-[#FF8A3D] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shrink-0 flex items-center gap-1.5"
                  >
                    <span>Post Note</span>
                    <Send size={13} />
                  </button>
                </form>
              </div>

              <div className="space-y-3.5">
                {comments.map(comment => (
                  <div key={comment.id} className="p-5 rounded-2xl bg-white/80 border border-[#FF8A3D]/10 flex items-start gap-3.5">
                    <img src={comment.avatar} alt={comment.author} className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FF8A3D]/20 shrink-0 mt-0.5" />
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-sm text-[#1F2937]">{comment.author}</span>
                        <span className="text-[11px] font-bold text-[#6B7280]">{comment.date}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#374151] font-medium leading-relaxed mb-3">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
