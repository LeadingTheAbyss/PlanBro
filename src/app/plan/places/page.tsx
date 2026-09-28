'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useTripStore } from '@/store/tripStore';
import { useBudgetStore } from '@/store/budgetStore';
import { useItineraryStore } from '@/store/itineraryStore';
import { useCacheStore } from '@/store/cacheStore';
import { useFetchQueue } from '@/store/fetchQueueStore';
import { Place } from '@/types/trip';
import { api } from '@/lib/api';
import {
  ArrowRight, Clock, IndianRupee, MapPin, Star, X,
  Bookmark, Navigation, Smartphone, Share2, Ticket, ExternalLink,
  Filter, SlidersHorizontal, Maximize, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ImageOff } from 'lucide-react';
import { CinematicLoader, preloadCinematicImages } from '@/components/CinematicLoader';
import TutorialOverlay from '@/components/TutorialOverlay';
import { useDestinationTheme } from '@/hooks/useDestinationTheme';

function getDefaultDuration(category?: string): number {
  if (!category) return 2.0;
  switch (category.toLowerCase()) {
    case 'historical': return 3.0;
    case 'museum': return 2.5;
    case 'religious': return 2.5;
    case 'nature': return 2.5;
    case 'mountain': return 2.0;
    case 'beach': return 4.0;
    case 'wildlife': return 3.0;
    case 'adventure': return 3.5;
    case 'nightlife': return 3.5;
    case 'food': return 1.5;
    case 'shopping': return 3.0;
    default: return 2.0;
  }
}

import { createPortal } from 'react-dom';

function PlaceModal({ place, destination, isOpen, onClose, onToggle, isSelected }: {
  place: Place;
  destination: string;
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  isSelected: boolean;
}) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [viewMode, setViewMode] = useState<'photo' | 'streetview'>('photo');
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (activeTab === 'Reviews' && reviews.length === 0) {
      const fetchReviews = async () => {
        setLoadingReviews(true);
        try {
          const res = await fetch(`/api/places/reviews?location_id=${place.id}`);
          const data = await res.json();
          setReviews(data);
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingReviews(false);
        }
      };
      fetchReviews();
    }
  }, [activeTab, place.id]);


  const reviewCount = place.reviewsCount || 0;
  const displayRating = place.rating ? place.rating.toFixed(1) : 'New';

  const handleActionClick = (action: string) => {
    const query = encodeURIComponent(place.name + (destination ? ' ' + destination : '')).replace(/%20/g, '+');
    const placeUrl = `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${place.id}`;

    switch (action) {
      case 'Directions':
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}&destination_place_id=${place.id}`, '_blank');
        break;
      case 'Explore Nearby':
        window.open(`https://www.google.com/maps/search/things+to+do+near+${query}`, '_blank');
        break;
      case 'View More':
        window.open(placeUrl, '_blank');
        break;
      case 'Share': {
        const showSuccess = () => {
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2500);
        };
        
        if (navigator.share) {
          navigator.share({ title: place.name, text: `Check out ${place.name}${destination ? ` in ${destination}` : ''}!`, url: placeUrl })
            .catch(() => showSuccess());
        } else {
          navigator.clipboard.writeText(placeUrl);
          showSuccess();
        }
        break;
      }
    }
  };

  // Handle Escape key to close fullscreen image
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <>
      {isFullscreen && place.imageUrl && (
        <div 
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-20 right-6 z-[210] bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors backdrop-blur-md"
          >
            <X size={24} />
          </button>
          <img 
            src={place.imageUrl} 
            alt={place.name} 
            className="w-full h-full object-contain p-4" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
      <div
        className="fixed inset-0 z-[150] flex items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
        className={`sm:rounded-3xl overflow-hidden w-full h-full sm:h-auto max-w-lg shadow-2xl relative flex flex-col sm:max-h-[90vh] bg-white dark:bg-zinc-900 ${isSelected ? 'border border-blue-500' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[100] bg-black/40 hover:bg-black/60 backdrop-blur-md text-white p-2 rounded-full transition-colors shadow-lg"
        >
          <X size={18} />
        </button>

        {/* Hero Image */}
        <div className="relative h-64 w-full shrink-0 bg-zinc-200 dark:bg-zinc-800 group">
          {place.imageUrl ? (
            <>
              <img
                src={place.imageUrl}
                alt={place.name}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setIsFullscreen(true)}
              />
              <button
                onClick={() => setIsFullscreen(true)}
                className="absolute top-4 left-4 z-[100] bg-black/40 hover:bg-black/60 backdrop-blur-md text-white p-2 rounded-full transition-colors shadow-lg opacity-100 sm:opacity-0 group-hover:opacity-100 pointer-events-none sm:pointer-events-auto"
              >
                <Maximize size={18} />
              </button>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-600 gap-2">
              <ImageOff size={32} />
              <span className="text-sm font-medium">No Image</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-zinc-900 via-white/20 dark:via-zinc-900/20 to-transparent pointer-events-none" />
          {/* Category pill overlaid on image */}
          <div className="absolute bottom-4 left-4">
            <span className="bg-blue-600/80 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full">
              {place.category}
            </span>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Header */}
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">{place.name}</h2>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center gap-1">
              <span className="text-zinc-700 dark:text-zinc-300 font-bold text-sm">{displayRating}</span>
              <div className="flex text-yellow-400">
                {[...Array(4)].map((_, i) => <Star key={i} size={13} fill="currentColor" />)}
                <Star size={13} fill="currentColor" className="opacity-40" />
              </div>
              <span className="text-zinc-500 text-xs">({reviewCount.toLocaleString('en-IN')})</span>
            </div>
            <span className="text-zinc-400 dark:text-zinc-700">•</span>
            <span className="text-zinc-600 dark:text-zinc-400 text-sm flex items-center gap-1">
              <MapPin size={13} className="text-zinc-500" /> {destination}
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-5 border-b border-zinc-200 dark:border-zinc-800 mb-5 sticky top-0 bg-white dark:bg-zinc-900 z-10 pt-1">
            {['Overview', 'About'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'Overview' && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              {/* Action Buttons */}
              <div className="flex justify-between px-1 mb-2">
                {[
                  { icon: Navigation, label: 'Directions', color: 'bg-blue-600', text: 'text-white' },
                  { icon: MapPin, label: 'Explore Nearby', color: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-blue-600 dark:text-blue-400' },
                  { icon: ExternalLink, label: 'View More', color: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-blue-600 dark:text-blue-400' },
                  { icon: Share2, label: 'Share', color: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-blue-600 dark:text-blue-400' },
                ].map(action => (
                  <div
                    key={action.label}
                    className="flex flex-col items-center gap-1.5 cursor-pointer group"
                    onClick={() => handleActionClick(action.label)}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 group-hover:brightness-110 ${action.color} ${action.text}`}>
                      <action.icon size={19} />
                    </div>
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{action.label}</span>
                  </div>
                ))}
              </div>

              <div className="bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <Clock size={17} className="text-zinc-500 shrink-0" />
                  <span className="text-sm">Duration: <span className="font-semibold text-zinc-900 dark:text-white">{place.visitDurationHours} hours</span></span>
                </div>
                <div className="border-t border-zinc-200 dark:border-zinc-700/50" />
                <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                  <IndianRupee size={17} className="text-green-500 shrink-0" />
                  <span className="text-sm">
                    Entry: <span className="font-semibold text-zinc-900 dark:text-white">
                      {place.entryFee === 0 ? 'Free' : `₹${place.entryFee} - ₹${Math.round(place.entryFee * 1.8)}`}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}


          {/* Reviews Tab */}
          {activeTab === 'Reviews' && (
            <div className="text-zinc-700 dark:text-zinc-300 py-2 animate-in slide-in-from-right-4 duration-300 space-y-3">
              <p className="text-xs text-zinc-500 mb-3">Showing {reviews.length} of {reviewCount.toLocaleString('en-IN')} reviews</p>
              {loadingReviews ? (
                <div className="text-center py-8 text-zinc-500 animate-pulse text-sm">Fetching reviews...</div>
              ) : reviews.length > 0 ? (
                reviews.map((review, i) => {
                  const colorHue = (place.id.charCodeAt(0) + i * 37) % 360;
                  return (
                    <div key={review.id || i} className="flex items-start gap-3 p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/30">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-white uppercase text-sm"
                        style={{ backgroundColor: `hsl(${colorHue}, 60%, 40%)` }}
                      >
                        {review.author[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{review.author}</span>
                          <div className="flex text-yellow-400">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star key={idx} size={11} fill="currentColor" className={idx < Math.floor(review.rating) ? '' : 'opacity-25'} />
                            ))}
                          </div>
                        </div>
                        {review.title && <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">{review.title}</p>}
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{review.text}</p>
                        {review.date && <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-1.5">{review.date}</p>}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-zinc-500 text-sm">No reviews found.</div>
              )}
            </div>
          )}

          {/* About Tab */}
          {activeTab === 'About' && (
            <div className="text-zinc-700 dark:text-zinc-300 py-2 animate-in slide-in-from-right-4 duration-300 text-sm leading-relaxed space-y-3">
              <p>
                <span className="font-semibold text-zinc-900 dark:text-white">{place.name}</span> is one of the most prominent{' '}
                <span className="text-blue-600 dark:text-blue-400">{place.category}</span> attractions in {destination}. It takes
                approximately <span className="font-semibold text-zinc-900 dark:text-white">{place.visitDurationHours} hours</span> to fully explore.
              </p>
              <p className="text-zinc-600 dark:text-zinc-400">
                It has a safety score of <span className="font-semibold text-zinc-900 dark:text-white">{place.safetyScore}/10</span>, making it
                suitable for all types of travelers, and is rated <span className="font-semibold text-zinc-900 dark:text-white">{place.rating || 4.5}</span> stars
                by visitors.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
          <button
            onClick={() => { onToggle(); onClose(); }}
            className={`w-full py-3.5 rounded-xl font-bold text-base transition-all ${isSelected
              ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 border border-red-300 dark:border-red-900'
              : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/30'
            }`}
          >
            {isSelected ? '✕ Remove from Plan' : '+ Add to Plan'}
          </button>
        </div>
      </div>
    </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[250] bg-[#1c1c1e] text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3"
          >
            <div className="bg-green-500 rounded-full p-0.5">
              <CheckCircle2 size={16} className="text-[#1c1c1e]" />
            </div>
            <span className="text-[14px] font-medium tracking-wide">Link copied to clipboard</span>
          </motion.div>
        )}
      </AnimatePresence>
  </>,
    document.body
  );
}

export default function PlacesPage() {
  const router = useRouter();
  const trip = useTripStore();
  const budget = useBudgetStore();
  const itinerary = useItineraryStore();
  const { activeTheme } = useDestinationTheme();

  const fetchQueue = useFetchQueue();
  const cache = useCacheStore();
  
  const places = (cache.cache['places'] || []) as Place[];
  const task = fetchQueue.tasks.find(t => t.id === 'places-main');
  const loading = !!trip.destination && !places.length && (!task || task.status === 'idle' || task.status === 'loading');
  const [selectedModalPlace, setSelectedModalPlace] = useState<Place | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'recommended' | 'cheapest' | 'shortest'>('recommended');

  // Derive unique categories from places data
  const categories = useMemo(() => {
    const unique = Array.from(new Set(places.map(p => p.category).filter(Boolean)));
    return ['All', ...unique.sort()];
  }, [places]);

  useEffect(() => {
    if (!trip.destination) return;
    
    // If we have no data, and it's not currently loading, we need to trigger a live fetch
    if (places.length === 0 && (!task || task.status === 'idle' || task.status === 'cache_miss' || task.status === 'error')) {
      fetchQueue.enqueueTask({ id: 'places-main', category: 'places', priority: 0, isLive: true });
      fetchQueue.bumpPriority('places-main');
    } else if (task && task.status === 'loading') {
      // It's loading in the background, jump it to the top!
      fetchQueue.bumpPriority('places-main');
    }
  }, [trip.destination, places.length, task?.status]);

  useEffect(() => {
    // Preload cinematic images for the /food loading screen asynchronously
    preloadCinematicImages('food');
  }, []);

  const handleTogglePlace = (place: Place) => {
    const isSelected = itinerary.selectedPlaces.some(p => p.id === place.id);
    if (isSelected) {
      itinerary.removePlaceFromBag(place.id);
      budget.refundExpense('places', place.entryFee);
    } else {
      itinerary.addPlaceToBag(place);
      budget.addExpense('places', place.entryFee);
    }
    budget.recalcBudget();
  };

  const displayedPlaces = useMemo(() => {
    let filtered = activeCategory === 'All' ? places : places.filter(p => p.category === activeCategory);
    const sorted = [...filtered];
    if (sortBy === 'cheapest') sorted.sort((a, b) => a.entryFee - b.entryFee);
    else if (sortBy === 'shortest') sorted.sort((a, b) => a.visitDurationHours - b.visitDurationHours);
    return sorted;
  }, [places, activeCategory, sortBy]);

  return (
    <div className={`min-h-screen bg-transparent pt-10 px-4 transition-colors duration-300 ${activeTheme.text}`}>
      <div className="max-w-5xl mx-auto space-y-6 pb-24">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Place Discovery</h1>
            <p className="text-inherit font-semibold text-sm mt-1">
              Explore top attractions in <span className="text-inherit font-black">{trip.destination || 'your destination'}</span>
            </p>
          </div>
          <div className="text-sm font-semibold bg-blue-500/20 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-full border border-blue-500/30 shrink-0">
            {itinerary.selectedPlaces.length} Selected
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Category filter tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 flex-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-900/40'
                    : 'bg-current/5 text-inherit border-current/20 hover:bg-current/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>


        </div>

        {/* Cinematic loader overlay — shown while data is fetching */}
        <CinematicLoader
          isLoading={loading}
          category="places"
          destination={trip.destination}
        />

        {/* Places Grid */}
        {loading ? null : displayedPlaces.length === 0 ? (
          <div className="p-12 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl text-center text-zinc-500">
            <MapPin size={32} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">No places found</p>
            <p className="text-inherit opacity-70 mt-1">Try selecting a different category or go back and set a destination.</p>
          </div>
        ) : (
          <div id="tutorial-places-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedPlaces.map(place => {
              const isSelected = itinerary.selectedPlaces.some(p => p.id === place.id);
              return (
                <div
                  key={place.id}
                  onClick={() => setSelectedModalPlace(place)}
                  className={`relative flex flex-col rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden group hover:-translate-y-1 ${activeTheme.card} ${activeTheme.text} ${
                    isSelected
                      ? 'border-blue-500 shadow-lg shadow-blue-900/30'
                      : 'hover:shadow-xl hover:shadow-black/40'
                  }`}
                >
                  {/* Image */}
                  <div className="relative h-48 w-full overflow-hidden shrink-0 bg-zinc-200 dark:bg-zinc-800">
                    {place.imageUrl ? (
                      <img src={place.imageUrl} alt={place.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400 dark:text-zinc-700">
                        <ImageOff size={24} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />

                    {/* Category badge */}
                    <div className="absolute top-3 left-3">
                      <span className="bg-black/50 backdrop-blur-sm text-zinc-300 text-[11px] font-medium px-2.5 py-1 rounded-full">
                        {place.category}
                      </span>
                    </div>

                    {/* Selected badge */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 bg-blue-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
                        ✓ ADDED
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="text-base font-bold text-inherit leading-tight group-hover:text-blue-500 transition-colors">
                        {place.name}
                      </h3>
                      <span className={`text-sm font-bold shrink-0 ${place.entryFee === 0 ? 'text-emerald-500' : 'text-inherit'}`}>
                        {place.entryFee === 0 ? 'Free' : `₹${place.entryFee} - ₹${Math.round(place.entryFee * 1.8)}`}
                      </span>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-3">
                      <Star size={14} className="text-yellow-400" fill="currentColor" />
                      <span className="text-sm font-semibold text-inherit">
                        {place.rating ? place.rating.toFixed(1) : 'New'}
                      </span>
                      <span className="text-inherit text-sm">
                        {place.reviewsCount ? `(${place.reviewsCount.toLocaleString('en-IN')})` : ''}
                      </span>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-1.5 text-inherit text-sm mt-auto mb-3">
                      <Clock size={14} />
                      <span>{place.visitDurationHours || getDefaultDuration(place.category)} hrs visit</span>
                    </div>

                    {/* Add button */}
                    <button
                      onClick={e => { e.stopPropagation(); handleTogglePlace(place); }}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                        isSelected
                          ? 'bg-black/20 text-inherit border-current/20 hover:bg-black/30'
                          : 'bg-transparent text-blue-600 dark:text-blue-400 border-blue-600/40 hover:bg-blue-600 hover:text-white hover:border-blue-600'
                      }`}
                    >
                      {isSelected ? 'Remove' : '+ Add to Plan'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 border-t border-current/10">
          <button
            onClick={() => router.push('/plan/transport')}
            className="text-inherit opacity-70 hover:opacity-100 font-medium transition-opacity text-sm"
          >
            ← Back to Transport
          </button>
          <button
            onClick={() => router.push('/plan/food')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-7 py-3.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-transform hover:-translate-y-0.5 text-sm"
          >
            Find Food <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Modal */}
      {selectedModalPlace && (
        <PlaceModal
          place={selectedModalPlace}
          destination={trip.destination}
          isOpen={!!selectedModalPlace}
          onClose={() => setSelectedModalPlace(null)}
          onToggle={() => handleTogglePlace(selectedModalPlace)}
          isSelected={itinerary.selectedPlaces.some(p => p.id === selectedModalPlace.id)}
        />
      )}

      <TutorialOverlay 
        tutorialKey="plan-places"
        steps={[
          {
            targetId: 'tutorial-places-grid',
            title: `Select places you're interested to visit at ${trip.destination || 'your destination'}`,
            text: ''
          }
        ]}
      />
    </div>
  );
}
