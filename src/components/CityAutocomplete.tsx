'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';


interface CityAutocompleteProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
}

export default function CityAutocomplete({ label, placeholder, value, onChange }: CityAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal query with external value if it changes
  useEffect(() => {
    if (value !== undefined) {
      setQuery(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const latestQueryRef = useRef(value);
  const [localCities, setLocalCities] = useState<any[]>([]);

  // Fetch all 750+ cities ONCE on mount for absolute 0ms instant autocomplete
  useEffect(() => {
    fetch('/api/local-cities')
      .then(res => res.json())
      .then(data => setLocalCities(data))
      .catch(err => console.error("Failed to load local cities", err));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    latestQueryRef.current = val;

    if (val === '') {
      onChange('');
      setResults([]);
      setIsOpen(false);
      return;
    }

    // Instantly filter locally with NO delay! 
    const searchVal = val.toLowerCase();
    const filtered = localCities.filter(c => 
      c.name.toLowerCase().startsWith(searchVal) || 
      c.display.toLowerCase().includes(searchVal)
    ).slice(0, 15); // Show top 15 matches

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (filtered.length > 0) {
      setResults(filtered);
      setIsOpen(true);
      setLoading(false);
    } else {
      // If no local results, fallback to Ola API via our backend proxy
      setResults([]);
      setLoading(true);
      
      timeoutRef.current = setTimeout(async () => {
        if (latestQueryRef.current !== val) return;
        
        try {
          const res = await fetch(`/api/search-city?q=${encodeURIComponent(val)}`);
          if (res.ok) {
            const data = await res.json();
            if (latestQueryRef.current === val && Array.isArray(data)) {
               setResults(data);
               setIsOpen(data.length > 0);
            }
          }
        } catch (error) {
          console.error("Failed to fetch API cities", error);
        } finally {
          if (latestQueryRef.current === val) {
            setLoading(false);
          }
        }
      }, 400); // 400ms debounce
    }
  };

  const handleSelect = (city: string) => {
    setQuery(city);
    onChange(city);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2 relative" ref={wrapperRef}>
      {label && <label className="text-sm font-medium text-muted-foreground">{label}</label>}
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          className="w-full p-3 bg-background border border-input text-foreground rounded-lg focus:ring-2 focus:ring-primary outline-none placeholder:text-muted-foreground/50 pr-10 transition-colors text-[11px] sm:text-[13px] truncate"
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          onBlur={() => {
            if (query && query.toLowerCase() !== (value || '').toLowerCase()) {
              if (results.length > 0) {
                handleSelect(results[0].name);
              } else {
                handleSelect(query);
              }
            } else if (query && query.toLowerCase() === (value || '').toLowerCase() && query !== value) {
              setQuery(value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (query && query.toLowerCase() !== (value || '').toLowerCase()) {
                if (results.length > 0) {
                  handleSelect(results[0].name);
                } else {
                  handleSelect(query);
                }
              } else if (query && query.toLowerCase() === (value || '').toLowerCase() && query !== value) {
                setQuery(value);
              }
            }
          }}
        />
        {/\d/.test(query) && (
          <div className="absolute top-full mt-1.5 left-0 text-red-500 text-[11px] font-medium flex items-center gap-1.5 bg-red-500/10 px-2 py-1.5 rounded-md backdrop-blur-sm border border-red-500/20 whitespace-nowrap z-50">
            <AlertCircle size={12} className="shrink-0" />
            <span>Invalid entry</span>
          </div>
        )}
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="animate-spin text-muted-foreground" size={18} />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-xl overflow-hidden top-[100%]">
          {results.map((res, i) => (
            <div
              key={i}
              className="p-3 hover:bg-muted cursor-pointer flex flex-col border-b last:border-0 border-border transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(res.name);
              }}
            >
              <div className="font-semibold text-foreground flex items-center gap-2 overflow-hidden">
                <MapPin size={14} className="text-muted-foreground shrink-0" />
                <span className="shrink-0">{res.name}</span>
                <span className="text-muted-foreground text-xs font-normal truncate">({res.state})</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}