// Shared field mapping between the blog create (POST) and update (PUT) routes.

export function buildArticleCreateData(data: any, featuredOrder: number) {
  return {
    slug: data.slug,
    title: data.title,
    excerpt: data.excerpt,
    category: data.category,
    city: data.city,
    categoryIcon: data.categoryIcon || '🌍',
    categoryBadgeBg: data.categoryBadgeBg || 'bg-gray-100',
    categoryBadgeText: data.categoryBadgeText || 'text-gray-800',
    readingTime: data.readingTime,

    author: data.author,
    collaborators: data.collaborators || null,

    date: data.date,
    imageUrl: data.imageUrl,
    featured: data.featured || false,
    featuredOrder,
    likes: data.likes || 0,
    views: data.views || 0,
    commentsCount: data.commentsCount || 0,
    controversialScore: data.controversialScore || 0,
    timesPlanned: data.timesPlanned || 0,

    budget: data.budget || null,
    bestSeason: data.bestSeason || null,
    accommodation: data.accommodation || null,
    transportMode: data.transportMode || null,

    itineraryStops: data.itineraryStops || null,
    content: data.content || null,
    mediaType: data.mediaType || null,
    videoUrl: data.videoUrl || null,

    comments: data.comments || null,
  };
}

export function buildArticleUpdateData(data: any, featuredOrder: number) {
  return {
    slug: data.slug,
    title: data.title,
    excerpt: data.excerpt,
    category: data.category,
    city: data.city,
    categoryIcon: data.categoryIcon || '🌍',
    categoryBadgeBg: data.categoryBadgeBg || 'bg-gray-100',
    categoryBadgeText: data.categoryBadgeText || 'text-gray-800',
    readingTime: data.readingTime,

    author: data.author,
    collaborators: data.collaborators || null,

    date: data.date,
    imageUrl: data.imageUrl,
    featured: data.featured,
    featuredOrder,
    likes: data.likes,
    views: data.views,
    commentsCount: data.commentsCount,
    controversialScore: data.controversialScore,
    timesPlanned: data.timesPlanned,

    budget: data.budget,
    bestSeason: data.bestSeason,
    accommodation: data.accommodation,
    transportMode: data.transportMode,

    itineraryStops: data.itineraryStops,
    content: data.content,
    mediaType: data.mediaType,
    videoUrl: data.videoUrl,

    comments: data.comments,
  };
}
