'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ARTICLES, FEATURED_ARTICLE, Article, Comment } from '@/data/blogData';
import { BlogNavbar } from '@/components/blog/BlogNavbar';
import { BlogFooter } from '@/components/blog/BlogFooter';
import { InteractiveItineraryMap } from '@/components/blog/InteractiveItineraryMap';
import { BlogVisualMap } from '@/components/blog/BlogVisualMap';
import { RichArticleRenderer } from '@/components/blog/RichArticleRenderer';
import { ImageCarousel } from '@/components/blog/ImageCarousel';
import { calculateProgressiveMetrics } from '@/lib/blogMetrics';
import { isAdminEmail } from '@/lib/admin';
import { useAuthStore } from '@/store/authStore';
import { readUserProfile } from '@/lib/profileStorage';
import { Clock, Eye, MessageSquare, Heart, Share2, Bookmark, MapPin, Plane, Send, ThumbsUp, ArrowLeft, User, Users, DollarSign, Calendar, Home, Navigation, Zap, Pencil, Trash2, Check, Link as LinkIcon, Upload } from 'lucide-react';
import Link from 'next/link';

export default function DedicatedArticlePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();

  const username = decodeURIComponent((params?.username as string) || '');
  const slugArray = params?.slug as string[] || [];
  const articleSlug = decodeURIComponent(slugArray[0] || '');
  const blogNumber = slugArray[1] ? decodeURIComponent(slugArray[1]) : undefined;

  const [article, setArticle] = useState<Article | null>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);
  const [shared, setShared] = useState(false);
  const [timesPlanned, setTimesPlanned] = useState(150);
  const [isFeatured, setIsFeatured] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState(false);

  // Custom comment fields for admins
  const [customCommentName, setCustomCommentName] = useState('');
  const [customCommentAvatar, setCustomCommentAvatar] = useState('');

  useEffect(() => {
    const checkAdminOwnerStatus = (displayArticle: Article | null) => {
      if (typeof window !== 'undefined') {
        try {
          const parsedProfile = readUserProfile(user?.id) || {};

          // Get username from profile OR authStore
          const myUsername = parsedProfile.username || user?.username || '';

          // Use email from authStore (server-verified) as source of truth
          const myEmail = user?.email || parsedProfile.email || '';

          const adminCheck = isAdminEmail(myEmail);
          setIsAdmin(adminCheck);

          const isOwnAuthor = Boolean(myUsername && (myUsername.toLowerCase() === username.toLowerCase()));
          const isCollab = Boolean(displayArticle?.collaborators?.some(c => c.username.toLowerCase() === myUsername?.toLowerCase()));
          
          setIsOwner(Boolean(isOwnAuthor || isCollab || adminCheck));
        } catch (e) {}
      }
    };

    const setupArticleState = (displayArticle: Article) => {
      setArticle(displayArticle);
      const metrics = calculateProgressiveMetrics(displayArticle);
      setLikesCount(metrics.likesCount);
      setViewsCount(metrics.viewsCount);
      setTimesPlanned(displayArticle.timesPlanned || 0);
      setIsFeatured(displayArticle.featured || false);
      setComments(displayArticle.comments || []);
      checkAdminOwnerStatus(displayArticle);
    };

    // Check in standard articles
    const allArticles = [FEATURED_ARTICLE, ...ARTICLES];
    let found = allArticles.find(a => 
      (a.slug && a.slug === articleSlug) || 
      a.id === articleSlug ||
      a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === articleSlug
    );

    if (found) {
      setupArticleState(found);
    } else if (typeof window !== 'undefined') {
      // If not found in default data, check API for custom written blogs or collaborated blogs
      fetch('/api/blogs')
        .then(res => res.json())
        .then(data => {
          let customBlogs: Article[] = Array.isArray(data) ? data : [];
          const customFound = customBlogs.find(a => 
            a.slug === articleSlug || 
            (a.author?.username === username && a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === articleSlug) ||
            a.id === articleSlug
          );
          
          if (customFound) {
            setupArticleState(customFound);
          } else {
            setupArticleState(FEATURED_ARTICLE);
          }
        })
        .catch(e => {
          console.error('Failed to fetch user custom blogs', e);
          setupArticleState(FEATURED_ARTICLE);
        });
    }
  }, [articleSlug, username, user]);

  const handleDeleteArticle = () => {
    if (!article) return;
    if (confirm(`Are you sure you want to delete "${article.title}"?`)) {
      if (typeof window !== 'undefined') {
        fetch(`/api/blogs/${article.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        }).catch(e => console.error(e));
      }
      setDeleteNotice(true);
      setTimeout(() => {
        router.push('/blog');
      }, 1000);
    }
  };

  const hasTrackedView = useRef(false);

  useEffect(() => {
    if (article?.id && !hasTrackedView.current) {
      hasTrackedView.current = true;
      fetch(`/api/blogs/${article.id}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'view' })
      }).catch(e => console.error('Failed to increment views', e));
    }
  }, [article?.id]);

  if (!article) {
    return (
      <div className="min-h-screen bg-[#FFF7F0] flex items-center justify-center font-bold text-xl text-[#1F2937]">
        Loading travel dispatch...
      </div>
    );
  }

  const toggleLike = () => {
    if (liked) {
      setLikesCount(l => l - 1);
      setLiked(false);
      if (article?.id) {
        fetch(`/api/blogs/${article.id}/metrics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'unlike' })
        }).catch(e => console.error('Failed to decrement likes', e));
      }
    } else {
      setLikesCount(l => l + 1);
      setLiked(true);
      if (article?.id) {
        fetch(`/api/blogs/${article.id}/metrics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'like' })
        }).catch(e => console.error('Failed to increment likes', e));
      }
    }
  };

  const handleShare = async () => {
    if (typeof window !== 'undefined') {
      if (navigator.share) {
        try {
          await navigator.share({
            title: article?.title || 'PlanBro Travel Story',
            text: article?.excerpt || 'Check out this travel story on PlanBro!',
            url: window.location.href,
          });
          return;
        } catch (e) {
          console.error('Error sharing:', e);
        }
      }
      navigator.clipboard.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    }
  };

  const handlePlanItinerary = () => {
    // Increment timesPlanned count live
    setTimesPlanned(c => c + 1);
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
    
    const finalName = isAdmin && customCommentName.trim() ? customCommentName.trim() : (user?.name || 'Fellow Indian Explorer');
    const finalAvatar = isAdmin && customCommentAvatar 
      ? customCommentAvatar 
      : isAdmin && customCommentName.trim() 
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(customCommentName.trim())}&background=random&color=fff&size=100`
        : (user?.picture || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80");
    
    const added: Comment = {
      id: `c-${Date.now()}`,
      author: finalName,
      avatar: finalAvatar,
      date: 'Just now',
      content: newComment.trim(),
      likes: 1,
    };
    
    // Save to local storage so it persists if the user wrote this blog
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
    if (isAdmin) {
      setCustomCommentName('');
      setCustomCommentAvatar('');
    }
  };

  const toggleCommentLike = (id: string) => {
    setComments(comments.map(c => c.id === id ? { ...c, likes: c.likes + 1 } : c));
  };

  const activeCollabs = (article.collaborators || []).filter(c => !c.status || c.status === 'approved');

  return (
    <div className="min-h-screen bg-[#FFF7F0] text-[#1F2937] font-sans selection:bg-[#FF8A3D]/20 flex flex-col justify-between">
      <BlogNavbar />

      {/* Main Reader Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-10 w-full">
        
        {/* Back navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <Link 
            href="/blog" 
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#6B7280] hover:text-[#FF8A3D] transition-colors px-3.5 py-2 rounded-full bg-white border border-[#FF8A3D]/20 shadow-xs"
          >
            <ArrowLeft size={14} />
            <span>Back to Journal</span>
          </Link>
        </div>
        {/* Title & Engagement Metadata */}
        <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4 text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-[#D45B0C] mb-4">
            <span className="bg-[#FFF3E6] px-2 py-1 rounded-md">{article.date}</span>
            <span className="flex items-center gap-1.5 text-[#6B7280] bg-gray-100 px-2 py-1 rounded-md">
              <Clock size={13} className="text-[#FF8A3D]" />
              {article.readingTime}
            </span>
            <span className="flex items-center gap-1.5 text-[#0284C7] bg-sky-50 px-2 py-1 rounded-md">
              <Eye size={13} />
              {isAdmin ? (
                <input 
                  type="number" 
                  value={viewsCount} 
                  onChange={(e) => setViewsCount(parseInt(e.target.value) || 0)} 
                  onBlur={() => {
                    if (article) fetch(`/api/blogs/${article.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ views: viewsCount }) });
                  }}
                  className="w-14 px-1 py-0.5 text-[#1F2937] rounded text-center font-black bg-white border border-sky-200"
                />
              ) : (
                <>{viewsCount.toLocaleString()}</>
              )} views
            </span>
            <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
              <MessageSquare size={13} />
              {comments.length} comments
            </span>
            <span className="text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md font-black flex items-center gap-1">
              ✈️ Planned 
              {isAdmin ? (
                <input 
                  type="number" 
                  value={timesPlanned} 
                  onChange={(e) => setTimesPlanned(parseInt(e.target.value) || 0)} 
                  onBlur={() => {
                    if (article) fetch(`/api/blogs/${article.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timesPlanned }) });
                  }}
                  className="w-12 px-1 py-0.5 text-[#1F2937] rounded text-center font-black bg-white border border-emerald-200"
                />
              ) : (
                ` ${timesPlanned}`
              )}x
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-[#FF8A3D]/15 text-[#D45B0C] border border-[#FF8A3D]/30 flex items-center gap-1.5">
              <span>{article.categoryIcon}</span>
              <span>{article.category}</span>
            </span>

            {article.city && (
              <span className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-black bg-[#1F2937] text-white flex items-center gap-1.5 shadow">
                <span>📍</span>
                <span>{article.city}</span>
              </span>
            )}

            <button
              onClick={toggleLike}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border font-extrabold text-[10px] sm:text-xs transition-all ${
                liked ? 'bg-rose-500 border-rose-600 text-white shadow-md' : 'bg-white border-[#FF8A3D]/20 hover:bg-rose-50 text-rose-600'
              }`}
              title="Like Article"
            >
              <Heart size={13} fill={liked ? "currentColor" : "none"} className={liked ? "text-white" : "text-rose-500"} />
              {isAdmin ? (
                <input 
                  type="number" 
                  value={likesCount} 
                  onChange={(e) => setLikesCount(parseInt(e.target.value) || 0)} 
                  onBlur={() => {
                    if (article) fetch(`/api/blogs/${article.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ likes: likesCount }) });
                  }}
                  className={`w-12 px-1 py-0.5 text-center font-black ml-1 rounded ${liked ? 'bg-white/20 text-white' : 'bg-gray-100 text-[#1F2937]'}`}
                />
              ) : (
                <span>{likesCount}</span>
              )}
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 hover:bg-black text-white font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all shadow-md relative"
              title="Share Link to Article"
            >
              <Share2 size={12} className="text-[#FFD166]" />
              <span>Share</span>
              {shared && (
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] py-1 px-3 rounded-lg font-black whitespace-nowrap shadow-xl border border-white/20 z-10">
                  Copied!
                </span>
              )}
            </button>

            {isOwner && (
              <>
                <button
                  onClick={() => router.push(`/blog/write?edit=${encodeURIComponent(article.id || article.slug)}`)}
                  className="flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all"
                  title="Edit Blog Post"
                >
                  <Pencil size={12} />
                  <span>Edit</span>
                </button>

                <button
                  onClick={handleDeleteArticle}
                  className="flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all"
                  title="Delete Article"
                >
                  <Trash2 size={12} />
                  <span>Delete</span>
                </button>

                <button
                  onClick={() => {
                    const newFeatured = !isFeatured;
                    setIsFeatured(newFeatured);
                    if (article?.id) {
                      fetch(`/api/blogs/${article.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ featured: newFeatured })
                      }).catch(e => console.error(e));
                    }
                  }}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full border font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-colors ${
                    isFeatured ? 'border-purple-300 bg-purple-100 text-purple-700 hover:bg-purple-200' : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-600'
                  }`}
                  title={isFeatured ? "Remove from Trending" : "Mark as Trending"}
                >
                  <span>{isFeatured ? '★ Trending' : '☆ Trend'}</span>
                </button>
              </>
            )}

            {isAdmin && (
              <input
                type="date"
                title="Change publish date"
                className="px-2 py-1 rounded-full border border-gray-200 text-[10px] sm:text-xs font-bold text-gray-700 bg-white focus:outline-none focus:border-[#FF8A3D] cursor-pointer"
                onChange={(e) => {
                  if (!e.target.value) return;
                  const newDateStr = new Date(e.target.value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  fetch(`/api/blogs/${article.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date: newDateStr })
                  }).then(() => {
                    setArticle({ ...article, date: newDateStr });
                  });
                }}
              />
            )}
          </div>
        </div>
        
        <div className="w-full md:w-auto shrink-0 flex flex-col gap-3">
             <Link
                href={`/u/${encodeURIComponent(article.author.username || 'traveler')}`}
                className="p-3 pr-5 rounded-3xl bg-[#FFF3E6] border border-[#FF8A3D]/30 flex items-center gap-3 hover:bg-amber-50 hover:border-[#FF8A3D]/60 transition-all shadow-sm group"
             >
                <img 
                  src={article.author.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
                  alt={article.author.name} 
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm group-hover:scale-105 transition-transform" 
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-black text-sm text-[#1F2937] leading-none">{article.author.name}</h4>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#FF8A3D] text-white font-bold uppercase">Author</span>
                  </div>
                  <p className="text-[10px] font-bold text-[#D45B0C] mt-0.5">@{article.author.username || username || 'writer'}</p>
                </div>
             </Link>

             {/* Display Collaborator if available */}
             {activeCollabs.map((collab, idx) => (
                <Link
                  key={idx}
                  href={`/u/${encodeURIComponent(collab.username)}`}
                  className="p-3 pr-5 rounded-3xl bg-[#EEF7FF] border border-blue-200 flex items-center gap-3 hover:bg-blue-50 transition-all shadow-sm group"
                >
                  <img 
                    src={collab.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80'} 
                    alt={collab.name} 
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm group-hover:scale-105 transition-transform" 
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-black text-sm text-[#1F2937] leading-none">{collab.name}</h4>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#0284C7] text-white font-bold uppercase">Companion</span>
                    </div>
                    <p className="text-[10px] font-bold text-[#0284C7] mt-0.5">@{collab.username}</p>
                  </div>
                </Link>
             ))}
          </div>
        </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#1F2937] tracking-tight leading-[1.1] mb-8">
            {article.title}
          </h1>



        {/* Main Cover Image or Video Banner */}
        {(article.imageUrl || article.imageUrls?.length || (article.videoUrl && article.mediaType === 'article')) ? (
          <div className="rounded-[36px] overflow-hidden shadow-2xl border-4 border-white max-h-[520px] mb-10 bg-neutral-100 flex items-center justify-center bg-black">
            {article.videoUrl && article.mediaType === 'article' ? (
              <video src={article.videoUrl} autoPlay loop muted playsInline controls className="w-full h-full object-cover max-h-[520px]" />
            ) : article.imageUrls && article.imageUrls.length > 1 ? (
              <ImageCarousel 
                urls={article.imageUrls} 
                alt={article.title} 
                className="w-full h-full max-h-[520px]"
              />
            ) : (
              <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover max-h-[520px]" />
            )}
          </div>
        ) : null}

        {/* INTERACTIVE SATELLITE VISUAL JOURNEY MAP (#7) */}
        {article.itineraryStops && article.itineraryStops.length > 0 && (
          <BlogVisualMap 
            stops={article.itineraryStops} 
            city={article.city} 
          />
        )}



        {/* Typography & Rich Platforms Content */}
        <div className="pt-2">
          <RichArticleRenderer content={article.content} excerpt={article.excerpt} city={article.city} />
        </div>

        {/* Video Player Display (if post contains video and it's not a cover video) */}
        {article.videoUrl && article.mediaType !== 'article' && (
          <div className={`my-8 rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-black ${article.mediaType === 'short' ? 'max-w-md mx-auto aspect-[9/16]' : 'w-full aspect-video'}`}>
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

        {/* STRUCTURED META-DATA TOKEN SPEC GRID (Moved to bottom) */}
        {(article.budget || article.bestSeason || article.accommodation || article.transportMode) && (
          <div className="flex flex-wrap gap-2 sm:gap-3 mt-12 mb-6">
            {article.budget && (
              <div className="px-3 py-2 sm:p-4 rounded-xl sm:rounded-3xl bg-white/95 border border-[#FF8A3D]/25 shadow-sm flex flex-col justify-center flex-1 min-w-[130px] sm:min-w-[180px]">
                <span className="text-[9px] sm:text-[11px] font-extrabold uppercase text-[#D45B0C] flex items-center gap-1 mb-0.5 sm:mb-1">
                  <DollarSign size={12} className="text-[#FF8A3D]" />
                  <span>Budget Tier</span>
                </span>
                <span className="font-black text-[10px] sm:text-sm text-[#1F2937] leading-tight">
                  {article.budget}
                </span>
              </div>
            )}

            {article.bestSeason && (
              <div className="px-3 py-2 sm:p-4 rounded-xl sm:rounded-3xl bg-white/95 border border-[#FF8A3D]/25 shadow-sm flex flex-col justify-center flex-1 min-w-[130px] sm:min-w-[180px]">
                <span className="text-[9px] sm:text-[11px] font-extrabold uppercase text-[#D45B0C] flex items-center gap-1 mb-0.5 sm:mb-1">
                  <Calendar size={12} className="text-emerald-600" />
                  <span>Best Season</span>
                </span>
                <span className="font-black text-[10px] sm:text-sm text-[#1F2937] leading-tight">
                  {article.bestSeason}
                </span>
              </div>
            )}

            {article.accommodation && (
              <div className="px-3 py-2 sm:p-4 rounded-xl sm:rounded-3xl bg-white/95 border border-[#FF8A3D]/25 shadow-sm flex flex-col justify-center flex-1 min-w-[130px] sm:min-w-[180px]">
                <span className="text-[9px] sm:text-[11px] font-extrabold uppercase text-[#D45B0C] flex items-center gap-1 mb-0.5 sm:mb-1">
                  <Home size={12} className="text-sky-600" />
                  <span>Stay Vibe</span>
                </span>
                <span className="font-black text-[10px] sm:text-sm text-[#1F2937] leading-tight">
                  {article.accommodation}
                </span>
              </div>
            )}

            {article.transportMode && (
              <div className="px-3 py-2 sm:p-4 rounded-xl sm:rounded-3xl bg-white/95 border border-[#FF8A3D]/25 shadow-sm flex flex-col justify-center flex-1 min-w-[130px] sm:min-w-[180px]">
                <span className="text-[9px] sm:text-[11px] font-extrabold uppercase text-[#D45B0C] flex items-center gap-1 mb-0.5 sm:mb-1">
                  <Navigation size={12} className="text-purple-600" />
                  <span>Transit Mode</span>
                </span>
                <span className="font-black text-[10px] sm:text-sm text-[#1F2937] leading-tight">
                  {article.transportMode}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Minimalist Bottom Call to Action */}
        <div className="mt-10 py-6 flex items-center justify-center">
          <button
            onClick={handlePlanItinerary}
            className="px-8 py-4 rounded-2xl bg-[#1F2937] hover:bg-[#FF8A3D] text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plane size={18} />
            <span>Plan this itinerary</span>
          </button>
        </div>

        {/* Interactive Discussion & Comments Section */}
        <div className="pt-12 border-t-2 border-[#FF8A3D]/20 mt-12">
          <div className="flex flex-wrap items-center justify-between mb-8 gap-2">
            <h3 className="text-2xl sm:text-3xl font-black text-[#1F2937] flex items-center gap-2.5">
              <MessageSquare className="text-[#FF8A3D]" size={28} />
              <span>Discussion ({comments.length})</span>
            </h3>
          </div>

          {/* Comment Input Form */}
          <div className="mb-10 p-6 rounded-3xl bg-white border-2 border-[#FF8A3D]/20 shadow-md flex flex-col gap-4">
            {isAdmin && (
              <div className="flex flex-col sm:flex-row gap-3 mb-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
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
            <form onSubmit={handleAddComment} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
              <img
                src={isAdmin && customCommentAvatar 
                  ? customCommentAvatar 
                  : isAdmin && customCommentName.trim()
                    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(customCommentName.trim())}&background=random&color=fff&size=100`
                    : (user?.picture || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80")
                }
                alt="Your avatar"
                className="w-12 h-12 rounded-full object-cover ring-2 ring-[#FF8A3D]/40 shrink-0 hidden sm:block shadow-xs"
              />
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={`Leave your field note or ask a question about ${article.city || 'this trip'}...`}
                className="flex-1 w-full px-5 py-3.5 rounded-2xl bg-[#FFF7F0]/70 border border-[#FF8A3D]/25 focus:outline-none focus:ring-2 focus:ring-[#FF8A3D] text-sm font-bold text-[#1F2937]"
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="px-8 py-3.5 rounded-2xl bg-[#1F2937] hover:bg-[#FF8A3D] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shrink-0 flex items-center gap-2 hover:scale-102"
              >
                <span>Post Note</span>
                <Send size={14} />
              </button>
            </form>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="p-6 rounded-3xl bg-white/90 border border-[#FF8A3D]/15 shadow-xs flex items-start gap-4 transition-all hover:bg-white">
                <img
                  src={comment.avatar}
                  alt={comment.author}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-[#FF8A3D]/20 shrink-0 mt-0.5 shadow-xs"
                />
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black text-base text-[#1F2937]">{comment.author}</span>
                    <span className="text-xs font-bold text-[#6B7280]">{comment.date}</span>
                  </div>
                  <p className="text-sm text-[#374151] font-medium leading-relaxed mb-4">
                    {comment.content}
                  </p>
                  <button
                    onClick={() => toggleCommentLike(comment.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-black text-[#4B5563] hover:text-[#D45B0C] transition-colors bg-[#FFF7F0] px-3.5 py-1.5 rounded-full border border-gray-200"
                  >
                    <ThumbsUp size={13} className="text-[#FF8A3D]" />
                    <span>Helpful ({comment.likes})</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      <BlogFooter />
    </div>
  );
}
