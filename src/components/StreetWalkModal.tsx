import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface StreetWalkModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  // Choose between simple iframe embed or dynamic JS API
  mode?: 'iframe' | 'dynamic';
}

export function StreetWalkModal({ 
  isOpen, 
  onClose, 
  lat, 
  lng, 
  mode = 'dynamic' 
}: StreetWalkModalProps) {
  const panoRef = useRef<HTMLDivElement>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Handle Dynamic JS API loading and Panorama initialization
  useEffect(() => {
    if (!isOpen || mode !== 'dynamic') return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;
    
    if (!apiKey) {
      console.warn("No NEXT_PUBLIC_GOOGLE_PLACES_KEY found. Falling back to iframe mode.");
      setIsError(true);
      return;
    }

    let isMounted = true;

    const initPanorama = async () => {
      try {
        // Use the modern inline bootstrap loader if not already loaded
        // @ts-ignore
        if (!window.google?.maps?.importLibrary) {
          const scriptId = 'google-maps-bootstrap';
          if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            // The modern bootstrap loader
            script.innerHTML = `(g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=\`https://maps.\${c}apis.com/maps/api/js?\`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({key: "${apiKey}", v: "weekly"});`;
            document.head.appendChild(script);
          }
        }

        // Import the streetView library dynamically
        // @ts-ignore
        const { StreetViewPanorama, StreetViewSource, StreetViewService, StreetViewPreference } = await window.google.maps.importLibrary("streetView");
        // @ts-ignore
        const geometryLib = await window.google.maps.importLibrary("geometry");

        if (!isMounted) return;
        setIsScriptLoaded(true);

        if (panoRef.current) {
          const position = { lat, lng };
          
          // @ts-ignore
          const sv = new StreetViewService();

          const loadPanorama = (panoId: string, heading: number) => {
            if (!panoRef.current) return;
            new StreetViewPanorama(panoRef.current, {
              pano: panoId,
              pov: { heading, pitch: 0 },
              zoom: 1,
              addressControl: false,
              linksControl: true,
              panControl: true,
              enableCloseButton: false,
              fullscreenControl: false,
              motionTracking: true,
              motionTrackingControl: true,
            });
          };

          const trySearch = (radius: number, source: any) => {
            sv.getPanorama({
              location: position,
              radius: radius,
              preference: StreetViewPreference.NEAREST,
              source: source
            }, (data: any, status: string) => {
              if (status === 'OK' && data?.location?.pano && panoRef.current) {
                try {
                  let heading = 165;
                  if (data.location.latLng && geometryLib?.spherical?.computeHeading) {
                    heading = geometryLib.spherical.computeHeading(data.location.latLng, position);
                  }
                  loadPanorama(data.location.pano, heading);
                } catch (err) {
                  console.error("Error setting up panorama", err);
                  if (isMounted) setIsError(true);
                }
              } else {
                // If OUTDOOR fails, fallback to DEFAULT (which includes indoor user-uploaded photospheres)
                if (source === StreetViewSource.OUTDOOR) {
                  console.warn(`No outdoor street view within ${radius}m. Falling back to default photospheres.`);
                  trySearch(50, StreetViewSource.DEFAULT);
                } else {
                  console.warn("No street view found at all.");
                  if (isMounted) setIsError(true);
                }
              }
            });
          };

          // Start with a strict 50m outdoor search (closer to the gate)
          trySearch(50, StreetViewSource.OUTDOOR);
        }
      } catch (error) {
        console.error("Failed to load Google Maps API", error);
        if (isMounted) setIsError(true);
      }
    };

    initPanorama();

    return () => {
      isMounted = false;
    };
  }, [isOpen, mode, lat, lng]);

  if (!isOpen) return null;

  // Iframe URL construction (fallback if dynamic fails or iframe mode is requested)
  // Needs a valid Maps Embed API key for streetview mode
  const embedKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY || '';
  const iframeUrl = `https://www.google.com/maps/embed/v1/streetview?key=${embedKey}&location=${lat},${lng}&radius=50&pitch=0&fov=90`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Modern Close Button Pinned Top Right */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 z-[60] p-3 rounded-full bg-black/40 text-white hover:bg-white hover:text-black transition-all duration-300 shadow-lg group"
        aria-label="Close Street Walk"
      >
        <X size={24} className="group-hover:scale-110 transition-transform" />
      </button>

      {/* Main Content Area */}
      <div className="w-full h-full relative">
        {mode === 'iframe' || isError ? (
          <iframe
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            src={iframeUrl}
            className="w-full h-full"
          />
        ) : (
          <>
            {/* Loading State for Dynamic Mode */}
            {!isScriptLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p className="text-sm font-medium tracking-wide uppercase">Connecting to Street View...</p>
              </div>
            )}
            {/* Dynamic Container */}
            <div ref={panoRef} className="w-full h-full bg-black" />
          </>
        )}
      </div>
    </div>
  );
}
