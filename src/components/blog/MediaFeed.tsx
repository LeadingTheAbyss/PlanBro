import React, { useState } from 'react';
import { Article } from '@/data/blogData';
import { MediaModal } from '@/components/blog/MediaModal';
import { MediaGridItem } from '@/components/blog/MediaGridItem';
import { useBlogTheme } from '@/context/BlogThemeContext';

interface MediaFeedProps {
  articles: Article[];
}

// Tiles above this index are preloaded eagerly (roughly the first two rows on
// desktop) so they're already visible and playing the instant the cinematic
// loader clears. Everything after that lazy-loads as the user scrolls to it.
const PRELOAD_COUNT = 8;

export function MediaFeed({ articles }: MediaFeedProps) {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const blogTheme = useBlogTheme();
  const isDark = blogTheme?.isDark || false;

  // Only get articles that have an image or video, prioritizing those with images for the feed
  const mediaItems = articles.filter(a => a.imageUrl || a.videoUrl);

  if (mediaItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center min-h-[60vh]">
        <h2 className={`text-2xl font-black mb-2 ${isDark ? 'text-zinc-200' : 'text-[#1F2937]'}`}>No media found</h2>
        <p className={isDark ? 'text-zinc-500' : 'text-[#6B7280]'}>Be the first to share pictures and videos from your trips!</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-0 sm:px-4 md:px-8 py-1 sm:py-10 min-h-screen">
      <div className="grid grid-cols-3 lg:grid-cols-4 gap-0.5 sm:gap-2">
        {mediaItems.map((article, idx) => (
          <MediaGridItem
            key={article.id || idx}
            article={article}
            preload={idx < PRELOAD_COUNT}
            onSelect={setSelectedArticle}
          />
        ))}
      </div>

      {selectedArticle && (
        <MediaModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
      )}
    </div>
  );
}
