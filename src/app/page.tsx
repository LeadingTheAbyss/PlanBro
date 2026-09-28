'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { UserAvatar } from '@/components/UserAvatar';
import { FeedbackModal } from '@/components/FeedbackModal';
import { ArrowRight, Menu, X, MessageSquare, MapPin, Compass, Clock, Wallet } from 'lucide-react';
import { Article } from '@/data/blogData';

const TOURIST_ATTRACTIONS = [
  'Taj Mahal, Agra',
  'Hawa Mahal, Jaipur',
  'Mysore Palace',
  'Golden Temple, Amritsar',
  'Gateway of India',
  'Victoria Memorial, Kolkata',
  'Pangong Lake, Ladakh',
  'Munnar Tea Gardens',
  'Meenakshi Temple, Madurai',
  'Qutub Minar, Delhi',
  'Amer Fort, Jaipur',
  'Varanasi Ghats',
];

const FEATURES = [
  {
    icon: Compass,
    title: 'We find the way there.',
    desc: 'Flights, trains, and buses, quietly compared until only the best remains.',
    bg: 'from-[#FF8A3D] to-[#FF5D8F]',
    ring: 'hover:border-[#FF8A3D] hover:shadow-[0_10px_30px_-8px_rgba(255,138,61,0.35)]',
  },
  {
    icon: MapPin,
    title: 'Your whole trip, stitched together.',
    desc: 'Stays, experiences, and timing, all laid out in one clean plan.',
    bg: 'from-[#2DD4BF] to-[#3B82F6]',
    ring: 'hover:border-[#2DD4BF] hover:shadow-[0_10px_30px_-8px_rgba(45,212,191,0.35)]',
  },
  {
    icon: Clock,
    title: 'Less planning. More going.',
    desc: 'Stop juggling logistics. Start the trip.',
    bg: 'from-[#FBBF24] to-[#FF8A3D]',
    ring: 'hover:border-[#FBBF24] hover:shadow-[0_10px_30px_-8px_rgba(251,191,36,0.35)]',
  },
  {
    icon: Wallet,
    title: 'Built around your budget.',
    desc: 'Tell us what you want to spend, we fit the trip to it, not the other way round.',
    bg: 'from-[#A78BFA] to-[#FF5D8F]',
    ring: 'hover:border-[#A78BFA] hover:shadow-[0_10px_30px_-8px_rgba(167,139,250,0.35)]',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { user, fetchUser } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const [bgImages, setBgImages] = useState<string[]>([
    '\public\landing_1.png',
    '\public\landing_2.png',
    '\public\landing_3.png',
    '\public\landing_4.jpg',
    '\public\landing_5.jpg',
  ]);

  const [blogDestinations, setBlogDestinations] = useState<Article[]>([]);

  const { scrollY } = useScroll();
  const heroImgY = useTransform(scrollY, [0, 900], [0, 220]);

  useEffect(() => {
    const mobile = window.innerWidth < 768;
    const imgWidth = mobile ? 800 : 1920;
    const shuffled = [...TOURIST_ATTRACTIONS].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 6);
    setBgImages(
      selected.map(
        (place) =>
          `/api/destination-photo?name=${encodeURIComponent(place)}&type=place&redirect=true&width=${imgWidth}`
      )
    );
  }, []);

  useEffect(() => {
    const fetchBlogDestinations = async () => {
      try {
        const res = await fetch('/api/blogs');
        if (!res.ok) return;
        const data: Article[] = await res.json();
        const withImages = data.filter((a) => a.imageUrl);
        const shuffled = [...withImages].sort(() => 0.5 - Math.random());
        setBlogDestinations(shuffled.slice(0, 6));
      } catch (e) {
        console.error('Unable to load blog destinations.', e);
      }
    };
    fetchBlogDestinations();
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleNavigation = (path: string) => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(path)}`);
    } else {
      router.push(path);
    }
  };

  return (
    <div className="bg-[#FFFBF5] text-[#1a1523] min-h-screen">
      {/* ===================== NAV ===================== */}
      <nav className="fixed top-0 left-0 w-full z-[100] flex items-center justify-between px-6 py-4 bg-[#FFFBF5]/80 backdrop-blur-xl border-b border-black/5 font-sans transition-all duration-300">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 md:gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => router.push('/')}>
            <span className="font-extrabold text-2xl tracking-tight text-[#1a1523] z-10 relative">PlanBro</span>
          </div>

          <div className="hidden lg:flex items-center gap-7 lg:gap-8 ml-8 xl:ml-14">
            <button
              onClick={() => router.push('/blog')}
              className="text-base tracking-wide font-bold text-[#1a1523] hover:text-[#FF5D8F] transition-colors duration-300 ease-in-out"
            >
              Discover Blogs & Videos
            </button>
            <button
              onClick={() => handleNavigation('/recommend')}
              className="text-base tracking-wide font-bold text-[#1a1523] hover:text-[#FF5D8F] transition-colors duration-300 ease-in-out"
            >
              Recommend Trips
            </button>
            <button
              onClick={() => handleNavigation('/plan/setup')}
              className="text-base tracking-wide font-bold text-[#1a1523] hover:text-[#FF5D8F] transition-colors duration-300 ease-in-out"
            >
              Plan a Trip
            </button>
            <button
              onClick={() => handleNavigation('/quick-trip')}
              className="text-base tracking-wide font-bold text-[#1a1523] hover:text-[#FF5D8F] transition-colors duration-300 ease-in-out"
            >
              Plan a Hangout in Your City
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <div className="lg:hidden flex items-center">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-[#1a1523]/70 hover:text-[#1a1523] p-1 transition-colors">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {user ? (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsFeedbackOpen(true)}
                className="h-8 px-3 rounded-full bg-black/5 hover:bg-black/10 border border-black/10 transition-colors flex items-center gap-2 text-[#1a1523] shrink-0"
                title="Send us Feedback"
              >
                <MessageSquare size={14} />
                <span className="hidden sm:inline-block text-xs font-bold uppercase tracking-widest">Send Us Feedback</span>
              </button>
              <button
                onClick={() => router.push(user.username ? `/u/${encodeURIComponent(user.username)}` : '/profile')}
                className="w-8 h-8 rounded-full border-2 border-black/10 hover:border-black/30 transition-colors overflow-hidden flex items-center justify-center shrink-0"
                title="Profile"
              >
                <UserAvatar user={user} className="w-full h-full text-xs" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="group relative overflow-hidden px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-[#1a1523] text-[13px] font-bold whitespace-nowrap transition-all duration-500 ease-in-out hover:-translate-y-0.5"
            >
              <span className="absolute z-0 left-1/2 top-1/2 w-[300%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full scale-100 group-hover:scale-0 origin-center bg-white transition-transform duration-500 ease-in-out" />
              <span className="relative z-10 text-[#1a1523] transition-colors duration-300 ease-in-out group-hover:text-white">Sign in</span>
            </button>
          )}
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 w-full bg-[#FFFBF5]/95 backdrop-blur-xl border-b border-black/5 z-[99] flex flex-col px-6 py-6 gap-6 shadow-2xl animate-in slide-in-from-top-2">
            <button onClick={() => { setMobileMenuOpen(false); router.push('/blog'); }} className="text-lg tracking-wide font-bold bg-gradient-to-r from-[#FF8A3D] to-[#FF5D8F] bg-clip-text text-transparent hover:opacity-80 text-left transition-all">
              Discover Blogs & Videos
            </button>
            <button onClick={() => { setMobileMenuOpen(false); handleNavigation('/recommend'); }} className="text-lg tracking-wide font-bold text-[#1a1523]/80 hover:text-[#1a1523] text-left transition-colors">
              Recommend Trips
            </button>
            <button onClick={() => { setMobileMenuOpen(false); handleNavigation('/plan/setup'); }} className="text-lg tracking-wide font-bold text-[#1a1523]/80 hover:text-[#1a1523] text-left transition-colors">
              Plan a Trip
            </button>
            <button onClick={() => { setMobileMenuOpen(false); handleNavigation('/quick-trip'); }} className="text-lg tracking-wide font-bold text-[#1a1523]/80 hover:text-[#1a1523] text-left transition-colors">
              Plan a Hangout in Your City
            </button>
          </div>
        )}
      </nav>

      {/* ===================== HERO ===================== */}
      <section className="relative h-[100svh] min-h-[640px] w-full overflow-hidden flex items-end">
        <motion.div className="absolute inset-0" style={{ y: heroImgY }}>
          <div className="absolute inset-0 grid grid-cols-2 md:grid-cols-3 gap-1 opacity-95">
            {bgImages.slice(0, 6).map((src, i) => (
              <div
                key={i}
                className="relative bg-cover bg-center"
                style={{ backgroundImage: `url('${src}')` }}
              />
            ))}
          </div>
        </motion.div>

        {/* Warm color wash instead of a flat black scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#2b0f1f]/90 via-[#5a1f3a]/40 to-[#FF8A3D]/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#2b0f1f]/60 via-transparent to-transparent" />

        <div className="relative z-10 w-full px-6 md:px-12 pb-16 md:pb-24 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="flex items-center gap-2 mb-6 text-xs md:text-sm font-bold uppercase tracking-[0.25em] text-white/80"
          >
            <span>Your next trip, planned in minutes</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
            className="font-black text-5xl md:text-7xl lg:text-[6.5rem] tracking-tighter leading-[0.95] text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.35)]"
          >
            We plan the trip.
            <br />
            <span className="bg-gradient-to-r from-[#FFD166] via-[#FF8A3D] to-[#FF5D8F] bg-clip-text text-transparent">
              You pack your bags.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.25 }}
            className="mt-6 max-w-xl text-lg md:text-xl text-white/85 font-medium"
          >
            No tabs. No spreadsheets. No back-and-forth over budgets. Just tell us where, or let us surprise you.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <button
              onClick={() => handleNavigation('/plan/setup')}
              className="group relative overflow-hidden px-7 py-4 rounded-full bg-white text-[#1a1523] font-bold text-base flex items-center gap-2 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.3)] transition-all duration-500 ease-in-out hover:-translate-y-0.5"
            >
              <span className="absolute left-1/2 top-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full scale-0 group-hover:scale-[15] origin-center bg-[#1a1523] transition-transform duration-500 ease-in-out" />
              <span className="relative transition-colors duration-300 ease-in-out group-hover:text-white">Plan my trip</span>
              <ArrowRight className="relative w-4 h-4 group-hover:translate-x-1 group-hover:text-white transition-all duration-300 ease-in-out" />
            </button>
            <button
              onClick={() => handleNavigation('/recommend')}
              className="group relative overflow-hidden px-7 py-4 rounded-full bg-white text-[#1a1523] font-bold text-base border-2 border-white transition-all duration-500 ease-in-out hover:-translate-y-0.5"
            >
              <span className="absolute left-1/2 top-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full scale-0 group-hover:scale-[15] origin-center bg-[#1a1523] transition-transform duration-500 ease-in-out" />
              <span className="relative transition-colors duration-300 ease-in-out group-hover:text-white">Not sure? Get inspired</span>
            </button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="absolute bottom-6 right-6 md:right-12 hidden sm:flex flex-col items-center gap-2 text-white/70 z-10"
        >
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            className="w-[2px] h-10 bg-gradient-to-b from-white/70 to-transparent"
          />
        </motion.div>
      </section>

      {/* ===================== FEATURES ===================== */}
      <section className="relative bg-[#FFFBF5] py-24 md:py-36 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="max-w-2xl mb-16 md:mb-20"
          >
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#FF5D8F]">How it works</span>
            <h2 className="mt-4 text-3xl md:text-5xl font-black tracking-tight leading-tight text-[#1a1523]">
              Trip planning shouldn&apos;t feel like a part-time job.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className={`group relative p-8 md:p-10 rounded-3xl bg-white border-2 border-black/5 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-1.5 transition-all duration-300 ${f.ring}`}
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.bg} flex items-center justify-center mb-6 shadow-md`}>
                  <f.icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-[#1a1523] mb-3 tracking-tight">{f.title}</h3>
                <p className="text-[#1a1523]/60 text-base md:text-lg leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== DESTINATION STRIP ===================== */}
      <section className="relative bg-[#FFFBF5] pb-24 md:pb-36 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="flex items-end justify-between mb-10 flex-wrap gap-4"
          >
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#FF5D8F]">Where to next</span>
              <h2 className="mt-4 text-3xl md:text-5xl font-black tracking-tight text-[#1a1523]">Places people are planning for.</h2>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {blogDestinations.map((article, i) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                onClick={() => router.push(`/blog/u/${encodeURIComponent(article.author?.username || 'traveler')}/${encodeURIComponent(article.slug)}`)}
                className={`relative rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer group shadow-[0_2px_16px_-6px_rgba(0,0,0,0.15)] ${i === 0 ? 'col-span-2 row-span-2 aspect-square md:aspect-auto' : 'aspect-square'}`}
              >
                {article.videoUrl ? (
                  <video
                    src={article.videoUrl}
                    poster={article.imageUrl}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url('${article.imageUrl}')` }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 flex items-center justify-between">
                  <span className="text-white font-bold text-sm md:text-base flex items-center gap-1.5">
                    <MapPin size={14} className="text-[#FFD166]" />
                    {article.city}
                  </span>
                  <ArrowRight className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== CTA / LET'S GO ===================== */}
      <section className="relative bg-gradient-to-b from-[#FFE8D6] via-[#FFD9E8] to-[#FFF0DA] py-24 md:py-32 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="text-4xl md:text-6xl font-black tracking-tight text-[#1a1523] mb-14 md:mb-16"
          >
            Let&apos;s go.
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6 }}
              onClick={() => handleNavigation('/recommend')}
              className="bg-white border-2 border-black/5 p-6 md:p-10 min-h-[180px] md:min-h-[260px] rounded-[1.5rem] md:rounded-3xl cursor-pointer transition-all duration-300 ease-out shadow-[0_2px_20px_-8px_rgba(0,0,0,0.1)] hover:border-[#2DD4BF] hover:shadow-[0_12px_32px_-8px_rgba(45,212,191,0.35)] hover:-translate-y-1.5 group flex flex-col justify-between text-left"
            >
              <div>
                <div className="text-lg md:text-2xl font-bold text-[#1a1523] mb-2 md:mb-4 leading-tight tracking-tight">Discovery Engine</div>
                <div className="text-[#1a1523]/60 text-sm md:text-lg leading-snug">
                  Not sure where to go? Tell us your budget and vibe.
                </div>
              </div>
              <div className="flex items-center text-[#1a1523] text-sm md:text-base font-bold group-hover:translate-x-1.5 transition-transform duration-300 mt-6">
                Explore <ArrowRight className="ml-1.5 w-4 h-4 md:w-5 md:h-5" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: 0.08 }}
              onClick={() => handleNavigation('/plan/setup')}
              className="bg-gradient-to-br from-[#FF8A3D] to-[#FF5D8F] p-6 md:p-10 min-h-[180px] md:min-h-[260px] rounded-[1.5rem] md:rounded-3xl cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1.5 hover:brightness-110 group shadow-[0_10px_35px_-8px_rgba(255,93,143,0.45)] hover:shadow-[0_16px_45px_-8px_rgba(255,93,143,0.65)] flex flex-col justify-between text-left"
            >
              <div>
                <div className="text-lg md:text-2xl font-bold text-white mb-2 md:mb-4 leading-tight tracking-tight">Plan Itinerary</div>
                <div className="text-white/85 text-sm md:text-lg leading-snug">
                  Know your destination? We&apos;ll lock down the logistics.
                </div>
              </div>
              <div className="flex items-center text-white text-sm md:text-base font-bold group-hover:translate-x-1.5 transition-transform duration-300 mt-6">
                Start <ArrowRight className="ml-1.5 w-4 h-4 md:w-5 md:h-5" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: 0.16 }}
              onClick={() => handleNavigation('/quick-trip')}
              className="bg-white border-2 border-black/5 p-6 md:p-10 min-h-[180px] md:min-h-[260px] rounded-[1.5rem] md:rounded-3xl cursor-pointer transition-all duration-300 ease-out shadow-[0_2px_20px_-8px_rgba(0,0,0,0.1)] hover:border-[#A78BFA] hover:shadow-[0_12px_32px_-8px_rgba(167,139,250,0.35)] hover:-translate-y-1.5 group flex flex-col justify-between text-left"
            >
              <div>
                <div className="text-lg md:text-2xl font-bold text-[#1a1523] mb-2 md:mb-4 leading-tight tracking-tight">Hangout Mode</div>
                <div className="text-[#1a1523]/60 text-sm md:text-lg leading-snug">
                  Short on time? Let&apos;s plan a spontaneous getaway.
                </div>
              </div>
              <div className="flex items-center text-[#1a1523] text-sm md:text-base font-bold group-hover:translate-x-1.5 transition-transform duration-300 mt-6">
                Go <ArrowRight className="ml-1.5 w-4 h-4 md:w-5 md:h-5" />
              </div>
            </motion.div>
          </div>

          {/* Footer Links */}
          <div className="mt-20 mb-6 flex flex-wrap gap-4 justify-center">
            <a href="/terms" className="px-4 py-2 rounded-full bg-white/70 text-[#1a1523] text-sm font-semibold border border-black/10 transition-colors duration-200 hover:bg-white">Terms of Service</a>
            <a href="/privacy" className="px-4 py-2 rounded-full bg-white/70 text-[#1a1523] text-sm font-semibold border border-black/10 transition-colors duration-200 hover:bg-white">Privacy Policy</a>
            <a href="mailto:support@brewplans.com" className="px-4 py-2 rounded-full bg-white/70 text-[#1a1523] text-sm font-semibold border border-black/10 transition-colors duration-200 hover:bg-white">Contact Us : support@brewplans.com</a>
          </div>

          {/* Social Links */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href="https://instagram.com/brewplansdotcom" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/70 hover:bg-[#FF5D8F] hover:border-[#FF5D8F] hover:[&_svg]:stroke-white border border-black/10 flex items-center justify-center transition-colors text-[#1a1523]" title="Instagram: @brewplansdotcom">
              <svg className="w-4 h-4 fill-none stroke-current stroke-[2] transition-colors" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </a>
            <a href="https://x.com/BrewPlans" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/70 hover:bg-[#FF5D8F] hover:border-[#FF5D8F] hover:[&_svg]:stroke-white border border-black/10 flex items-center justify-center transition-colors text-[#1a1523]" title="X (Twitter): @BrewPlans">
              <svg className="w-4 h-4 fill-none stroke-current stroke-[2] transition-colors" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
            </a>
            <a href="https://facebook.com/BrewPlans" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/70 hover:bg-[#FF5D8F] hover:border-[#FF5D8F] hover:[&_svg]:stroke-white border border-black/10 flex items-center justify-center transition-colors text-[#1a1523]" title="Facebook: BrewPlans">
              <svg className="w-4 h-4 fill-none stroke-current stroke-[2] transition-colors" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="mailto:support@brewplans.com" className="w-10 h-10 rounded-full bg-white/70 hover:bg-[#FF5D8F] hover:border-[#FF5D8F] hover:[&_svg]:stroke-white border border-black/10 flex items-center justify-center transition-colors text-[#1a1523]" title="Email: support@brewplans.com">
              <svg className="w-4 h-4 fill-none stroke-current stroke-[2] transition-colors" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-white/70 hover:bg-[#FF5D8F] hover:border-[#FF5D8F] hover:[&_svg]:stroke-white border border-black/10 flex items-center justify-center transition-colors text-[#1a1523]" title="YouTube (Link coming soon)">
              <svg className="w-4 h-4 fill-none stroke-current stroke-[2] transition-colors" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3v6Z"/></svg>
            </a>
          </div>
        </div>
      </section>

      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
}
