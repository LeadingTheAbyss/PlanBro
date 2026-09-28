'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Script from 'next/script';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, MapPin, Users, ArrowRight, Sparkles,
  Clock, Car, Bike, Map, ChevronDown, ChevronUp, X, Loader2, Check,
  Search, GripVertical, Share2, RotateCcw, Footprints, LocateFixed, Download, Link as LinkIcon, CheckCircle2,
  Sun, Moon
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getDistanceInKm, calculateCost, estimateTravelTime, TransportModeEnum } from '@/lib/travelCost';
import { detectCategory, smartSortStops, comfortSortStops, buildTimeline, QuickStop, StopCategory } from '@/lib/quickTripSorter';
import { getAvatarHex } from '@/components/QuickTripMapInner';
import LocationAutocomplete from '@/components/LocationAutocomplete';
import { api } from '@/lib/api';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDestinationTheme } from '@/hooks/useDestinationTheme';

const QuickTripThemeContext = React.createContext<{ isLight: boolean }>({ isLight: false });
const useQTTheme = () => React.useContext(QuickTripThemeContext);

const QuickTripMapInnerDynamic = dynamic(
  () => import('@/components/QuickTripMapInner'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-[#111] flex items-center justify-center text-zinc-500 font-medium text-sm">
        Loading Map...
      </div>
    ),
  }
);

// ─── Types ───────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  location: string; // city / neighbourhood they're starting from
  lat?: number;
  lng?: number;
  remember?: boolean;
}

interface PlaceResult {
  id: string;
  name: string;
  category: string;
  lat?: number;
  lng?: number;
  rating?: number;
  entryFee?: number;
}

interface ActiveStop extends QuickStop {
  placeResult: PlaceResult;
  customDuration?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const DURATION_OPTIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hr', value: 60 },
  { label: '1.5 hr', value: 90 },
  { label: '2 hr', value: 120 },
  { label: '3 hr', value: 180 },
];

const TIMESLOT_OPTIONS = [
  { label: 'Morning', value: 'morning' as const },
  { label: 'Afternoon', value: 'afternoon' as const },
  { label: 'Evening', value: 'evening' as const },
];

const CATEGORY_LABELS: Record<StopCategory, string> = {
  ACTIVE: 'Sports / Outdoor',
  FOOD: 'Food & Drinks',
  INDOOR_ENT: 'Entertainment',
  CULTURAL: 'Culture & Heritage',
  SHOPPING: 'Shopping',
  OTHER: 'Other',
};

const CATEGORY_COLORS: Record<StopCategory, string> = {
  ACTIVE: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  FOOD: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  INDOOR_ENT: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  CULTURAL: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  SHOPPING: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  OTHER: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

// Geocode a city name using our backend search
async function geocodeCity(cityName: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const results = await api.searchCity(cityName);
    if (results.length === 0) return null;
    const coords = results[0].osrm_coords;
    if (!coords) return null;
    const [lng, lat] = coords.split(',').map(Number);
    return { lat, lng };
  } catch {
    return null;
  }
}

// ─── Place Search Dropdown ────────────────────────────────────────────────────

function PlaceSearchBox({
  city,
  onSelect,
}: {
  city: string;
  onSelect: (place: PlaceResult) => void;
}) {
  const { isLight } = useQTTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (val.length >= 3) {
      setLoading(true);
      timeoutRef.current = setTimeout(async () => {
        try {
          const searchQuery = city ? `${val}, ${city}` : val;
          let url = `/api/ola/autocomplete?input=${encodeURIComponent(searchQuery)}`;
          if (city) url += `&city=${encodeURIComponent(city)}`;
          
          const res = await fetch(url);
          const data = await res.json();
          
          if (data.predictions && data.predictions.length > 0) {
            setResults(data.predictions);
            setIsOpen(true);
          } else {
            setIsOpen(false);
            setResults([]);
          }
        } catch (err) {
          console.error(err);
        } finally { 
          setLoading(false); 
        }
      }, 400);
    } else {
      setIsOpen(false);
      setResults([]);
      setLoading(false);
    }
  };

  const handleSelect = async (place: any) => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    
    // We construct a mock PlaceResult for the UI
    const address = place.description;
    const placeId = place.place_id || place.reference || '';
    const mainText = place.structured_formatting ? place.structured_formatting.main_text : address;
    
    // If geometry is already bundled (e.g. from DB cache), use it directly!
    if (place.geometry && place.geometry.location) {
      onSelect({
        id: placeId || `place-${Date.now()}`,
        name: mainText,
        category: 'ACTIVITY', // fallback
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      });
      return;
    }

    // Otherwise, fetch exact coordinates from the Geocode/Details API
    try {
      let url = `/api/ola/geocode?address=${encodeURIComponent(address)}`;
      if (placeId) url += `&place_id=${encodeURIComponent(placeId)}`;
      else if (city && !address.toLowerCase().includes(city.toLowerCase())) url = `/api/ola/geocode?address=${encodeURIComponent(address + ', ' + city)}`;
        
      const res = await fetch(url);
      const data = await res.json();
      
      let lat, lng;
      if (data.result && data.result.geometry) {
        lat = data.result.geometry.location.lat;
        lng = data.result.geometry.location.lng;
      } else if (data.geocodingResults && data.geocodingResults.length > 0) {
        lat = data.geocodingResults[0].geometry.location.lat;
        lng = data.geocodingResults[0].geometry.location.lng;
      }
      
      if (lat && lng) {
        onSelect({
          id: placeId || `place-${Date.now()}`,
          name: mainText,
          category: 'ACTIVITY', // fallback
          lat,
          lng,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className={`flex items-center gap-2 border rounded-xl px-4 py-3 focus-within:border-emerald-500/60 transition-colors ${isLight ? 'bg-white/80 border-zinc-300' : 'bg-zinc-900 border-zinc-700'}`}>
        <Search size={15} className="text-zinc-500 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder={city ? `Search places in ${city}…` : 'Enter city first'}
          disabled={!city}
          className={`flex-1 bg-transparent text-sm focus:outline-none ${isLight ? 'text-zinc-900 placeholder:text-zinc-400' : 'text-white placeholder:text-zinc-600'}`}
        />
        {loading && <Loader2 size={14} className="text-zinc-500 animate-spin shrink-0" />}
      </div>

      {isOpen && query.length >= 3 && (
        <div className={`absolute z-50 top-full mt-1 w-full border rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-700'}`}>
          {results.length > 0 ? (
            results.map((place, idx) => {
              const mainText = place.structured_formatting ? place.structured_formatting.main_text : place.description;
              const secondaryText = place.structured_formatting ? place.structured_formatting.secondary_text : "";
              
              return (
                <button
                  key={place.place_id || idx}
                  onClick={() => handleSelect(place)}
                  className={`w-full text-left px-4 py-3 transition-colors border-b last:border-0 flex items-center gap-3 ${isLight ? 'hover:bg-zinc-50 border-zinc-200' : 'hover:bg-zinc-800 border-zinc-800'}`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <div>
                    <div className={`text-sm font-medium ${isLight ? 'text-zinc-900' : 'text-white'}`}>{mainText}</div>
                    {secondaryText && <div className="text-xs text-zinc-500">{secondaryText}</div>}
                  </div>
                </button>
              );
            })
          ) : (
            !loading && (
              <div className="px-4 py-3 text-sm text-zinc-500 text-center">
                No places found matching "{query}" in this area.
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuickTripPage() {
  const router = useRouter();
  const { user, fetchUser } = useAuthStore();

  useEffect(() => { fetchUser(); }, [fetchUser]);

  // Redirect to login if not logged in
  useEffect(() => {
    if (user === null) {
      // Give it a moment to hydrate
      const t = setTimeout(() => {
        if (!useAuthStore.getState().user) {
          router.push('/login?redirect=/quick-trip');
        }
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [user, router]);

  // Check Quick Trip limit
  useEffect(() => {
    if (user && !user.isAdmin && (user.quickTripsToday || 0) >= 10) {
      alert('You have reached the limit for Quick Trip feature today, higher limits will be available for Pro users soon.');
      router.push('/');
    }
  }, [user, router]);

  // ── State ──
  const [city, setCity] = useState('');
  const [isLightMode, setIsLightMode] = useState(false);
  const { activeTheme, currentTheme, dynamicBg } = useDestinationTheme(city);
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<{ name: string; state: string }[]>([]);
  const [isCityLoading, setIsCityLoading] = useState(false);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const cityWrapperRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const displayToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const [members, setMembers] = useState<Member[]>([
    { id: 'member-1', name: '', location: '' }
  ]);
  const [savedPassengers, setSavedPassengers] = useState<any[]>([]);

  useEffect(() => {
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

  const [meetAtSomeone, setMeetAtSomeone] = useState(false);
  const [meetingMemberId, setMeetingMemberId] = useState<string>('member-1');
  const [transportMode, setTransportMode] = useState<'cab' | 'personal_car' | 'personal_bike' | 'walk'>('cab');

  const [stops, setStops] = useState<ActiveStop[]>([]);
  const [autoSorted, setAutoSorted] = useState(false);

  // Load from localStorage if editing a saved quick trip, or load from API if universal link
  useEffect(() => {
    const fetchSharedTrip = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const tripId = searchParams.get('id');
        
        if (tripId) {
          const res = await fetch(`/api/trips/${tripId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.trip && data.trip.snapshot) {
              const snap = data.trip.snapshot;
              setCity(snap.city || '');
              setCityQuery(snap.city || '');
              if (snap.members) setMembers(snap.members);
              if (snap.meetAtSomeone !== undefined) setMeetAtSomeone(snap.meetAtSomeone);
              if (snap.meetingMemberId) setMeetingMemberId(snap.meetingMemberId);
              if (snap.transportMode) setTransportMode(snap.transportMode);
              if (snap.stops) setStops(snap.stops);
              setIsSaved(true);
              setShareLink(`${window.location.origin}/quick-trip?id=${tripId}`);
              return; // skip localStorage if loaded from API
            }
          }
        }
      } catch (err) {
        console.error('Failed to parse URL quick trip', err);
      }
      
      try {
        const saved = localStorage.getItem('quickTripData');
        if (saved) {
          const data = JSON.parse(saved);
          setCity(data.city || '');
          setCityQuery(data.city || '');
          if (data.members) setMembers(data.members);
          if (data.meetAtSomeone !== undefined) setMeetAtSomeone(data.meetAtSomeone);
          if (data.meetingMemberId) setMeetingMemberId(data.meetingMemberId);
          if (data.transportMode) setTransportMode(data.transportMode);
          if (data.stops) setStops(data.stops);
          localStorage.removeItem('quickTripData');
        }
      } catch (err) {
        console.error('Failed to parse saved quick trip', err);
      }
    };
    fetchSharedTrip();
  }, []);

  // ── City Autocomplete ──
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (cityWrapperRef.current && !cityWrapperRef.current.contains(e.target as Node)) {
        setCityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (cityQuery.length < 2) { setCityResults([]); setIsCityLoading(false); return; }
    
    // Prevent fetching and opening dropdown if it matches the selected city (case-insensitive)
    if (city && cityQuery.toLowerCase() === city.toLowerCase()) {
      setIsCityLoading(false);
      return;
    }

    setIsCityLoading(true);
    const t = setTimeout(async () => {
      const results = await api.searchCity(cityQuery);
      setCityResults(results.slice(0, 6));
      setCityDropdownOpen(true);
      setIsCityLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [cityQuery, city]);

  const selectCity = (name: string) => {
    setCity(name);
    setCityQuery(name);
    setCityDropdownOpen(false);
  };

  // ── Drag & Drop ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setStops((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setAutoSorted(false);
    }
  };

  // ── Members ──
  const addMember = () => {
    setMembers(prev => [...prev, { id: `member-${Date.now()}`, name: '', location: '' }]);
    displayToast('Traveller Added');
  };

  const removeMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
    if (meetingMemberId === id) setMeetingMemberId(members[0]?.id || '');
  };

  const updateMember = (id: string, field: keyof Member, value: string | number | boolean) => {
    setMembers(prev => prev.map(m => {
      if (m.id === id) {
        const updated: any = { ...m, [field]: value };
        if (field === 'location') {
          updated.lat = undefined;
          updated.lng = undefined;
        }
        return updated;
      }
      return m;
    }));
  };

  // ── Stops ──
  const handleAddStop = useCallback((place: PlaceResult) => {
    const cat = detectCategory(place.category || '');
    const isEvent = cat === 'INDOOR_ENT';
    const newStop: ActiveStop = {
      id: `stop-${Date.now()}`,
      name: place.name,
      category: cat,
      lat: place.lat,
      lng: place.lng,
      durationMins: isEvent ? 150 : 60,
      timeslot: isEvent ? 'afternoon' : undefined,
      placeResult: place,
    };
    setStops(prev => [...prev, newStop]);
    setAutoSorted(false);
  }, []);

  const removeStop = (id: string) => setStops(prev => prev.filter(s => s.id !== id));

  const updateStopDuration = (id: string, mins: number) => {
    setStops(prev => prev.map(s => s.id === id ? { ...s, durationMins: mins } : s));
  };

  const updateStopTimeslot = (id: string, timeslot: 'morning' | 'afternoon' | 'evening' | undefined) => {
    setStops(prev => prev.map(s => s.id === id ? { ...s, timeslot } : s));
  };

  const handleSmartSort = () => {
    setStops(prev => smartSortStops(prev, meetingPin?.lat, meetingPin?.lng) as ActiveStop[]);
    setAutoSorted(true);
  };

  const handleComfortSort = () => {
    setStops(prev => comfortSortStops(prev, meetingPin?.lat, meetingPin?.lng) as ActiveStop[]);
    setAutoSorted(true);
  };

  // ── Geocoding members ──
  useEffect(() => {
    const timers = members.map(m => {
      if (m.location && m.location.length >= 3 && !m.lat && city) {
        return setTimeout(async () => {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(m.location + ', ' + city)}&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
              setMembers(prev => prev.map(pm => pm.id === m.id ? { ...pm, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : pm));
            }
          } catch (e) {}
        }, 1000);
      }
      return null;
    });
    return () => timers.forEach(t => t && clearTimeout(t));
  }, [members.map(m => m.location).join(','), members.map(m => m.lat).join(','), city]);

  // ── Map data ──
  const meetingMember = meetAtSomeone ? members.find(m => m.id === meetingMemberId) : null;

  const memberPins = useMemo(() => members
    .filter(m => m.name && m.lat && m.lng)
    .map(m => ({
      name: m.name,
      lat: m.lat!,
      lng: m.lng!,
      color: getAvatarHex(m.name),
    })), [members]);

  const meetingPin = useMemo(() => {
    if (!meetAtSomeone || !meetingMember?.lat) return null;
    return {
      name: `${meetingMember.name.split(' ')[0]}'s place`,
      lat: meetingMember.lat!,
      lng: meetingMember.lng!,
    };
  }, [meetAtSomeone, meetingMember]);

  const stopPins = useMemo(() => stops
    .filter(s => s.lat && s.lng)
    .map((s, i) => ({
      id: s.id,
      name: s.name,
      lat: s.lat!,
      lng: s.lng!,
      label: i + 1,
    })), [stops]);

  // ── Timeline computation ──
  const paxCount = members.filter(m => m.name).length;

  const { timelineItems, totalCost } = useMemo(() => {
    // Build journey: (meeting point if chosen) → stops
    const journeyPoints = [
      ...(meetingPin ? [{ lat: meetingPin.lat, lng: meetingPin.lng, name: meetingPin.name, durationMins: 0, isMeetingPoint: true }] : []),
      ...stops.filter(s => s.lat && s.lng),
    ];

    if (journeyPoints.length === 0) return { timelineItems: [], totalCost: 0 };

    const travelMins: number[] = [];
    const roadDistances: number[] = [];

    const modeMap: Record<string, TransportModeEnum> = {
      'cab': TransportModeEnum.CAR,
      'personal_car': TransportModeEnum.CAR,
      'personal_bike': TransportModeEnum.BIKE,
      'walk': TransportModeEnum.WALK,
    };

    const enumMode = modeMap[transportMode] || TransportModeEnum.CAR;

    for (let i = 0; i < journeyPoints.length - 1; i++) {
      const dist = getDistanceInKm(
        journeyPoints[i].lat!, journeyPoints[i].lng!,
        journeyPoints[i + 1].lat!, journeyPoints[i + 1].lng!,
      );
      
      const estimate = estimateTravelTime(dist, enumMode);
      travelMins.push(estimate.travelTimeMinutes);
      roadDistances.push(estimate.distanceRoadKm);
    }

    const builtItems = buildTimeline(journeyPoints as any, travelMins, 9);

    let total = 0;
    const enriched = builtItems.map((item, i) => {
      let commute = null;
      let travelDistanceStr = '';
      if (i < travelMins.length) {
        const roadDist = roadDistances[i];
        commute = calculateCost(roadDist, travelMins[i], paxCount || 1, transportMode);
        travelDistanceStr = roadDist.toFixed(1);
        total += commute.cost;
      }
      return { ...item, commute, travelMins: travelMins[i] || 0, travelDistanceStr };
    });

    return { timelineItems: enriched, totalCost: total };
  }, [stops, meetingPin, paxCount, transportMode]);

  const formatDuration = (mins: number) => {
    if (!mins || mins === 0) return '';
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // ── Save Trip ──
  const handleSaveTrip = async () => {
    setIsSaving(true);
    try {
      if (user) {
        const passengersToSave = members.filter(p => p.remember && p.name.trim() !== '');
        if (passengersToSave.length > 0) {
          await Promise.all(passengersToSave.map(p => 
            fetch('/api/passengers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
              body: JSON.stringify({ name: p.name, city: p.location || city || 'Unknown City' })
            }).catch(console.error)
          ));
        }
      }

      const snapshot = {
        type: 'quick-trip',
        city,
        members,
        meetAtSomeone,
        meetingMemberId,
        transportMode,
        stops,
        budget: { spent: totalCost }
      };

      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: city || 'Quick Trip',
          snapshot
        })
      });

      if (res.ok) {
        setIsSaved(true);
        setTimeout(() => {
          router.push('/profile');
        }, 1500);
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

  // ── Share & Download ──
  const handleUniversalShare = async () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      displayToast('Link copied to clipboard!');
      return;
    }
    
    // Save first to generate ID
    setIsSaving(true);
    try {
      const snapshot = { type: 'quick-trip', city, members, meetAtSomeone, meetingMemberId, transportMode, stops, budget: { spent: totalCost } };
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: city || 'Quick Trip', snapshot })
      });
      if (res.ok) {
        const data = await res.json();
        const link = `${window.location.origin}/quick-trip?id=${data.trip.id}`;
        setShareLink(link);
        navigator.clipboard.writeText(link);
        displayToast('Link copied to clipboard!');
      } else {
        alert('Failed to generate share link.');
      }
    } catch (e) {
      console.error(e);
      alert('Error generating share link.');
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
          const usableWidth = pdfWidth;

          const addSectionToPdf = async (elementId: string, isFirstPage: boolean = false) => {
            const sectionEl = document.getElementById(elementId);
            if (!sectionEl) return;
            
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
                pdf.addImage(dataUrl, 'JPEG', 0, 0, usableWidth, finalHeight, undefined, 'FAST');
                resolve(null);
              };
            });
          };

          await addSectionToPdf('pdf-summary', true);

          pdf.save(`HangoutPlan_${city || 'Plan'}.pdf`);
          setIsGeneratingPdf(false);
        } catch (err: any) {
          console.error('PDF generation error', err);
          alert('Failed to generate PDF.');
          setIsGeneratingPdf(false);
        }
      }, 500);
    } else {
      alert("PDF library is still loading. Please try again.");
      setIsGeneratingPdf(false);
    }
  };

  const handleShareGoogleMaps = () => {
    const allPoints = [
      ...memberPins.map(m => `${m.lat},${m.lng}`),
      ...stopPins.map(s => `${s.lat},${s.lng}`),
    ];
    if (allPoints.length < 2) { alert('Add at least 2 locations first!'); return; }
    const [origin, ...rest] = allPoints;
    const destination = rest[rest.length - 1];
    const waypoints = rest.slice(0, -1).join('|');
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypoints) url += `&waypoints=${waypoints}`;
    if (navigator.share) {
      navigator.share({ title: `Hangout Plan`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      displayToast('Google Maps route link copied to clipboard!');
    }
  };

  const hasEnoughData = stopPins.length >= 1;

  return (
    <QuickTripThemeContext.Provider value={{ isLight: isLightMode }}>
      <div 
        className={`relative min-h-screen flex flex-col transition-colors duration-500 ${isLightMode ? 'text-zinc-900' : 'text-white bg-[#0a0a0a]'}`}
        style={isLightMode ? { backgroundColor: dynamicBg || '#f8f8f8' } : undefined}
      >
      {/* Dynamic City Background Image */}
      {currentTheme !== 'default' && city && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div
            className={`absolute inset-0 transition-all duration-1000 bg-cover bg-center bg-no-repeat ${isLightMode ? 'opacity-[0.16]' : 'opacity-[0.24]'} mix-blend-overlay`}
            style={{ backgroundImage: `url(${activeTheme.imageUrl})` }}
          />
        </div>
      )}

      {/* ── Scripts ── */}
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js" strategy="lazyOnload" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" strategy="lazyOnload" />

      {/* ── Header ── */}
      <div className={`flex items-center justify-between px-6 py-4 border-b sticky top-0 z-[9999] transition-colors duration-500 ${isLightMode ? 'bg-white/80 backdrop-blur-md border-zinc-200' : 'bg-[#0d0d0d] border-zinc-800'}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className={`transition-colors text-sm font-medium flex items-center gap-1 ${isLightMode ? 'text-zinc-500 hover:text-zinc-800' : 'text-zinc-400 hover:text-white'}`}
          >
            ← Back
          </button>
          <div className={`w-px h-4 ${isLightMode ? 'bg-zinc-300' : 'bg-zinc-800'}`} />
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight">Plan a Hangout in Your City</span>
          </div>
          <div className="text-xs text-zinc-600 hidden sm:block">Plan a hangout in 60 seconds</div>
        </div>
        
        <div className="flex items-center gap-3 relative">
          <button
            onClick={() => setIsLightMode(v => !v)}
            className={`p-2 rounded-xl transition-all ${isLightMode ? 'bg-zinc-200 text-zinc-700' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
            title={isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {isLightMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            disabled={!hasEnoughData || isGeneratingPdf || isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all"
          >
            {isGeneratingPdf || isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Share2 size={14} />
            )}
            Share Plan
          </button>

          {showShareMenu && (
            <>
              <div className="fixed inset-0 z-[9999] cursor-pointer" onClick={() => setShowShareMenu(false)} />
              <div className={`absolute right-0 mt-2 w-56 border rounded-xl shadow-2xl z-[10000] overflow-hidden text-sm ${isLightMode ? 'bg-white border-zinc-200' : 'bg-[#111] border-[#222]'}`}>
                <button
                  onClick={() => { setShowShareMenu(false); handleUniversalShare(); }}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b ${isLightMode ? 'hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 border-zinc-200' : 'hover:bg-[#1a1a1a] text-zinc-300 hover:text-white border-[#222]'}`}
                >
                  <LinkIcon size={14} />
                  Copy Share Link
                </button>
                <button
                  onClick={handleDownloadPdf}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b ${isLightMode ? 'hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 border-zinc-200' : 'hover:bg-[#1a1a1a] text-zinc-300 hover:text-white border-[#222]'}`}
                >
                  <Download size={14} />
                  <div className="flex flex-col items-start gap-1">
                    <span>Download PDF</span>
                    <span className="text-[9px] uppercase tracking-wider font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-sm">Premium • Free for now</span>
                  </div>
                </button>
                <button
                  onClick={() => { setShowShareMenu(false); handleShareGoogleMaps(); }}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${isLightMode ? 'hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900' : 'hover:bg-[#1a1a1a] text-zinc-300 hover:text-white'}`}
                >
                  <Map size={14} />
                  Open in Google Maps
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Body: two-column layout ── */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden h-[calc(100vh-60px)]">

        {/* ════ LEFT: Wizard ════ */}
        <div className={`w-full lg:w-[420px] flex flex-col lg:overflow-y-auto border-b lg:border-b-0 lg:border-r shrink-0 transition-colors duration-500 ${isLightMode ? 'border-zinc-200' : 'border-zinc-800'}`}>
          <div className="p-5 space-y-6">

            {/* Section 1: City */}
            <section>
              <SectionHeader icon={<MapPin size={14} />} label="City" number={1} />
              <div className="mt-3 relative" ref={cityWrapperRef}>
                <div className={`flex items-center gap-2 border rounded-xl px-4 py-3 focus-within:border-emerald-500/60 transition-colors ${isLightMode ? 'bg-white/80 border-zinc-300' : 'bg-zinc-900 border-zinc-700'}`}>
                  {isCityLoading ? (
                    <Loader2 size={15} className="animate-spin text-emerald-500 shrink-0" />
                  ) : (
                    <Search size={15} className="text-zinc-500 shrink-0" />
                  )}
                  <input
                    type="text"
                    value={cityQuery}
                    onChange={e => { setCityQuery(e.target.value); setCity(''); }}
                    onFocus={() => { if (cityResults.length > 0) setCityDropdownOpen(true); }}
                    onBlur={() => {
                      setTimeout(() => {
                        if (cityQuery && cityQuery.toLowerCase() !== (city || '').toLowerCase()) {
                          if (cityResults.length > 0) {
                            selectCity(cityResults[0].name);
                          } else {
                            selectCity(cityQuery);
                          }
                        } else if (cityQuery && cityQuery.toLowerCase() === (city || '').toLowerCase() && cityQuery !== city) {
                          selectCity(city);
                        }
                      }, 150);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (cityQuery && cityQuery.toLowerCase() !== (city || '').toLowerCase()) {
                          if (cityResults.length > 0) {
                            selectCity(cityResults[0].name);
                          } else {
                            selectCity(cityQuery);
                          }
                        } else if (cityQuery && cityQuery.toLowerCase() === (city || '').toLowerCase() && cityQuery !== city) {
                          selectCity(city);
                        }
                      }
                    }}
                    placeholder="Which city are you hanging out in?"
                    className={`flex-1 bg-transparent text-sm focus:outline-none ${isLightMode ? 'text-zinc-900 placeholder:text-zinc-400' : 'text-white placeholder:text-zinc-600'}`}
                  />
                  {city && <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
                </div>
                {cityDropdownOpen && cityResults.length > 0 && (
                  <div className={`absolute z-50 top-full mt-1 w-full border rounded-xl shadow-2xl overflow-hidden ${isLightMode ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-700'}`}>
                    {cityResults.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => selectCity(r.name)}
                        className={`w-full text-left px-4 py-3 transition-colors border-b last:border-0 flex items-center gap-2 ${isLightMode ? 'hover:bg-zinc-50 border-zinc-200' : 'hover:bg-zinc-800 border-zinc-800'}`}
                      >
                        <MapPin size={12} className="text-zinc-500 shrink-0" />
                        <span className={`text-sm ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{r.name}</span>
                        <span className="text-xs text-zinc-500 truncate">({r.state})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Section 2: The Crew */}
            <section>
              <SectionHeader icon={<Users size={14} />} label="The Crew" number={2} />
              <div className="mt-3 space-y-3">
                {members.map((m, i) => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    index={i}
                    city={city}
                    onUpdate={updateMember}
                    onRemove={members.length > 1 ? () => removeMember(m.id) : undefined}
                  />
                ))}
                <button
                  onClick={addMember}
                  className={`w-full py-2.5 border border-dashed rounded-xl text-sm transition-all flex items-center justify-center gap-2 ${isLightMode ? 'border-zinc-300 text-zinc-500 hover:text-zinc-700 hover:border-zinc-400' : 'border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500'}`}
                >
                  <Plus size={14} />
                  Add Person
                </button>

                {/* Meeting point toggle */}
                <div className={`border rounded-xl p-4 ${isLightMode ? 'bg-white/80 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${isLightMode ? 'text-zinc-600' : 'text-zinc-300'}`}>
                      Meet at someone's place first?
                    </span>
                    <button
                      onClick={() => setMeetAtSomeone(v => !v)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${meetAtSomeone ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${meetAtSomeone ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {meetAtSomeone && (
                    <div className={`mt-3 pt-3 border-t ${isLightMode ? 'border-zinc-200' : 'border-zinc-800'}`}>
                      <label className={`text-xs uppercase tracking-widest font-bold mb-2 block ${isLightMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Whose place?</label>
                      <div className="flex flex-wrap gap-2">
                        {members.filter(m => m.name).map(m => (
                          <button
                            key={m.id}
                            onClick={() => setMeetingMemberId(m.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${meetingMemberId === m.id ? 'bg-emerald-500 text-black' : (isLightMode ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700')}`}
                          >
                            {m.name || `Person ${members.indexOf(m) + 1}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Transport Mode toggle */}
                <div className={`border rounded-xl p-4 mt-3 ${isLightMode ? 'bg-white/80 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-sm font-medium ${isLightMode ? 'text-zinc-600' : 'text-zinc-300'}`}>
                      How are you getting around?
                    </span>
                  </div>
                  <div className={`flex border p-1 rounded-lg ${isLightMode ? 'bg-zinc-100 border-zinc-200' : 'bg-[#161616] border-zinc-800'}`}>
                    {[
                      { id: 'cab', label: 'Cab/Auto' },
                      { id: 'personal_car', label: 'Car' },
                      { id: 'personal_bike', label: 'Bike / Scooty' },
                      { id: 'walk', label: 'Walk' },
                    ].map(t => (
                      <button 
                        key={t.id} 
                        onClick={() => setTransportMode(t.id as any)}
                        className={`flex-1 text-[11px] py-1.5 rounded-md font-medium transition-all ${transportMode === t.id ? 'bg-zinc-800 text-white shadow-md border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Places */}
            <section>
              <div className="flex items-center justify-between">
                <SectionHeader icon={<Map size={14} />} label="Places to Visit" number={3} />
                {stops.length >= 2 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSmartSort}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${autoSorted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : (isLightMode ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700')}`}
                    >
                      <Sparkles size={12} />
                      {autoSorted ? 'Smart Sorted' : 'Auto-Sort'}
                    </button>
                    <button
                      onClick={handleComfortSort}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isLightMode ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                    >
                      <CheckCircle2 size={12} />
                      Comfort Sort
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-3 space-y-3">
                <PlaceSearchBox city={city} onSelect={handleAddStop} />

                {stops.length > 1 && (
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold flex items-center justify-center gap-1 my-2">
                    <GripVertical size={10} /> Drag to reorder your stops
                  </p>
                )}

                {stops.length === 0 && (
                  <div className={`text-center py-8 text-sm border border-dashed rounded-xl ${isLightMode ? 'text-zinc-400 border-zinc-300' : 'text-zinc-600 border-zinc-800'}`}>
                    Search for a place above to add it to your plan
                  </div>
                )}

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={stops.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {stops.map((stop, i) => (
                      <StopCard
                        key={stop.id}
                        stop={stop}
                        index={i}
                        onRemove={() => removeStop(stop.id)}
                        onDurationChange={(mins) => updateStopDuration(stop.id, mins)}
                        onTimeslotChange={(ts) => updateStopTimeslot(stop.id, ts)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </section>

          </div>
        </div>

        {/* ════ RIGHT: Live Preview ════ */}
        <div className={`flex flex-col flex-1 lg:overflow-hidden ${isLightMode ? 'bg-transparent' : 'bg-[#0a0a0a]'}`}>
          {/* Map */}
          <div className={`h-[350px] lg:h-[42%] w-full border-b relative shrink-0 ${isLightMode ? 'border-zinc-200' : 'border-zinc-800'}`}>
            {memberPins.length === 0 && stopPins.length === 0 ? (
              <div className={`w-full h-full flex flex-col items-center justify-center gap-3 ${isLightMode ? 'text-zinc-400' : 'text-zinc-700'}`}>
                <MapPin size={32} className="opacity-30" />
                <p className="text-sm font-medium">Your route will appear here</p>
                <p className={`text-xs ${isLightMode ? 'text-zinc-500' : 'text-zinc-600'}`}>Add people and places to get started</p>
              </div>
            ) : (
              <QuickTripMapInnerDynamic
                members={memberPins}
                meetingPoint={meetingPin}
                stops={stopPins}
              />
            )}
          </div>

          {/* Timeline */}
          <div className="flex-1 lg:overflow-y-auto">
            {/* Stats bar */}
            {hasEnoughData && (
              <div className={`flex items-center gap-6 px-6 py-3 border-b text-xs font-medium ${isLightMode ? 'bg-white/60 border-zinc-200 text-zinc-500' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'}`}>
                <div className="flex items-center gap-2">
                  <Map size={13} className="text-zinc-600" />
                  <span>{stops.length} {stops.length === 1 ? 'stop' : 'stops'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={13} className="text-zinc-600" />
                  <span>{paxCount || '?'} people</span>
                </div>
                <div className="flex items-center gap-2">
                  <Car size={13} className="text-zinc-600" />
                  <span className="text-emerald-400 font-bold">₹{totalCost} est. travel</span>
                </div>
              </div>
            )}

            <div className="p-6">
              {!hasEnoughData ? (
                <div className={`text-center py-16 ${isLightMode ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  <Clock size={28} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Your timeline will appear here</p>
                  <p className={`text-xs mt-1 ${isLightMode ? 'text-zinc-500' : 'text-zinc-600'}`}>Add at least one place to generate a plan</p>
                </div>
              ) : (
                <div className="space-y-0">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
                    Today's Journey · Starting 9:00 AM
                  </h3>

                  {/* Member convergence section */}
                  {memberPins.length > 1 && meetingPin && (
                    <div className={`mb-6 p-4 rounded-xl border ${isLightMode ? 'bg-white/80 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
                      <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isLightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Meet At</p>
                      <div className="flex flex-wrap gap-2">
                        {memberPins.map((m, i) => (
                          <div key={i} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${isLightMode ? 'bg-zinc-100' : 'bg-zinc-800'}`}>
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                              style={{ backgroundColor: m.color }}
                            >
                              {getInitials(m.name)}
                            </div>
                            <span className={`text-xs ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>{m.name.split(' ')[0]}</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <ArrowRight size={12} />
                          <span className="font-medium text-amber-400">{meetingPin.name}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  {timelineItems.map((item, idx) => (
                    <div key={idx} className="relative group">
                      {/* Connector */}
                      {idx < timelineItems.length - 1 && (
                        <div className={`absolute top-6 left-[62px] bottom-[-24px] w-px transition-colors z-0 ${isLightMode ? 'bg-zinc-200 group-hover:bg-zinc-300' : 'bg-zinc-800 group-hover:bg-zinc-700'}`} />
                      )}

                      {/* Stop row */}
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="w-16 pt-1 text-xs text-zinc-500 text-right shrink-0">{item.arrivalTime}</div>
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 z-10 mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className={`font-medium text-sm ${isLightMode ? 'text-zinc-800' : 'text-zinc-200'}`}>{item.stop.name}</h4>
                              <div className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                (item.stop as any).isMeetingPoint 
                                  ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' 
                                  : CATEGORY_COLORS[(item.stop as ActiveStop).category || 'OTHER']
                              }`}>
                                {(item.stop as any).isMeetingPoint ? 'DEPARTURE POINT' : CATEGORY_LABELS[(item.stop as ActiveStop).category || 'OTHER']}
                              </div>
                            </div>
                            <span className={`text-xs ml-2 shrink-0 ${isLightMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{formatDuration(item.stop.durationMins)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Travel segment */}
                      {item.commute && idx < timelineItems.length - 1 && (
                        <div className={`flex items-center justify-between relative z-10 ml-[84px] pb-6 text-xs ${isLightMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`py-1 ${isLightMode ? 'bg-transparent' : 'bg-[#0a0a0a]'}`}>
                              {item.commute.type === 'scooty/bike'
                                ? <Bike size={13} className="text-blue-400" />
                                : item.commute.type === 'walk'
                                ? <Footprints size={13} className="text-amber-400" />
                                : <Car size={13} className="text-green-400" />
                              }
                            </div>
                            <div className="flex flex-col">
                              <span>{formatDuration(item.travelMins)} ({item.travelDistanceStr || (item.commute.cost > 0 ? (item.commute.cost / 7).toFixed(1) : '2.0')} km)</span>
                              <span className="text-[10px] text-zinc-600">
                                {transportMode === 'cab'
                                  ? `Recommended: ${item.commute.type === 'scooty/bike' ? 'Bike Ride' : 'Cab'}`
                                  : `Transport: ${item.commute.service}`}
                              </span>
                            </div>
                          </div>
                          <div className={`font-medium px-2 py-1 rounded text-xs ${isLightMode ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-900 text-zinc-400'}`}>
                            {item.commute.cost > 0 ? `₹${item.commute.cost}` : 'Free'}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {hasEnoughData && stops.length > 0 && (
                    <div className={`mt-8 pt-6 border-t flex justify-center ${isLightMode ? 'border-zinc-200' : 'border-zinc-800'}`}>
                      <button
                        onClick={handleSaveTrip}
                        disabled={isSaving || isSaved}
                        className={`px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg w-full sm:w-auto text-white ${
                          isSaved ? 'bg-emerald-500 shadow-emerald-500/20 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                      >
                        {isSaving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 
                         isSaved ? <><Check size={16} /> Trip Saved!</> : 'Save Hangout Plan'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden PDF Content */}
      <div id="pdf-content" className="bg-[#050505] text-white w-[1024px] absolute top-[-9999px] left-[-9999px] z-[-50] overflow-visible" style={{ opacity: 0, pointerEvents: 'none' }}>
        <div id="pdf-summary" className="p-8 bg-[#050505]">
          <h1 className="text-4xl font-bold mb-8 tracking-tight text-white">Hangout Plan for {city || 'Somewhere'}</h1>
          
          <div className="bg-[#111] border border-[#222] rounded-2xl p-6 mb-8 flex justify-between">
            <div className="flex gap-8">
              <div>
                <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider mb-1">Members</p>
                <p className="font-medium text-lg">{paxCount || '?'} People</p>
              </div>
              <div>
                <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider mb-1">Stops</p>
                <p className="font-medium text-lg">{stops.length}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider mb-1">Estimated Travel Cost</p>
                <p className="font-medium text-lg text-emerald-400">₹{totalCost}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden mt-8">
            <div className="px-6 py-4 border-b border-[#222] flex items-center justify-between bg-[#161616]">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <Map size={20} className="text-emerald-500" />
                Trip Map & Timeline
              </h2>
            </div>
            
            <div className="h-[600px] w-full relative">
              <QuickTripMapInnerDynamic members={memberPins} meetingPoint={meetingPin} stops={stopPins} />
            </div>

            <div className="p-8">
                {timelineItems.map((item, idx) => (
                  <div key={idx} className="flex gap-6 mb-6 last:mb-0 relative">
                    {idx < timelineItems.length - 1 && (
                      <div className="absolute top-8 left-[110px] bottom-[-32px] w-0.5 bg-zinc-800 z-0" />
                    )}
                    <div className="w-24 shrink-0 font-bold text-zinc-400 pt-1 text-right">{item.arrivalTime}</div>
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0 z-10 mt-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="font-bold text-xl">{item.stop.name}</div>
                      <div className="text-zinc-500 mt-1">{formatDuration(item.stop.durationMins)}</div>
                      {item.commute && (
                         <div className="mt-4 p-4 bg-zinc-900 rounded-xl flex justify-between items-center text-sm border border-zinc-800">
                           <div className="flex flex-col">
                             <span className="text-zinc-400">Travel to next stop</span>
                             <span className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wider font-bold">
                               {transportMode === 'cab'
                                 ? `Recommended: ${item.commute.type === 'scooty/bike' ? 'Bike Ride' : 'Cab'}`
                                 : `Transport: ${item.commute.service}`}
                             </span>
                           </div>
                           <div className="flex flex-col items-end">
                             <span className="font-medium text-emerald-400">{formatDuration(item.travelMins)} · {item.travelDistanceStr} km</span>
                             <span className="text-[11px] text-zinc-500 mt-0.5 font-bold">
                               {item.commute.cost > 0 ? `₹${item.commute.cost}` : 'Free'}
                             </span>
                           </div>
                         </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
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
            <div className="bg-emerald-500 rounded-full p-0.5 text-black">
              <CheckCircle2 size={16} />
            </div>
            <span className="text-[14px] font-medium tracking-wide">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </QuickTripThemeContext.Provider>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, label, number }: { icon: React.ReactNode; label: string; number: number }) {
  const { isLight } = useQTTheme();
  return (
    <div className="flex items-center gap-2">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isLight ? 'bg-zinc-200 text-zinc-500' : 'bg-zinc-800 text-zinc-400'}`}>
        {number}
      </div>
      <div className={`flex items-center gap-1.5 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
        {icon}
        <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
      </div>
    </div>
  );
}

function MemberRow({
  member, index, city, onUpdate, onRemove, savedPassengers = [], allMembers = []
}: {
  member: Member;
  index: number;
  city?: string;
  onUpdate: (id: string, field: keyof Member, value: string | number | boolean) => void;
  onRemove?: () => void;
  savedPassengers?: any[];
  allMembers?: Member[];
}) {
  const color = member.name ? getAvatarHex(member.name) : '#52525b';
  const initials = member.name ? (member.name.trim().split(/\s+/).length === 1
    ? member.name.substring(0, 2).toUpperCase()
    : (member.name.split(' ')[0][0] + member.name.split(' ').slice(-1)[0][0]).toUpperCase()) : '?';
  const { isLight } = useQTTheme();

  return (
    <div className={`border rounded-xl p-4 space-y-3 relative overflow-visible ${isLight ? 'bg-white/80 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
      <div className="flex items-center gap-3 relative">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ backgroundColor: color }}
        >
          {initials}
        </div>
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder={`Person ${index + 1}'s name`}
            value={member.name}
            onChange={e => onUpdate(member.id, 'name', e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
            className={`w-full bg-transparent text-sm focus:outline-none ${isLight ? 'text-zinc-900 placeholder:text-zinc-400' : 'text-white placeholder:text-zinc-600'}`}
          />
          {member.name && [...savedPassengers, ...allMembers.filter(p => p.remember && p.id !== member.id && p.name)]
            .filter((sp, index, self) => index === self.findIndex((t) => t.name === sp.name))
            .filter(sp => sp.name.toLowerCase().startsWith(member.name.toLowerCase()) && sp.name !== member.name).length > 0 && (
            <div className={`absolute top-full left-0 right-0 mt-2 border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
              {[...savedPassengers, ...allMembers.filter(p => p.remember && p.id !== member.id && p.name)]
                .filter((sp, index, self) => index === self.findIndex((t) => t.name === sp.name))
                .filter(sp => sp.name.toLowerCase().startsWith(member.name.toLowerCase()) && sp.name !== member.name)
                .map((sp, idx) => (
                  <button
                    key={idx}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors border-b last:border-0 ${isLight ? 'text-zinc-900 hover:bg-zinc-50 border-zinc-200' : 'text-white hover:bg-zinc-800 border-zinc-800/50'}`}
                    onClick={() => {
                      onUpdate(member.id, 'name', sp.name);
                    }}
                  >
                    <div className={`font-medium ${isLight ? 'text-zinc-900' : 'text-white'}`}>{sp.name}</div>
                  </button>
                ))}
            </div>
          )}
        </div>
        {onRemove && (
          <button onClick={onRemove} className={`${isLight ? 'text-zinc-400' : 'text-zinc-700'} hover:text-red-500 transition-colors shrink-0`}>
            <X size={14} />
          </button>
        )}
      </div>
      <div className={`flex flex-col gap-2 pt-2 border-t ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
        <LocationAutocomplete
          memberId={member.id}
          value={member.location}
          lat={member.lat}
          city={city}
          onUpdate={onUpdate as any}
        />
        <label className={`flex items-center gap-2 cursor-pointer text-[10px] font-bold uppercase tracking-widest transition-colors mt-2 ${isLight ? 'text-zinc-400 hover:text-zinc-600' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <input 
            type="checkbox" 
            checked={member.remember || false}
            onChange={(e) => onUpdate(member.id, 'remember', e.target.checked)}
            className={`accent-emerald-500 w-3 h-3 rounded-md cursor-pointer ${isLight ? 'border-zinc-300 bg-zinc-100' : 'border-zinc-700 bg-zinc-800'}`}
          />
          Remember this passenger
        </label>
      </div>
    </div>
  );
}

function StopCard({
  stop, index, onRemove, onDurationChange, onTimeslotChange,
}: {
  stop: ActiveStop;
  index: number;
  onRemove: () => void;
  onDurationChange: (mins: number) => void;
  onTimeslotChange: (ts: 'morning' | 'afternoon' | 'evening' | undefined) => void;
}) {
  const isEvent = stop.category === 'INDOOR_ENT';

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  const { isLight } = useQTTheme();

  return (
    <div ref={setNodeRef} style={style} className={`border rounded-xl p-4 space-y-3 relative group ${isLight ? 'bg-white/80 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
      <div className="flex items-start gap-3">
        <div {...attributes} {...listeners} className="cursor-grab hover:text-emerald-400 text-zinc-600 mt-0.5 shrink-0">
          <GripVertical size={16} />
        </div>
        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-medium text-sm truncate ${isLight ? 'text-zinc-900' : 'text-white'}`}>{stop.name}</div>
          <div className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${CATEGORY_COLORS[stop.category]}`}>
            {CATEGORY_LABELS[stop.category]}
          </div>
        </div>
        <button onClick={onRemove} className={`${isLight ? 'text-zinc-400' : 'text-zinc-700'} hover:text-red-500 transition-colors shrink-0`}>
          <X size={14} />
        </button>
      </div>

      {/* Duration or Timeslot */}
      <div className={`pt-2 border-t ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
        {isEvent ? (
          <div>
            <label className={`text-[10px] uppercase tracking-widest font-bold mb-1.5 block ${isLight ? 'text-zinc-500' : 'text-zinc-600'}`}>Show time</label>
            <div className="flex gap-1.5">
              {TIMESLOT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onTimeslotChange(stop.timeslot === opt.value ? undefined : opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${stop.timeslot === opt.value ? 'bg-blue-500 text-white' : (isLight ? 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700')}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <label className={`text-[10px] uppercase tracking-widest font-bold mb-1.5 block ${isLight ? 'text-zinc-500' : 'text-zinc-600'}`}>Duration</label>
            <div className="flex flex-wrap gap-1.5">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onDurationChange(opt.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${stop.durationMins === opt.value ? 'bg-emerald-500 text-black' : (isLight ? 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700')}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
