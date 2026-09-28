'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle2, Mail, Plane, ShieldCheck, Calendar, Sparkles, Music, MapPin } from 'lucide-react';

export function BlogNewsletter() {
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('weekly');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setEmail('');
    }, 700);
  };

  return (
    <section id="newsletter-section" className="py-20 px-4 md:px-8 max-w-7xl mx-auto scroll-mt-24">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative overflow-hidden rounded-[40px] bg-gradient-to-r from-[#FF8A3D] via-[#FFB347] to-[#FFD166] p-8 sm:p-12 md:p-16 text-left border-4 border-white shadow-[0_25px_60px_-15px_rgba(255,138,61,0.45)]"
      >
        
        {/* Background Decorative Icons & Pattern */}
        <div className="absolute -top-10 -right-10 text-white/15 pointer-events-none">
          <Plane size={320} className="rotate-[-20deg]" />
        </div>
        <div className="absolute -bottom-10 left-10 text-white/15 pointer-events-none">
          <Mail size={180} className="rotate-12" />
        </div>

        <div className="relative z-10 max-w-3xl">
          
          {/* Frequency Toggle Badge Bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1F2937] text-white text-xs font-black uppercase tracking-widest shadow-md">
              <span>📮 The PlanBro Dispatch</span>
            </div>

            <div className="inline-flex items-center rounded-full bg-white/90 p-1 border border-black/10 shadow-sm font-extrabold text-xs">
              <button
                type="button"
                onClick={() => setFrequency('weekly')}
                className={`px-3 py-1 rounded-full transition-all ${
                  frequency === 'weekly' ? 'bg-[#1F2937] text-white shadow-xs scale-105' : 'text-[#4B5563] hover:text-[#1F2937]'
                }`}
              >
                Weekly Events
              </button>
              <button
                type="button"
                onClick={() => setFrequency('monthly')}
                className={`px-3 py-1 rounded-full transition-all ${
                  frequency === 'monthly' ? 'bg-[#1F2937] text-white shadow-xs scale-105' : 'text-[#4B5563] hover:text-[#1F2937]'
                }`}
              >
                Monthly Roadmap
              </button>
            </div>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#1F2937] tracking-tight leading-[1.05] mb-6 drop-shadow-sm">
            Never miss what is buzzing across Indian cities.
          </h2>

          <p className="text-base sm:text-xl text-[#1F2937]/95 font-extrabold max-w-2xl leading-relaxed mb-8">
            {frequency === 'weekly' ? (
              <>
                Every week, discover what all Indian cities have exciting events, live concerts, cultural art pop-ups, or weekend meetups worth giving a visit to! We handpick special weekend gatherings so you always know where the action is.
              </>
            ) : (
              <>
                Receive our curated monthly guide highlighting upcoming festival dates across India—from Rann Utsav and Hornbill Festival to secret mountain acoustics and heritage architecture walks worth planning around.
              </>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-[#1F2937]/90 mb-10 bg-white/40 p-4 rounded-2xl backdrop-blur-xs border border-white/60">
            <span className="flex items-center gap-1.5">
              <Music size={15} className="text-[#D45B0C]" />
              <span>Live Concerts & Gig Guides</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Calendar size={15} className="text-[#1D4ED8]" />
              <span>Weekend City Festivals</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <MapPin size={15} className="text-rose-700" />
              <span>Secret Local Hangouts</span>
            </span>
          </div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-6 md:p-8 border-2 border-[#1F2937] shadow-xl flex items-center gap-4 max-w-lg"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#7ED957] text-[#1F2937] flex items-center justify-center shrink-0">
                <CheckCircle2 size={26} />
              </div>
              <div>
                <h4 className="font-black text-lg text-[#1F2937]">You&apos;re officially on the passenger list! 🎉</h4>
                <p className="text-xs text-[#4B5563] font-medium mt-1">
                  We just queued up our upcoming weekend gig and city meetup report for your inbox ({frequency} dispatch).
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 max-w-lg">
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]" size={20} />
                <input
                  type="email"
                  disabled
                  value=""
                  placeholder="Upcoming Soon..."
                  className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/70 text-[#1F2937] font-bold placeholder:text-[#1F2937]/70 shadow-lg text-sm cursor-not-allowed"
                />
              </div>

              <button
                type="button"
                disabled
                className="h-14 px-8 rounded-2xl bg-[#1F2937]/80 text-white font-black uppercase text-sm tracking-wider shadow-xl flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <span>Upcoming Soon</span>
                <Sparkles size={16} className="text-[#FFB347]" />
              </button>
            </div>
          )}

          <div className="mt-6 flex items-center gap-2 text-xs font-black text-[#1F2937]/80">
            <ShieldCheck size={15} className="text-[#1F2937]" />
            <span>100% Free. Unsubscribe anytime with 1-click. Zero spam guarantee.</span>
          </div>

        </div>
      </motion.div>
    </section>
  );
}
