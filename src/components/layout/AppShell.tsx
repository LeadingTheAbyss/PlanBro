'use client';

import { createPortal } from 'react-dom';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBudgetStore } from '@/store/budgetStore';
import { useTripStore } from '@/store/tripStore';
import { Plane, Building, Landmark, Coffee, User, Menu, ChevronUp, Check, ListFilter, Sun, Moon, X, AlertCircle, MessageSquare } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { UserAvatar } from '@/components/UserAvatar';
import { FeedbackModal } from '@/components/FeedbackModal';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBlogRoute = pathname.startsWith('/blog');
  const forceLightHeader = isBlogRoute;
  const budget = useBudgetStore();
  const { user, fetchUser, isLoading } = useAuthStore();
  const [isNotificationDismissed, setIsNotificationDismissed] = useState(false);
  const [isBudgetDropdownOpen, setIsBudgetDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch user on mount if not already fetched
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Global Budget Sync to prevent ghost expenses if passengers are deleted
  const trip = useTripStore();
  useEffect(() => {
    const transportTotal = trip.selectedTransports.reduce((acc, t) => acc + t.cost, 0);
    useBudgetStore.getState().setExpense('transport', transportTotal);
    
    // Note: We're omitting places/food auto-sync here because those depend on itineraryStore, 
    // but tripStore (transports) handles the biggest expenses and passenger deletions.
  }, [trip.selectedTransports]);
  
  // Theme state
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(localStorage.getItem('theme') === 'dark');
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const navLinks = [
    { href: '/plan/setup', label: 'Trip Setup' },
    { href: '/plan/transport', label: 'Transport' },
    { href: '/plan/places', label: 'Places' },
    { href: '/plan/food', label: 'Food' },
    { href: '/plan/hotels', label: 'Hotels' },
    { href: '/plan/itinerary', label: 'Itinerary' },
    { href: '/plan/review', label: 'Review' },
  ];

  return (
    <div className={`flex flex-col ${pathname === '/' || isBlogRoute ? 'min-h-screen' : 'h-screen overflow-hidden'} ${isBlogRoute ? '!bg-[#FFF7F0] !text-[#1F2937] selection:!bg-[#FF8A3D]/20' : 'bg-white dark:bg-[#050505] text-neutral-900 dark:text-[#EDEDED] selection:bg-black/10 dark:selection:bg-white/30'} font-sans transition-colors duration-300`} style={{ fontFamily: "'Outfit', sans-serif" }}>

      {/* Horizontal Progression Track */}
      {!pathname.startsWith('/profile') && !pathname.startsWith('/u') && pathname !== '/' && !isBlogRoute && (
        <header className={`h-14 border-b backdrop-blur-md flex items-center justify-between px-4 md:px-8 shrink-0 z-[100] sticky top-0 transition-colors duration-300 ${forceLightHeader ? 'border-[#FF8A3D]/20 bg-white/90' : 'border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-[#050505]/90'}`}>
          <div className="flex items-center gap-10">
            <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2 md:gap-3 shrink-0">
              <img src="/icon.png" alt="PlanBro Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain" />
              <h1 className={`text-xs md:text-sm font-bold uppercase tracking-[0.2em] hidden sm:block ${forceLightHeader ? 'text-[#1F2937]' : 'text-black dark:text-white'}`}>PlanBro</h1>
            </Link>
            
            {pathname !== '/stats' && pathname !== '/recommend' && (
              <nav className="flex items-center gap-6 hidden md:flex">
                {navLinks.map((link, idx) => {
                  const isActive = pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`text-[11px] uppercase font-bold tracking-[0.1em] transition-all ${isActive ? 'text-black dark:text-white' : 'text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white'}`}
                    >
                      {idx + 1}. {link.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 shrink-0">
            
            {/* Budget Dropdown in Navbar */}
            {pathname.startsWith('/plan') && (
              <div className="relative">
                <button
                  onClick={() => setIsBudgetDropdownOpen(!isBudgetDropdownOpen)}
                  className="h-7 px-2 sm:px-3 rounded-full border border-neutral-300 dark:border-white/20 hover:border-neutral-500 dark:hover:border-white/50 transition-colors flex items-center justify-center bg-neutral-100 dark:bg-white/5 text-neutral-800 dark:text-neutral-200 gap-1.5 sm:gap-2"
                >
                  <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest hidden sm:inline-block">Budget</span>
                  <span className="text-xs font-bold">₹{budget.totalBudget.toLocaleString('en-IN')}</span>
                  <ChevronUp size={12} className={`text-neutral-500 transition-transform duration-300 ${isBudgetDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu via Portal */}
                {mounted && isBudgetDropdownOpen && createPortal(
                  <>
                    {/* Backdrop to close when clicking outside */}
                    <div className="fixed inset-0 z-[999] cursor-pointer" onClick={() => setIsBudgetDropdownOpen(false)}></div>
                    <div className="fixed right-8 top-16 w-72 bg-white dark:bg-[#111111] text-black dark:text-[#EDEDED] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.8)] overflow-hidden z-[1000] animate-in fade-in slide-in-from-top-2">
                      <div className="px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#0a0a0a]">
                        <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Budget Breakdown</span>
                      </div>
                      <div className="p-5">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-neutral-400 font-medium flex items-center gap-2"><Plane size={12} /> Transport</span>
                            <span className="text-red-400 font-semibold">- ₹{(budget.spentTransport || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-neutral-400 font-medium flex items-center gap-2"><Landmark size={12} /> Places</span>
                            <span className="text-red-400 font-semibold">- ₹{(budget.spentPlaces || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-neutral-400 font-medium flex items-center gap-2"><Coffee size={12} /> Food</span>
                            <span className="text-red-400 font-semibold">- ₹{(budget.spentFood || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-neutral-400 font-medium flex items-center gap-2"><Building size={12} /> Hotels</span>
                            <span className="text-red-400 font-semibold">- ₹{(budget.spentHotels || 0).toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center mt-4">
                          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Remaining</span>
                          <span className={`text-xl font-bold ${budget.remaining < 0 ? 'text-red-500' : 'text-emerald-500 dark:text-emerald-400'}`}>
                            ₹{(budget.remaining || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>,
                  document.body
                )}
              </div>
            )}
            <button
              onClick={() => setIsDark(!isDark)}
              className={`w-7 h-7 rounded-full border transition-colors flex items-center justify-center shrink-0 ${forceLightHeader ? 'border-neutral-300 hover:border-neutral-500 bg-neutral-100 text-neutral-600' : 'border-neutral-300 dark:border-white/20 hover:border-neutral-500 dark:hover:border-white/50 bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-300'}`}
              title="Toggle Theme"
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <button
              onClick={() => setIsFeedbackOpen(true)}
              className={`group relative overflow-hidden h-7 px-2 sm:px-3 rounded-full border transition-all duration-500 ease-in-out flex items-center justify-center gap-1.5 shrink-0 ${forceLightHeader ? 'border-neutral-300 bg-neutral-100 text-neutral-600' : 'border-neutral-300 dark:border-white/20 bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-300'}`}
              title="Send Us Feedback!"
            >
              <span className="absolute z-0 left-1/2 top-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full scale-0 group-hover:scale-[15] origin-center bg-[#1a1523] transition-transform duration-500 ease-in-out" />
              <MessageSquare size={13} className="relative z-10 transition-colors duration-300 ease-in-out group-hover:text-white" />
              <span className="relative z-10 hidden sm:inline-block text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ease-in-out group-hover:text-white">Send Us Feedback</span>
            </button>
            <Link href={user?.username ? `/u/${encodeURIComponent(user.username)}` : '/profile'} className={`w-7 h-7 rounded-full border transition-colors flex items-center justify-center overflow-hidden shrink-0 ${forceLightHeader ? 'border-neutral-300 hover:border-neutral-500 bg-neutral-100 text-neutral-600' : 'border-neutral-300 dark:border-white/20 hover:border-neutral-500 dark:hover:border-white/50 bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-300'}`}>
              {isLoading ? (
                <div className="w-full h-full bg-black/10 dark:bg-white/10 animate-pulse"></div>
              ) : user ? (
                <UserAvatar user={user} className="w-full h-full text-[10px]" />
              ) : (
                <User size={14} />
              )}
            </Link>
            
            {/* Mobile Menu Toggle */}
            {pathname !== '/stats' && pathname !== '/recommend' && (
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="w-7 h-7 md:hidden rounded-md border border-neutral-300 dark:border-white/20 hover:border-neutral-500 dark:hover:border-white/50 transition-colors flex items-center justify-center bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-300 shrink-0"
              >
                {isMobileMenuOpen ? <X size={14} /> : <Menu size={14} />}
              </button>
            )}
          </div>
        </header>
      )}

      {/* Mobile Navigation Drawer */}
      {mounted && isMobileMenuOpen && (
        <div className="md:hidden fixed top-14 left-0 w-full bg-white/95 dark:bg-[#050505]/95 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800 z-[999] shadow-2xl animate-in slide-in-from-top-4">
          <nav className="flex flex-col p-4 gap-2">
            {navLinks.map((link, idx) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`p-3 rounded-xl text-[12px] uppercase font-bold tracking-[0.1em] transition-all ${isActive ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900'}`}
                >
                  {idx + 1}. {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col relative ${pathname === '/' || isBlogRoute ? '' : 'h-[calc(100vh-3.5rem)] overflow-hidden'}`}>
        <div id="main-scroll-container" className={`flex-1 bg-transparent ${pathname === '/' || isBlogRoute ? '' : 'overflow-y-auto'}`}>
          {children}
        </div>



        {/* API Limit Warning Notification */}
        {user && !user.isAdmin && user.apiCalls >= 120 && !isNotificationDismissed && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-[#111]/95 backdrop-blur-md border border-red-500/50 rounded-2xl shadow-[0_0_40px_rgba(220,38,38,0.15)] p-4 z-[9999] animate-in slide-in-from-top-4 fade-in">
            <button
              onClick={() => setIsNotificationDismissed(true)}
              className="absolute top-3 right-3 text-neutral-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-500 mt-0.5" size={16} />
              <div className="pr-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-widest mb-1.5">Limit Warning</h4>
                <p className="text-[11px] font-medium text-neutral-300 leading-relaxed">
                  You are approaching the daily mission limit.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
}
