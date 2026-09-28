'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Article } from '@/data/blogData';
import { Play, Heart, MessageCircle } from 'lucide-react';

// Wikimedia's Special:FilePath generates a resized thumbnail on demand and
// redirects straight to their CDN — no proxy on our end, no server-side hop.
const FALLBACK_THUMB = 'https://commons.wikimedia.org/wiki/Special:FilePath/Taj_Mahal_in_March_2004.jpg?width=400';

interface MediaGridItemProps {
  article: Article;
  preload?: boolean;
  onSelect: (article: Article) => void;
}

export function MediaGridItem({ article, preload = false, onSelect }: MediaGridItemProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(preload);

  const isPlayableVideo = !!article.videoUrl?.match(/\.(mp4|webm|ogg)$/i);

  // Only mount (and start downloading) the <video> once its tile nears the viewport,
  // instead of every tile in the feed auto-playing and downloading at once on page load.
  useEffect(() => {
    if (!isPlayableVideo || videoReady) return;
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVideoReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isPlayableVideo, videoReady]);

  // Pause playback once a mounted video scrolls off-screen so it stops burning bandwidth/CPU.
  useEffect(() => {
    if (!isPlayableVideo || !videoReady) return;
    const el = wrapperRef.current;
    const video = videoRef.current;
    if (!el || !video) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isPlayableVideo, videoReady]);

  return (
    <div
      ref={wrapperRef}
      className="relative group aspect-square overflow-hidden cursor-pointer bg-neutral-900"
      onClick={() => onSelect(article)}
    >
      {isPlayableVideo ? (
        <div className="relative w-full h-full bg-black flex items-center justify-center group/video">
          {videoReady ? (
            <video
              ref={videoRef}
              src={article.videoUrl}
              className="w-full h-full object-cover opacity-70 group-hover/video:opacity-100 transition-opacity"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <div className="w-full h-full bg-neutral-800 animate-pulse" />
          )}
          <Play className="absolute text-white w-8 h-8 z-20 opacity-80 pointer-events-none" fill="currentColor" />
        </div>
      ) : article.mediaType === 'video' || article.videoUrl ? (
        <div className="relative w-full h-full bg-black flex items-center justify-center group/video">
          <Play className="absolute text-white w-10 h-10 z-20 opacity-80 pointer-events-none" fill="currentColor" />
          <img
            src={article.imageUrl || FALLBACK_THUMB}
            alt={article.title}
            className="w-full h-full object-cover opacity-70"
            loading={preload ? 'eager' : 'lazy'}
            decoding="async"
          />
        </div>
      ) : (
        <img
          src={article.imageUrl}
          alt={article.title}
          className="w-full h-full object-cover"
          loading={preload ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}

      {/* Hover overlay (Instagram style) */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2 text-white font-bold">
          <Heart size={20} fill="currentColor" />
          <span>{article.likes || 0}</span>
        </div>
        <div className="flex items-center gap-2 text-white font-bold">
          <MessageCircle size={20} fill="currentColor" />
          <span>{article.comments?.length || 0}</span>
        </div>
      </div>
    </div>
  );
}
