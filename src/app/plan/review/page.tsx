'use client';

import React, { useState } from 'react';
import { useTripStore } from '@/store/tripStore';
import { useBudgetStore } from '@/store/budgetStore';
import { useItineraryStore } from '@/store/itineraryStore';
import { useCacheStore } from '@/store/cacheStore';
import { Place } from '@/types/trip';
import { 
  CheckCircle, CheckCircle2, ArrowRight, ArrowLeft, Users, Share2, ChevronDown, Link as LinkIcon, Download
} from 'lucide-react';
import Script from 'next/script';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import MemberTravelCard from '@/components/review/MemberTravelCard';
import StayDetailsCard from '@/components/review/StayDetailsCard';
import DayCard from '@/components/review/DayCard';
import VisualJourneyMap from '@/components/VisualJourneyMap';
import { useDestinationTheme } from '@/hooks/useDestinationTheme';

export default function ReviewPage() {
  const router = useRouter();
  const globalTrip = useTripStore();
  const globalBudget = useBudgetStore();
  const globalItinerary = useItineraryStore();
  const cache = useCacheStore();

  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedDayForJourney, setSelectedDayForJourney] = useState<number | null>(null);
  
  const [viewMode, setViewMode] = useState<'itinerary' | 'ledger'>('itinerary');
  
  const [showShareMenu, setShowShareMenu] = useState(false);
  const loadedTripId = React.useRef<string | null>(null);
  const [isLoadingTrip, setIsLoadingTrip] = useState(false);
  const [sharedTripData, setSharedTripData] = useState<any>(null);

  const isReadOnly = !!sharedTripData;
  const trip = (isReadOnly ? sharedTripData.trip : globalTrip) as typeof globalTrip;
  const itinerary = (isReadOnly ? sharedTripData.itinerary : globalItinerary) as typeof globalItinerary;
  const budget = (isReadOnly ? sharedTripData.budget : globalBudget) as typeof globalBudget;
  const { activeTheme } = useDestinationTheme();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const tripId = searchParams.get('tripId');
      const editMode = searchParams.get('mode') === 'edit';
      
      if (tripId && loadedTripId.current !== tripId) {
        loadedTripId.current = tripId;
        const fetchTrip = async () => {
          setIsLoadingTrip(true);
          try {
            const res = await fetch(`/api/trips/${tripId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.trip && data.trip.snapshot) {
                const snap = data.trip.snapshot;
                if (editMode) {
                  useTripStore.getState().loadSnapshot(snap, data.trip.destination);
                  useItineraryStore.getState().loadSnapshot(snap);
                  useBudgetStore.getState().loadSnapshot(snap);
                } else {
                  setSharedTripData({
                    trip: { ...snap, destination: data.trip.destination },
                    itinerary: { days: snap.itinerary || [], selectedPlaces: snap.selectedPlaces || [] },
                    budget: snap.budget || { total: 0, spent: 0, remaining: 0 }
                  });
                }
              }
            } else {
              alert('Failed to load shared trip. You might need to log in or the trip was deleted.');
            }
          } catch (e) {
            console.error('Error loading trip', e);
          } finally {
            setIsLoadingTrip(false);
          }
        };
        fetchTrip();
      }
    }
  }, []);
  
  const [panelWidth, setPanelWidth] = useState(380);
  const isDragging = React.useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth >= 300 && newWidth <= 800) {
      setPanelWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const handleSaveTrip = async () => {
    setIsSaving(true);
    try {
      const snapshot = {
        source: trip.source,
        startDate: trip.startDate,
        endDate: trip.endDate,
        passengers: trip.passengers,
        selectedTransports: trip.selectedTransports,
        selectedHotel: trip.selectedHotel,
        itinerary: itinerary.days,
        selectedPlaces: itinerary.selectedPlaces,
        budget: {
          total: budget.totalBudget,
          spent: budget.spentTransport + budget.spentHotels + budget.spentPlaces,
          remaining: budget.remaining
        }
      };

      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: trip.destination || 'Unknown Destination',
          snapshot
        })
      });

      if (res.ok) {
        setToastMessage('Trip saved successfully!');
        
        // Let them see the toast before redirecting
        setTimeout(() => {
          setToastMessage(null);
          router.push('/profile');
        }, 2000);
      } else {
        const error = await res.json();
        alert(`Failed to save trip: ${error.error}`);
      }
    } catch (error) {
      console.error('Save trip error:', error);
      alert('An error occurred while saving the trip.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUniversalLink = async (isEdit: boolean = false) => {
    setShowShareMenu(false);
    setIsSaving(true);
    try {
      const snapshot = {
        source: globalTrip.source,
        startDate: globalTrip.startDate,
        endDate: globalTrip.endDate,
        passengers: globalTrip.passengers,
        selectedTransports: globalTrip.selectedTransports,
        selectedHotel: globalTrip.selectedHotel,
        itinerary: globalItinerary.days,
        selectedPlaces: globalItinerary.selectedPlaces,
        budget: {
          total: globalBudget.totalBudget,
          spent: globalBudget.spentTransport + globalBudget.spentHotels + globalBudget.spentPlaces,
          remaining: globalBudget.remaining
        }
      };

      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: globalTrip.destination || 'Unknown Destination',
          snapshot
        })
      });

      if (res.ok) {
        const data = await res.json();
        const url = `${window.location.origin}/plan/review?tripId=${data.trip.id}${isEdit ? '&mode=edit' : ''}`;
        if (navigator.share) {
          navigator.share({ title: `Trip to ${globalTrip.destination}`, url }).catch(() => {});
        } else {
          navigator.clipboard.writeText(url);
          setToastMessage('Share link copied to clipboard!');
          setTimeout(() => setToastMessage(null), 3000);
        }
      } else {
        alert(`Failed to generate link.`);
      }
    } catch (error) {
      alert('An error occurred while generating the link.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = () => {
    setShowShareMenu(false);
    
    const element = document.getElementById('pdf-content');
    if (!element) return;
    
    setIsGeneratingPdf(true);

    if ((window as any).htmlToImage && (window as any).jspdf) {
      setTimeout(async () => {
        try {
          const pdf = new (window as any).jspdf.jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
          });
          
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const usableWidth = pdfWidth; // No margins to fill the whole page

            // Helper to capture and add a section to the PDF
            const addSectionToPdf = async (elementId: string, isFirstPage: boolean = false) => {
              const sectionEl = document.getElementById(elementId);
              if (!sectionEl) return;
              
              // Use JPEG with quality 0.8 and pixelRatio 2 to keep the file size under 10MB while remaining sharp
              const dataUrl = await (window as any).htmlToImage.toJpeg(sectionEl, { quality: 0.8, pixelRatio: 2 });
              
              if (!isFirstPage) {
                pdf.addPage();
              }
              
              const img = new Image();
              img.src = dataUrl;
              await new Promise((resolve) => {
                img.onload = () => {
                  const imgRatio = img.height / img.width;
                  let finalHeight = usableWidth * imgRatio;
                  // Add as JPEG and use 'FAST' compression alias to further optimize size
                  pdf.addImage(dataUrl, 'JPEG', 0, 0, usableWidth, finalHeight, undefined, 'FAST');
                  resolve(null);
                };
              });
            };

          // 1. Capture Summary
          await addSectionToPdf('pdf-summary', true);

          // 2. Capture Each Day
          for (const day of itinerary.days.filter(d => d.placeIds.length > 0)) {
            await addSectionToPdf(`pdf-day-${day.dayNumber}`);
          }

          pdf.save(`Trip_to_${trip.destination}.pdf`);
          
          setIsGeneratingPdf(false);
        } catch (err: any) {
          console.error('PDF generation error', err);
          alert('Failed to generate PDF. Check console for details.');
          setIsGeneratingPdf(false);
        }
      }, 500); // 500ms delay to ensure layout is perfectly settled
    } else {
      alert("PDF library is still loading. Please try again in a moment.");
      setIsGeneratingPdf(false);
    }
  };

  const resolveTransport = (passengerId: string) => {
    const selected = trip.selectedTransports.find((t: any) => t.passengerId === passengerId);
    if (!selected) return null;
    if (selected.transport) return selected.transport;
    
    // Fallback for older stored states
    const cachedOptions = cache.cache.transportOptions?.[passengerId] ?? [];
    return cachedOptions.find((opt: any) => opt.id === selected.transportOptionId) ?? null;
  };

  const selectedDayObj = selectedDayForJourney 
    ? itinerary.days.find(d => d.dayNumber === selectedDayForJourney) 
    : null;
    
  const selectedDayPlaces = selectedDayObj
    ? (selectedDayObj.placeIds.map((id: string) => itinerary.selectedPlaces.find((p: Place) => p.id === id)).filter(Boolean) as Place[])
    : [];

  // Group passengers by transport for UI display
  const groupedPassengers = React.useMemo(() => {
    const groups: Record<string, { passengers: typeof trip.passengers, transport: any }> = {};
    
    trip.passengers.forEach(pax => {
      const transport = resolveTransport(pax.id);
      const key = transport ? transport.id : `no-transport-${pax.id}`;
      
      if (!groups[key]) {
        groups[key] = { passengers: [], transport };
      }
      groups[key].passengers.push(pax);
    });
    
    return Object.values(groups);
  }, [trip.passengers, trip.selectedTransports, cache.cache.transportOptions]);

  return (
    <div className={`flex h-full w-full bg-transparent overflow-hidden font-sans transition-colors duration-300 ${activeTheme.text}`}>
      
      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col h-full transition-all duration-400 ease-out overflow-y-auto custom-scrollbar`}
        style={{ paddingRight: selectedDayForJourney !== null ? (typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${panelWidth}px` : '0') : '0' }}
      >
        
        <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto w-full space-y-12">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Trip Review and Finances</h1>
              <p className="text-sm mt-2 opacity-80">Review your trip details and settle up expenses</p>
            </div>
            
            <div className={`flex border border-white/10 p-1 rounded-full items-center relative self-start md:self-end ${activeTheme.card} ${activeTheme.text}`}>
              <div 
                className="absolute inset-y-1 bg-current/10 rounded-full transition-all duration-300 ease-out" 
                style={{
                  width: 'calc(50% - 4px)',
                  left: viewMode === 'itinerary' ? '4px' : 'calc(50%)'
                }}
              />
              <button 
                onClick={() => setViewMode('itinerary')}
                className={`relative px-6 py-2 rounded-full text-sm font-bold transition-colors z-10 w-40 text-center ${viewMode === 'itinerary' ? 'text-inherit opacity-100' : 'text-inherit opacity-50 hover:opacity-80'}`}
              >
                View Itinerary
              </button>
              {/* Hide expenses tab in read-only mode since it requires store access */}
              {!isReadOnly && (
                <button 
                  onClick={() => setViewMode('ledger')}
                  className={`relative px-6 py-2 rounded-full text-sm font-bold transition-colors z-10 w-40 text-center ${viewMode === 'ledger' ? 'text-inherit opacity-100' : 'text-inherit opacity-50 hover:opacity-80'}`}
                >
                  Track Expenses
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {!isReadOnly && (
                <div className="relative">
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    disabled={itinerary.selectedPlaces.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-sm"
                  >
                  <Share2 size={16} />
                  Share Plan
                  <ChevronDown size={14} />
                </button>
                
                <AnimatePresence>
                  {showShareMenu && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 md:right-0 md:left-auto top-full mt-2 w-48 bg-[#1A1A1A] border border-[#333] rounded-xl shadow-2xl overflow-hidden z-[9999] flex flex-col p-1"
                    >
                      <button 
                        onClick={() => handleUniversalLink(false)}
                        className="flex items-center gap-3 px-3 py-3 hover:bg-white/10 transition-colors rounded-lg text-sm text-zinc-200 text-left font-medium w-full"
                      >
                        <LinkIcon size={16} className="text-emerald-500 shrink-0" />
                        Copy View Link
                      </button>
                      <button 
                        onClick={() => handleUniversalLink(true)}
                        className="flex items-center gap-3 px-3 py-3 hover:bg-white/10 transition-colors rounded-lg text-sm text-zinc-200 text-left font-medium w-full"
                      >
                        <LinkIcon size={16} className="text-purple-500 shrink-0" />
                        Copy Edit Link
                      </button>
                      <button 
                        onClick={handleDownloadPdf}
                        disabled={isGeneratingPdf}
                        className="flex items-center gap-3 px-3 py-3 hover:bg-white/10 transition-colors rounded-lg text-sm text-zinc-200 text-left font-medium w-full disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download size={16} className="text-blue-500 shrink-0" />
                        <div className="flex flex-col items-start gap-1">
                          <span>{isGeneratingPdf ? 'Generating...' : 'Download PDF'}</span>
                          <span className="text-[9px] uppercase tracking-wider font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-sm">Premium • Free for now</span>
                        </div>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                </div>
              )}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm shrink-0 ${activeTheme.card} ${activeTheme.text}`}>
                <Users size={16} className="text-green-500" />
                <span className="font-medium">{trip.passengers.length} Members</span>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {viewMode === 'itinerary' ? (
              <motion.div 
                key="itinerary"
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                className="space-y-12"
              >
                {/* 1. Member Travel Details */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold tracking-widest uppercase text-green-600 dark:text-green-500 flex items-center gap-2 w-fit bg-current/5 px-3 py-1.5 rounded-lg backdrop-blur-md border border-current/10">
              <Users size={16} /> 1. Member Travel Details
            </h2>
            
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
              {groupedPassengers.map((group, idx) => (
                <MemberTravelCard 
                  key={group.passengers[0].id} 
                  passengers={group.passengers} 
                  transport={group.transport}
                  isPrimary={idx === 0}
                />
              ))}
            </div>
          </section>

          {/* 2. Stay Details */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold tracking-widest uppercase text-green-600 dark:text-green-500 flex items-center gap-2 w-fit bg-current/5 px-3 py-1.5 rounded-lg backdrop-blur-md border border-current/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/><path d="M10 9h.01"/><path d="M14 9h.01"/><path d="M10 13h.01"/><path d="M14 13h.01"/></svg>
              2. Stay Details
            </h2>
            
            {trip.selectedHotel ? (
              <StayDetailsCard 
                hotel={trip.selectedHotel}
                checkInDate={trip.startDate}
                checkOutDate={trip.endDate}
                paxCount={trip.passengers.length}
              />
            ) : (
              <div className={`border border-white/10 rounded-2xl p-6 text-center text-sm opacity-80 ${activeTheme.card} ${activeTheme.text}`}>
                No hotel selected for this trip.
              </div>
            )}
          </section>

          {/* 3. Daily Breakdown */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold tracking-widest uppercase text-green-600 dark:text-green-500 flex items-center gap-2 w-fit bg-current/5 px-3 py-1.5 rounded-lg backdrop-blur-md border border-current/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
              3. Daily Breakdown
            </h2>
            <div className="flex items-center justify-between">
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {itinerary.days.map((day) => {
                const dayPlaces = day.placeIds.map(id => itinerary.selectedPlaces.find(p => p.id === id)).filter(Boolean) as Place[];
                return (
                  <DayCard 
                    key={day.dayNumber}
                    dayNumber={day.dayNumber}
                    date={day.date}
                    places={dayPlaces}
                    hotel={trip.selectedHotel}
                    paxCount={trip.passengers.length}
                    totalCost={day.totalCost}
                    exactTravelMins={day.exactTravelMins}
                    exactDistanceKm={day.exactDistanceKm}
                    exactCommuteCost={day.exactCommuteCost}
                    isSelected={selectedDayForJourney === day.dayNumber}
                    onSelect={() => setSelectedDayForJourney(selectedDayForJourney === day.dayNumber ? null : day.dayNumber)}
                  />
                );
              })}
            </div>
            
            <p className="text-xs text-inherit font-medium flex items-center gap-2 mt-4 bg-current/5 px-3 py-2 rounded-lg backdrop-blur-md border border-current/10 w-fit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              Each day's route includes places to visit, food stops and travel between locations.
            </p>
          </section>
          </motion.div>
            ) : (
              <motion.div 
                key="ledger"
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                className="h-full min-h-[600px]"
              >
                <div className="flex flex-col items-center justify-center h-[400px] bg-zinc-50 dark:bg-[#111] border border-zinc-200 dark:border-[#222] rounded-3xl p-8 text-center mt-12">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Upcoming Feature</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                    Work on the advanced expense tracking ledger is currently in progress! We will add it later to the website.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-current/10 gap-4">
            <button 
              onClick={() => router.push('/plan/itinerary')}
              className="flex items-center gap-2 text-inherit opacity-80 hover:opacity-100 transition-colors font-bold text-sm px-5 py-2.5 w-full sm:w-auto justify-center bg-current/5 hover:bg-current/10 border border-current/10 rounded-xl backdrop-blur-md"
            >
              <ArrowLeft size={16} /> Go Back and Edit
            </button>
            
            <button 
              onClick={handleSaveTrip}
              disabled={isSaving}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-500 text-white px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : <>Confirm Trip and Continue <ArrowRight size={18} /></>}
            </button>
          </div>
          
          {/* Spacer for bottom */}
          <div className="h-8"></div>
        </div>
      </div>

      {/* Slide-in Journey Panel */}
      <div 
        className={`fixed top-14 right-0 bottom-0 bg-white dark:bg-[#0a0a0a] border-l border-zinc-200 dark:border-[#222] z-40 transform transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-2xl flex ${
          selectedDayForJourney !== null ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: typeof window !== 'undefined' && window.innerWidth < 1024 ? '100%' : `${panelWidth}px` }}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 bottom-0 left-[-4px] w-[8px] cursor-col-resize z-50 flex items-center justify-center group"
        >
          <div className="w-[2px] h-12 bg-zinc-300 dark:bg-zinc-700 rounded-full group-hover:bg-blue-500 transition-colors"></div>
        </div>

        <div className="flex-1 w-full h-full overflow-hidden">
        {selectedDayObj && (
          <VisualJourneyMap 
            dayNumber={selectedDayObj.dayNumber}
            date={selectedDayObj.date}
            places={selectedDayPlaces}
            hotel={trip.selectedHotel}
            paxCount={trip.passengers.length}
            onClose={() => setSelectedDayForJourney(null)}
          />
        )}
        </div>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}</style>
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[250] bg-[#1c1c1e] text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3"
          >
            <div className="bg-green-500 rounded-full p-0.5">
              <CheckCircle2 size={16} className="text-[#1c1c1e]" />
            </div>
            <span className="text-[14px] font-medium tracking-wide">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden PDF Content */}
      <div id="pdf-content" className="bg-[#050505] text-white w-[1024px] absolute top-[-9999px] left-[-9999px] z-[-50] overflow-visible" style={{ opacity: 0, pointerEvents: 'none' }}>
        
        {/* Summary Page */}
        <div id="pdf-summary" className="p-8 bg-[#050505]">
          <h1 className="text-4xl font-bold mb-8 text-center text-emerald-500">Trip to {trip.destination}</h1>
          
          <section className="mb-12">
            <h2 className="text-xl font-bold tracking-widest uppercase text-green-500 flex items-center gap-2 mb-6">
               1. Member Travel Details
            </h2>
            <div className="grid grid-cols-2 gap-6">
              {groupedPassengers.map((group, idx) => (
                <MemberTravelCard 
                  key={group.passengers[0].id} 
                  passengers={group.passengers} 
                  transport={group.transport}
                  isPrimary={idx === 0}
                />
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-bold tracking-widest uppercase text-green-500 flex items-center gap-2 mb-6">
               2. Stay Details
            </h2>
            {trip.selectedHotel && (
              <StayDetailsCard 
                hotel={trip.selectedHotel}
                checkInDate={trip.startDate}
                checkOutDate={trip.endDate}
                paxCount={trip.passengers.length}
              />
            )}
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-bold tracking-widest uppercase text-green-500 flex items-center gap-2 mb-6">
               3. Itinerary Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {itinerary.days.map(day => {
                const dayPlaces = day.placeIds.map(id => itinerary.selectedPlaces.find(p => p.id === id)).filter(Boolean) as Place[];
                return (
                  <DayCard 
                    key={day.dayNumber} 
                    dayNumber={day.dayNumber}
                    date={day.date}
                    places={dayPlaces}
                    hotel={trip.selectedHotel}
                    paxCount={trip.passengers.length}
                    totalCost={day.totalCost}
                    exactTravelMins={day.exactTravelMins}
                    exactDistanceKm={day.exactDistanceKm}
                    exactCommuteCost={day.exactCommuteCost}
                    isSelected={false}
                    onSelect={() => {}}
                  />
                );
              })}
            </div>
          </section>
        </div>

        {/* Visual Journeys (One per day) */}
        {itinerary.days.filter(d => d.placeIds.length > 0).map((day) => {
           const places = day.placeIds.map(id => itinerary.selectedPlaces.find(p => p.id === id)).filter(Boolean) as Place[];
           const dDate = new Date(day.date);
           const formattedDate = !isNaN(dDate.getTime()) 
             ? dDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
             : day.date;
             
           return (
             <div id={`pdf-day-${day.dayNumber}`} key={`pdf-vj-${day.dayNumber}`} className="p-8 bg-[#050505] flex flex-col" style={{ width: '1024px', height: '1448px' }}>
               <h2 className="text-xl font-bold tracking-widest uppercase text-green-500 mb-6 shrink-0">
                 Visual Journey - Day {day.dayNumber} ({formattedDate})
               </h2>
               <div className="flex-1 w-full relative border border-white/20 rounded-xl overflow-hidden bg-[#0A0A0A]">
                 <VisualJourneyMap 
                   dayNumber={day.dayNumber}
                   date={day.date}
                   places={places}
                   hotel={trip.selectedHotel}
                   paxCount={trip.passengers.length}
                   onClose={() => {}}
                   isPdfMode={true}
                 />
               </div>
             </div>
           );
        })}
      </div>

      <Script src="https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js" strategy="lazyOnload" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" strategy="lazyOnload" />
    </div>
  );
}