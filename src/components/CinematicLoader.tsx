'use client';

import React, { useEffect, useRef, useState } from 'react';

// ─── Image Pools ────────────────────────────────────────────────────────────
// Dynamic high quality Wikipedia images using internal API (with fallback)

const PLACES_IMAGES = [
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/960px-Taj_Mahal_%28Edited%29.jpeg', label: 'Taj Mahal', tag: 'Agra' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Delhi_fort.jpg/960px-Delhi_fort.jpg', label: 'Red Fort', tag: 'Delhi' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/The_Golden_Temple_of_Amrithsar_7.jpg/960px-The_Golden_Temple_of_Amrithsar_7.jpg', label: 'Golden Temple', tag: 'Amritsar' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/20191219_Fort_Amber%2C_Amer%2C_Jaipur_0955_9481.jpg/960px-20191219_Fort_Amber%2C_Amer%2C_Jaipur_0955_9481.jpg', label: 'Amer Fort', tag: 'Jaipur' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/East_facade_Hawa_Mahal_Jaipur_from_ground_level_%28July_2022%29_-_img_01.jpg/960px-East_facade_Hawa_Mahal_Jaipur_from_ground_level_%28July_2022%29_-_img_01.jpg', label: 'Hawa Mahal', tag: 'Jaipur' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Qutab_Minar_station.jpg/960px-Qutab_Minar_station.jpg', label: 'Qutab Minar', tag: 'Delhi' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Mysore_Palace_Morning.jpg/960px-Mysore_Palace_Morning.jpg', label: 'Mysore Palace', tag: 'Mysore' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Ahilya_Ghat_by_the_Ganges%2C_Varanasi.jpg/960px-Ahilya_Ghat_by_the_Ganges%2C_Varanasi.jpg', label: 'Varanasi Ghats', tag: 'Uttar Pradesh' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Mumbai_03-2016_30_Gateway_of_India.jpg/960px-Mumbai_03-2016_30_Gateway_of_India.jpg', label: 'Gateway of India', tag: 'Mumbai' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/TawangMonastery.jpg/960px-TawangMonastery.jpg', label: 'Tawang Monastery', tag: 'Arunachal Pradesh' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Beauty_of_Kaziranga_National_Park.jpg/960px-Beauty_of_Kaziranga_National_Park.jpg', label: 'Kaziranga National Park', tag: 'Assam' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Darjeeling%2C_India%2C_Darjeeling_tea_in_variety%2C_Black_tea.jpg/960px-Darjeeling%2C_India%2C_Darjeeling_tea_in_variety%2C_Black_tea.jpg', label: 'Darjeeling Tea Gardens', tag: 'West Bengal' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Nainital_metro.jpg/960px-Nainital_metro.jpg', label: 'Nainital Lake', tag: 'Uttarakhand' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Mall_Road_Shimla_1.jpg/960px-Mall_Road_Shimla_1.jpg', label: 'The Ridge', tag: 'Shimla' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Road_Padum_Zanskar_Range_Jun24_A7CR_00818.jpg/960px-Road_Padum_Zanskar_Range_Jun24_A7CR_00818.jpg', label: 'Pangong Lake', tag: 'Ladakh' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/PremMandirSideViewFromCanteen.jpg/960px-PremMandirSideViewFromCanteen.jpg', label: 'Prem Mandir', tag: 'Vrindavan' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Manali_City.jpg/960px-Manali_City.jpg', label: 'Rohtang Pass', tag: 'Manali' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Evening_view_of_Har-ki-Pauri%2C_Haridwar.jpg', label: 'Har Ki Pauri', tag: 'Haridwar' },
];

const FOOD_IMAGES = [
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/%22Hyderabadi_Dum_Biryani%22.jpg/960px-%22Hyderabadi_Dum_Biryani%22.jpg', label: 'Biryani', tag: 'Flavorful' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Rameshwaram_Cafe_Dosa.jpg/960px-Rameshwaram_Cafe_Dosa.jpg', label: 'Masala Dosa', tag: 'South Indian' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Samosas%2C_snack_food_at_Wikipedia%27s_16th_Birthday_celebration_in_Chittagong_%2801%29.jpg/960px-Samosas%2C_snack_food_at_Wikipedia%27s_16th_Birthday_celebration_in_Chittagong_%2801%29.jpg', label: 'Samosa', tag: 'Snack' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Butter_Chicken_%26_Butter_Naan_-_Home_-_Chandigarh_-_India_-_0006.jpg/960px-Butter_Chicken_%26_Butter_Naan_-_Home_-_Chandigarh_-_India_-_0006.jpg', label: 'Butter Chicken', tag: 'Rich' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Chole_Bhature_from_Nagpur.JPG/960px-Chole_Bhature_from_Nagpur.JPG', label: 'Chole Bhature', tag: 'North Indian' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Annapurna_Naan.jpg/960px-Annapurna_Naan.jpg', label: 'Naan', tag: 'Bread' },
  { url: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&q=80', label: 'Pav Bhaji', tag: 'Street Food' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Aloo_Ghobi.jpg/960px-Aloo_Ghobi.jpg', label: 'Aloo Gobi', tag: 'Vegetarian' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Gulab-jamun-wallpaper-1.jpg', label: 'Gulab Jamun', tag: 'Sweet' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Punjabi_style_Dal_Makhani.jpg/960px-Punjabi_style_Dal_Makhani.jpg', label: 'Dal Makhani', tag: 'Comfort' },
  { url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80', label: 'Palak Paneer', tag: 'Healthy' },
  { url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80', label: 'Malai Kofta', tag: 'Gourmet' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Rajma_Masala_%2832081557778%29.jpg/960px-Rajma_Masala_%2832081557778%29.jpg', label: 'Rajma Chawal', tag: 'Comfort' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Basavanagudi_Kadalekai_Parishe_%282025%29_Bangalore_%2886%29.jpg/960px-Basavanagudi_Kadalekai_Parishe_%282025%29_Bangalore_%2886%29.jpg', label: 'Jalebi', tag: 'Sweet' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/4/49/Vegetarian_Curry.jpeg', label: 'Thali', tag: 'Feast' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Rogan_Josh_Kashmiri.jpg/960px-Rogan_Josh_Kashmiri.jpg', label: 'Rogan Josh', tag: 'Kashmiri' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Chickentandoori.jpg', label: 'Tandoori Chicken', tag: 'Grilled' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Pani_Puri1.JPG/960px-Pani_Puri1.JPG', label: 'Pani Puri', tag: 'Street Food' },
];

const HOTELS_IMAGES = [
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Taj_Mahal_Palace_Hotel_photo.jpg/960px-Taj_Mahal_Palace_Hotel_photo.jpg', label: 'Taj Mahal Palace', tag: 'Mumbai' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Rajasthan_%286373261127%29.jpg/960px-Rajasthan_%286373261127%29.jpg', label: 'The Oberoi Udaivilas', tag: 'Udaipur' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Udaipur_Lake_Palace.jpg/960px-Udaipur_Lake_Palace.jpg', label: 'Taj Lake Palace', tag: 'Udaipur' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Shiv_niwas_avanindra.jpg/960px-Shiv_niwas_avanindra.jpg', label: 'Shiv Niwas Palace', tag: 'Udaipur' },
  { url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80', label: 'The Oberoi Rajvilas', tag: 'Jaipur' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Rambagh_Palace_hotel_Jaipur_lobby_courtyard.jpg/960px-Rambagh_Palace_hotel_Jaipur_lobby_courtyard.jpg', label: 'Rambagh Palace', tag: 'Jaipur' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/1996_-218-20A_Jodhpur_Hotel_Umaid_Bhawan_Palace_%282233393509%29.jpg/960px-1996_-218-20A_Jodhpur_Hotel_Umaid_Bhawan_Palace_%282233393509%29.jpg', label: 'Umaid Bhawan Palace', tag: 'Jodhpur' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/ITC-Grand-Chola-Chennai-2.JPG/960px-ITC-Grand-Chola-Chennai-2.JPG', label: 'ITC Grand Chola', tag: 'Chennai' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Falaknuma_Palace_01.jpg/960px-Falaknuma_Palace_01.jpg', label: 'Taj Falaknuma Palace', tag: 'Hyderabad' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Imperial_Hotel%2C_Delhi.jpg', label: 'The Imperial', tag: 'New Delhi' },
  { url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80', label: 'Wildflower Hall', tag: 'Shimla' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Gajner_Wildlife_Sanctuary-MBP-20131009.jpg/960px-Gajner_Wildlife_Sanctuary-MBP-20131009.jpg', label: 'Gajner Palace', tag: 'Bikaner' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/%E0%A6%B8%E0%A6%BE%E0%A6%AE%E0%A7%81%E0%A6%A1_%E0%A6%AA%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%B2%E0%A7%87%E0%A6%B8.jpg/960px-%E0%A6%B8%E0%A6%BE%E0%A6%AE%E0%A7%81%E0%A6%A1_%E0%A6%AA%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%B2%E0%A7%87%E0%A6%B8.jpg', label: 'Samode Palace', tag: 'Jaipur' },
  { url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80', label: 'Naila Fort', tag: 'Jaipur' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/ITC_Royal_Bengal_in_April_2026.webp/960px-ITC_Royal_Bengal_in_April_2026.webp.png', label: 'ITC Royal Bengal', tag: 'Kolkata' },
  { url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80', label: 'The Leela Palace', tag: 'New Delhi' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/New_Chandigarh_Skyline.jpg/960px-New_Chandigarh_Skyline.jpg', label: 'The Oberoi Sukhvilas', tag: 'New Chandigarh' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/The_Laxmi_Niwas_Palace%2C_Bikaner%2C_Rajasthan.jpg/960px-The_Laxmi_Niwas_Palace%2C_Bikaner%2C_Rajasthan.jpg', label: 'Laxmi Niwas Palace', tag: 'Bikaner' },
];

const IMAGE_POOLS = {
  places: PLACES_IMAGES,
  food: FOOD_IMAGES,
  hotels: HOTELS_IMAGES,
};

const CATEGORY_CONFIG = {
  places: {
    label: 'Discovering Places',
    sublabel: 'Finding the best attractions just for you',
    accent: '#3b82f6',
    accentRgb: '59, 130, 246',
    gradient: 'from-blue-950 via-slate-900 to-black',
  },
  food: {
    label: 'Exploring Restaurants',
    sublabel: 'Curating the best dining experiences for you',
    accent: '#f97316',
    accentRgb: '249, 115, 22',
    gradient: 'from-orange-950 via-zinc-900 to-black',
  },
  hotels: {
    label: 'Finding Hotels',
    sublabel: 'Selecting the finest stays just for you',
    accent: '#8b5cf6',
    accentRgb: '139, 92, 246',
    gradient: 'from-purple-950 via-zinc-900 to-black',
  },
};

// Preload images asynchronously
export function preloadCinematicImages(category: 'places' | 'food' | 'hotels') {
  if (typeof window === 'undefined') return;
  const images = IMAGE_POOLS[category];
  
  // We use setTimeout to push this to the end of the event queue so it doesn't block
  setTimeout(() => {
    // We could use requestIdleCallback if available, but a simple small delay is often enough
    const loadImages = () => {
      images.forEach(img => {
        const image = new Image();
        image.src = img.url;
      });
    };
    
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(loadImages);
    } else {
      loadImages();
    }
  }, 1000);
}

// ─── Fisher-Yates shuffle ─────────────────────────────────────────────────────
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Build column data (6+ cards per column, looping after 10s) ───────────────
function buildColumns(category: 'places' | 'food' | 'hotels') {
  const pool = shuffled(IMAGE_POOLS[category]);
  const half = Math.ceil(pool.length / 3);
  // Each column gets a slice of the shuffled pool, then repeats for looping
  const col1 = [...pool.slice(0, half), ...pool.slice(0, half)];
  const col2 = [...pool.slice(half, half * 2), ...pool.slice(half, half * 2)];
  const col3 = [...pool.slice(half * 2), ...pool.slice(half * 2)];
  return [col1, col2, col3];
}

// ─── PhotoCard ────────────────────────────────────────────────────────────────
function PhotoCard({ img, accent, delay }: {
  img: { url: string; label: string; tag: string };
  accent: string;
  delay: number;
}) {
  return (
    <div
      className="cinematic-card"
      style={{ animationDelay: `${delay}ms` }}
    >
      <img
        src={img.url}
        alt={img.label}
        loading="eager"
        decoding="async"
        onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
      />
      <div className="cinematic-card-overlay">
        <span className="cinematic-card-tag" style={{ background: `${accent}33`, borderColor: `${accent}55`, color: accent }}>
          {img.tag}
        </span>
        <span className="cinematic-card-label">{img.label}</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface CinematicLoaderProps {
  isLoading: boolean;
  category: 'places' | 'food' | 'hotels';
  destination?: string;
  customLabel?: string;
  minDisplayMs?: number;
}

type Phase = 'entering' | 'running' | 'exiting' | 'done';

export function CinematicLoader({ isLoading, category, destination, customLabel, minDisplayMs = 2500 }: CinematicLoaderProps) {
  const [phase, setPhase] = useState<Phase>(isLoading ? 'entering' : 'done');
  const [columns, setColumns] = useState<ReturnType<typeof buildColumns>>(() => isLoading ? buildColumns(category) : [[], [], []]);
  const startTimeRef = useRef<number>(Date.now());
  const MIN_DISPLAY_MS = minDisplayMs;

  const config = CATEGORY_CONFIG[category];

  // If loading starts again (e.g. changing filters)
  useEffect(() => {
    if (isLoading && phase === 'done') {
      setColumns(buildColumns(category));
      startTimeRef.current = Date.now();
      setPhase('entering');
    }
  }, [isLoading, category, phase]);

  // Transition entering -> running
  useEffect(() => {
    if (phase === 'entering') {
      if (columns[0].length === 0) {
         setColumns(buildColumns(category));
      }
      startTimeRef.current = Date.now();
      const enterTimer = setTimeout(() => setPhase('running'), 50);
      return () => clearTimeout(enterTimer);
    }
  }, [phase, category, columns]);

  // Watch isLoading to trigger exit after min display time
  useEffect(() => {
    if (!isLoading && phase === 'running') {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

      const exitTimer = setTimeout(() => {
        setPhase('exiting');
        // After exit animation (900ms), mark done
        setTimeout(() => setPhase('done'), 900);
      }, remaining);

      return () => clearTimeout(exitTimer);
    }
  }, [isLoading, phase]);

  if (phase === 'done') return null;

  return (
    <>
      {/* Injected CSS */}
      <style>{`
        @keyframes scrollUp {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes scrollDown {
          0% { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
        @keyframes shimmerSweep {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes cardFadeIn {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.1); }
        }
        @keyframes cinematic-bounce {
          0%, 100% { transform: translateY(0) scale(0.8); opacity: 0.4; }
          50% { transform: translateY(-8px) scale(1.2); opacity: 1; box-shadow: 0 4px 16px var(--cinematic-accent); }
        }
        @keyframes floatBadge {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }

        .cinematic-loader-overlay {
          position: fixed;
          inset: -200px 0 -200px 0; /* Extended top and bottom to completely cover any layout gaps or scrolling artifacts */
          z-index: 9999;
          overflow: hidden;
          background: #050508;
          opacity: 0;
          transition: opacity 0.4s ease;
        }
        .cinematic-loader-overlay.phase-running {
          opacity: 1;
        }
        .cinematic-loader-overlay.phase-exiting {
          opacity: 0;
          transition: opacity 0.9s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .cinematic-columns {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
          padding: 10px;
        }

        .cinematic-column {
          display: flex;
          flex-direction: column;
          gap: 10px;
          will-change: transform;
        }
        .cinematic-col-0 { animation: scrollUp 24s linear infinite; }
        .cinematic-col-1 { animation: scrollDown 19s linear infinite; }
        .cinematic-col-2 { animation: scrollUp 15s linear infinite; }

        .cinematic-card {
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          flex-shrink: 0;
          height: 220px;
          background: #111;
          opacity: 0;
          animation: cardFadeIn 0.6s ease forwards;
          box-shadow: 0 4px 24px rgba(0,0,0,0.5);
        }
        .cinematic-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 6s ease;
        }
        .cinematic-card:hover img {
          transform: scale(1.06);
        }
        .cinematic-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 12px;
          gap: 4px;
        }
        .cinematic-card-tag {
          display: inline-block;
          width: fit-content;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 20px;
          border: 1px solid;
          backdrop-filter: blur(4px);
        }
        .cinematic-card-label {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.92);
          line-height: 1.3;
        }

        .cinematic-center-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0;
          pointer-events: none;
          z-index: 10;
        }

        .cinematic-blur-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 55% 50% at 50% 50%, rgba(0,0,0,0.82) 30%, transparent 100%);
        }

        .cinematic-badge {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          animation: floatBadge 3.5s ease-in-out infinite;
        }

        .cinematic-destination-label {
          font-size: clamp(13px, 1.5vw, 16px);
          font-weight: 600;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.7);
          margin-bottom: 8px;
        }

        .cinematic-title {
          font-size: clamp(26px, 4vw, 48px);
          font-weight: 800;
          letter-spacing: -0.02em;
          text-align: center;
          background: linear-gradient(120deg, #fff 20%, var(--cinematic-accent) 50%, #fff 80%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmerSweep 2.5s linear infinite;
          line-height: 1.15;
          padding: 0 20px;
        }

        .cinematic-subtitle {
          font-size: clamp(12px, 1.5vw, 15px);
          font-weight: 400;
          color: rgba(255,255,255,0.45);
          letter-spacing: 0.02em;
          text-align: center;
          margin-top: 6px;
        }

        .cinematic-dots {
          display: flex;
          gap: 8px;
          margin-top: 20px;
        }
        .cinematic-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: cinematic-bounce 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
        }
        .cinematic-dot:nth-child(1) { animation-delay: 0ms; }
        .cinematic-dot:nth-child(2) { animation-delay: 150ms; }
        .cinematic-dot:nth-child(3) { animation-delay: 300ms; }

        .cinematic-vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(to right, rgba(5,5,8,0.65) 0%, transparent 18%, transparent 82%, rgba(5,5,8,0.65) 100%),
            linear-gradient(to bottom, rgba(5,5,8,0.5) 0%, transparent 14%, transparent 86%, rgba(5,5,8,0.5) 100%);
        }
      `}</style>

      <div
        className={`cinematic-loader-overlay ${phase === 'running' ? 'phase-running' : phase === 'exiting' ? 'phase-exiting' : ''}`}
        style={{ '--cinematic-accent': config.accent } as React.CSSProperties}
        aria-label="Loading content, please wait"
        aria-live="polite"
      >
        {/* 3-Column Photo Wall */}
        <div className="cinematic-columns">
          {columns.map((col, colIdx) => (
            <div key={colIdx} className={`cinematic-column cinematic-col-${colIdx}`}>
              {col.map((img, i) => (
                <PhotoCard
                  key={`${colIdx}-${i}`}
                  img={img}
                  accent={config.accent}
                  delay={i * 60 + colIdx * 80}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Edge vignettes */}
        <div className="cinematic-vignette" />

        {/* Center hero overlay */}
        <div className="cinematic-center-overlay">
          <div className="cinematic-blur-bg" />
          <div className="cinematic-badge">
            {destination && (
              <div className="cinematic-destination-label">{destination}</div>
            )}
            <div className="cinematic-title">{customLabel || config.label}</div>
            <div className="cinematic-subtitle">{customLabel ? '' : config.sublabel}</div>
            <div className="cinematic-dots">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="cinematic-dot"
                  style={{ background: config.accent }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
