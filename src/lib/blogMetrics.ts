import { Article } from '@/data/blogData';

// Simple deterministic PRNG based on string seed
const mulberry32 = (a: number) => {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

const generateSeed = (str: string) => {
  let h = 0;
  for(let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return h;
}

export const calculateProgressiveMetrics = (article: Article) => {
  // Extract timestamp from ID (e.g. blog-1718293921)
  let createdAt = Date.now();
  if (article.id && article.id.includes('-')) {
    const parts = article.id.split('-');
    const parsed = parseInt(parts[parts.length - 1]);
    // Validate it's a realistic timestamp (after year 2020)
    if (!isNaN(parsed) && parsed > 1500000000000) {
      createdAt = parsed;
    }
  }

  const seed = generateSeed(article.id || 'default');
  const rand = mulberry32(seed);

  // max 200 likes, max 1500 views, based on user request: 
  // "cap it at some random number > 100 and < 200, for views some random number > 700 and < 1500"
  const maxLikes = Math.floor(rand() * 100) + 100; // 100 to 199
  const maxViews = Math.floor(rand() * 800) + 700; // 700 to 1499

  const ageInHours = (Date.now() - createdAt) / (1000 * 60 * 60);
  
  // Growth curve: peaks at 72 hours, non-linear (sqrt)
  const cappedAge = Math.max(0, Math.min(72, ageInHours));
  const growthCurve = Math.sqrt(cappedAge) / Math.sqrt(72);

  const fakeLikes = Math.floor(maxLikes * growthCurve);
  const fakeViews = Math.floor(maxViews * growthCurve);

  return {
    likesCount: fakeLikes + (article.likes || 0),
    viewsCount: fakeViews + (article.views || 0)
  };
};
