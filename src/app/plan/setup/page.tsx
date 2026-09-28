'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTripStore } from '@/store/tripStore';
import { useBudgetStore } from '@/store/budgetStore';
import { useItineraryStore } from '@/store/itineraryStore';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import CityAutocomplete from '@/components/CityAutocomplete';
import ModernDateRangePicker from '@/components/ModernDateRangePicker';
import { Plus, Trash2, ArrowRight, AlertCircle, CheckCircle2, ChevronDown, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useCacheStore } from '@/store/cacheStore';
import { useFetchQueue } from '@/store/fetchQueueStore';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedGlobe from '@/components/AnimatedGlobe';
import TutorialOverlay from '@/components/TutorialOverlay';
import { UserAvatar } from '@/components/UserAvatar';
import { useDestinationTheme } from '@/hooks/useDestinationTheme';
import ImagePrefetcher from '@/components/ImagePrefetcher';

const TRIP_STYLES = [
  { id: 'family', label: 'Family' },
  { id: 'solo', label: 'Solo' },
  { id: 'romantic', label: 'Romantic' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'luxury', label: 'Luxury' }
];

const GenderSelect = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ];

  const selectedLabel = options.find(o => o.value === value)?.label || 'Select';

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-10 bg-background border border-input rounded-lg px-2.5 sm:px-3 text-xs sm:text-sm text-foreground font-medium flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer hover:border-primary/50"
      >
        <span className={!value ? 'text-muted-foreground/70 font-normal' : 'capitalize font-semibold'}>{selectedLabel}</span>
        <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 shrink-0 ml-1 ${open ? 'rotate-180 text-primary' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden p-1 space-y-0.5"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-between cursor-pointer ${
                  value === opt.value
                    ? 'bg-primary/20 text-primary font-bold'
                    : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <span>{opt.label}</span>
                {value === opt.value && <Check size={14} className="text-primary shrink-0 ml-2" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function TripSetupPage() {
  const router = useRouter();
  const trip = useTripStore();
  const budget = useBudgetStore();
  const { user } = useAuthStore();
  const [tripStyle, setTripStyle] = useState('family');
  const [error, setError] = useState('');
  const [savedPassengers, setSavedPassengers] = useState<any[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [focusedPaxId, setFocusedPaxId] = useState<string | null>(null);

  const { activeTheme, dynamicBg, currentTheme } = useDestinationTheme();

  const displayToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  React.useEffect(() => {
    if (user) {
      fetch('/api/passengers', {
        headers: { 'x-user-id': user.id }
      })
        .then(res => res.json())
        .then(data => {
          if (data.passengers) setSavedPassengers(data.passengers);
        })
        .catch(console.error);
    }
  }, [user]);

  const handleAddPassenger = () => {
    trip.addPassenger({
      id: `pax_${Date.now()}`,
      tripId: 'TRIP_CURRENT',
      name: '',
      age: '' as unknown as number,
      gender: '' as any,
      pincode: '',
      city: '',
      transportPreference: 'any'
    });
    displayToast('Passenger Added');
  };

  const handleContinue = async () => {
    setError('');
    
    // Check trip planning limit
    if (user && !user.isAdmin && (user.tripsToday || 0) >= 10) {
      setError('You have reached the limit for Plan a Trip feature today, higher limits will be available for Pro users soon.');
      return;
    }

    const validPassengers = trip.passengers.filter(p => p.name.trim() !== '');
    if (validPassengers.length === 0) {
      setError('Please add at least one passenger.');
      return;
    }
    if (!budget.totalBudget || budget.totalBudget <= 0) {
      setError('Please enter a valid total budget for the trip.');
      return;
    }

    if (user) {
      const passengersToSave = validPassengers.filter(p => p.remember);
      if (passengersToSave.length > 0) {
        await Promise.all(passengersToSave.map(p => 
          fetch('/api/passengers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
            body: JSON.stringify({ name: p.name, age: p.age, gender: p.gender, city: p.city })
          }).catch(console.error)
        ));
      }
    }

    const dest = trip.destination;
    
    if (!dest) {
      setError('Please select a destination.');
      return;
    }

    if (trip.passengers.some(p => p.city && p.city.toLowerCase() === dest.toLowerCase())) {
      setError('Source and destination cannot be the same.');
      return;
    }

    router.push('/plan/transport');
  };

  return (
    <div className={`w-full h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-2 sm:p-4 md:p-8 transition-all duration-1000 overflow-hidden`} style={{ fontFamily: "'Outfit', sans-serif" }}>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full h-[calc(100vh-4.5rem)] md:h-[min(800px,85vh)] md:max-w-4xl relative flex flex-col-reverse md:flex-row shadow-2xl md:shadow-[0_40px_100px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden border border-border"
      >
        
        {/* Main Configuration Body */}
        <div 
          className={`w-full md:w-auto md:flex-1 lg:flex-[1.2] flex-[1.5] shrink-0 p-3 sm:p-4 md:p-6 lg:p-12 relative md:border-r transition-all duration-1000 overflow-y-auto overflow-x-hidden ${activeTheme.card} ${activeTheme.text}`}
        >
          <div className="flex justify-between items-center mb-4 md:mb-10 relative z-10">
            <h2 className="text-lg md:text-3xl font-light tracking-tight">Trip Details</h2>
          </div>

          <div className="space-y-6 md:space-y-10 relative z-10">
            {/* Row 1: Destination & Dates */}
            <div className="grid grid-cols-2 gap-2 md:gap-8">
              <div id="tutorial-step-destination" className="space-y-1.5 sm:space-y-3 min-w-0 rounded-lg">
                <label className={`block text-[9px] sm:text-[11px] font-bold uppercase tracking-widest text-inherit opacity-70`}>Destination</label>
                <div className="relative text-white z-50">
                  <CityAutocomplete 
                    label="" 
                    placeholder="Where to?" 
                    value={trip.destination} 
                    onChange={(val) => {
                      if (val !== trip.destination) {
                        budget.reset();
                        useItineraryStore.getState().reset();
                        useCacheStore.getState().clearCache();
                        useFetchQueue.getState().clearQueue();
                        trip.setTripDetails({ destination: val, selectedTransports: [], selectedHotel: null });
                        trip.logTripAttempt('STARTED');
                      }
                    }} 
                  />
                  {trip.destination && trip.passengers.some(p => p.city && p.city.toLowerCase() === trip.destination.toLowerCase()) && (
                    <div className="absolute top-full mt-1.5 left-0 text-red-500 text-[11px] font-medium flex items-center gap-1.5 bg-red-500/10 px-2 py-1.5 rounded-md backdrop-blur-sm border border-red-500/20 whitespace-nowrap">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>Enter a valid destination (current city and the destination are same for the traveller)</span>
                    </div>
                  )}
                </div>
              </div>

              <div id="tutorial-step-dates" className="space-y-1.5 sm:space-y-3 min-w-0 rounded-lg">
                <label className={`block text-[9px] sm:text-[11px] font-bold uppercase tracking-widest text-inherit opacity-70`}>Dates</label>
                <div className="relative text-white z-40">
                  <ModernDateRangePicker 
                    label=""
                    startDate={trip.startDate}
                    endDate={trip.endDate}
                    onChange={(start, end) => {
                      const datesChanged = start !== trip.startDate || end !== trip.endDate;
                      if (datesChanged) {
                        // Dates only affect transport (flights/trains/cabs are date-dependent);
                        // places/food/hotels caches and selections stay put.
                        trip.selectedTransports.forEach(t => budget.refundExpense('transport', t.cost));
                        useFetchQueue.getState().clearTasksByCategory('transport');
                      }
                      trip.setTripDetails({ startDate: start, endDate: end });
                      if (start && end) {
                        trip.logTripAttempt('DATES_SET');
                      }
                    }}
                    minDate={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Budget */}
            <div id="tutorial-step-budget" className="space-y-1.5 sm:space-y-3 pt-2 sm:pt-4">
              <label className={`block text-[9px] sm:text-[11px] font-bold uppercase tracking-widest text-inherit opacity-70`}>Total Budget (INR)</label>
              <div className="relative">
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 text-xl sm:text-2xl font-light ${activeTheme.text}`}>₹</span>
                <input 
                  type="number"
                  min="0"
                  value={budget.totalBudget || ''}
                  onChange={(e) => budget.setTotalBudget(Math.max(0, Number(e.target.value)))}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="100000"
                  className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full bg-transparent text-xl sm:text-3xl font-light pl-6 sm:pl-8 py-2 focus:outline-none placeholder:opacity-50 border-b-2 transition-colors ${activeTheme.text} border-current focus:border-primary/50 ${currentTheme !== 'default' ? 'placeholder:text-current' : 'placeholder:text-muted-foreground/50'}`}
                />
              </div>
            </div>

            {/* Passengers Section */}
            <div id="tutorial-step-passenger" className="pt-4 sm:pt-8 flex flex-col">
               <div className="flex justify-between items-center mb-2 sm:mb-4">
                  <label className={`text-[9px] sm:text-[11px] font-bold uppercase tracking-widest text-inherit opacity-70`}>Passengers</label>
                  <button 
                    onClick={handleAddPassenger}
                    className={`text-[9px] sm:text-[11px] font-bold uppercase tracking-widest flex items-center gap-1 sm:gap-1.5 transition-colors text-inherit opacity-70 hover:opacity-100 whitespace-nowrap`}
                  >
                   <Plus size={12}/> Add Passenger
                 </button>
               </div>



               <div className="space-y-3 sm:space-y-4 pr-1 sm:pr-2 pb-4">
                  {trip.passengers.map((pax, index) => (
                    <div key={pax.id} className={`p-3 sm:p-5 rounded-xl border relative transition-all group ${currentTheme !== 'default' ? 'bg-white/40' : 'bg-card/50'} border-current/20`}>
                      
                      <div className="flex justify-between items-start mb-3 sm:mb-5">
                        <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-inherit`}>
                          Passenger {String(index + 1).padStart(2, '0')}
                        </span>
                        {index > 0 && (
                          <button onClick={() => trip.removePassenger(pax.id)} className="text-red-600 hover:text-red-700 transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
                            <Trash2 size={12} /> Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 relative">
                        {/* Name Input */}
                        <div className="md:col-span-6 relative z-30">
                          <label className={`block text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-1.5 truncate text-inherit opacity-70`}>Full Name</label>
                          <input 
                            type="text" placeholder="e.g. John Doe"
                            className="w-full h-10 bg-background border border-input rounded-lg px-3 text-sm text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-muted-foreground/50"
                            value={pax.name} 
                            onChange={(e) => trip.updatePassenger(pax.id, { name: e.target.value.replace(/[^a-zA-Z\s]/g, '') })}
                          />
                          {pax.name && [...savedPassengers, ...trip.passengers.filter(p => p.remember && p.id !== pax.id && p.name)]
                            .filter((sp, index, self) => index === self.findIndex((t) => t.name === sp.name))
                            .filter(sp => sp.name.toLowerCase().startsWith(pax.name.toLowerCase()) && sp.name.toLowerCase() !== pax.name.toLowerCase()).length > 0 && (
                            <div className={`absolute top-full left-0 right-0 mt-2 border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto bg-white dark:bg-zinc-900 border-border text-black dark:text-white`}>
                              {[...savedPassengers, ...trip.passengers.filter(p => p.remember && p.id !== pax.id && p.name)]
                                .filter((sp, index, self) => index === self.findIndex((t) => t.name === sp.name))
                                .filter(sp => sp.name.toLowerCase().startsWith(pax.name.toLowerCase()) && sp.name.toLowerCase() !== pax.name.toLowerCase())
                                .map((sp, idx) => (
                                  <button
                                    key={idx}
                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors border-b last:border-0 border-border`}
                                    onClick={() => {
                                      trip.updatePassenger(pax.id, {
                                        name: sp.name,
                                        age: sp.age,
                                        gender: sp.gender as any,
                                        city: sp.city || pax.city,
                                        remember: true
                                      });
                                    }}
                                  >
                                    <div className="font-bold text-inherit">{sp.name}</div>
                                    <div className="text-[10px] opacity-70 mt-1 tracking-wide uppercase">{sp.city || 'Unknown City'} • {sp.age}yo • {sp.gender}</div>
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>

                        {/* Age Input */}
                        <div className="md:col-span-3 relative z-20">
                          <label className={`block text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-1.5 truncate text-inherit opacity-70`}>Age</label>
                          <input 
                            type="number" placeholder="Years" min="1" max="120"
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full h-10 bg-background border border-input rounded-lg px-3 text-sm text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-muted-foreground/50"
                            onWheel={(e) => e.currentTarget.blur()}
                            value={pax.age || ''} 
                            onChange={(e) => {
                              const cleanStr = e.target.value.replace(/\D/g, '');
                              const val = parseInt(cleanStr);
                              trip.updatePassenger(pax.id, { age: isNaN(val) ? '' as any : Math.max(1, val) });
                            }}
                          />
                        </div>

                        {/* Gender Select */}
                        <div className="md:col-span-3 relative z-20">
                          <label className={`block text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-1.5 truncate text-inherit opacity-70`}>Gender</label>
                          <GenderSelect 
                            value={pax.gender || ''} 
                            onChange={(val) => trip.updatePassenger(pax.id, { gender: val as any })} 
                          />
                        </div>

                        {/* City Input */}
                        <div className="md:col-span-6 relative z-10">
                          <label className={`block text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-1.5 truncate text-inherit opacity-70`}>Current City</label>
                          <CityAutocomplete 
                            label="" placeholder="Where is this person currently" 
                            value={pax.city || ''} 
                            onChange={(val) => trip.updatePassenger(pax.id, { city: val })} 
                          />
                        </div>

                        {/* Remember Checkbox */}
                        <div className="md:col-span-6 flex items-end pb-2 sm:pl-2">
                           <label className={`flex items-center gap-2 cursor-pointer text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-colors text-inherit opacity-70 hover:opacity-100`}>
                             <input 
                               type="checkbox" 
                               checked={pax.remember || false}
                               onChange={(e) => trip.updatePassenger(pax.id, { remember: e.target.checked })}
                               className="accent-primary w-3.5 h-3.5 rounded-md border-border bg-muted/30 cursor-pointer"
                             />
                             Remember this passenger
                           </label>
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              {error && (
                <div className="mb-4 text-red-400 text-[11px] font-bold uppercase tracking-widest bg-red-500/10 px-4 py-3 rounded-lg shadow-sm backdrop-blur-md text-center">
                  {error}
                </div>
              )}
              <button 
                onClick={handleContinue}
                className={`group w-full py-3 sm:py-4 font-bold uppercase tracking-widest text-[9px] sm:text-xs transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2.5 rounded-xl shadow-lg whitespace-nowrap overflow-hidden px-2 hover:-translate-y-1 hover:shadow-2xl hover:brightness-105 active:translate-y-0 active:scale-[0.98] active:shadow-md bg-black text-white dark:bg-white dark:text-black`}
              >
                <span>Continue to Transport</span> <ArrowRight size={14} className="shrink-0 transition-transform group-hover:translate-x-1"/>
              </button>
            </div>

          </div>
        </div>

        {/* Right Map View (Globe) */}
        <div className="w-full md:w-auto md:flex-1 flex-[1] min-h-[30%] shrink-0 relative overflow-hidden flex flex-col transition-colors border-0 items-center justify-center">
           <ImagePrefetcher />
           <div className="w-full h-full absolute inset-0 z-0">
             <AnimatedGlobe 
               passengers={trip.passengers} 
               destination={trip.destination} 
               themeImageUrl={currentTheme !== 'default' ? activeTheme.imageUrl : undefined} 
               themeGlowColor={currentTheme !== 'default' ? activeTheme.glowColor : undefined}
             />
           </div>

        </div>

      </motion.div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[250] bg-[#1c1c1e] text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3"
          >
            <div className="bg-emerald-500 rounded-full p-0.5 text-black">
              <CheckCircle2 size={16} />
            </div>
            <span className="text-[14px] font-medium tracking-wide">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <TutorialOverlay 
        tutorialKey="plan-setup"
        steps={[
          {
            targetId: 'tutorial-step-destination',
            title: 'Enter your destination here',
            text: ''
          },
          {
            targetId: 'tutorial-step-dates',
            title: 'Select your dates to check booking availability',
            text: ''
          },
          {
            targetId: 'tutorial-step-budget',
            title: 'Set your budget for the trip (include Travel and Stay as well)',
            text: ''
          },
          {
            targetId: 'tutorial-step-passenger',
            title: 'Add co-travelers for the trip',
            text: ''
          }
        ]}
      />
    </div>
  );
}
