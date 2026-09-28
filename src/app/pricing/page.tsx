'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Star } from 'lucide-react';

export default function PricingPage() {
  const router = useRouter();

  return (
    <div className="w-full min-h-screen bg-[#0A0A0A] text-[#EDEDED] flex flex-col font-sans p-8 lg:p-16">
      
      {/* Header */}
      <div className="flex items-center mb-16">
        <button 
          onClick={() => router.back()} 
          className="text-white/40 hover:text-white transition-colors flex items-center gap-2 font-bold text-xs uppercase tracking-widest group shrink-0"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back
        </button>
      </div>

      <div className="max-w-4xl mx-auto w-full flex flex-col items-center">
        
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-light tracking-tighter text-white mb-6">Upgrade to PlanBro Pro</h1>
          <p className="text-lg text-white/60 max-w-xl mx-auto">Get exclusive features like custom PlanBro Wrapped timeframes, high-res PDF exports, and priority support.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 w-full max-w-3xl">
          
          {/* Free Plan */}
          <div className="border border-white/10 rounded-3xl p-8 flex flex-col bg-white/[0.02]">
            <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
            <p className="text-white/40 text-sm mb-6">Everything you need to plan basic trips.</p>
            <div className="text-4xl font-light text-white mb-8">₹0</div>
            
            <ul className="flex-1 space-y-4 mb-8">
              <li className="flex items-start gap-3 text-sm text-white/80">
                <Check size={18} className="text-white/40 shrink-0 mt-0.5" />
                <span>Basic trip planning</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-white/80">
                <Check size={18} className="text-white/40 shrink-0 mt-0.5" />
                <span>Standard itinerary generation</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-white/80">
                <Check size={18} className="text-white/40 shrink-0 mt-0.5" />
                <span>View All-Time Wrapped</span>
              </li>
            </ul>

            <button 
              disabled
              className="w-full py-4 rounded-xl bg-white/5 text-white/40 font-bold uppercase tracking-widest text-xs cursor-not-allowed"
            >
              Current Plan
            </button>
          </div>

          {/* Pro Plan */}
          <div className="border border-[#F5B942]/30 rounded-3xl p-8 flex flex-col bg-gradient-to-br from-[#F5B942]/10 to-transparent relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-[#F5B942] rounded-full blur-[80px] opacity-20"></div>
            
            <div className="flex justify-between items-start mb-2 relative z-10">
              <h3 className="text-2xl font-bold text-[#F5B942] flex items-center gap-2">PlanBro Pro</h3>
            </div>
            
            <p className="text-white/60 text-sm mb-6 relative z-10">Unlock the full potential of your travels.</p>
            <div className="text-4xl font-light text-white mb-8 relative z-10">₹19 <span className="text-lg text-white/40">/mo</span></div>
            
            <ul className="flex-1 space-y-4 mb-8 relative z-10">
              <li className="flex items-start gap-3 text-sm text-white/90">
                <Check size={18} className="text-[#F5B942] shrink-0 mt-0.5" />
                <span>Everything in Free Plan</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-white/90">
                <Check size={18} className="text-[#F5B942] shrink-0 mt-0.5" />
                <span>View Wrapped on Custom Time</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-white/90">
                <Check size={18} className="text-[#F5B942] shrink-0 mt-0.5" />
                <span>Download Offline PDF for /review</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-white/90">
                <Check size={18} className="text-[#F5B942] shrink-0 mt-0.5" />
                <span>Priority AI generation</span>
              </li>
            </ul>

            <button 
              className="w-full py-4 rounded-xl bg-[#F5B942] text-black font-bold uppercase tracking-widest text-xs hover:bg-[#F5B942]/90 transition-colors relative z-10 shadow-[0_0_30px_rgba(245,185,66,0.3)] hover:shadow-[0_0_40px_rgba(245,185,66,0.5)]"
            >
              Upgrade Now
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
