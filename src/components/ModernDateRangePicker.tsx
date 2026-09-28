'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface ModernDateRangePickerProps {
  label: string;
  startDate: string | null;
  endDate: string | null;
  onChange: (start: string | null, end: string | null) => void;
  minDate?: string;
}

export default function ModernDateRangePicker({ label, startDate, endDate, onChange, minDate }: ModernDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Parse initial date or default to today
  const initialDate = startDate ? new Date(startDate) : new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  // Hover state for range selection
  const [hoverDate, setHoverDate] = useState<string | null>(null);

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

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = formatDate(selectedDate);
    
    if (!startDate || (startDate && endDate)) {
      // Start a new range
      onChange(dateStr, null);
    } else {
      // Complete the range
      const start = new Date(startDate);
      start.setHours(0,0,0,0);
      if (selectedDate < start) {
        // If selected date is before start date, restart the range
        onChange(dateStr, null);
      } else {
        onChange(startDate, dateStr);
        setIsOpen(false); // Close when range is complete
      }
    }
  };

  const isSelectedStart = (dateStr: string) => startDate === dateStr;
  const isSelectedEnd = (dateStr: string) => endDate === dateStr;
  
  const isWithinRange = (dateStr: string) => {
    if (!startDate) return false;
    const date = new Date(dateStr).getTime();
    const start = new Date(startDate).getTime();
    
    if (endDate) {
      const end = new Date(endDate).getTime();
      return date > start && date < end;
    }
    
    if (hoverDate) {
      const hover = new Date(hoverDate).getTime();
      return (date > start && date <= hover) || (date >= hover && date < start);
    }
    
    return false;
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
  const formatDisplay = (val: string | null) => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  };
  
  let displayValue = 'Select Dates';
  if (startDate && endDate) {
    displayValue = `${formatDisplay(startDate)} - ${formatDisplay(endDate)}`;
  } else if (startDate) {
    displayValue = `${formatDisplay(startDate)} - Select End`;
  }

  return (
    <div className="space-y-2 relative" ref={wrapperRef}>
      {label && (
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {label} <CalendarIcon size={16} className="text-primary" />
        </label>
      )}
      
      <div 
        className="w-full p-3 bg-background border border-input rounded-lg flex items-center justify-between cursor-pointer hover:border-primary transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`${startDate ? 'text-foreground font-medium' : 'text-muted-foreground/50'} truncate text-[11px] sm:text-[13px] leading-tight`}>{displayValue}</span>
        <CalendarIcon size={18} className="text-muted-foreground" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-72 mt-2 bg-popover/90 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-4 top-[100%] right-0 transform transition-all animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground">
              <ChevronLeft size={18} />
            </button>
            <div className="font-semibold text-foreground flex items-center gap-1">
              <select
                value={currentMonth.getMonth()}
                onChange={(e) => setCurrentMonth(new Date(currentMonth.getFullYear(), parseInt(e.target.value), 1))}
                className="bg-transparent appearance-none outline-none cursor-pointer hover:text-primary transition-colors font-semibold text-center"
              >
                {monthNames.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={currentMonth.getFullYear()}
                onChange={(e) => setCurrentMonth(new Date(parseInt(e.target.value), currentMonth.getMonth(), 1))}
                className="bg-transparent appearance-none outline-none cursor-pointer hover:text-primary transition-colors font-semibold text-center"
              >
                {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <button onClick={nextMonth} className="p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2 text-center">
            {daysOfWeek.map(day => (
              <div key={day} className="text-xs font-semibold text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {/* Empty slots for start of month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}
            
            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
              
              const isStart = isSelectedStart(dateStr);
              const isEnd = isSelectedEnd(dateStr);
              const inRange = isWithinRange(dateStr);
              const disabled = isPastDate(day);
              
              return (
                <div 
                  key={day} 
                  className={`relative flex items-center justify-center h-8
                    ${inRange ? 'bg-primary/20' : ''}
                    ${isStart && endDate ? 'bg-gradient-to-r from-transparent to-primary/20' : ''}
                    ${isEnd ? 'bg-gradient-to-l from-transparent to-primary/20' : ''}
                  `}
                  onMouseEnter={() => !disabled && setHoverDate(dateStr)}
                >
                  <button
                    disabled={disabled}
                    onClick={() => handleDateSelect(day)}
                    className={`
                      absolute h-8 w-8 rounded-full text-sm font-medium flex items-center justify-center transition-all z-10
                      ${disabled ? 'text-muted-foreground/30 cursor-not-allowed' : 'hover:bg-muted text-foreground cursor-pointer'}
                      ${(isStart || isEnd) ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/30 scale-105' : ''}
                      ${inRange && !isStart && !isEnd ? 'text-primary' : ''}
                    `}
                  >
                    {day}
                  </button>
                </div>
              );
            })}
          </div>
          
        </div>
      )}
    </div>
  );
}
