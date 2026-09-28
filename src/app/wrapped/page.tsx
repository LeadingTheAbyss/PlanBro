'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-transparent animate-pulse" />
});

const AnimatedJourneyMap = dynamic(() => import('@/components/AnimatedJourneyMap'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-transparent animate-pulse" />
});

const CITY_COORDS: Record<string, {lat: number, lng: number}> = {
  "Jaipur": {lat: 26.9124, lng: 75.7873},
  "Udaipur": {lat: 24.5854, lng: 73.7125},
  "Goa": {lat: 15.2993, lng: 74.1240},
  "Manali": {lat: 32.2396, lng: 77.1887},
  "Rishikesh": {lat: 30.0869, lng: 78.2676},
  "Pondicherry": {lat: 11.9416, lng: 79.8083},
  "Munnar": {lat: 10.0889, lng: 77.0595},
  "Varanasi": {lat: 25.3176, lng: 82.9739},
  "Leh": {lat: 34.1526, lng: 77.5771},
  "Delhi": {lat: 28.7041, lng: 77.1025},
  "Mumbai": {lat: 19.0760, lng: 72.8777},
  "Bangalore": {lat: 12.9716, lng: 77.5946},
  "Chennai": {lat: 13.0827, lng: 80.2707},
  "Kolkata": {lat: 22.5726, lng: 88.3639},
  "Hyderabad": {lat: 17.3850, lng: 78.4867},
  "Pune": {lat: 18.5204, lng: 73.8567},
  "Agra": {lat: 27.1767, lng: 78.0081},
  "Kochi": {lat: 9.9312, lng: 76.2673},
  "Ahmedabad": {lat: 23.0225, lng: 72.5714},
  "Srinagar": {lat: 34.0837, lng: 74.7973},
  "Darjeeling": {lat: 27.0410, lng: 88.2663},
  "Ooty": {lat: 11.4100, lng: 76.6950},
  "Shimla": {lat: 31.1048, lng: 77.1734},
  "Lucknow": {lat: 26.8467, lng: 80.9462},
  "New Delhi": {lat: 28.6139, lng: 77.2090},
  "Chandigarh": {lat: 30.7333, lng: 76.7794},
  "Amritsar": {lat: 31.6340, lng: 74.8723},
  "Mysore": {lat: 12.2958, lng: 76.6394},
  "Guwahati": {lat: 26.1445, lng: 91.7362}
};

function AnimatedNumber({ value, active, duration = 1500 }: { value: number, active: boolean, duration?: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!active) {
      setCurrent(0);
      return;
    }

    let startTime = performance.now();
    
    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeOutExpo for a cool fast-to-slow rolling effect
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const nextValue = Math.floor(easeProgress * value);
      setCurrent(nextValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrent(value);
      }
    };
    
    const raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value, active, duration]);

  return <>{current.toLocaleString()}</>;
}

function WrappedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const total = 7;
  const [current, setCurrent] = useState(1);
  const [showToast, setShowToast] = useState(false);
  
  const range = searchParams.get('range') || 'all-time';
  const startDateStr = searchParams.get('start');
  const endDateStr = searchParams.get('end');

  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<string[]>([]);
  const [foods, setFoods] = useState<string[]>([]);
  const [buddies, setBuddies] = useState<[string, number][]>([]);
  const [tripsCount, setTripsCount] = useState(0);
  const [foodStopsCount, setFoodStopsCount] = useState(0);
  const [distance, setDistance] = useState(0);
  const [topBuddy, setTopBuddy] = useState<string>('Solo');
  const [topBuddyCount, setTopBuddyCount] = useState(0);
  const [buddiesCount, setBuddiesCount] = useState(0);
  
  const [mapCoords, setMapCoords] = useState<any[]>([]);
  const [mapRoutes, setMapRoutes] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/trips')
      .then(res => res.json())
      .then(data => {
        let trips = data.trips || [];
        
        // Filter by date
        const now = new Date();
        trips = trips.filter((t: any) => {
          const tDate = new Date(t.createdAt);
          if (range === 'today') {
            return tDate.toDateString() === now.toDateString();
          } else if (range === 'this-week') {
            const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return tDate >= lastWeek;
          } else if (range === 'this-month') {
            return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
          } else if (range === 'this-year') {
            return tDate.getFullYear() === now.getFullYear();
          } else if (range === 'custom' && startDateStr && endDateStr) {
            const end = new Date(endDateStr);
            end.setHours(23, 59, 59); // include entire end day
            return tDate >= new Date(startDateStr) && tDate <= end;
          }
          return true; // all-time
        });

        // Calculate statistics
        const cityMap: Record<string, number> = {};
        const foodMap: Record<string, number> = {};
        const buddyMap: Record<string, number> = {};
        let totalFoodStops = 0;

        trips.forEach((t: any) => {
          // City
          const dest = t.destination || t.snapshot?.city || 'Unknown';
          cityMap[dest] = (cityMap[dest] || 0) + 1;

          // Places & Foods (All Itinerary Items)
          if (t.snapshot?.selectedFood) {
             t.snapshot.selectedFood.forEach((f: any) => {
               const fname = typeof f === 'string' ? f : f.name || 'Food';
               foodMap[fname] = (foodMap[fname] || 0) + 1;
               totalFoodStops++;
             });
          }
          if (t.snapshot?.selectedPlaces) {
             t.snapshot.selectedPlaces.forEach((p: any) => {
               const pname = typeof p === 'string' ? p : p.name || 'Place';
               foodMap[pname] = (foodMap[pname] || 0) + 1;
               totalFoodStops++;
             });
          }
          if (t.snapshot?.stops) {
             t.snapshot.stops.forEach((s: any) => {
                 const sname = s.name || 'Stop';
                 foodMap[sname] = (foodMap[sname] || 0) + 1;
                 totalFoodStops++;
             });
          }
          if (t.snapshot?.itinerary) {
             t.snapshot.itinerary.forEach((day: any) => {
               const acts = day.activities || day.places || day.spots || [];
               acts.forEach((act: any) => {
                 const actname = typeof act === 'string' ? act : (act.name || act.title || 'Activity');
                 foodMap[actname] = (foodMap[actname] || 0) + 1;
                 totalFoodStops++;
               });
             });
          }

          // Buddies
          const passengers = t.snapshot?.passengers || t.snapshot?.members || [];
          passengers.forEach((p: any) => {
            const pname = typeof p === 'string' ? p : p.name;
            if (pname) {
               buddyMap[pname] = (buddyMap[pname] || 0) + 1;
            }
          });
        });

        // Sort and select
        const sortedCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).map(x => x[0]).slice(0, 10);
        const sortedFoods = Object.entries(foodMap).sort((a, b) => b[1] - a[1]).map(x => x[0]).slice(0, 10);
        const sortedBuddies = Object.entries(buddyMap).sort((a, b) => b[1] - a[1]).slice(0, 5) as [string, number][];

        setCities(sortedCities.length > 0 ? sortedCities : ['No trips yet']);
        setFoods(sortedFoods.length > 0 ? sortedFoods : ['No food logged']);
        setBuddies(sortedBuddies);
        setTripsCount(trips.length);
        setFoodStopsCount(totalFoodStops);
        setDistance(trips.length * 1520); // heuristic distance
        setBuddiesCount(Object.keys(buddyMap).length);
        
        if (sortedBuddies.length > 0) {
           setTopBuddy(sortedBuddies[0][0]);
           setTopBuddyCount(sortedBuddies[0][1]);
        } else {
           setTopBuddy('Solo');
           setTopBuddyCount(0);
        }
        
        // Generate sequential map routes
        const coords: any[] = [];
        const routes: any[] = [];
        
        // Asynchronously fetch coords
        (async () => {
          const newCoords = { ...CITY_COORDS };
          for (const city of sortedCities) {
            const match = Object.keys(newCoords).find(k => k.toLowerCase() === city.toLowerCase());
            if (!match) {
              try {
                // Free geocoding fallback for missing cities
                const geo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
                const geoData = await geo.json();
                if (geoData && geoData[0]) {
                  newCoords[city] = { lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) };
                }
              } catch(e) {}
            }
          }

          let validCities = sortedCities.filter(c => {
            return Object.keys(newCoords).some(k => k.toLowerCase() === c.toLowerCase());
          });
          
          validCities.forEach((city, index) => {
            const match = Object.keys(newCoords).find(k => k.toLowerCase() === city.toLowerCase());
            if (match) {
              const coord = newCoords[match];
              const node = { id: `city-${city}`, lat: coord.lat, lng: coord.lng, type: 'destination', name: city };
              coords.push(node);
              
              if (index > 0) {
                routes.push({
                  id: `route-${validCities[index-1]}-${city}`,
                  start: coords[index - 1],
                  end: node
                });
              }
            }
          });
          
          setMapCoords(coords);
          setMapRoutes(routes);
          setLoading(false);
        })();
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [range, startDateStr, endDateStr]);

  const handleNext = () => {
    if(current < total) setCurrent(c => c + 1);
  };

  const handlePrev = () => {
    if(current > 1) setCurrent(c => c - 1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrent(c => (c < total ? c + 1 : c));
      } else if (e.key === 'ArrowLeft') {
        setCurrent(c => (c > 1 ? c - 1 : c));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [total]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#05061A] flex items-center justify-center">
        <p className="text-white font-mono text-xs tracking-widest animate-pulse">ANALYZING YOUR JOURNEYS...</p>
      </div>
    );
  }

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1800);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        :root{
          --ink:#0A0E27;
          --ink2:#121A3F;
          --ink3:#1B2657;
          --gold:#F5B942;
          --pink:#FF3D7F;
          --mint:#37E8C4;
          --cream:#F7F3EC;
          --muted:rgba(247,243,236,0.58);
          --line:rgba(247,243,236,0.14);
        }
        .wrapped-body {
          height: 100vh;
          background:#05061A;
          background-image:
            radial-gradient(ellipse 900px 600px at 15% 10%, rgba(245,185,66,0.10), transparent 60%),
            radial-gradient(ellipse 900px 700px at 90% 90%, rgba(255,61,127,0.10), transparent 60%);
          font-family:'Inter',sans-serif;
          display:flex;
          align-items:center;
          justify-content:center;
          overflow:hidden;
        }
        .stage{
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:18px;
        }
        .hint{
          font-family: monospace;
          font-size:11px;
          letter-spacing:0.14em;
          text-transform:uppercase;
          color:rgba(247,243,236,0.35);
        }
        .hint b{color:rgba(247,243,236,0.6); font-weight:600;}

        /* story container */
        .phone{
          position:relative;
          width:100%;
          max-width:440px;
          height:85vh;
          max-height:850px;
          border-radius:24px;
          background:#05061A;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.08),
            0 40px 90px -20px rgba(0,0,0,0.8),
            0 0 120px -30px rgba(245,185,66,0.1);
          overflow:hidden;
        }
        .screen-frame{
          position:relative;
          width:100%; height:100%;
          background:var(--ink);
          isolation:isolate;
        }

        /* ambient moving blobs */
        .ambient{position:absolute; inset:0; z-index:0; overflow:hidden;}
        .blob{position:absolute; border-radius:50%; filter:blur(60px); opacity:0.35; animation:drift 18s ease-in-out infinite;}
        .blob.b1{width:260px;height:260px; background:var(--gold); top:-60px; left:-60px;}
        .blob.b2{width:280px;height:280px; background:var(--pink); bottom:-80px; right:-60px; animation-delay:-6s;}
        .blob.b3{width:220px;height:220px; background:var(--mint); bottom:20%; left:-80px; animation-delay:-11s;}
        @keyframes drift{
          0%,100%{transform:translate(0,0) scale(1);}
          50%{transform:translate(30px,-20px) scale(1.15);}
        }

        /* progress bar */
        .progress{
          position:absolute; top:22px; left:16px; right:16px;
          display:flex; gap:5px; z-index:40;
        }
        .progress .seg{
          flex:1; height:3px; border-radius:3px;
          background:rgba(247,243,236,0.22);
          overflow:hidden;
        }
        .progress .seg i{
          display:block; height:100%; width:0%;
          background:var(--cream);
          border-radius:3px;
          transition:width .25s linear;
        }
        .progress .seg.done i{width:100%;}

        .brandbar{
          position:absolute; top:40px; left:20px; right:20px;
          display:flex; align-items:center; justify-content:space-between;
          z-index:40;
        }
        .brandbar .logo{
          font-family: monospace;
          font-size:12px; letter-spacing:0.08em;
          color:var(--cream); font-weight:600;
          display:flex; align-items:center; gap:6px;
        }
        .brandbar .logo::before{content:"✈"; color:var(--gold); font-size:12px;}
        .brandbar .pnr{
          font-family: monospace;
          font-size:10px; color:rgba(247,243,236,0.4); letter-spacing:0.08em;
        }

        /* tap zones */
        .tapzone{position:absolute; top:0; bottom:0; width:50%; z-index:35; cursor:pointer; -webkit-tap-highlight-color: transparent;}
        .tapzone.left{left:0;} .tapzone.right{right:0;}

        /* screens */
        .screens{position:absolute; inset:0; z-index:5;}
        .screen{
          position:absolute; inset:0;
          display:none;
          flex-direction:column;
          padding:100px 26px 40px;
          z-index:6;
        }
        .screen.active{display:flex;}

        .eyebrow{
          font-family: monospace;
          font-size:11px; letter-spacing:0.16em; text-transform:uppercase;
          color:var(--gold);
          display:flex; align-items:center; gap:8px;
          margin-bottom:14px;
          opacity:0; transform:translateY(8px);
          animation:riseIn .5s .05s forwards ease-out;
        }
        .eyebrow::before{content:""; width:16px; height:1px; background:var(--gold);}

        .display{
          font-family:'Bricolage Grotesque', sans-serif;
          color:var(--cream);
          font-weight:700;
          line-height:1.02;
          letter-spacing:-0.01em;
        }
        .subcopy{
          font-family:'Inter',sans-serif;
          color:var(--muted);
          font-size:15px;
          line-height:1.55;
          margin-top:14px;
          max-width:300px;
          opacity:0; transform:translateY(8px);
          animation:riseIn .5s .2s forwards ease-out;
        }
        @keyframes riseIn{ to{opacity:1; transform:translateY(0);} }
        @keyframes countRise{ from{opacity:0; transform:translateY(16px);} to{opacity:1; transform:translateY(0);} }

        .ticket-tag{
          font-family: monospace;
          font-size:10.5px;
          letter-spacing:0.06em;
          color:var(--ink);
          background:var(--cream);
          padding:5px 10px;
          border-radius:100px;
          display:inline-flex;
          align-items:center;
          gap:6px;
          font-weight:600;
        }

        .dashed-divider{
          width:100%; height:0; border-top:1.5px dashed var(--line);
          margin:22px 0;
        }

        /* screen 1: intro */
        #s1{justify-content:center; align-items:flex-start; padding-top:0;}
        #s1 .wordmark{
          font-family: monospace;
          font-size:13px; letter-spacing:0.2em; color:var(--muted); margin-bottom:26px;
        }
        #s1 .display{font-size:56px;}
        #s1 .display span{color:var(--gold);}
        #s1 .cta{
          margin-top:40px;
          display:flex; align-items:center; gap:10px;
          font-family: monospace;
          font-size:12px; letter-spacing:0.1em; text-transform:uppercase;
          color:var(--cream);
        }
        #s1 .cta .arrow{
          width:34px; height:34px; border-radius:50%;
          border:1px solid var(--line);
          display:flex; align-items:center; justify-content:center;
          animation:pulseArrow 1.6s ease-in-out infinite;
        }
        @keyframes pulseArrow{0%,100%{transform:translateX(0);}50%{transform:translateX(5px);}}

        /* stat number */
        .statnum{
          font-family:'Bricolage Grotesque', sans-serif;
          font-weight:800;
          font-size:104px;
          line-height:0.92;
          letter-spacing:-0.02em;
          background:linear-gradient(180deg, var(--cream), rgba(247,243,236,0.75));
          -webkit-background-clip:text; background-clip:text; color:transparent;
          margin-top:6px;
        }
        .statunit{
          font-family: monospace;
          font-size:14px; color:var(--muted); letter-spacing:0.08em; text-transform:uppercase;
          margin-top:6px;
        }
        .accentline{width:44px; height:4px; border-radius:4px; margin-top:22px;}

        /* chips (screen 2) */
        .chiprow{display:flex; flex-wrap:wrap; gap:8px; margin-top:22px;}
        .citychip{
          font-family:'Inter',sans-serif; font-size:12.5px; font-weight:600;
          color:var(--cream);
          background:rgba(247,243,236,0.06);
          border:1px solid var(--line);
          padding:7px 12px; border-radius:100px;
          opacity:0; transform:translateY(6px);
          animation:countRise .4s forwards ease-out;
        }

        /* screen 3 distance / route viz */
        .routeviz{
          margin-top:26px; width:100%; height:70px; position:relative;
        }
        .routeviz svg{width:100%; height:100%; overflow:visible;}
        .routeviz .path{
          fill:none; stroke:var(--mint); stroke-width:2; stroke-dasharray:6 8;
          stroke-linecap:round;
          animation:dashmove 1.4s linear infinite;
        }
        @keyframes dashmove{ to{ stroke-dashoffset:-28; } }
        .routeviz .dot{fill:var(--cream);}
        .equivbox{
          margin-top:20px;
          border:1px solid var(--line);
          border-radius:16px;
          padding:14px 16px;
          background:rgba(247,243,236,0.04);
        }
        .equivbox .lbl{font-family: monospace; font-size:10px; color:var(--mint); letter-spacing:0.1em; text-transform:uppercase; margin-bottom:6px;}
        .equivbox .txt{font-size:13.5px; color:var(--cream); line-height:1.5;}

        /* screen 5 foodie tag cloud */
        .tagcloud{display:flex; flex-wrap:wrap; gap:9px; margin-top:22px;}
        .foodtag{
          font-family:'Inter',sans-serif; font-size:12.5px; font-weight:600;
          color:var(--ink); background:var(--gold);
          padding:7px 13px; border-radius:100px;
          opacity:0; transform:scale(0.85);
          animation:popIn .4s forwards ease-out;
        }
        @keyframes popIn{ to{opacity:1; transform:scale(1);} }

        /* screen 6: map */
        .mapwrap{
          margin-top:16px; position:relative; flex:1;
          display:flex; align-items:center; justify-content:center;
          width:100%; border-radius: 20px; overflow: hidden;
          box-shadow: inset 0 0 40px rgba(0,0,0,0.8);
        }
        .mapwrap::after {
          content: "";
          position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(5,6,26,0) 0%, rgba(5,6,26,0.6) 100%);
          pointer-events: none;
          z-index: 10;
        }
        .city-dot{fill:var(--gold); stroke:var(--ink); stroke-width:2;}
        .city-pulse{fill:none; stroke:var(--gold); stroke-width:1.5; opacity:0.6; animation:pulseRing 2.2s ease-out infinite;}
        @keyframes pulseRing{
          0%{ r:5; opacity:0.7; }
          100%{ r:16; opacity:0; }
        }
        .city-label{font-family: monospace; font-size:8.5px; fill:var(--cream); letter-spacing:0.02em;}

        /* screen 7 buddies */
        .buddy-count-row{display:flex; align-items:baseline; gap:10px; margin-top:2px;}
        .reveal-card{
          margin-top:18px;
          border:1px solid rgba(255,61,127,0.35);
          background:linear-gradient(160deg, rgba(255,61,127,0.14), rgba(255,61,127,0.02));
          border-radius:20px;
          padding:22px 20px;
          text-align:center;
        }
        .reveal-card .lbl{font-family: monospace; font-size:10.5px; letter-spacing:0.14em; text-transform:uppercase; color:var(--pink);}
        .avatar-ring{
          width:76px; height:76px; border-radius:50%; margin:16px auto 12px;
          background:linear-gradient(135deg,var(--pink),var(--gold));
          display:flex; align-items:center; justify-content:center;
          font-family:'Bricolage Grotesque',sans-serif; font-weight:700; font-size:26px; color:var(--ink);
        }
        .reveal-card .name{font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:30px; color:var(--cream);}
        .reveal-card .meta{font-family: monospace; font-size:11px; color:var(--muted); margin-top:6px; letter-spacing:0.05em;}
        .buddy-bars{margin-top:20px; display:flex; flex-direction:column; gap:9px;}
        .buddy-bar-row{display:flex; align-items:center; gap:10px;}
        .buddy-bar-row .bname{width:58px; font-family:'Inter',sans-serif; font-size:11.5px; color:var(--muted); font-weight:600; flex-shrink:0;}
        .buddy-bar-track{flex:1; height:8px; border-radius:6px; background:rgba(247,243,236,0.08); overflow:hidden;}
        .buddy-bar-fill{height:100%; border-radius:6px; width:0%; background:linear-gradient(90deg,var(--pink),var(--gold)); transition:width 1s cubic-bezier(.2,.9,.3,1);}
        .buddy-bar-row .bnum{font-family: monospace; font-size:11px; color:var(--cream); width:16px; text-align:right;}

        /* screen 8 final ticket */
        #s8{padding:70px 20px 30px; align-items:center;}
        .ticket{
          width:100%;
          background:linear-gradient(165deg,#151B44,#0A0E27);
          border:1px solid rgba(247,243,236,0.12);
          border-radius:22px;
          padding:22px 20px 0;
          position:relative;
          box-shadow:0 20px 60px -20px rgba(0,0,0,0.6);
        }
        .ticket-top{display:flex; justify-content:space-between; align-items:flex-start;}
        .ticket-top .tlogo{font-family: monospace; font-weight:700; font-size:13px; color:var(--cream); letter-spacing:0.06em;}
        .ticket-top .tlogo span{color:var(--gold);}
        .ticket-top .tyear{font-family: monospace; font-size:11px; color:var(--muted);}
        .ticket-headline{font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:26px; color:var(--cream); margin-top:16px; line-height:1.05;}
        .ticket-grid{
          display:grid; grid-template-columns:1fr 1fr; gap:14px 10px;
          margin-top:20px;
        }
        .ticket-stat .k{font-family: monospace; font-size:9.5px; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted);}
        .ticket-stat .v{font-family:'Bricolage Grotesque',sans-serif; font-weight:700; font-size:22px; color:var(--cream); margin-top:2px;}
        .ticket-stat .v.gold{color:var(--gold);}
        .ticket-stat .v.pink{color:var(--pink);}
        .ticket-stat .v.mint{color:var(--mint);}
        .perforation{
          position:relative; margin-top:22px; height:1px;
          border-top:1.5px dashed rgba(247,243,236,0.25);
        }
        .perforation::before, .perforation::after{
          content:""; position:absolute; top:-9px; width:18px; height:18px; background:#05061A; border-radius:50%;
        }
        .perforation::before{left:-29px;}
        .perforation::after{right:-29px;}
        .ticket-bottom{display:flex; align-items:center; justify-content:space-between; padding:16px 0 20px;}
        .barcode{display:flex; gap:2px; align-items:flex-end; height:26px;}
        .barcode i{display:block; width:2px; background:rgba(247,243,236,0.5);}
        .ticket-bottom .code{font-family: monospace; font-size:10px; color:var(--muted); letter-spacing:0.08em;}

        .share-btn{
          margin-top:24px; width:100%;
          background:var(--gold); color:var(--ink);
          font-family:'Inter',sans-serif; font-weight:700; font-size:14.5px;
          border:none; border-radius:100px; padding:15px;
          display:flex; align-items:center; justify-content:center; gap:8px;
          cursor:pointer;
          transition:transform .15s ease;
        }
        .share-btn:active{transform:scale(0.97);}
        .share-sub{
          margin-top:12px; font-family: monospace; font-size:10.5px; color:rgba(247,243,236,0.35); letter-spacing:0.05em;
        }
        .toast{
          position:absolute; bottom:110px; left:50%; transform:translateX(-50%) translateY(10px);
          background:var(--cream); color:var(--ink);
          font-family:'Inter',sans-serif; font-weight:600; font-size:12.5px;
          padding:10px 18px; border-radius:100px;
          opacity:0; pointer-events:none; z-index:60;
          transition:all .3s ease;
          white-space:nowrap;
        }
        .toast.show{opacity:1; transform:translateX(-50%) translateY(0);}

        @media (max-height:780px){
          .phone{height:92vh;}
          .statnum{font-size:86px;}
          #s1 .display{font-size:46px;}
        }
      `}} />
      <div className="wrapped-body relative">
        <button 
          onClick={() => router.push('/profile')} 
          className="absolute top-8 left-8 text-white/50 hover:text-white z-50 text-sm flex items-center gap-2 tracking-widest uppercase font-bold"
        >
          &larr; Back
        </button>

        <div className="stage w-full px-4">
          <div className="phone">
            <div className="screen-frame">
              <div className="ambient">
                <div className="blob b1"></div><div className="blob b2"></div><div className="blob b3"></div>
              </div>

              <div className="progress" id="progress">
                {[...Array(total)].map((_, i) => (
                  <div key={i} className={`seg ${i + 1 <= current ? 'done' : ''}`}><i></i></div>
                ))}
              </div>
              
              <div className="brandbar">
                <div className="logo">PLANBRO</div>
                <div className="pnr" id="pnrlabel">SCREEN {current}/{total}</div>
              </div>

              <div className="tapzone left" onClick={handlePrev}></div>
              <div className="tapzone right" onClick={handleNext}></div>

              <div className="screens">

                {/* 1 INTRO */}
                <div className={`screen ${current === 1 ? 'active' : ''}`} id="s1">
                  <div className="wordmark">PLANBRO PRESENTS</div>
                  <div className="display">Your 2026,<br/>in motion<span>.</span></div>
                  <div className="subcopy">Every city you chased, every km you clocked, every plate you didn't finish. We tracked it all so you don't have to remember it.</div>
                  <div className="cta" onClick={handleNext} style={{cursor: 'pointer'}}>Tap to begin <div className="arrow">&rarr;</div></div>
                </div>

                {/* 2 EXPLORER */}
                <div className={`screen flex flex-col ${current === 2 ? 'active' : ''}`} id="s2" style={{paddingBottom:'24px'}}>
                  <div className="eyebrow">Terminal 01 &middot; Destinations</div>
                  <div className="statnum" data-count={cities.length === 1 && cities[0] === 'No trips yet' ? 0 : cities.length}>{cities.length === 1 && cities[0] === 'No trips yet' ? 0 : cities.length}</div>
                  <div className="statunit">cities explored</div>
                  <div className="accentline" style={{background:'var(--gold)'}}></div>
                  <div className="mapwrap" style={{marginTop:'24px'}}>
                    {mapCoords.length > 0 ? (
                      <div className="absolute inset-0 z-0">
                        {current === 2 && <AnimatedJourneyMap coords={mapCoords} isActive={true} />}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-white/50 text-sm font-mono bg-[#0A0E27]">No route data available</div>
                    )}
                  </div>
                </div>

                {/* 3 DISTANCE */}
                <div className={`screen ${current === 3 ? 'active' : ''}`} id="s3">
                  <div className="eyebrow" style={{color:'var(--mint)'}}>Terminal 02 &middot; Distance</div>
                  <div className="statnum" data-count={distance}><AnimatedNumber value={distance} active={current === 3} /></div>
                  <div className="statunit">kilometers covered</div>
                  <div className="accentline" style={{background:'var(--mint)'}}></div>
                  <div className="routeviz">
                    <svg viewBox="0 0 320 70" preserveAspectRatio="none">
                      <path className="path" d="M5,50 Q80,10 160,40 T310,20"/>
                      <circle className="dot" cx="5" cy="50" r="4"/>
                      <circle className="dot" cx="310" cy="20" r="4"/>
                    </svg>
                  </div>
                  <div className="equivbox">
                    <div className="lbl">Put in perspective</div>
                    <div className="txt">That's Delhi to London and back &mdash; with a detour to Goa, because obviously.</div>
                  </div>
                </div>

                {/* 4 TRIPS */}
                <div className={`screen ${current === 4 ? 'active' : ''}`} id="s4">
                  <div className="eyebrow">Terminal 03 &middot; Trips</div>
                  <div className="statnum" data-count={tripsCount}><AnimatedNumber value={tripsCount} active={current === 4} /></div>
                  <div className="statunit">trips planned</div>
                  <div className="accentline" style={{background:'var(--gold)'}}></div>
                  <div className="subcopy" style={{marginTop:'20px'}}>{tripsCount} times you said "let's just go" &mdash; and actually went.</div>
                  <div className="dashed-divider"></div>
                  <div className="ticket-tag">&#10003; Exploring {range === 'all-time' ? 'forever' : range.replace('-', ' ')}</div>
                  <div style={{height:'8px'}}></div>
                  <div className="ticket-tag">&#10003; The world is yours</div>
                </div>

                {/* 5 EXPLORATIONS */}
                <div className={`screen ${current === 5 ? 'active' : ''}`} id="s5">
                  <div className="eyebrow" style={{color:'var(--pink)'}}>Terminal 04 &middot; Explorations</div>
                  <div className="statnum" data-count={foodStopsCount}><AnimatedNumber value={foodStopsCount} active={current === 5} /></div>
                  <div className="statunit">places &amp; restaurants visited</div>
                  <div className="accentline" style={{background:'var(--pink)'}}></div>
                  <div className="subcopy" style={{marginTop:'20px'}}>You explored far and wide. Here are the spots that defined your trips.</div>
                  <div className="tagcloud" id="foodtags">
                    {foods.map((f, i) => (
                      <div key={i} className="foodtag" style={{animationDelay: `${0.15 + i*0.05}s`}}>{f}</div>
                    ))}
                  </div>
                </div>

                {/* 6 SOCIAL */}
                <div 
                  className={`screen ${current === 6 ? 'active' : ''}`} 
                  id="s6"
                  style={{
                    backgroundImage: 'linear-gradient(to bottom, rgba(5,6,26,0.7), rgba(5,6,26,0.95)), url(/wrapped_friends.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="eyebrow" style={{color:'var(--pink)'}}>Terminal 05 &middot; Travel Squad</div>
                  <div className="buddy-count-row">
                    <div className="statnum" style={{fontSize:'64px'}} data-count={buddiesCount}><AnimatedNumber value={buddiesCount} active={current === 6} /></div>
                    <div className="statunit" style={{marginTop:'0'}}>travel buddies in this period</div>
                  </div>
                  <div className="reveal-card">
                    <div className="lbl">Out of all your buddies, your top buddy was</div>
                    <div className="avatar-ring">{topBuddy.charAt(0).toUpperCase()}</div>
                    <div className="name">{topBuddy}</div>
                    <div className="meta">{topBuddyCount} TRIPS TOGETHER &middot; YOUR #1 CO-PILOT</div>
                  </div>
                  <div className="buddy-bars" id="buddybars">
                    {buddies.map((b, i) => (
                      <div key={i} className="buddy-bar-row">
                        <div className="bname">{b[0]}</div>
                        <div className="buddy-bar-track">
                          <div className="buddy-bar-fill" style={{width: current === 6 ? `${((b[1] as number)/4)*100}%` : '0%', transitionDelay: `${150 + i*100}ms`}}></div>
                        </div>
                        <div className="bnum">{b[1]}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 7 SUMMARY */}
                <div className={`screen ${current === 7 ? 'active' : ''}`} id="s7">
                  <div className="ticket">
                    <div className="ticket-top">
                      <div className="tlogo">PLAN<span>BRO</span></div>
                      <div className="tyear">WRAPPED &middot; {range === 'all-time' ? 'ALL TIME' : range.replace('-', ' ').toUpperCase()}</div>
                    </div>
                    <div className="ticket-headline">This was your journey on the move.</div>
                    <div className="ticket-grid">
                      <div className="ticket-stat"><div className="k">Destinations</div><div className="v gold">{cities.length === 1 && cities[0] === 'No trips yet' ? 0 : cities.length}</div></div>
                      <div className="ticket-stat"><div className="k">Distance</div><div className="v mint">{distance.toLocaleString()} km</div></div>
                      <div className="ticket-stat"><div className="k">Trips</div><div className="v">{tripsCount}</div></div>
                      <div className="ticket-stat"><div className="k">Explorations</div><div className="v pink">{foodStopsCount}</div></div>
                      <div className="ticket-stat"><div className="k">Travel buddies</div><div className="v">{buddiesCount}</div></div>
                      <div className="ticket-stat"><div className="k">Top buddy</div><div className="v gold">{topBuddy}</div></div>
                    </div>
                    <div className="perforation"></div>
                    <div className="ticket-bottom">
                      <div className="barcode" id="barcode">
                        {[...Array(28)].map((_, i) => (
                          <i key={i} style={{height: `${8 + Math.random()*18}px`}}></i>
                        ))}
                      </div>
                      <div className="code">PNR: PB2026WRAP</div>
                    </div>
                  </div>
                  <button className="share-btn" onClick={triggerToast}>&#10548; Share your Wrapped</button>
                  <div className="share-sub">planbro.app/wrapped</div>
                </div>

              </div>
              <div className={`toast ${showToast ? 'show' : ''}`} id="toast">Saved to your gallery &#10003;</div>
            </div>
          </div>
          <div className="hint">Tap <b>left</b> / <b>right</b> edges of the screen to move through the story</div>
        </div>
      </div>
    </>
  );
}

export default function WrappedPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full bg-[#05061A] flex items-center justify-center">
        <p className="text-white font-mono text-xs tracking-widest animate-pulse">LOADING YOUR WRAPPED...</p>
      </div>
    }>
      <WrappedContent />
    </Suspense>
  );
}
