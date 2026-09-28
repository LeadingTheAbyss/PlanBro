'use client';

import React, { useEffect, useState } from 'react';
import { useTripStore } from '@/store/tripStore';
import { useBudgetStore } from '@/store/budgetStore';
import { TransportOption, Passenger } from '@/types/trip';
import { api } from '@/lib/api';
import { Train, Plane, MapPin, Building, Bus, Car, Loader2, IndianRupee, Clock, ShieldCheck, Armchair, ChevronDown, ArrowRight, CheckCircle2, Circle, AlertCircle, Users, Star, X, Maximize } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useCacheStore } from '@/store/cacheStore';
import { useFetchQueue } from '@/store/fetchQueueStore';
import { TrainRouteModal, LiveStatusModal, StationBoardModal } from '@/components/ui/TrainModals';
import AnimatedGlobe from '@/components/AnimatedGlobe';
import TutorialOverlay from '@/components/TutorialOverlay';
import { preloadCinematicImages } from '@/components/CinematicLoader';
import { useDestinationTheme } from '@/hooks/useDestinationTheme';

const LoadingScreen = ({ isFinished, onComplete }: { isFinished: boolean, onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);

  // Asymptotic progress logic
  useEffect(() => {
    if (isFinished) {
      setProgress(100);
      const t = setTimeout(onComplete, 800);
      return () => clearTimeout(t);
    }

    const interval = setInterval(() => {
      setProgress(p => {
        const remaining = 99 - p;
        const jump = Math.max(0.8, remaining * 0.08); 
        const next = p + jump;
        return next >= 99 ? 99 : next;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [isFinished, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] w-full h-screen bg-[#1e1424] flex flex-col justify-end items-center pb-16 overflow-hidden select-none">
      {/* Epic Background Illustration */}
      <img 
        src="/images/travel_loading_bg.png" 
        alt="Epic Journey Horizon" 
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

      {/* Title Header (Top Right style alignment) */}
      <div className="absolute top-12 right-12 text-right z-50">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-wider drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] uppercase">
          PlanBro
        </h1>
      </div>

      {/* Gamified UI Loading Container */}
      <div className="w-full max-w-2xl px-6 z-50 flex flex-col items-center">
        <span className="text-xl font-black text-amber-400 tracking-widest uppercase mb-2 animate-pulse drop-shadow">
          Finding Transport Options... {Math.floor(progress)}%
        </span>

        {/* The Track */}
        <div className="relative w-full h-6 bg-black/60 rounded-full border border-white/10 backdrop-blur-sm flex items-center p-1">
          {/* Progress Fill */}
          <motion.div 
            className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ ease: "easeInOut" }}
          />
          
          {/* Slider Head (Animated Train) */}
          <motion.div 
            className="absolute top-1/2 -translate-y-1/2 -ml-6 flex items-center z-10"
            style={{ left: `${progress}%` }}
            transition={{ ease: "easeInOut" }}
          >
            {/* Animated Smoke Puffs */}
            <div className="absolute -left-6 -top-4 flex gap-1 pointer-events-none scale-x-[-1]">
              <motion.div 
                animate={{ x: [-2, -15], y: [-5, -15], opacity: [0.8, 0], scale: [0.5, 2] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                className="w-2.5 h-2.5 bg-gray-200/80 rounded-full blur-[1px]"
              />
              <motion.div 
                animate={{ x: [-1, -10], y: [-2, -10], opacity: [0.6, 0], scale: [0.6, 1.5] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: 0.3 }}
                className="w-2 h-2 bg-gray-300/60 rounded-full blur-[1px]"
              />
              <motion.div 
                animate={{ x: [0, -8], y: [0, -8], opacity: [0.9, 0], scale: [0.4, 1.8] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: 0.6 }}
                className="w-1.5 h-1.5 bg-white/70 rounded-full blur-[0.5px]"
              />
            </div>
            
            {/* The Train (Flipped horizontally to face right) */}
            <motion.div 
              className="text-4xl scale-x-[-1] filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]"
              animate={{ y: [-1.5, 1.5, -1.5], rotate: [-2, 2, -2] }}
              transition={{ repeat: Infinity, duration: 0.4, ease: "easeInOut" }}
            >
                <Train size={48} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
            </motion.div>
          </motion.div>
        </div>

        {/* Waiting Message */}
        <div className="h-12 mt-4 flex items-center justify-center overflow-hidden">
          <motion.p 
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="text-xs md:text-sm text-gray-300 text-center max-w-lg font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,1)]"
          >
            Searching across multiple sources. This might take a few moments...
          </motion.p>
        </div>
      </div>
    </div>
  );
};

const getAirlineLogo = (providerName: string) => {
  if (!providerName) return null;
  const name = providerName.toLowerCase();
  if (name.includes('indigo')) return '/indigo_logo.png';
  if (name.includes('express')) return '/AirIndiaExpress_logo.png';
  if (name.includes('air india')) return '/AirIndia_logo.png';
  if (name.includes('akasa')) return '/AkasaAir_logo.png';
  if (name.includes('alliance')) return '/AllianceAirlines_logo.jpg';
  if (name.includes('spicejet')) return '/SpiceJet_logo.png';
  return null;
};

// Edit these values to tweak the width/height (zoom) of each individual logo!
const getAirlineLogoStyles = (providerName: string) => {
  if (!providerName) return 'w-[100%] h-[100%] scale-100';
  const name = providerName.toLowerCase();
  
  if (name.includes('indigo')) {
    // INDIGO: Increase or decrease scale-100 to change size (e.g., scale-90, scale-110)
    return 'w-[100%] h-[100%] scale-100'; 
  }
  if (name.includes('express')) {
    // AIR INDIA EXPRESS: Very wide logo with lots of white space
    return 'w-[120%] h-[100%] scale-[1.8]';
  }
  if (name.includes('air india')) {
    // AIR INDIA: Needs significant zoom to cut out the massive white borders
    return 'w-[47.5%] h-[120%] scale-[2.5]'; 
  }
  
// DEFAULT for everything else (Akasa, Spicejet, etc.)
  return 'w-[100%] h-[100%] scale-[1.2]'; 
};

const getCabLogo = (providerName: string) => {
  if (!providerName) return null;
  const name = providerName.toLowerCase();
  if (name.includes('hatchback')) return '/Hatchback_logo.jpg';
  if (name.includes('suv')) return '/SUV_logo.jpg';
  if (name.includes('sedan')) return '/sedan_logo.jpg';
  return null;
};

// Edit these values to tweak the zoom of cab images
const getCabLogoStyles = (providerName: string) => {
  if (!providerName) return 'w-[100%] h-[100%] scale-100';
  const name = providerName.toLowerCase();
  
  if (name.includes('hatchback')) return 'w-[120%] h-[100%] scale-120';
  if (name.includes('suv')) return 'w-[100%] h-[100%] scale-100';
  if (name.includes('sedan')) return 'w-[100%] h-[100%] scale-100';
  
  return 'w-[100%] h-[100%] scale-100';
};

// Station/airport code abbreviations for common Indian cities
const CITY_ABBREV: Record<string, string> = {
  'new delhi': 'NDLS', 'delhi': 'NDLS',
  'lucknow': 'LKO',
  'mumbai': 'CSTM', 'bombay': 'CSTM',
  'kolkata': 'HWH', 'calcutta': 'HWH',
  'chennai': 'MAS', 'madras': 'MAS',
  'bangalore': 'SBC', 'bengaluru': 'SBC',
  'hyderabad': 'SC',
  'ahmedabad': 'ADI',
  'pune': 'PUNE',
  'jaipur': 'JP',
  'varanasi': 'BSB',
  'agra': 'AGC',
  'patna': 'PNBE',
  'bhopal': 'BPL',
  'indore': 'INDB',
  'nagpur': 'NGP',
  'surat': 'ST',
  'kanpur': 'CNB',
  'allahabad': 'ALD', 'prayagraj': 'ALD',
  'guwahati': 'GHY',
  'bhubaneswar': 'BBS',
  'visakhapatnam': 'VSKP', 'vizag': 'VSKP',
  'coimbatore': 'CBE',
  'kochi': 'ERS', 'cochin': 'ERS',
  'thiruvananthapuram': 'TVC', 'trivandrum': 'TVC',
  'amritsar': 'ASR',
  'chandigarh': 'CDG',
  'goa': 'MAO', 'panaji': 'MAO',
  'raipur': 'R',
  'ranchi': 'RNC',
  'gorakhpur': 'GKP',
  'mathura': 'MTJ',
};

const cityAbbrev = (city: string) => {
  if (!city) return '???';
  return CITY_ABBREV[city.toLowerCase()] || city.substring(0, 4).toUpperCase();
};

export default function TransportPage() {
  const router = useRouter();
  const trip = useTripStore();
  const budget = useBudgetStore();
  const { activeTheme, currentTheme } = useDestinationTheme();
  
  // Global stores for queue and cache
  const fetchQueue = useFetchQueue();
  const cache = useCacheStore();
  const cachedData = cache.cache;
  const [sortBy, setSortBy] = useState<Record<string, 'recommended' | 'cheapest' | 'fastest' | 'earliest'>>({});

  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [liveModalOpen, setLiveModalOpen] = useState(false);
  const [stationBoardOpen, setStationBoardOpen] = useState(false);
  const [activeTrainId, setActiveTrainId] = useState('');
  
  // Track active transport tab per passenger
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({});

  const [activePassengerId, setActivePassengerId] = useState<string | null>(null);
  const [isPassengerDropdownOpen, setIsPassengerDropdownOpen] = useState(false);
  const [isMapMaximized, setIsMapMaximized] = useState(false);


  useEffect(() => {
    if (trip.passengers.length > 0 && !activePassengerId) {
      setActivePassengerId(trip.passengers[0].id);
    }
  }, [trip.passengers, activePassengerId]);

  useEffect(() => {
    // Preload cinematic images for the /places loading screen asynchronously
    preloadCinematicImages('places');
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMapMaximized) {
        setIsMapMaximized(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isMapMaximized]);

  const handleAccordionClick = (pax: Passenger, type: string) => {
    if (!pax.city) {
      alert(`Please go back to Setup and enter a starting city for ${pax.name || 'this passenger'}`);
      return;
    }
    
    const destination = trip.destination || 'Unknown';
    const key = `${pax.id}-${pax.city}-${destination}-${type}-v10`;
    const isActive = activeTabs[pax.id] === type;

    // Toggle tab
    setActiveTabs({ ...activeTabs, [pax.id]: isActive ? '' : type });
    
    if (!isActive) {
      const data = useCacheStore.getState().cache[key];
      const task = useFetchQueue.getState().tasks.find(t => t.id === key);
      
      // If no valid data is cached, and it's not currently loading, trigger a live fetch!
      if (!data && (!task || task.status === 'idle' || task.status === 'cache_miss' || task.status === 'error')) {
        useFetchQueue.getState().enqueueTask({ id: key, category: 'transport', subType: type, paxId: pax.id, priority: 0, isLive: true });
        useFetchQueue.getState().bumpPriority(key);
      } else if (task && task.status === 'loading') {
        // If it was already loading in the background, jump it to the top so we don't wait
        useFetchQueue.getState().bumpPriority(key);
      }
    }
  };

  // Handle transport selection
  const handleSelectTransport = (paxId: string, option: TransportOption) => {
    const currentPax = trip.passengers.find(p => p.id === paxId);
    const existingSelection = trip.selectedTransports.find(t => t.passengerId === paxId);
    
    // If clicking the currently selected option, deselect it
    if (existingSelection && existingSelection.transportOptionId === option.id) {
      budget.refundExpense('transport', existingSelection.cost);
      trip.deselectTransport(paxId);
      budget.recalcBudget();
      return;
    }

    // Otherwise, select the new one (refunding the old one if it exists)
    if (existingSelection) {
      budget.refundExpense('transport', existingSelection.cost);
    }
    trip.selectTransport(paxId, option);
    budget.addExpense('transport', option.price);
    
    // Automatically apply this choice to other passengers from the SAME origin who have NOT selected any transport yet
    if (currentPax && currentPax.city) {
      const othersWithNoSelection = trip.passengers.filter(p => 
        p.id !== paxId && 
        p.city === currentPax.city && 
        !trip.selectedTransports.find(t => t.passengerId === p.id)
      );

      othersWithNoSelection.forEach(p => {
        trip.selectTransport(p.id, option);
        budget.addExpense('transport', option.price);
      });
    }

    budget.recalcBudget();
  };

  const getTransportIcon = (type: string) => {
    if (type === 'flight') return <Plane className="text-blue-500 shrink-0" size={20} />;
    if (type === 'train') return <Train className="text-orange-500 shrink-0" size={20} />;
    if (type === 'cab' || type === 'car') return <Car className="text-purple-500 shrink-0" size={20} />;
    if (type === 'cross') return <MapPin className="text-amber-500 shrink-0" size={20} />;
    return <Bus className="text-green-500 shrink-0" size={20} />;
  };

  const parseDuration = (dur: string) => {
    const hMatch = dur.match(/(\d+)h/);
    const mMatch = dur.match(/(\d+)m/);
    return (hMatch ? parseInt(hMatch[1]) * 60 : 0) + (mMatch ? parseInt(mMatch[1]) : 0);
  };

  const parseTime = (time: string) => {
    const timePart = time.includes(', ') ? time.split(', ')[1] : time;
    if (!timePart) return 0;
    const [h, m] = timePart.split(':').map(Number);
    return h * 60 + m;
  };

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="min-h-screen bg-transparent transition-colors duration-300">
      
      {/* Hero Header (Full Width) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden mb-10 w-[100vw] -ml-[50vw] left-1/2"
      >
        {/* Full-width satellite map background */}
        <div className={isMapMaximized ? "fixed inset-0 z-[100] w-screen h-screen bg-black" : "relative h-[260px] lg:h-[300px] w-full"}>
          <AnimatedGlobe
            passengers={trip.passengers.filter(p => p.city)}
            destination={trip.destination || ''}
            routeModes={Object.fromEntries(
              trip.passengers
                .filter(p => p.city)
                .map(p => {
                  const sel = trip.selectedTransports.find(t => t.passengerId === p.id);
                  return [p.city!, sel?.transport?.type ?? ''];
                })
                .filter(([, mode]) => mode)
            )}
            isMaximized={isMapMaximized}
          />
          
          {/* Maximize/Minimize Button - Using z-[2000] to overlay leaflet which uses up to 1000 */}
          <button
            onClick={() => setIsMapMaximized(!isMapMaximized)}
            className={`absolute ${isMapMaximized ? 'top-20 md:top-24' : 'top-4'} right-4 z-[2000] p-2 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full text-white transition-all shadow-lg border border-white/10`}
            title={isMapMaximized ? "Minimize Map" : "Maximize Map"}
          >
            {isMapMaximized ? <X size={24} /> : <Maximize size={20} />}
          </button>

          {!isMapMaximized && (
            <>
              {/* Gradient overlay: dark bottom so text is readable */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/10 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

              {/* Text overlaid on map, left aligned within standard max width */}
              <div className="absolute inset-0 flex items-center px-4 lg:px-8 pointer-events-none">
                <div className="max-w-6xl mx-auto w-full">
                  <div>
                    <h1 className="text-4xl font-black mb-2 tracking-tight text-white drop-shadow-lg">How's Everyone<br/><span className="text-primary">Getting There?</span></h1>
                    <p className="text-white/70 text-sm drop-shadow">
                      Travelling to <span className="font-semibold text-white">{trip.destination || 'the destination'}</span>
                      {' · '}{trip.passengers.length} {trip.passengers.length === 1 ? 'traveller' : 'travellers'}
                      {' · '}{(trip.startDate && trip.endDate) ? Math.max(1, Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 3600 * 24))) : 0} days
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 pb-24 text-foreground">
        
        {/* Content */}
        <AnimatePresence mode="wait">
          {trip.passengers.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-8 border-2 border-dashed border-border rounded-xl text-center text-muted-foreground"
            >
              No passengers added yet. Please go back to Setup.
            </motion.div>
          ) : (
            <motion.div 
              key="content"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="flex flex-col lg:flex-row gap-4 lg:gap-8"
            >
              <div className="flex-1 space-y-6 px-4 lg:px-0">
                {/* Passenger Switcher */}
                {trip.passengers.length > 0 && (
                  <div className="relative">
                    <div 
                      id="tutorial-transport-passenger"
                      onClick={() => setIsPassengerDropdownOpen(!isPassengerDropdownOpen)}
                      className={`p-5 rounded-2xl border border-border cursor-pointer flex justify-between items-center shadow-sm hover:border-primary/50 hover:shadow-md transition-all group ${activeTheme.card} ${activeTheme.text}`}
                    >
                      <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                        <div className="hidden sm:flex w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 items-center justify-center shrink-0">
                          <Users size={18} className="text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base sm:text-lg font-bold text-inherit group-hover:text-primary transition-colors truncate">
                            {trip.passengers.find(p => p.id === activePassengerId)?.name || trip.passengers[0].name}
                          </h3>
                          <p className="text-[11px] sm:text-sm text-inherit opacity-100 font-semibold flex items-center gap-1.5 mt-0.5 whitespace-normal">
                            <span className="font-medium">{trip.passengers.find(p => p.id === activePassengerId)?.city || 'Unknown Origin'}</span>
                            <ArrowRight size={12} className="text-primary/60 shrink-0" />
                            <span className="font-medium">{trip.destination}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-[10px] sm:text-xs font-bold text-primary bg-primary/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-primary/20 whitespace-nowrap">{trip.passengers.length} traveller{trip.passengers.length > 1 ? 's' : ''}</span>
                        <ChevronDown className={`transition-transform duration-300 text-inherit opacity-70 shrink-0 ${isPassengerDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {isPassengerDropdownOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={`absolute top-full left-0 right-0 mt-2 border border-border rounded-xl shadow-xl z-50 overflow-hidden ${activeTheme.card} ${activeTheme.text}`}
                        >
                          {trip.passengers.map(p => (
                            <div 
                              key={p.id}
                              onClick={() => {
                                setActivePassengerId(p.id);
                                setIsPassengerDropdownOpen(false);
                              }}
                              className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 flex justify-between items-center ${p.id === activePassengerId ? 'bg-primary/10' : ''}`}
                            >
                              <div>
                                <div className="font-bold text-inherit">{p.name}</div>
                                <div className="text-xs text-inherit opacity-90 font-medium">{p.city || 'Unknown Origin'} → {trip.destination}</div>
                              </div>
                              {p.id === activePassengerId && <CheckCircle2 size={16} className="text-primary" />}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {trip.passengers.filter(p => p.id === (activePassengerId || trip.passengers[0]?.id)).map((pax) => {
                  const selectedTransportId = trip.selectedTransports.find(t => t.passengerId === pax.id)?.transportOptionId;

                  return (
                    <motion.section 
                      variants={itemVariants}
                      key={pax.id} 
                      className={`p-6 rounded-2xl border shadow-lg transition-colors ${activeTheme.card} ${activeTheme.text}`}
                    >
                        {/* Transport Section */}
                    <div className="space-y-5">
                      {/* Transport Type Pills */}
                      <div id="tutorial-transport-options" className="flex flex-wrap sm:flex-nowrap sm:overflow-x-auto no-scrollbar items-center gap-2.5 pb-2">
                        {['flight', 'train', 'bus', 'cab'].map((type) => {
                          const destination = trip.destination || 'Unknown';
                          const key = `${pax.id}-${pax.city}-${destination}-${type}-v10`;
                          const isFetched = cachedData[key] !== undefined;
                          const task = fetchQueue.tasks.find(t => t.id === key);
                          const isLoading = task?.status === 'loading' || task?.status === 'idle';

                          const rawData = cachedData[key] || {};
                          const rawOptions = rawData.options || (Array.isArray(rawData) ? rawData : []);
                          const typeOptionsRaw = rawOptions.filter((o: any) => o.type === type || (type === 'cab' && o.type === 'car'));
                          
                          const currentActive = activeTabs[pax.id] ?? '';
                          const isActive = currentActive === type;
                          const hasError = task?.status === 'error';
                          // Only permanently disable if we got real data back and it was truly empty
                          const isDisabled = isFetched && typeOptionsRaw.length === 0 && !hasError;

                          const typeColors: Record<string, string> = {
                            flight: 'text-blue-500 bg-blue-500/10 border-blue-500/30 data-[active=true]:bg-blue-500/20 data-[active=true]:border-blue-500',
                            train: 'text-orange-500 bg-orange-500/10 border-orange-500/30 data-[active=true]:bg-orange-500/20 data-[active=true]:border-orange-500',
                            bus: 'text-green-500 bg-green-500/10 border-green-500/30 data-[active=true]:bg-green-500/20 data-[active=true]:border-green-500',
                            cab: 'text-purple-500 bg-purple-500/10 border-purple-500/30 data-[active=true]:bg-purple-500/20 data-[active=true]:border-purple-500',
                          };
                          return (
                            <button
                              key={type}
                              data-active={isActive}
                              onClick={() => handleAccordionClick(pax, type)}
                              disabled={isDisabled}
                              className={`w-[calc(50%-5px)] sm:w-[135px] shrink-0 px-2 py-3.5 flex flex-col items-center justify-center gap-1.5 font-bold rounded-2xl border transition-all ${
                                isDisabled
                                  ? 'bg-muted/20 border-border/40 text-muted-foreground/40 cursor-not-allowed'
                                  : isActive
                                    ? `${typeColors[type]} shadow-sm`
                                    : `bg-transparent border-border hover:border-primary/40 hover:shadow-sm`
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {getTransportIcon(type)}
                                <span className="text-sm whitespace-nowrap font-bold">{type === 'bus' ? 'Buses' : type === 'cab' ? 'Cabs' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}</span>
                              </div>
                              <span className={`flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap truncate w-full text-center ${
                                isLoading ? 'text-primary' : isDisabled ? 'text-primary/40' : isActive ? 'opacity-100 text-primary' : 'opacity-80 text-inherit'
                              }`}>
                                {isLoading ? (
                                  <><Loader2 size={10} className="animate-spin shrink-0" /> Loading...</>
                                ) : (!isFetched || hasError ? 'Tap to search' : (typeOptionsRaw.length === 0 ? 'Not available' : `${typeOptionsRaw.length} options`))}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Active Tab Content Area */}
                      <div className="relative">
                        <AnimatePresence mode="wait">
                          {['flight', 'train', 'bus', 'cab'].map((type) => {
                            const destination = trip.destination || 'Unknown';
                            const key = `${pax.id}-${pax.city}-${destination}-${type}-v10`;
                            const isFetched = cachedData[key] !== undefined;
                            const task = fetchQueue.tasks.find(t => t.id === key);
                            const isLoading = task?.status === 'loading' || task?.status === 'idle';

                            const rawData = cachedData[key] || {};
                            const rawOptions = rawData.options || (Array.isArray(rawData) ? rawData : []);
                            const typeOptionsRaw = rawOptions.filter((o: any) => o.type === type || (type === 'cab' && o.type === 'car'));
                            
                            const currentSort = sortBy[key] || '';
                            let typeOptions = [...typeOptionsRaw];
                            if (currentSort === 'cheapest') {
                              typeOptions.sort((a, b) => a.price - b.price);
                            } else if (currentSort === 'fastest') {
                              typeOptions.sort((a, b) => parseDuration(a.duration) - parseDuration(b.duration));
                            } else if (currentSort === 'earliest') {
                              typeOptions.sort((a, b) => parseTime(a.departure) - parseTime(b.departure));
                            }
                            
                            const currentActive = activeTabs[pax.id] ?? '';
                            const isActive = currentActive === type;

                            if (!isActive) return null;

                            return (
                              <motion.div
                                key={type}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="w-full"
                              >
                                <div className="space-y-3">
                                  {isLoading ? (
                                    <div className="flex items-center justify-center p-8 bg-muted/20 border-2 border-border rounded-xl text-muted-foreground font-medium">
                                      <Loader2 className="animate-spin mr-3 shrink-0" size={20} /> Searching live {type === 'bus' ? 'buses' : type + 's'}...
                                    </div>
                                  ) : (
                                    <>
                                      {typeOptions.length > 0 && (
                                        <div className="flex justify-end mb-2">
                                          <div className="relative">
                                            <select 
                                              className="pl-3 pr-8 py-1.5 border border-border rounded-lg bg-background outline-none focus:border-primary text-xs font-medium text-foreground cursor-pointer shadow-sm transition-colors appearance-none"
                                              value={currentSort}
                                              onChange={(e) => setSortBy({ ...sortBy, [key]: e.target.value as any })}
                                            >
                                              <option value="" disabled>Select Sort</option>
                                              <option value="cheapest">Cheapest First</option>
                                              <option value="fastest">Fastest First</option>
                                              <option value="earliest">Earliest Departure</option>
                                            </select>
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                              <ChevronDown size={14} />
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      {typeOptions.length === 0 && isFetched && (
                                        <div className={`flex flex-col items-center justify-center p-8 bg-muted/10 border border-border rounded-xl mt-4 ${activeTheme.text}`}>
                                           <div className="bg-muted/30 p-3 rounded-full mb-3">
                                             <AlertCircle size={24} />
                                           </div>
                                           <h3 className="text-sm font-bold tracking-widest uppercase mb-1">Not Available</h3>
                                           <p className="text-xs text-center">We couldn't find any available {type === 'bus' ? 'buses' : type === 'cab' ? 'cabs' : type + 's'} for this route right now.</p>
                                        </div>
                                      )}
                                      {typeOptions.map((opt, idx) => {
                                        const isSelected = selectedTransportId === opt.id;
                                        
                                        if (opt.type === 'bus') {
                                          const depTimeStr = String(opt.departure).includes('T') ? String(opt.departure).split('T')[1].slice(0,5) : opt.departure;
                                          const arrTimeStr = String(opt.arrival).includes('T') ? String(opt.arrival).split('T')[1].slice(0,5) : opt.arrival;
                                          
                                          return (
                                            <motion.div 
                                              initial={{ opacity: 0, x: -10 }}
                                              animate={{ opacity: 1, x: 0 }}
                                              transition={{ delay: idx * 0.05 }}
                                              key={opt.id}
                                              onClick={() => handleSelectTransport(pax.id, opt)}
                                              className={`relative mb-4 bg-card border cursor-pointer overflow-hidden rounded-2xl transition-shadow p-5 ${isSelected ? 'border-[#d84e55] ring-1 ring-[#d84e55] shadow-md' : 'border-border shadow-sm hover:shadow-md'}`}
                                            >
                                              <div className="flex flex-col gap-5">
                                                {/* Top Row: Info, Timing, Price */}
                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
                                                  
                                                  {/* Provider */}
                                                  <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
                                                    <Bus size={16} className="text-muted-foreground shrink-0" />
                                                    <span className="font-bold text-foreground text-[16px] tracking-tight leading-snug">{opt.provider || 'Bus'}</span>
                                                  </div>

                                                  {/* Timing & Duration */}
                                                  <div className="flex flex-col items-start md:items-center flex-[1.5] w-full md:w-auto">
                                                    <div className="flex items-center gap-3 text-[19px] font-bold text-foreground tracking-wide">
                                                      <span>{depTimeStr}</span>
                                                      <span className="text-muted-foreground/40 font-light text-sm">──</span>
                                                      <span>{arrTimeStr}</span>
                                                    </div>
                                                    <div className="text-[12px] text-muted-foreground font-medium mt-1">
                                                      {opt.duration}
                                                    </div>
                                                  </div>

                                                  {/* Price & Button */}
                                                  <div className="flex flex-row md:flex-col items-center justify-between md:items-end gap-2 flex-1 w-full md:w-auto border-t md:border-t-0 border-border/50 pt-3 md:pt-0">
                                                    <span className="text-xl font-bold text-foreground tracking-tight">₹{opt.price.toLocaleString('en-IN')}</span>
                                                    <button className={`px-5 py-2 text-[13px] font-bold rounded-full transition-colors ${isSelected ? 'bg-orange-500 text-white shadow-md' : 'bg-[#d84e55] hover:bg-[#c64147] text-white shadow-sm hover:shadow-md'}`}>
                                                      {isSelected ? 'SELECTED' : 'Select'}
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            </motion.div>
                                          );
                                        }
                                        
                                        if (opt.type === 'train') {
                                          const trainNum = opt.id.split('_')[1] || '';
                                          const depTimeStr = String(opt.departure).includes('T') ? String(opt.departure).split('T')[1].slice(0,5) : opt.departure;
                                          const arrTimeStr = String(opt.arrival).includes('T') ? String(opt.arrival).split('T')[1].slice(0,5) : opt.arrival;
                                          
                                          const formatIrctcDate = (isoStr: string) => {
                                            try {
                                              if (!isoStr.includes('T')) return isoStr;
                                              const d = new Date(isoStr);
                                              const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                                              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                              return `${days[d.getDay()]}, ${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]}`;
                                            } catch (e) {
                                              return isoStr;
                                            }
                                          };

                                          const depDateStr = formatIrctcDate(opt.departure);
                                          const arrDateStr = formatIrctcDate(opt.arrival);
                                          
                                          // Format duration from "12h 30m" to "12:30"
                                          let formattedDur = opt.duration;
                                          try {
                                            const hMatch = opt.duration.match(/(\d+)h/);
                                            const mMatch = opt.duration.match(/(\d+)m/);
                                            if (hMatch && mMatch) {
                                              formattedDur = `${hMatch[1].padStart(2, '0')}:${mMatch[1].padStart(2, '0')}`;
                                            }
                                          } catch(e) {}

                                          return (
                                            <motion.div 
                                              initial={{ opacity: 0, x: -10 }}
                                              animate={{ opacity: 1, x: 0 }}
                                              transition={{ delay: idx * 0.05 }}
                                              key={opt.id}
                                              onClick={() => handleSelectTransport(pax.id, opt)}
                                              className={`relative mb-4 bg-card border cursor-pointer overflow-hidden rounded-sm transition-shadow ${isSelected ? 'border-primary ring-1 ring-primary shadow-md' : 'border-border shadow-sm hover:shadow-md'}`}
                                            >
                                              {/* Header */}
                                              <div className="px-5 pt-4 pb-2">
                                                <div className="font-bold text-card-foreground text-[15px] sm:text-[16px] uppercase tracking-wide">
                                                  {opt.provider} ({trainNum})
                                                </div>
                                              </div>

                                              {/* Body */}
                                              <div className="px-4 sm:px-5 pb-4 pl-7 sm:pl-9">
                                                {/* Times & Duration */}
                                                <div className="flex justify-between items-center mt-3">
                                                  {/* Departure */}
                                                  <div className="flex flex-col items-start w-[32%]">
                                                    <span className="text-2xl sm:text-3xl font-light text-card-foreground tracking-tight">{depTimeStr}</span>
                                                    <span className="text-[11px] sm:text-[13px] text-card-foreground mt-2 sm:mt-3 uppercase truncate max-w-full tracking-wide" title={pax.city}>{pax.city}</span>
                                                    <span className="text-[11px] sm:text-[13px] text-card-foreground opacity-70 mt-0.5">{depDateStr}</span>
                                                  </div>
                                                  
                                                  {/* Duration Line */}
                                                  <div className="flex flex-col items-center justify-start flex-1 px-1 relative -mt-8 sm:-mt-10">
                                                    <div className="flex items-center w-full">
                                                      <div className="h-[1px] bg-border flex-1"></div>
                                                      <span className="text-[13px] sm:text-[15px] text-card-foreground mx-2 sm:mx-3 tracking-wider">{formattedDur}</span>
                                                      <div className="h-[1px] bg-border flex-1"></div>
                                                    </div>
                                                  </div>
                                                  
                                                  {/* Arrival */}
                                                  <div className="flex flex-col items-end w-[32%]">
                                                    <span className="text-2xl sm:text-3xl font-light text-card-foreground tracking-tight">{arrTimeStr}</span>
                                                    <span className="text-[11px] sm:text-[13px] text-card-foreground mt-2 sm:mt-3 uppercase truncate max-w-full tracking-wide" title={trip.destination}>{trip.destination}</span>
                                                    <span className="text-[11px] sm:text-[13px] text-card-foreground opacity-70 mt-0.5">{arrDateStr}</span>
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              {/* Bottom Section */}
                                              <div className="px-4 sm:px-5 py-3 bg-muted/10 border-t border-border">
                                                <div className="flex items-center gap-2 sm:gap-3">
                                                  <button className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 text-[13px] sm:text-[14px] font-bold rounded-sm transition-colors ${isSelected ? 'bg-[#f4a261] text-white border border-[#f4a261] dark:bg-[#f4a261]/80' : 'bg-[#facca9] text-white border border-[#facca9] hover:bg-[#f4a261] dark:bg-[#facca9]/50 dark:hover:bg-[#f4a261]/80'}`}>
                                                    {isSelected ? 'SELECTED' : 'Select'}
                                                  </button>
                                                  <div className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 text-[13px] sm:text-[14px] font-bold rounded-sm border border-border/70 bg-transparent text-card-foreground uppercase flex items-center justify-center">
                                                    ₹{opt.price.toLocaleString('en-IN')}
                                                  </div>
                                                </div>
                                              </div>
                                            </motion.div>
                                          );
                                        }

                                        return (
                                          <motion.div 
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            key={opt.id}
                                            onClick={() => handleSelectTransport(pax.id, opt)}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            className={`
                                              relative flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-colors

                                              ${isSelected 
                                                ? 'border-primary bg-primary/10 shadow-sm' 
                                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                              }
                                            `}
                                          >
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full">
                                                {/* Top Row on Mobile / Left Section on Desktop */}
                                                <div className="flex items-center gap-3 w-full sm:flex-1 min-w-0">
                                                  <div className="shrink-0">
                                                    {isSelected ? (
                                                      <CheckCircle2 className="text-primary" size={20} />
                                                    ) : (
                                                      <Circle className="text-muted-foreground/50" size={20} />
                                                    )}
                                                  </div>
                                                  
                                                  {opt.type === 'flight' && getAirlineLogo(opt.provider) ? (
                                                    <div className="bg-white rounded-lg shadow-sm border border-border flex items-center justify-center overflow-hidden shrink-0 w-[64px] h-[40px] sm:w-[100px] sm:h-[60px]">
                                                      <img 
                                                        src={getAirlineLogo(opt.provider)!} 
                                                        alt={opt.type === 'flight' ? (opt.provider || '').split('|')[0].trim() : opt.provider} 
                                                        className={`object-contain mix-blend-multiply ${getAirlineLogoStyles(opt.provider)}`}
                                                        style={{ imageRendering: 'high-quality' as any }}
                                                      />
                                                    </div>
                                                  ) : (opt.type === 'cab' || opt.type === 'car') && getCabLogo(opt.provider) ? (
                                                    <div className="bg-white rounded-lg shadow-sm border border-border flex items-center justify-center overflow-hidden shrink-0 w-[64px] h-[40px] sm:w-[100px] sm:h-[60px]">
                                                      <img 
                                                        src={getCabLogo(opt.provider)!} 
                                                        alt={opt.provider} 
                                                        className={`object-contain mix-blend-multiply ${getCabLogoStyles(opt.provider)}`}
                                                        style={{ imageRendering: 'high-quality' as any }}
                                                      />
                                                    </div>
                                                  ) : (
                                                    <div className="bg-background rounded-lg shadow-sm border border-border flex items-center justify-center shrink-0 w-[32px] h-[32px] sm:w-[56px] sm:h-[56px]">
                                                      <div className="scale-75 sm:scale-100">{getTransportIcon(opt.type)}</div>
                                                    </div>
                                                  )}
                                                  
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                                      <div className="flex flex-col font-bold uppercase tracking-wider text-[11px] sm:text-sm leading-tight break-words">
                                                        {opt.type === 'flight' ? (
                                                          (opt.provider || '').split('*')[0].split('|').map((part: string, i: number) => (
                                                            <span key={i} className={i >= 1 ? "text-[9px] sm:text-[11px] text-inherit opacity-100 mt-0.5 font-semibold" : ""}>{part.trim()}</span>
                                                          ))
                                                        ) : (
                                                          <span>{opt.provider || opt.type}</span>
                                                        )}
                                                      </div>
                                                      {/* Desktop Badge */}
                                                      {opt.type !== 'cross' && isSelected && (
                                                        <div className="hidden sm:flex items-center gap-1.5 text-[9px] text-inherit opacity-100 bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded-full border border-border/50 w-fit shrink-0">
                                                          <span className="font-bold uppercase truncate max-w-[120px] text-inherit">{pax.city}</span>
                                                          <ArrowRight size={10} className="text-primary/80 shrink-0"/>
                                                          <span className="font-bold uppercase truncate max-w-[120px] text-inherit">{trip.destination}</span>
                                                        </div>
                                                      )}
                                                    </div>
                                                    
                                                    {opt.type !== 'cross' && (
                                                      <div className="hidden sm:flex text-sm text-inherit opacity-100 font-medium mt-1 items-center gap-1 flex-wrap">
                                                        <span>{String(opt.departure).includes('T') ? String(opt.departure).split('T')[1].slice(0,5) : opt.departure}</span>
                                                        <ArrowRight className="inline mx-1" size={12}/>
                                                        <span className="flex items-center">
                                                          {String(opt.arrival).includes('T') ? String(opt.arrival).split('T')[1].slice(0,5) : opt.arrival}
                                                          {String(opt.departure).includes('T') && String(opt.arrival).includes('T') && (
                                                            (() => {
                                                              const d1 = new Date(String(opt.departure).split('T')[0]);
                                                              const d2 = new Date(String(opt.arrival).split('T')[0]);
                                                              const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
                                                              return diffDays > 0 ? (
                                                                <span className="text-[9px] font-bold text-red-500 ml-1 mb-2">+{diffDays} DAY</span>
                                                              ) : null;
                                                            })()
                                                          )}
                                                        </span>
                                                        <span className="ml-1">({opt.duration})</span>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Bottom Row on Mobile / Right Section on Desktop */}
                                                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-2 sm:pt-0 mt-1 sm:mt-0 border-t sm:border-t-0 border-border/40 sm:shrink-0">
                                                  {/* Mobile Time/Duration + Badge */}
                                                  <div className="flex sm:hidden flex-col gap-1.5 min-w-0 flex-1">
                                                    {opt.type !== 'cross' && (
                                                      <div className="text-[10px] text-inherit opacity-100 font-medium flex items-center gap-1 flex-wrap">
                                                        <span>{String(opt.departure).includes('T') ? String(opt.departure).split('T')[1].slice(0,5) : opt.departure}</span>
                                                        <ArrowRight className="inline mx-0.5" size={10}/>
                                                        <span className="flex items-center">
                                                          {String(opt.arrival).includes('T') ? String(opt.arrival).split('T')[1].slice(0,5) : opt.arrival}
                                                          {String(opt.departure).includes('T') && String(opt.arrival).includes('T') && (
                                                            (() => {
                                                              const d1 = new Date(String(opt.departure).split('T')[0]);
                                                              const d2 = new Date(String(opt.arrival).split('T')[0]);
                                                              const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
                                                              return diffDays > 0 ? (
                                                                <span className="text-[8px] font-bold text-red-500 ml-1 mb-1">+{diffDays} DAY</span>
                                                              ) : null;
                                                            })()
                                                          )}
                                                        </span>
                                                        <span className="ml-0.5 text-[9px]">({opt.duration})</span>
                                                      </div>
                                                    )}
                                                    
                                                    {opt.type !== 'cross' && isSelected && (
                                                      <div className="flex items-center gap-1 text-[8px] text-inherit opacity-100 font-medium bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-sm border border-border/50 w-fit shrink-0">
                                                        <span className="font-bold uppercase truncate max-w-[90px] text-inherit">{pax.city}</span>
                                                        <ArrowRight size={8} className="text-primary/80 shrink-0"/>
                                                        <span className="font-bold uppercase truncate max-w-[90px] text-inherit">{trip.destination}</span>
                                                      </div>
                                                    )}
                                                  </div>

                                                  <div className="text-right shrink-0 ml-auto">
                                                    <div className="text-sm sm:text-xl font-bold text-inherit">₹{opt.price.toLocaleString('en-IN')}</div>
                                                    {opt.price_breakdown && (
                                                      <div className="flex flex-col items-end text-[11px] sm:text-xs text-inherit opacity-80 mt-1 gap-0.5 font-medium">
                                                        {Object.entries(opt.price_breakdown).map(([label, price]) => (
                                                          <span key={label}>{label}: {opt.time_breakdown?.[label]} • ₹{(price as number).toLocaleString('en-IN')}</span>
                                                        ))}
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              
                                                {opt.type === 'cross' && opt.legs && (
                                                  <div className="mt-3 space-y-2 border-t border-border pt-3 w-full sm:w-auto col-span-full" onClick={(e) => e.stopPropagation()}>
                                                    {opt.legs.map((leg: any, lIdx: number) => (
                                                      <div key={lIdx} className="flex justify-between items-center text-[10px] sm:text-xs bg-background/50 p-2 rounded-lg border border-border">
                                                        <div className="flex items-center gap-2">
                                                          <div className="scale-75 origin-left">{getTransportIcon(leg.mode)}</div>
                                                          <span className="font-semibold text-inherit opacity-80">{leg.source} → {leg.destination}</span>
                                                        </div>
                                                        <div className="text-inherit opacity-70 flex gap-3 text-right">
                                                          <span className="truncate max-w-[60px] sm:max-w-none">{leg.provider}</span>
                                                          <span className="font-medium">₹{leg.price}</span>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                            </div>
                                          </motion.div>
                                        );
                                      })}
                                    </>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.section>
                );
              })}
              </div>

              {/* Right Column: Selections Summary */}
              <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 space-y-4 px-4 lg:px-0">
                <div className="sticky top-24 space-y-4">

                  {/* Summary Card */}
                  <div className={`rounded-2xl border border-border shadow-lg overflow-hidden ${activeTheme.card} ${activeTheme.text}`}>
                    {/* Header */}
                    <div className="px-5 pt-5 pb-4 border-b border-border/60" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)/0.08) 0%, transparent 100%)' }}>
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-primary" />
                          Transport Summary
                        </h2>
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full border border-primary/20">
                          {trip.passengers.filter(p => trip.selectedTransports.find(t => t.passengerId === p.id)).length}/{trip.passengers.length} selected
                        </span>
                      </div>
                    </div>

                    {/* Passenger cards */}
                    <div className="p-4 space-y-3">
                      {trip.passengers.map(pax => {
                        const selectedOption = trip.selectedTransports.find(t => t.passengerId === pax.id);
                        const tr = selectedOption?.transport;
                        
                        const depTime = tr ? (String(tr.departure).includes('T') ? String(tr.departure).split('T')[1].slice(0,5) : tr.departure) : null;
                        const arrTime = tr ? (String(tr.arrival).includes('T') ? String(tr.arrival).split('T')[1].slice(0,5) : tr.arrival) : null;
                        
                        const formatShortDate = (isoStr: string) => {
                          try {
                            if (!isoStr.includes('T')) return '';
                            const d = new Date(isoStr);
                            return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                          } catch { return ''; }
                        };
                        const depDate = tr ? formatShortDate(String(tr.departure)) : '';
                        const arrDate = tr ? formatShortDate(String(tr.arrival)) : '';
                        
                        const modeColor: Record<string, string> = {
                          flight: 'text-blue-500',
                          train: 'text-orange-500',
                          bus: 'text-green-500',
                          cab: 'text-purple-500',
                          car: 'text-purple-500',
                        };
                        const modeBg: Record<string, string> = {
                          flight: 'bg-blue-500/10 border-blue-500/20',
                          train: 'bg-orange-500/10 border-orange-500/20',
                          bus: 'bg-green-500/10 border-green-500/20',
                          cab: 'bg-purple-500/10 border-purple-500/20',
                          car: 'bg-purple-500/10 border-purple-500/20',
                        };

                        return (
                          <div key={pax.id} className={`rounded-xl border overflow-hidden transition-all ${tr ? 'border-border' : 'border-dashed border-border/50'}`}>
                            {/* Pax name bar */}
                            <div className="flex items-center justify-between px-3 py-2 bg-black/5 dark:bg-white/5 border-b border-border/40">
                              <span className="text-xs font-bold text-inherit uppercase tracking-wider">{pax.name}</span>
                              {tr && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${modeBg[tr.type] || 'bg-black/10 border-border'} ${modeColor[tr.type] || 'text-inherit'} uppercase tracking-wider`}>
                                  {tr.type}
                                </span>
                              )}
                            </div>

                            {tr ? (
                              <div className="p-3 space-y-2">
                                {/* Provider + Price */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {tr.type === 'flight' && getAirlineLogo(tr.provider) ? (
                                      <div className="bg-white rounded-md border border-border flex items-center justify-center overflow-hidden shrink-0" style={{ width: '36px', height: '24px' }}>
                                        <img src={getAirlineLogo(tr.provider)!} alt={tr.type === 'flight' ? (tr.provider || '').split('|')[0].trim() : tr.provider} className={`object-contain mix-blend-multiply ${getAirlineLogoStyles(tr.provider)}`} />
                                      </div>
                                    ) : (tr.type === 'cab' || tr.type === 'car') && getCabLogo(tr.provider) ? (
                                      <div className="bg-white rounded-md border border-border flex items-center justify-center overflow-hidden shrink-0" style={{ width: '36px', height: '24px' }}>
                                        <img src={getCabLogo(tr.provider)!} alt={tr.provider} className={`object-contain mix-blend-multiply ${getCabLogoStyles(tr.provider)}`} />
                                      </div>
                                    ) : (
                                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${modeBg[tr.type] || 'bg-muted border-border'}`}>
                                        <div className="scale-75">{getTransportIcon(tr.type)}</div>
                                      </div>
                                    )}
                                    <span className="text-xs font-bold text-inherit truncate leading-tight">
                                      {tr.type === 'flight' ? (tr.provider || '').split('*')[0].split('|')[0].trim() : tr.provider || tr.type}
                                    </span>
                                  </div>
                                  <span className="text-sm font-black text-inherit shrink-0">₹{tr.price.toLocaleString('en-IN')}</span>
                                </div>

                                {/* Departure / Arrival times */}
                                <div className="bg-current/5 rounded-lg border border-current/10 px-3 py-2 flex items-center gap-2">
                                  <div className="text-center min-w-0 flex-1">
                                    <div className="text-[15px] font-black text-inherit">{depTime}</div>
                                    <div className="text-[10px] text-inherit font-bold uppercase">{cityAbbrev(pax.city || '')}</div>
                                    {depDate && <div className="text-[9px] text-inherit font-bold mt-0.5">{depDate}</div>}
                                  </div>
                                  <div className="flex flex-col items-center flex-1 min-w-0">
                                    <div className="text-[9px] text-inherit font-bold uppercase tracking-wider">{tr.duration}</div>
                                    <div className="relative w-full flex items-center my-1">
                                      <div className="h-[1px] bg-border flex-1"></div>
                                      <div className={`mx-1 ${modeColor[tr.type] || 'text-primary'}`}>
                                        {tr.type === 'flight' ? <Plane size={10} className="rotate-45" fill="currentColor" /> : tr.type === 'train' ? <Train size={10} /> : tr.type === 'bus' ? <Bus size={10} /> : <Car size={10} />}
                                      </div>
                                      <div className="h-[1px] bg-border flex-1"></div>
                                    </div>
                                  </div>
                                  <div className="text-center min-w-0 flex-1">
                                    <div className="text-[15px] font-black text-inherit">{arrTime}</div>
                                    <div className="text-[10px] text-inherit font-bold uppercase">{cityAbbrev(trip.destination || '')}</div>
                                    {arrDate && <div className="text-[9px] text-inherit font-bold mt-0.5">{arrDate}</div>}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 flex items-center gap-2 text-xs text-inherit opacity-100 font-medium">
                                <AlertCircle size={13} className="text-amber-400 shrink-0" />
                                <span>No transport selected</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Total footer */}
                    {trip.selectedTransports.length > 0 && (
                      <div className="px-5 py-4 border-t border-border/60 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)/0.05) 0%, transparent 100%)' }}>
                        <span className="text-xs font-bold text-inherit opacity-70 uppercase tracking-wider">Total Transport</span>
                        <span className="text-lg font-black text-inherit">
                          ₹{trip.selectedTransports.reduce((sum, t) => sum + t.cost, 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>


            </motion.div>
          )}
        </AnimatePresence>

        {/* CONTINUATION */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-between items-center mt-8 pt-8 border-t border-border px-4 lg:px-0"
        >
          <button 
            onClick={() => router.push('/plan/setup')}
            className={`${activeTheme.text} font-medium transition-colors hover:opacity-70`}
          >
            ← Back to Setup
          </button>
          <motion.button 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/plan/places')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all"
          >
            Discover Places <ArrowRight size={20} />
          </motion.button>
        </motion.div>
      </div>

      {/* Prompt removed as requested */}

      <TrainRouteModal 
        isOpen={routeModalOpen} 
        onClose={() => setRouteModalOpen(false)} 
        trainNumber={activeTrainId} 
      />
      <LiveStatusModal 
        isOpen={liveModalOpen} 
        onClose={() => setLiveModalOpen(false)} 
        trainNumber={activeTrainId} 
      />
      <StationBoardModal 
        isOpen={stationBoardOpen} 
        onClose={() => setStationBoardOpen(false)} 
        stationCode={trip.destination}
        stationName={trip.destination}
      />

      <TutorialOverlay 
        tutorialKey="plan-transport"
        steps={[
          {
            targetId: 'tutorial-transport-passenger',
            title: 'Change Traveller',
            text: 'Click on the top to change the traveller'
          },
          {
            targetId: 'tutorial-transport-options',
            title: 'Transport Modes',
            text: 'Click on a box to view the options to go to the destination using that type of transport'
          }
        ]}
      />
    </div>
  );
}
