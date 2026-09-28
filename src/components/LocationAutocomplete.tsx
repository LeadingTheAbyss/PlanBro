'use client';
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, LocateFixed, Loader2, AlertCircle } from 'lucide-react';

interface LocationAutocompleteProps {
  memberId: string;
  value: string;
  lat?: number;
  city?: string;
  onUpdate: (id: string, field: string, value: any) => void;
  placeholder?: string;
}

export default function LocationAutocomplete({ memberId, value, lat, city, onUpdate, placeholder = "Add closest landmark" }: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (value !== query && !isOpen) {
      setQuery(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onUpdate(memberId, 'location', val);

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
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }, 400);
    } else {
      setResults([]);
      setIsOpen(false);
      setLoading(false);
    }
  };

  const handleSelect = async (place: any) => {
    const address = place.description;
    const placeId = place.place_id || place.reference || '';
    
    setQuery(address);
    onUpdate(memberId, 'location', address);
    setIsOpen(false);
    
    // If we already have geometry (from DB cache or API), use it instantly
    if (place.geometry && place.geometry.location) {
      onUpdate(memberId, 'lat', place.geometry.location.lat);
      onUpdate(memberId, 'lng', place.geometry.location.lng);
      return;
    }

    setLoading(true);

    try {
      // Pass place_id if available for 100% precision, otherwise fallback to address search
      let url = `/api/ola/geocode?address=${encodeURIComponent(address)}`;
      if (placeId) {
        url += `&place_id=${encodeURIComponent(placeId)}`;
      } else if (city && !address.toLowerCase().includes(city.toLowerCase())) {
        url = `/api/ola/geocode?address=${encodeURIComponent(address + ', ' + city)}`;
      }
        
      const res = await fetch(url);
      const data = await res.json();
      
      // Handle both geocoding structure and place details structure
      if (data.result && data.result.geometry) {
        onUpdate(memberId, 'lat', data.result.geometry.location.lat);
        onUpdate(memberId, 'lng', data.result.geometry.location.lng);
      } else if (data.geocodingResults && data.geocodingResults.length > 0) {
        const location = data.geocodingResults[0].geometry.location;
        onUpdate(memberId, 'lat', location.lat);
        onUpdate(memberId, 'lng', location.lng);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLocateMe = () => {
    setLocating(true);
    setQuery("Locating...");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const address = "Current Location";
          setQuery(address);
          onUpdate(memberId, 'location', address);
          onUpdate(memberId, 'lat', lat);
          onUpdate(memberId, 'lng', lng);
          setLocating(false);
        },
        (error) => {
          setQuery("");
          onUpdate(memberId, 'location', "");
          alert("Location access denied");
          setLocating(false);
        }
      );
    } else {
      setLocating(false);
    }
  };

  return (
    <div className="relative flex-1 w-full" ref={wrapperRef}>
      <div className="flex items-center gap-2 relative">
        <MapPin size={12} className={lat ? "text-emerald-400" : "text-zinc-600"} />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder={placeholder}
          className="w-full bg-transparent text-xs text-zinc-400 placeholder:text-zinc-700 focus:outline-none pr-12"
        />

        {(loading || (value && !lat && !locating && value !== 'Current Location')) && (
          <Loader2 size={12} className="text-zinc-500 animate-spin absolute right-6" />
        )}
        <button 
          onClick={handleLocateMe} 
          disabled={locating}
          className={`absolute right-0 hover:text-[#4a90e2] transition-colors disabled:cursor-not-allowed ${locating ? 'text-[#4a90e2]' : 'text-zinc-600'}`}
          title="Use current location"
        >
          <LocateFixed size={14} />
        </button>
      </div>
      
      {isOpen && results.length > 0 && (
        <div className="absolute z-[60] top-full left-0 right-0 mt-2 bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden">
          <ul className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
            {results.map((place, idx) => {
              const mainText = place.structured_formatting ? place.structured_formatting.main_text : place.description;
              const secondaryText = place.structured_formatting ? place.structured_formatting.secondary_text : "";
              
              return (
                <li 
                  key={idx}
                  onClick={() => handleSelect(place)}
                  className="px-4 py-2 hover:bg-[#2a2a2a] cursor-pointer transition-colors flex flex-col"
                >
                  <span className="text-sm text-white">{mainText}</span>
                  {secondaryText && <span className="text-xs text-[#777777]">{secondaryText}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
