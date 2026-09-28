'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { isAdminEmail } from '@/lib/admin';
import { Article, BUDGET_FILTER_OPTIONS, SEASON_FILTER_OPTIONS } from '@/data/blogData';
import { calculateProgressiveMetrics } from '@/lib/blogMetrics';
import { BlogNavbar } from '@/components/blog/BlogNavbar';
import { BlogHero } from '@/components/blog/BlogHero';
import { FeaturedArticleCard } from '@/components/blog/FeaturedArticleCard';
import { CategoryPills } from '@/components/blog/CategoryPills';
import { EditorialArticleGrid } from '@/components/blog/EditorialArticleGrid';
import { BlogNewsletter } from '@/components/blog/BlogNewsletter';
import { BlogFooter } from '@/components/blog/BlogFooter';
import { CustomDropdown } from '@/components/blog/CustomDropdown';
import { CinematicLoader } from '@/components/CinematicLoader';
import { useCacheStore } from '@/store/cacheStore';
import { BlogThemeContext } from '@/context/BlogThemeContext';
import { useAuthStore } from '@/store/authStore';
import { readUserProfile } from '@/lib/profileStorage';
import { useRouter } from 'next/navigation';
import { Search, Filter, DollarSign, Calendar, X } from 'lucide-react';

const QUICK_CITIES = [
  'All India',
  'Goa',
  'Jammu & Kashmir',
  'Manali & Himachal',
  'Delhi',
  'Kochi & Kerala',
  'Jaipur & Udaipur',
  'Meghalaya & Tawang',
  'Mumbai & Pune'
];

export default function BlogLandingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('All Stories');
  const [searchCity, setSearchCity] = useState<string>('');
  const [selectedQuickCity, setSelectedQuickCity] = useState<string>('All India');

  // Dynamic user blogs (No hardcoded data - Item 14)
  const [articles, setArticles] = useState<Article[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const cache = useCacheStore();

  // Structured Meta-Data filter states
  const [budgetFilter, setBudgetFilter] = useState<string>('All Budgets');
  const [seasonFilter, setSeasonFilter] = useState<string>('All Seasons');

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
            let customBlogs: Article[] = data;
            
            // Apply progressive metrics
            customBlogs = customBlogs.map(b => {
              const metrics = calculateProgressiveMetrics(b);
              return {
                ...b,
                likes: metrics.likesCount,
                views: metrics.viewsCount
              };
            });
            
            customBlogs.sort((a, b) => {
              if (a.featured && !b.featured) return -1;
              if (!a.featured && b.featured) return 1;
              return (b.likes || 0) - (a.likes || 0);
            });
            
            setArticles(customBlogs);
            cache.setCache('blogs', customBlogs);
          })
          .catch(e => {
            console.error(e);
            if (!cache.getCache('blogs')) setArticles([]);
          })
          .finally(() => {
            setIsFetching(false);
          });
      } catch (e) {
        if (!cache.getCache('blogs')) setArticles([]);
        setIsFetching(false);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const parsedProfile: any = readUserProfile(user?.id) || {};
    const myEmail = parsedProfile.email || user?.email || '';

    const currentIsAdmin = Boolean(
      parsedProfile.isAdmin ||
      isAdminEmail(myEmail)
    );
    setIsAdmin(currentIsAdmin);
  }, [user]);

  const isLoading = isMounted && articles.length === 0 && isFetching;

  const handleDeleteArticle = (articleToDelete: Article) => {
    if (typeof window !== 'undefined') {
      try {
        fetch(`/api/blogs/${articleToDelete.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {}
      const updated = articles.filter(a => a.id !== articleToDelete.id && a.slug !== articleToDelete.slug);
      setArticles(updated);
    }
  };

  const handleSelectArticle = (article: Article) => {
    const username = article.author?.username || 'explorer';
    const slug = article.slug || article.id;
    router.push(`/blog/u/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`);
  };

  const displayedArticles = useMemo(() => {
    let list = [...articles];

    // Category filter
    if (selectedCategory !== 'All Stories') {
      list = list.filter(a => a.category === selectedCategory);
    }

    // Quick City chip filter
    if (selectedQuickCity !== 'All India') {
      const target = selectedQuickCity.toLowerCase().split(' & ')[0];
      list = list.filter(a => 
        a.city?.toLowerCase().includes(target) ||
        a.title.toLowerCase().includes(target) ||
        a.excerpt?.toLowerCase().includes(target)
      );
    }

    // Text box search city filter
    if (searchCity.trim()) {
      const q = searchCity.toLowerCase().trim();
      list = list.filter(a => 
        a.city?.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.excerpt?.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q)
      );
    }

    // Structured Meta-Data filters
    if (budgetFilter !== 'All Budgets') {
      list = list.filter(a => a.budget?.toLowerCase().includes(budgetFilter.toLowerCase().split(' ')[0]) || a.budget === budgetFilter);
    }
    if (seasonFilter !== 'All Seasons') {
      list = list.filter(a => a.bestSeason?.toLowerCase().includes(seasonFilter.toLowerCase().split(' ')[0]) || a.bestSeason === seasonFilter);
    }

    return list;
  }, [articles, selectedCategory, searchCity, selectedQuickCity, budgetFilter, seasonFilter]);

  const resetAllFilters = () => {
    setSelectedCategory('All Stories');
    setSearchCity('');
    setSelectedQuickCity('All India');
    setBudgetFilter('All Budgets');
    setSeasonFilter('All Seasons');
  };

  const activeFilterCount = 
    (selectedCategory !== 'All Stories' ? 1 : 0) +
    (selectedQuickCity !== 'All India' ? 1 : 0) +
    (budgetFilter !== 'All Budgets' ? 1 : 0) +
    (seasonFilter !== 'All Seasons' ? 1 : 0);

  const featuredArticles = useMemo(() => {
    const featured = articles
      .filter(a => a.featuredOrder && a.featuredOrder > 0)
      .sort((a, b) => (a.featuredOrder || 0) - (b.featuredOrder || 0));
    return featured.length > 0 ? featured : (articles.length > 0 ? [articles[0]] : []);
  }, [articles]);

  return (
    <BlogThemeContext.Provider value={{ isDark, toggleDark: () => setIsDark(!isDark) }}>
    <div className={`min-h-screen font-sans selection:bg-[#FF8A3D]/20 overflow-x-hidden relative transition-colors duration-500 ${isDark ? 'bg-[#0a0a0a] text-zinc-100' : 'bg-[#FFF7F0] text-[#1F2937]'}`}>
      <CinematicLoader 
        isLoading={isLoading} 
        category="places" 
        customLabel="Handpicking The Best Blogs For You" 
        minDisplayMs={6500} 
      />
      
      {/* Top Travel Journal Navbar */}
      <BlogNavbar />

      {/* Featured Article Section (Trending Top) */}
      {featuredArticles.length > 0 && (
        <FeaturedArticleCard 
          articles={featuredArticles} 
          onSelectArticle={handleSelectArticle} 
        />
      )}

      {/* View More Popular Blogs (Unfiltered) */}
      <EditorialArticleGrid 
        title="View More Popular Blogs"
        articles={articles} 
        onSelectArticle={handleSelectArticle} 
        selectedCategory={selectedCategory} 
        onDeleteArticle={handleDeleteArticle}
        isAdmin={isAdmin}
      />

      {/* Indian City Search & Structured Filters Console */}
      <section className="py-8 px-4 md:px-8 max-w-7xl mx-auto">
        <div className={`rounded-[36px] p-6 sm:p-10 shadow-xl mb-8 transition-colors ${isDark ? 'bg-zinc-900 border-2 border-zinc-800' : 'bg-gradient-to-r from-[#FFF3E6] via-[#FFF9E6] to-[#FEF3C7] border-4 border-[#FF8A3D]/30'}`}>
          
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <div className={`inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest mb-1.5 px-3.5 py-1 rounded-full shadow-xs ${isDark ? 'bg-zinc-800 text-[#D45B0C] border border-zinc-700' : 'bg-white/80 text-[#D45B0C] border border-[#FF8A3D]/30'}`}>
                <Filter size={14} className="text-[#FF8A3D]" />
                <span>Smart Indian Expedition Discovery</span>
              </div>
              <h3 className={`text-2xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-zinc-100' : 'text-[#1F2937]'}`}>
                Filter by Destination, Budget or Season
              </h3>
              <p className={`text-xs sm:text-sm font-medium mt-1 ${isDark ? 'text-zinc-400' : 'text-[#4B5563]'}`}>
                Customize your feed to match your exact budget and trip vibe.
              </p>
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FF8A3D]" size={22} />
            <input
              type="text"
              value={searchCity}
              onChange={(e) => {
                setSearchCity(e.target.value);
                if (selectedQuickCity !== 'All India') setSelectedQuickCity('All India');
              }}
              placeholder="Search Indian destinations or regions (e.g. Goa, Manali, Spiti, Chandni Chowk, Tawang...)"
              className={`w-full h-15 pl-12 pr-12 rounded-2xl focus:outline-none font-extrabold shadow-md text-base sm:text-lg transition-all ${isDark ? 'bg-zinc-800 border-2 border-zinc-700 focus:border-[#FF8A3D] text-zinc-100 placeholder:text-zinc-500' : 'bg-white/95 border-2 border-[#FF8A3D]/30 focus:border-[#FF8A3D] text-[#1F2937] placeholder:text-gray-400'}`}
            />
            {searchCity && (
              <button
                onClick={() => setSearchCity('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* STRUCTURED META-DATA DROPDOWN CONSOLE (Budget Tier & Season) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 pt-2">
            
            {/* Budget Selector */}
            <CustomDropdown
              label={
                <label className={`block text-[10px] font-extrabold uppercase tracking-widest mb-1 pl-1 flex items-center gap-1 ${isDark ? 'text-[#FF8A3D]' : 'text-[#D45B0C]'}`}>
                  <DollarSign size={12} /> Budget Tier
                </label>
              }
              value={budgetFilter}
              onChange={setBudgetFilter}
              options={BUDGET_FILTER_OPTIONS}
              colorTheme="orange"
              isDark={isDark}
            />

            {/* Season Selector */}
            <CustomDropdown
              label={
                <label className={`block text-[10px] font-extrabold uppercase tracking-widest mb-1 pl-1 flex items-center gap-1 ${isDark ? 'text-emerald-500' : 'text-emerald-700'}`}>
                  <Calendar size={12} /> Best Time to Visit
                </label>
              }
              value={seasonFilter}
              onChange={setSeasonFilter}
              options={SEASON_FILTER_OPTIONS}
              colorTheme="emerald"
              isDark={isDark}
            />
          </div>

          {/* Quick City Filter Chips & Reset Bar */}
          <div className={`flex flex-wrap items-center justify-between gap-4 pt-4 border-t ${isDark ? 'border-zinc-800' : 'border-[#FF8A3D]/20'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-black uppercase tracking-wider mr-1 ${isDark ? 'text-zinc-500' : 'text-[#6B7280]'}`}>Regions:</span>
              {QUICK_CITIES.map(city => (
                <button
                  key={city}
                  onClick={() => {
                    setSelectedQuickCity(city);
                    setSearchCity('');
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${
                    selectedQuickCity === city && !searchCity
                      ? (isDark ? 'bg-zinc-100 text-zinc-900 shadow-md scale-105' : 'bg-[#1F2937] text-white shadow-md scale-105')
                      : (isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700' : 'bg-white text-[#4B5563] hover:bg-[#FF8A3D]/10 border border-[#FF8A3D]/25')
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={resetAllFilters}
                className="px-4 py-1.5 rounded-full bg-rose-500 text-white font-black text-xs uppercase tracking-wider hover:bg-rose-600 transition-colors shadow-sm flex items-center gap-1"
              >
                <span>Reset All Filters ({activeFilterCount})</span>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Filtered Editorial Masonry Grid of Articles & Videos */}
      {(activeFilterCount > 0 || searchCity.trim() !== '') && (
        <div className="mt-8">
          <EditorialArticleGrid 
            title="Filtered Results"
            articles={displayedArticles} 
            onSelectArticle={handleSelectArticle} 
            selectedCategory={selectedCategory} 
            onDeleteArticle={handleDeleteArticle}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {/* Travel Journal Footer */}
      <BlogFooter showQuote={true} />

    </div>
    </BlogThemeContext.Provider>
  );
}
