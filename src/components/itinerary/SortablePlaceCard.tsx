import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Place } from '@/types/trip';
import { Clock, Ticket, CheckSquare, Square, Plus, GripVertical, Trash2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDestinationTheme } from '@/hooks/useDestinationTheme';

interface SortablePlaceCardProps {
  place: Place;
  sortableId?: string;
  isOverlay?: boolean;
  compact?: boolean;
  isSelected?: boolean;
  isAssigned?: boolean;
  dayColorCode?: string;
  dragUser?: { name: string; color: string } | null;
  lockedByOther?: boolean;
  onSelectToggle?: () => void;
  onQuickAdd?: (placeId: string) => void;
  onRemoveFromDay?: (placeId: string) => void;
  onClickContainer?: () => void;
}

export function SortablePlaceCard({ 
  place, 
  sortableId,
  isOverlay = false, 
  compact = false,
  isSelected = false,
  isAssigned = false,
  dayColorCode,
  dragUser,
  lockedByOther = false,
  onSelectToggle,
  onQuickAdd,
  onRemoveFromDay,
  onClickContainer
}: SortablePlaceCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortableId || place.id, disabled: lockedByOther });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : (isAssigned ? 0.4 : 1),
    ...(dragUser ? { outline: `2px solid ${dragUser.color}`, boxShadow: `0 0 15px ${dragUser.color}40` } : {})
  };

  const { activeTheme } = useDestinationTheme();

  const getCategoryColor = (cat: string) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('park') || c.includes('nature')) return 'text-green-400 bg-green-500/10 border-green-500/20';
    if (c.includes('museum') || c.includes('history') || c.includes('fort')) return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    if (c.includes('temple') || c.includes('church') || c.includes('shrine')) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  };
  const catStyle = getCategoryColor(place.category || '');

  const borderClasses: Record<string, string> = {
    'emerald': 'border-emerald-500/50 shadow-[inset_4px_0_0_rgba(16,185,129,0.3)]',
    'amber': 'border-amber-500/50 shadow-[inset_4px_0_0_rgba(245,158,11,0.3)]',
    'purple': 'border-purple-500/50 shadow-[inset_4px_0_0_rgba(168,85,247,0.3)]',
    'blue': 'border-blue-500/50 shadow-[inset_4px_0_0_rgba(59,130,246,0.3)]',
    'pink': 'border-pink-500/50 shadow-[inset_4px_0_0_rgba(236,72,153,0.3)]',
  };
  const dayBorder = dayColorCode ? borderClasses[dayColorCode] || 'border-[#222]' : '';

  return (
    <motion.div
      layoutId={isOverlay || isAssigned ? undefined : `card-${place.id}`}
      layout={!isOverlay && !isAssigned}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      ref={setNodeRef}
      style={style}
      onClick={onClickContainer}
      {...(!isAssigned ? attributes : {})}
      {...(!isAssigned ? listeners : {})}
      className={`relative group border rounded-xl flex items-stretch transition-[border-color,background-color,box-shadow,opacity] duration-300 touch-none ${activeTheme.card} ${activeTheme.text}
        ${isOverlay ? 'shadow-[0_0_30px_rgba(34,197,94,0.15)] border-green-500/50 scale-[1.02] z-50' : (dayBorder || 'border-[#222222] hover:border-[#333] hover:shadow-lg')}
        ${isSelected ? 'border-emerald-500/50' : ''}
        ${lockedByOther ? 'cursor-not-allowed' : (!isAssigned ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer')}
        ${compact ? 'p-3' : 'p-4'}
      `}
    >
      {dragUser && (
        <div 
          className="absolute -top-3 -right-2 px-2 py-0.5 rounded text-[9px] font-bold text-white shadow-lg z-20 whitespace-nowrap"
          style={{ backgroundColor: dragUser.color }}
        >
          {dragUser.name} dragging...
        </div>
      )}
      
      {isAssigned && compact && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 z-10 pointer-events-none bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded text-emerald-400 backdrop-blur-sm shadow-md">
          <CheckCircle size={10} />
          <span className="text-[8px] font-bold uppercase tracking-widest">Assigned</span>
        </div>
      )}
      {/* Selection Checkbox (Vault only) */}
      {onSelectToggle && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onSelectToggle();
          }}
          className="absolute -left-2 -top-2 z-10 w-6 h-6 rounded-md bg-[#1a1a1a] border border-[#333] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:border-emerald-500 data-[selected=true]:opacity-100 data-[selected=true]:bg-emerald-500 data-[selected=true]:border-emerald-400"
          data-selected={isSelected}
        >
          {isSelected ? <CheckSquare size={14} className="text-black" /> : <Square size={14} className="text-zinc-400" />}
        </button>
      )}

      {/* Minimal Drag Handle */}
      <div 
        className={`w-6 flex items-center justify-center shrink-0 transition-opacity text-inherit hover:opacity-100
          ${isAssigned ? 'opacity-20' : 'opacity-50'}
        `}
      >
        <GripVertical size={16} strokeWidth={2} />
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${compact ? 'pl-3' : 'pl-4'} relative`}>
        <div className="flex justify-between items-start mb-1">
          <h4 className="font-bold text-sm text-inherit truncate pr-6">{place.name}</h4>
          
          {/* Remove Button (Only shown when in a day column i.e. dayColorCode exists) */}
          {dayColorCode && onRemoveFromDay && (
            <div className="absolute right-0 top-0">
              <button 
                onClick={(e) => { e.stopPropagation(); onRemoveFromDay(place.id); }}
                className="text-inherit opacity-60 hover:opacity-100 hover:text-red-500 transition-colors p-1 bg-current/5 hover:bg-current/10 hover:border-red-500/50 rounded-md border border-current/10"
                title="Remove from day"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 mb-1.5">
          {place.entryFee && place.entryFee > 0 ? (
            <div className="flex items-center gap-1 text-[10px] font-bold text-inherit bg-current/5 px-1.5 py-0.5 rounded border border-current/10 shrink-0">
              <Ticket size={10} /> ₹{place.entryFee}
            </div>
          ) : null}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${catStyle}`}>
              {place.category || 'Location'}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-inherit font-medium">
              <Clock size={10} /> {(place.visitDurationHours || 1) + (place.travelTimeHours || 0)}h
            </span>
          </div>

          {/* Quick Add Button (Vault only) */}
          {onQuickAdd && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd(place.id);
              }}
              className="px-2 py-1 bg-current/10 hover:bg-emerald-600 text-inherit opacity-70 hover:opacity-100 hover:text-white rounded text-[10px] font-bold uppercase tracking-widest transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1"
            >
              <Plus size={10} /> Add
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
