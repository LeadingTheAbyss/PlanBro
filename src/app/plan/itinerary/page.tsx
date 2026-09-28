'use client';

import React, { useEffect, useState } from 'react';
import { useTripStore } from '@/store/tripStore';
import { useItineraryStore } from '@/store/itineraryStore';
import { useAuthStore } from '@/store/authStore';
import { Place } from '@/types/trip';
import { Clock, Wand2, ArrowRight, CheckCircle, Search, MapPin, Zap, AlertTriangle, ListPlus, Loader2, Users, Plus, Link as LinkIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';

import { SortablePlaceCard } from '@/components/itinerary/SortablePlaceCard';
import TutorialOverlay from '@/components/TutorialOverlay';
import { useDestinationTheme } from '@/hooks/useDestinationTheme';

// --- DROPPABLE LIST COMPONENT ---
function DroppableList({ id, items, children, className }: { id: string, items: string[], children: React.ReactNode, className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
      <div 
        ref={setNodeRef} 
        className={`${className} transition-colors duration-300 ${isOver ? 'bg-emerald-500/10 border-emerald-500/30' : ''}`}
      >
        {children}
      </div>
    </SortableContext>
  );
}

// --- MAIN PAGE ---
export default function ItineraryPage() {
  const router = useRouter();
  const trip = useTripStore();
  const itinerary = useItineraryStore();
  
  const [activePlace, setActivePlace] = useState<Place | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const authUser = useAuthStore(state => state.user);
  const { activeTheme } = useDestinationTheme();
  
  const myUser = React.useMemo(() => {
     const colors = ['#ef4444', '#10b981', '#a855f7', '#ec4899', '#f59e0b', '#3b82f6'];
     return {
        id: Math.random().toString(36).substring(2, 9),
        name: authUser?.name || 'You',
        color: colors[Math.floor(Math.random() * colors.length)],
        picture: authUser?.picture || null,
        isMe: true
     };
  }, [authUser]);

  const myUserRef = React.useRef(myUser);
  useEffect(() => {
    myUserRef.current = myUser;
  }, [myUser]);

  const [collaboratorCount, setCollaboratorCount] = useState(1);
  const [activeUsers, setActiveUsers] = useState<any[]>([myUser]);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [remoteDragStates, setRemoteDragStates] = useState<Record<string, any>>({});
  const [isCopied, setIsCopied] = useState(false);
  const wsRef = React.useRef<WebSocket | null>(null);
  const isRemoteUpdate = React.useRef(false);
  const syncReceived = React.useRef(false);
  const [planId, setPlanId] = useState<string | null>(null);

  // Layout & Filter State
  const [vaultFilter, setVaultFilter] = useState('All');
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  // Batch planning state
  const [selectedVaultPlaces, setSelectedVaultPlaces] = useState<Set<string>>(new Set());

  // Gamified picker state
  const [gamifiedPlace, setGamifiedPlace] = useState<Place | null>(null);

  useEffect(() => {
    setIsMounted(true);

    // Collaboration setup
    const searchParams = new URLSearchParams(window.location.search);
    let currentPlanId = searchParams.get('planId');
    if (!currentPlanId) {
      currentPlanId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('planId', currentPlanId);
      window.history.replaceState({}, '', newUrl.toString());
    }
    setPlanId(currentPlanId);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // For production deployed on Vercel, it should connect to Render Backend
    // Use env var or default to the Render URL if available
    const productionWsHost = process.env.NEXT_PUBLIC_WS_URL || `${protocol}//${window.location.host}/api/ws/plan/`;
    
    const wsUrl = process.env.NODE_ENV === 'development' 
      ? `ws://localhost:8002/api/ws/plan/${currentPlanId}`
      : (process.env.NEXT_PUBLIC_WS_URL ? `${process.env.NEXT_PUBLIC_WS_URL}/${currentPlanId}` : `${productionWsHost}${currentPlanId}`);
      
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      const animals = ['Panda', 'Tiger', 'Koala', 'Fox', 'Wolf', 'Bear', 'Lion', 'Hawk', 'Otter', 'Seal', 'Rhino', 'Moose'];
      const animal = animals[Math.floor(Math.random() * animals.length)];
      const name = myUserRef.current.name !== 'You' ? myUserRef.current.name : 'Anonymous ' + animal;
      ws.send(JSON.stringify({ type: 'JOIN', user: { frontend_id: myUserRef.current.id, name, color: myUserRef.current.color, picture: myUserRef.current.picture } }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'PRESENCE') {
          // Filter out the local user from the backend's presence list using frontend_id
          const others = (data.users || []).filter((u: any) => u.frontend_id !== myUserRef.current.id);
          setActiveUsers([myUserRef.current, ...others]); 
          setCollaboratorCount(others.length + 1);
        } else if (data.type === 'SYNC_STATE') {
          isRemoteUpdate.current = true;
          syncReceived.current = true;
          // Apply remote state to local store
          useItineraryStore.setState(data.state);
          // Allow small window before local changes re-broadcast
          setTimeout(() => { isRemoteUpdate.current = false; }, 100);
        } else if (data.type === 'DRAG_START') {
          setRemoteDragStates(prev => ({ ...prev, [data.placeId]: data.user }));
        } else if (data.type === 'DRAG_END') {
          setRemoteDragStates(prev => {
            const next = { ...prev };
            delete next[data.placeId];
            return next;
          });
        } else if (data.type === 'DRAG_REJECTED') {
          // Server says someone else grabbed this place first; abort our local drag
          setActivePlace(null);
        }
      } catch(e) {}
    };

    return () => {
      ws.close();
    };
  }, []); // Only run once on mount

  // Sync auth updates to the backend presence
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const animals = ['Panda', 'Tiger', 'Koala', 'Fox', 'Wolf', 'Bear', 'Lion', 'Hawk', 'Otter', 'Seal', 'Rhino', 'Moose'];
      const animal = animals[Math.floor(Math.random() * animals.length)];
      const name = myUser.name !== 'You' ? myUser.name : 'Anonymous ' + animal;
      wsRef.current.send(JSON.stringify({ type: 'JOIN', user: { frontend_id: myUser.id, name, color: myUser.color, picture: myUser.picture } }));
    }
    
    // Also explicitly update the local activeUsers list in case PRESENCE is delayed
    setActiveUsers(prev => {
      const others = prev.filter(u => u.frontend_id !== myUser.id && !u.isMe);
      return [myUser, ...others];
    });
  }, [myUser]);

  // Broadcast local changes via WebSocket
  useEffect(() => {
    if (!isMounted || !planId) return;
    const unsub = useItineraryStore.subscribe((state) => {
      if (isRemoteUpdate.current) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'SYNC_STATE', state }));
      }
    });
    return unsub;
  }, [isMounted, planId]);

  // Initialize days on mount or if dates change
  useEffect(() => {
    const startDateStr = trip.startDate || new Date().toISOString().split('T')[0];
    const start = new Date(startDateStr);
    
    let totalDays = 3;
    if (trip.startDate && trip.endDate) {
      const end = new Date(trip.endDate);
      const diffTime = end.getTime() - start.getTime();
      totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
    }
    
    if (isNaN(totalDays)) totalDays = 1;

    // Prevent a guest joining via link with an empty trip store from wiping out the shared state
    const isGuest = !trip.destination && window.location.search.includes('planId');
    
    if (!isGuest && !syncReceived.current && (itinerary.days.length === 0 || itinerary.days.length !== totalDays)) {
      itinerary.initializeDays(totalDays, startDateStr);
    }
  }, [trip.startDate, trip.endDate, trip.destination, itinerary.days.length, itinerary.initializeDays]);

  const pointerSensorOptions = React.useMemo(() => ({ activationConstraint: { distance: 5 } }), []);
  const touchSensorOptions = React.useMemo(() => ({ activationConstraint: { delay: 200, tolerance: 5 } }), []);
  const keyboardSensorOptions = React.useMemo(() => ({ coordinateGetter: sortableKeyboardCoordinates }), []);

  const sensors = useSensors(
    useSensor(PointerSensor, pointerSensorOptions),
    useSensor(TouchSensor, touchSensorOptions),
    useSensor(KeyboardSensor, keyboardSensorOptions)
  );

  // Calculate assigned and unassigned places
  const assignedPlaceIds = React.useMemo(() => new Set(itinerary.days.flatMap(d => d.placeIds)), [itinerary.days]);
  const allUnassigned = React.useMemo(() => itinerary.selectedPlaces.filter(p => !assignedPlaceIds.has(p.id)), [itinerary.selectedPlaces, assignedPlaceIds]);
  
  // Filtered vault places
  const vaultPlaces = React.useMemo(() => {
    let places = allUnassigned;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      places = places.filter(p => p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
    }
    if (vaultFilter !== 'All') {
      const filterCat = vaultFilter.toLowerCase();
      places = places.filter(p => {
        const cat = (p.category || '').toLowerCase();
        if (filterCat === 'attractions') return !cat.includes('food') && !cat.includes('hotel');
        if (filterCat === 'food') return cat.includes('food') || cat.includes('restaurant') || cat.includes('cafe');
        if (filterCat === 'hotels') return cat.includes('hotel') || cat.includes('resort');
        return true;
      });
    }
    return places;
  }, [itinerary.selectedPlaces, searchQuery, vaultFilter]);
  
  const vaultItemIds = React.useMemo(() => vaultPlaces.map(p => p.id), [vaultPlaces]);

  // Summary Metrics
  const totalScheduledHours = React.useMemo(() => itinerary.days.reduce((sum, d) => sum + d.totalTimeHours, 0), [itinerary.days]);
  const scheduledPlacesCount = assignedPlaceIds.size;
  const totalPlacesCount = itinerary.selectedPlaces.length;
  const progressPercent = totalPlacesCount === 0 ? 0 : Math.round((scheduledPlacesCount / totalPlacesCount) * 100);

  // New Helpful Metrics
  const avgHoursPerDay = itinerary.days.length > 0 ? (totalScheduledHours / itinerary.days.length) : 0;
  let pacingLevel = 'Relaxed';
  let pacingColor = 'text-emerald-400';
  if (avgHoursPerDay > 6.5) {
    pacingLevel = 'Packed';
    pacingColor = 'text-red-400';
  } else if (avgHoursPerDay > 4) {
    pacingLevel = 'Active';
    pacingColor = 'text-blue-400';
  }
  
  const totalTripCost = itinerary.days.reduce((sum, d) => sum + (d.totalCost || 0), 0);

  // --- Handlers ---
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (remoteDragStates[active.id as string]) return; // Already locked by another user

    const place = itinerary.selectedPlaces.find(p => p.id === active.id);
    if (place) {
      setActivePlace(place);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'DRAG_START', placeId: place.id }));
      }
    }
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const findContainerDay = (id: string) => {
      if (id === 'unassigned') return 0;
      const day = itinerary.days.find(d => d.dayNumber.toString() === id || d.placeIds.includes(id));
      return day ? day.dayNumber : 0;
    };

    const sourceDay = findContainerDay(activeId);
    const destDay = findContainerDay(overId);

    if (sourceDay !== destDay) {
      let newIndex: number | undefined;
      if (destDay !== 0 && overId !== destDay.toString() && overId !== 'unassigned') {
        const destDayObj = itinerary.days.find(d => d.dayNumber === destDay);
        if (destDayObj) {
          newIndex = destDayObj.placeIds.indexOf(overId);
          if (newIndex === -1) newIndex = undefined;
        }
      }

      itinerary.movePlaceBetweenDays(activeId, sourceDay, destDay, newIndex);
      if (sourceDay !== 0) itinerary.recalcDay(sourceDay);
      if (destDay !== 0) itinerary.recalcDay(destDay);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePlace(null);
    const { active, over } = event;
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'DRAG_END', placeId: active.id }));
    }
    
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const findContainerDay = (id: string) => {
      if (id === 'unassigned') return 0;
      const day = itinerary.days.find(d => d.dayNumber.toString() === id || d.placeIds.includes(id));
      return day ? day.dayNumber : 0;
    };

    const sourceDay = findContainerDay(activeId);
    const destDay = findContainerDay(overId);

    if (sourceDay === destDay && sourceDay !== 0 && activeId !== overId) {
      const day = itinerary.days.find(d => d.dayNumber === sourceDay);
      if (day) {
        const oldIndex = day.placeIds.indexOf(activeId);
        const newIndex = day.placeIds.indexOf(overId);
        const newPlaceIds = arrayMove(day.placeIds, oldIndex, newIndex);
        
        useItineraryStore.setState(state => {
          const newDays = [...state.days];
          const dayIdx = newDays.findIndex(d => d.dayNumber === sourceDay);
          if (dayIdx >= 0) {
            newDays[dayIdx] = { ...newDays[dayIdx], placeIds: newPlaceIds };
          }
          return { days: newDays };
        });
      }
    }
  };

  const handleQuickAdd = (placeId: string) => {
    // Find the first day with enough capacity
    const place = itinerary.selectedPlaces.find(p => p.id === placeId);
    if (!place) return;
    
    const placeTime = (place.visitDurationHours || 1) + (place.travelTimeHours || 0);
    const availableDay = itinerary.days.find(d => d.totalTimeHours + placeTime <= 8) || itinerary.days[0];
    
    if (availableDay) {
      itinerary.assignPlaceToDay(placeId, availableDay.dayNumber);
      itinerary.recalcDay(availableDay.dayNumber);
      
      // If it was selected, unselect it
      if (selectedVaultPlaces.has(placeId)) {
        const newSet = new Set(selectedVaultPlaces);
        newSet.delete(placeId);
        setSelectedVaultPlaces(newSet);
      }
    }
  };

  const handleToggleSelect = (placeId: string) => {
    const newSet = new Set(selectedVaultPlaces);
    if (newSet.has(placeId)) {
      newSet.delete(placeId);
    } else {
      newSet.add(placeId);
    }
    setSelectedVaultPlaces(newSet);
  };

  const handleBatchAssign = () => {
    if (selectedVaultPlaces.size === 0) return;
    itinerary.batchAssign(Array.from(selectedVaultPlaces));
    setSelectedVaultPlaces(new Set());
    
    // Recalc all days
    itinerary.days.forEach(d => itinerary.recalcDay(d.dayNumber));
  };

  const handleGamifiedSelect = (dayNumber: number) => {
    if (!gamifiedPlace) return;

    if (dayNumber === 0) {
      // Remove to vault
      const oldDay = itinerary.days.find(d => d.placeIds.includes(gamifiedPlace.id));
      if (oldDay) {
        useItineraryStore.setState(state => {
          const newDays = state.days.map(d => {
            if (d.dayNumber === oldDay.dayNumber) {
              return { ...d, placeIds: d.placeIds.filter(id => id !== gamifiedPlace.id) };
            }
            return d;
          });
          return { days: newDays };
        });
        itinerary.recalcDay(oldDay.dayNumber);
      }
    } else {
      const oldDay = itinerary.days.find(d => d.placeIds.includes(gamifiedPlace.id));
      if (oldDay && oldDay.dayNumber !== dayNumber) {
        itinerary.movePlaceBetweenDays(gamifiedPlace.id, oldDay.dayNumber, dayNumber);
        itinerary.recalcDay(oldDay.dayNumber);
      } else if (!oldDay) {
        itinerary.assignPlaceToDay(gamifiedPlace.id, dayNumber);
      }
      itinerary.recalcDay(dayNumber);
      
      if (selectedVaultPlaces.has(gamifiedPlace.id)) {
        const newSet = new Set(selectedVaultPlaces);
        newSet.delete(gamifiedPlace.id);
        setSelectedVaultPlaces(newSet);
      }
    }
    
    setGamifiedPlace(null);
  };

  const selectAllFiltered = () => {
    const newSet = new Set(selectedVaultPlaces);
    vaultPlaces.forEach(p => newSet.add(p.id));
    setSelectedVaultPlaces(newSet);
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col lg:flex-row h-full bg-transparent relative overflow-y-auto lg:overflow-hidden">
      {/* Ambient Deep Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
        <div className="absolute top-[-10%] left-[30%] w-[40%] h-[40%] rounded-full bg-emerald-600/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[20%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[150px]"></div>
      </div>

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCorners} 
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        
        {/* PANE 1: Left Vault (Unassigned) */}
        <div id="tutorial-itinerary-vault" className={`transition-all duration-300 ease-in-out flex flex-col backdrop-blur-3xl lg:border-r border-b lg:border-b-0 border-current/10 z-20 shrink-0 shadow-2xl h-[70vh] lg:h-auto overflow-hidden ${activeTheme.card} ${activeTheme.text} ${isLeftSidebarOpen ? 'w-full lg:w-[320px] opacity-100' : 'w-0 opacity-0'}`}>
          <div className="px-5 py-6 border-b border-current/10 bg-current/5 shrink-0 w-full lg:w-[320px]">
            <div className="mb-4">
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-current">
                <MapPin size={18} className="text-emerald-500" />
                Saved Places
              </h2>
            </div>

            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-current/50" />
              <input
                type="text"
                placeholder="Search places..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-current/5 border border-current/10 rounded-lg pl-9 pr-3 py-2 text-sm text-current placeholder:text-current/40 focus:outline-none focus:border-current/30 transition-colors"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar-on-mobile mb-4 pb-1">
              {['All', 'Attractions', 'Food', 'Hotels'].map(f => (
                <button
                  key={f}
                  onClick={() => setVaultFilter(f)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap border ${vaultFilter === f ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-current/5 text-current/60 border-current/10 hover:border-current/30 hover:text-current'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            
            {/* Batch Actions Strip */}
            <div className="flex justify-end items-center">
              {selectedVaultPlaces.size > 0 ? (
                <button 
                  onClick={handleBatchAssign}
                  disabled={itinerary.isOptimizing}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-[10px] font-bold tracking-wider uppercase transition-colors"
                >
                  {itinerary.isOptimizing ? <Loader2 size={12} className="animate-spin" /> : <ListPlus size={12} />} Distribute ({selectedVaultPlaces.size})
                </button>
              ) : (
                <button 
                  onClick={selectAllFiltered}
                  disabled={vaultPlaces.length === 0}
                  className="text-[10px] font-bold uppercase tracking-widest text-current/60 hover:text-current transition-colors disabled:opacity-50 disabled:hover:text-current/60 disabled:cursor-not-allowed"
                >
                  Select All
                </button>
              )}
            </div>
          </div>
          
          <DroppableList id="unassigned" items={vaultItemIds} className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 custom-scrollbar w-full lg:w-[320px] touch-pan-y">
            {vaultPlaces.map(place => {
              const isAssigned = assignedPlaceIds.has(place.id);
              return (
                <SortablePlaceCard 
                  key={`vault-${place.id}`}
                  sortableId={isAssigned ? `vault-assigned-${place.id}` : place.id}
                  place={place} 
                  compact 
                  isSelected={selectedVaultPlaces.has(place.id)}
                  isAssigned={isAssigned}
                  dragUser={remoteDragStates[place.id]}
                  lockedByOther={!!remoteDragStates[place.id]}
                  onSelectToggle={() => handleToggleSelect(place.id)}
                  onQuickAdd={() => handleQuickAdd(place.id)}
                  onClickContainer={() => {
                    if (!isAssigned) {
                      setGamifiedPlace(place);
                    }
                  }}
                />
              );
            })}
            
            {itinerary.selectedPlaces.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-current/70 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-current/5 border border-current/10 flex items-center justify-center mb-3 shadow-inner">
                  <CheckCircle size={20} className="text-emerald-500/50" />
                </div>
                <p className="text-xs font-bold tracking-wider uppercase mb-1">Vault Empty</p>
                <p className="text-[10px] text-current/50">Save places from the map first.</p>
              </div>
            )}

            {itinerary.selectedPlaces.length > 0 && vaultPlaces.length === 0 && (
              <div className="py-10 text-center text-sm text-current/60 font-medium">
                No places match your filter/search.
              </div>
            )}
          </DroppableList>
        </div>

        {/* PANE 2: Center Canvas (Horizontal Board) */}
        <div className="flex-1 flex flex-col z-10 relative min-w-0 min-h-[60vh] lg:min-h-0 bg-transparent">
          {/* Toggle Left Sidebar */}
          <button 
            onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
            className={`absolute left-2 top-1/2 -translate-y-1/2 z-50 border hover:border-emerald-500 rounded-full w-8 h-8 flex items-center justify-center transition-all shadow-lg hover:opacity-70 ${activeTheme.card} ${activeTheme.text}`}
          >
            {isLeftSidebarOpen ? '<' : '>'}
          </button>

          {/* Toggle Right Sidebar */}
          <button 
            onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 z-50 border hover:border-emerald-500 rounded-full w-8 h-8 flex items-center justify-center transition-all shadow-lg hover:opacity-70 ${activeTheme.card} ${activeTheme.text}`}
          >
            {isRightSidebarOpen ? '>' : '<'}
          </button>

          {/* Top Overview / Minimap Bar */}
          <div className={`h-auto min-h-[64px] shrink-0 border-b flex flex-col sm:flex-row sm:items-center px-4 lg:px-8 py-4 sm:py-0 justify-between z-20 gap-3 ${activeTheme.card} ${activeTheme.text}`}>
            <div>
              <p className="text-sm font-medium leading-relaxed tracking-wide">
                Drag places to a day, or <span className="text-emerald-400 font-bold">click on a place</span> to quickly assign it.
              </p>
            </div>
            
            {/* Day Capacity Minimap & Collaboration */}
            <div className="flex items-center gap-4">
              
              {/* Active Collaborators */}
              <div id="tutorial-itinerary-collaborators" className="relative flex items-center h-10">
                {activeUsers.length > 0 && (
                  <div 
                    className="flex items-center -space-x-3 mr-3 cursor-pointer hover:scale-105 transition-transform group"
                    onClick={() => setShowCollaborators(!showCollaborators)}
                  >
                    {activeUsers.slice(0, 4).map((u, i) => (
                      <div
                        key={u.id || i}
                        className={`w-9 h-9 rounded-full border-[3px] border-white/90 flex items-center justify-center text-[12px] font-bold text-white uppercase shadow-lg relative z-${40 - i * 10} avatar-animate overflow-hidden ${!u.isMe ? 'avatar-pulse-ring' : ''}`}
                        style={{ backgroundColor: u.color || '#3b82f6', animationDelay: `${i * 0.1}s` }}
                        title={u.name}
                      >
                        {u.picture ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={u.picture} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          u.name?.charAt(0) || 'U'
                        )}
                        {/* Tooltip on hover */}
                        <div className="absolute top-full mt-2 hidden group-hover:block bg-[#222] text-white text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap z-50">
                          {u.name} {u.isMe ? '(You)' : ''}
                        </div>
                      </div>
                    ))}
                    {activeUsers.length > 4 && (
                      <div className="w-9 h-9 rounded-full border-[3px] border-white/90 bg-[#222] flex items-center justify-center text-[11px] font-bold text-zinc-300 shadow-lg relative z-0 avatar-animate">
                        +{activeUsers.length - 4}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Collaborators Popover */}
                {showCollaborators && activeUsers.length > 0 && (
                  <div className="absolute top-full left-0 mt-3 w-56 bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl z-50 py-3 backdrop-blur-xl bg-opacity-95">
                    <div className="px-4 pb-2 mb-2 border-b border-[#333] text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex justify-between items-center">
                      <span>Collaborators</span>
                      <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">{activeUsers.length} Online</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                      {activeUsers.map((u, i) => (
                        <div key={u.id || i} className="flex items-center gap-3 px-4 py-2 hover:bg-[#222] transition-colors cursor-pointer">
                          <div 
                            className="relative w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white uppercase shadow-inner overflow-hidden"
                            style={{ backgroundColor: u.color || '#3b82f6' }}
                          >
                            {u.picture ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={u.picture} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              u.name?.charAt(0) || 'U'
                            )}
                            {!u.isMe && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#1a1a1a] rounded-full"></div>}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm text-zinc-200 font-medium">{u.name}</span>
                            <span className="text-[10px] text-zinc-500">{u.isMe ? 'You (Host)' : 'Collaborator'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Invite Collaborators Button */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-[0_0_10px_rgba(37,99,235,0.4)] whitespace-nowrap shrink-0 group border border-blue-500/50"
              >
                {isCopied ? (
                  <>
                    <CheckCircle size={14} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} strokeWidth={3} />
                    <span>Invite Collaborators</span>
                  </>
                )}
              </button>

              <div className="hidden sm:block h-6 w-px bg-current/10"></div>

              {/* Minimap */}
              <div id="tutorial-itinerary-minimap" className="flex gap-2 overflow-x-auto custom-scrollbar w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar-on-mobile">
                {itinerary.days.map(d => (
                  <div 
                    key={d.dayNumber}
                    className={`w-12 h-8 shrink-0 rounded border flex flex-col justify-end overflow-hidden
                      ${d.totalTimeHours > 8 ? 'bg-red-950/30 border-red-900/50' : 'bg-current/10 border-current/10'}
                    `}
                    title={`Day ${d.dayNumber}: ${d.totalTimeHours}h scheduled`}
                  >
                    <div 
                      className={`w-full transition-all duration-500 ${d.totalTimeHours > 8 ? 'bg-red-500/80' : 'bg-emerald-500/60'}`}
                      style={{ height: `${Math.min(100, (d.totalTimeHours / 8) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Horizontal Day Rail */}
          <div id="tutorial-itinerary-daycolumns" className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar scroll-smooth overscroll-x-contain bg-[url('/grid.svg')] bg-center transform-gpu">
            <div className="flex h-full p-4 lg:p-8 gap-4 lg:gap-6 w-max">
              {itinerary.days.map((day) => {
                const dayPlaces = day.placeIds.map(id => itinerary.selectedPlaces.find(p => p.id === id)).filter(Boolean) as Place[];
                const isOverloaded = day.totalTimeHours > 8;

                let formattedDate = day.date;
                try {
                  const d = new Date(day.date);
                  if (!isNaN(d.getTime())) {
                    const dayOfMonth = d.getDate();
                    const suffix = (dayOfMonth > 3 && dayOfMonth < 21) ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][dayOfMonth % 10];
                    const monthStr = d.toLocaleDateString('en-GB', { month: 'long' });
                    formattedDate = `${dayOfMonth}${suffix} ${monthStr}`;
                  }
                } catch (e) {}

                return (
                  <div key={day.dayNumber} className={`w-[300px] lg:w-[340px] flex flex-col h-full rounded-2xl border border-current/10 shadow-xl overflow-hidden shrink-0 transition-colors hover:border-current/30 ${activeTheme.card} ${activeTheme.text}`}>

                    {/* Day Column Header */}
                    <div className="p-4 border-b border-current/10 bg-current/5 flex flex-col gap-3 shrink-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner
                            ${isOverloaded ? 'bg-red-950/50 border-red-500/30 text-red-400' : 'bg-current/10 border-current/20 text-emerald-500'}
                          `}>
                            <span className="text-xl font-black">{day.dayNumber}</span>
                          </div>
                          <div>
                            <span className="block text-[13px] font-semibold text-current">{formattedDate}</span>
                            <span className={`text-[10px] font-medium tracking-wider mt-0.5 block
                              ${isOverloaded ? 'text-red-400' : 'text-current/60'}
                            `}>
                              {day.totalTimeHours} / 8 HOURS
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Budget Bar */}
                      <div className="w-full h-1.5 bg-current/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${isOverloaded ? 'bg-red-500' : (day.totalTimeHours > 6 ? 'bg-amber-500' : 'bg-emerald-500')}`}
                          style={{ width: `${Math.min(100, (day.totalTimeHours / 8) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Droppable Canvas */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative">

                      <DroppableList id={day.dayNumber.toString()} items={day.placeIds} className="p-3 space-y-3 min-h-full relative z-10">
                        {dayPlaces.map((place, idx) => {
                          const isLast = idx === dayPlaces.length - 1;
                          const dayColorCodes = ['emerald', 'amber', 'purple', 'blue', 'pink'];
                          const colorCode = dayColorCodes[(day.dayNumber - 1) % dayColorCodes.length];
                          
                          // Mock distance calculation for UI purposes
                          const nextPlace = !isLast ? dayPlaces[idx + 1] : null;
                          let distanceStr = '';
                          if (nextPlace) {
                            const hash = (place.id + nextPlace.id).split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                            const km = ((hash % 150) / 10).toFixed(1);
                            const mins = Math.floor(parseFloat(km) * (60 / 30));
                            distanceStr = `🚗 ${mins} mins transit (${km} km)`;
                          }

                          return (
                            <React.Fragment key={place.id}>
                              <SortablePlaceCard 
                                place={place}
                                dayColorCode={colorCode}
                                dragUser={remoteDragStates[place.id]}
                                lockedByOther={!!remoteDragStates[place.id]}
                                onClickContainer={() => {
                                  setGamifiedPlace(place);
                                }}
                                onRemoveFromDay={(placeId) => {
                                  itinerary.removePlaceFromDay(placeId, day.dayNumber);
                                  itinerary.recalcDay(day.dayNumber);
                                }}
                              />
                              {!isLast && (
                                <div className="flex items-center justify-center my-1.5 py-1 text-current/60 font-bold text-[10px] uppercase tracking-widest bg-current/5 rounded-md border border-current/10">
                                  {distanceStr}
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                        
                        {dayPlaces.length === 0 && (
                          <div className="h-32 rounded-xl flex flex-col items-center justify-center text-current/70 opacity-90 bg-current/5 border border-dashed border-current/20 px-6 text-center transition-all hover:border-current/40 hover:bg-current/10">
                            {day.dayNumber === 1 ? (
                              <>
                                <span className="text-sm font-bold text-emerald-500 mb-2">Transit & Settle</span>
                                <span className="text-[10px] uppercase tracking-wider leading-relaxed">
                                  You arrive on <span className="text-current font-bold">{formattedDate}</span>. No activities scheduled so you can comfortably reach your hotel and rest.
                                </span>
                              </>
                            ) : day.dayNumber === itinerary.days.length ? (
                              <>
                                <span className="text-sm font-bold text-blue-500 mb-2">Departure Day</span>
                                <span className="text-[10px] uppercase tracking-wider leading-relaxed">
                                  Heading home on <span className="text-current font-bold">{formattedDate}</span>. Safe travels!
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-sm font-bold text-amber-500 mb-2">Rest Day</span>
                                <span className="text-[10px] uppercase tracking-wider leading-relaxed">
                                  No rigid plans! Relax, explore at your own pace, or drag places here.
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </DroppableList>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* PANE 3: Right Summary (Trip Overview) */}
        <div className={`transition-all duration-300 ease-in-out lg:border-l border-t lg:border-t-0 z-20 shrink-0 shadow-2xl overflow-y-auto overflow-x-hidden flex flex-col ${activeTheme.card} ${activeTheme.text} ${isRightSidebarOpen ? 'w-full lg:w-[300px] opacity-100' : 'w-0 opacity-0'}`}>
          <div className="w-full lg:w-[300px] flex flex-col shrink-0">
            <div className="px-6 py-8 border-b border-current/10 shrink-0">
            <h3 className="text-sm font-bold tracking-widest uppercase text-inherit mb-6">
              Trip Overview
            </h3>
            
            <div className="space-y-4">
              {/* Main Progress Ring / Bar */}
              <div className="bg-current/5 border border-current/10 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none"></div>

                <div className="flex justify-between text-xs font-medium mb-3 relative z-10">
                  <span className="text-current/60">Routing Progress</span>
                  <span className="text-blue-500 font-bold">{progressPercent}%</span>
                </div>
                <div className="h-2 w-full bg-current/10 rounded-full overflow-hidden mb-4 relative z-10">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-700 ease-out" style={{ width: `${progressPercent}%` }}></div>
                </div>

                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div>
                    <p className="text-[10px] text-current/50 font-bold uppercase tracking-widest mb-1">Routed</p>
                    <p className="text-2xl font-black text-current">{scheduledPlacesCount} <span className="text-sm font-medium text-current/40">/ {totalPlacesCount}</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] text-current/50 font-bold uppercase tracking-widest mb-1">Total Time</p>
                    <p className="text-2xl font-black text-current">{totalScheduledHours}<span className="text-sm font-medium text-current/40">h</span></p>
                  </div>
                </div>
              </div>

              {/* Helpful User Metrics Card */}
              <div className="bg-current/5 border border-current/10 rounded-2xl p-5 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-current/50 uppercase tracking-widest">Pacing</p>
                    <p className={`text-sm font-bold ${pacingColor}`}>{pacingLevel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-current/50 uppercase tracking-widest">Avg Time</p>
                    <p className="text-sm font-bold text-current/80">{avgHoursPerDay.toFixed(1)}h / day</p>
                  </div>
                </div>

                <div className="h-[1px] w-full bg-current/10" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-current/50 uppercase tracking-widest">Estimated Cost So Far</p>
                    <p className="text-sm font-bold text-emerald-500">₹{totalTripCost.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-4 bg-transparent">
            <div className="flex-1"></div>
            
            <button
              id="tutorial-itinerary-automagic"
              onClick={() => itinerary.batchAssign(vaultItemIds)}
              disabled={vaultPlaces.length === 0 || itinerary.isOptimizing}
              className="w-full bg-current/5 border border-current/20 hover:border-emerald-500 hover:bg-current/10 disabled:opacity-50 disabled:hover:border-current/20 disabled:cursor-not-allowed text-current/80 hover:text-emerald-500 text-sm font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 group"
            >
              {itinerary.isOptimizing && (
                <Loader2 size={16} className="text-emerald-400 animate-spin" />
              )}
              {itinerary.isOptimizing ? 'Optimizing Route...' : 'Schedule to Maximize Comfort'}
            </button>
            
            <button 
              onClick={() => router.push('/plan/review')}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
            >
              Complete Trip <ArrowRight size={18} />
            </button>
          </div>
        </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {activePlace ? <SortablePlaceCard place={activePlace} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Gamified Day Picker Modal */}
      <AnimatePresence>
        {gamifiedPlace && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-3xl"
          >
            {/* Close layer */}
            <div className="absolute inset-0 cursor-pointer" onClick={() => setGamifiedPlace(null)} />

            <div className="relative z-10 flex flex-col items-center w-full max-w-4xl px-8">
              <motion.h2 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-2xl font-black text-white mb-10 tracking-widest uppercase drop-shadow-lg"
              >
                Assign to Day
              </motion.h2>

              {/* Centerpiece Place Card */}
              <motion.div
                layoutId={`place-${gamifiedPlace.id}`}
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1.05, y: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative mb-8 md:mb-16 pointer-events-none w-full max-w-xs md:max-w-sm shadow-[0_0_80px_rgba(16,185,129,0.2)] rounded-xl"
              >
                <div className="absolute inset-0 rounded-xl border-2 border-emerald-500 animate-pulse"></div>
                <SortablePlaceCard place={gamifiedPlace} />
              </motion.div>

              {/* Day Cards (Fan/Grid) */}
              <div className="flex flex-wrap justify-center gap-6">
                {itinerary.days.map((day, idx) => (
                  <motion.button
                    key={day.dayNumber}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + (idx * 0.05), type: 'spring' }}
                    whileHover={{ scale: 1.1, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleGamifiedSelect(day.dayNumber)}
                    className={`
                      w-24 h-24 md:w-32 md:h-32 rounded-2xl flex flex-col items-center justify-center gap-1 md:gap-2 border shadow-2xl transition-colors
                      ${day.totalTimeHours > 8 ? 'bg-red-950/50 border-red-500/30' : 'bg-[#111] border-[#333] hover:bg-emerald-900/40 hover:border-emerald-500'}
                    `}
                  >
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-500">Day</span>
                    <span className={`text-2xl md:text-4xl font-black ${day.totalTimeHours > 8 ? 'text-red-400' : 'text-white'}`}>
                      {day.dayNumber}
                    </span>
                    <div className="mt-1 md:mt-2 w-12 md:w-16 h-1 bg-[#222] rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${day.totalTimeHours > 8 ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, (day.totalTimeHours / 8) * 100)}%` }}
                      />
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Remove to Vault Option */}
              {gamifiedPlace && assignedPlaceIds.has(gamifiedPlace.id) && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  onClick={() => handleGamifiedSelect(0)}
                  className="mt-12 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-bold transition-colors"
                >
                  Unassign & Remove from Day
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #222;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #333;
        }
      `}</style>

      <TutorialOverlay 
        tutorialKey="plan-itinerary" 
        steps={[
          {
            targetId: 'tutorial-itinerary-vault',
            title: 'Your saved places live here',
            text: 'Everything you picked earlier is in this vault. Click to quick-assign, or grab and drag it onto a day.',
          },
          {
            targetId: 'tutorial-itinerary-daycolumns',
            title: 'Drop places into your days',
            text: 'Each column is one day of the trip. Drag a place here to slot it into your schedule.',
          },
          {
            targetId: 'tutorial-itinerary-minimap',
            title: 'Keep an eye on the pace',
            text: 'This minimap shows how packed each day is, so you can spot an overloaded day at a glance.',
          },
          {
            targetId: 'tutorial-itinerary-collaborators',
            title: "See who's planning with you",
            text: 'Invite collaborators and see live avatars of everyone editing the trip right now.',
          },
          {
            targetId: 'tutorial-itinerary-automagic',
            title: 'Stuck? Let AI take a pass',
            text: "Auto-Magic Plan arranges your saved places into a full itinerary in one click. You're always free to rearrange it after.",
          },
        ]} 
      />
    </div>
  );
}
