'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface ModernDatePickerProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  minDate?: string;
}

export default function ModernDatePicker({ label, value, onChange, minDate }: ModernDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Parse initial date or default to today
  const initialDate = value ? new Date(value) : new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    // Format to YYYY-MM-DD local time safely
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(selectedDate.getDate()).padStart(2, '0');
    
    onChange(`${year}-${month}-${dayStr}`);
    setIsOpen(false);
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    const [y, m, d] = value.split('-');
    return (
      parseInt(y) === currentMonth.getFullYear() &&
      parseInt(m) === currentMonth.getMonth() + 1 &&
      parseInt(d) === day
    );
  };

  const isPastDate = (day: number) => {
    if (!minDate) return false;
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const minimum = new Date(minDate);
    minimum.setHours(0, 0, 0, 0);
    return checkDate < minimum;
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Display value formatting
  const displayValue = value ? (() => {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  })() : 'Select Date';

  return (
    <div className="space-y-2 relative" ref={wrapperRef}>
      <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
        <CalendarIcon size={16} className="text-blue-500" /> {label}
      </label>
      
      <div 
        className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between cursor-pointer hover:border-blue-500 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? 'text-white font-medium' : 'text-zinc-600'}>{displayValue}</span>
        <CalendarIcon size={18} className="text-zinc-500" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-72 mt-2 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl p-4 top-[100%] left-0 transform transition-all animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
              <ChevronLeft size={18} />
            </button>
            <div className="font-semibold text-white">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <button onClick={nextMonth} className="p-1.5 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2 text-center">
            {daysOfWeek.map(day => (
              <div key={day} className="text-xs font-semibold text-zinc-500">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots for start of month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}
            
            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = isSelected(day);
              const disabled = isPastDate(day);
              
              return (
                <button
                  key={day}
                  disabled={disabled}
                  onClick={() => handleDateSelect(day)}
                  className={`
                    h-8 w-full rounded-full text-sm font-medium flex items-center justify-center transition-all
                    ${disabled ? 'text-zinc-700 cursor-not-allowed' : 'hover:bg-zinc-800 text-zinc-300 cursor-pointer'}
                    ${selected ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/30 scale-105' : ''}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
          
        </div>
      )}
    </div>
  );
}
