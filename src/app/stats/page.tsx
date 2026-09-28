'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Users, Compass, Activity, ArrowLeft, RefreshCw, BarChart2, TrendingUp, AlertTriangle, Search, Filter, ShieldCheck, Database, DollarSign, CloudLightning, MessageSquare, CheckCircle, XCircle, Heart, Eye } from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { isAdminEmail } from '@/lib/admin';

interface StatsData {
  stats: {
    totalBlogs: number;
    totalLikes: number;
    totalViews: number;
    totalUsers: number;
    activeUsersToday: number;
    totalApiCallsAllTime: number;
    totalApiCallsToday: number;
    apiBreakdown: Record<string, number>;
    costEstimateToday: string;
    cacheHitRate: string;
    errorRate: string;
    errors: Array<{ id: string; endpoint: string; errorMessage: string; createdAt: string }>;
    funnelStats?: { STARTED: number; DATES_SET: number; FINALIZED: number };
    retentionStats?: { D1: number; D7: number; D30: number };
    detailedStats?: {
      ALL: { tripsPlanned: number; quickTripsPlanned: number; recommendationsUsed: number };
      MONTHLY: { tripsPlanned: number; quickTripsPlanned: number; recommendationsUsed: number };
      WEEKLY: { tripsPlanned: number; quickTripsPlanned: number; recommendationsUsed: number };
      DAILY: { tripsPlanned: number; quickTripsPlanned: number; recommendationsUsed: number };
    };
  };
  users: Array<{
    id: string;
    name: string;
    email: string;
    picture: string | null;
    authProvider: string;
    apiCalls: number;
    apiCallsFlights: number;
    apiCallsTrains: number;
    apiCallsBusses: number;
    apiCallsHotels: number;
    apiCallsPlaces: number;
    apiCallsRecommendations: number;
    lastApiCallDate: string;
    createdAt: string;
    tripsPlanned: number;
    quickTripsPlanned: number;
    _count: {
      tripHistories: number;
    };
  }>;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const Counter = ({ value, prefix = "", suffix = "" }: { value: number | string, prefix?: string, suffix?: string }) => {
  const isNumber = typeof value === 'number' || !isNaN(Number(value));
  const numValue = isNumber ? Number(value) : 0;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isNumber) return;
    let startTime: number;
    const duration = 1200; 
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      const ease = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);
      setDisplayValue(Math.floor(numValue * ease));
      if (progress < duration) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [numValue, isNumber]);

  if (!isNumber) return <>{prefix}{value}{suffix}</>;
  return <>{prefix}{displayValue}{suffix}</>;
};



export default function AdminStatsPage() {
  const { user, isLoading, fetchUser } = useAuthStore();
  const router = useRouter();
  
  const [data, setData] = useState<StatsData | null>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [dashboardRole, setDashboardRole] = useState<'ALL' | 'USER' | 'ADMIN' | 'GUEST'>('ALL');
  const [timeframe, setTimeframe] = useState<'ALL' | 'MONTHLY' | 'WEEKLY' | 'DAILY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'USER' | 'GUEST'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [feedbackTab, setFeedbackTab] = useState<'PENDING' | 'RESOLVED'>('PENDING');

  const updateFeedbackStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        setFeedbacks(prev => prev.map(fb => fb.id === id ? { ...fb, status: newStatus } : fb));
      }
    } catch (err) {
      console.error('Failed to update feedback', err);
    }
  };

  const deleteFeedback = async (id: string) => {
    try {
      const res = await fetch(`/api/feedback?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setFeedbacks(prev => prev.filter(fb => fb.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete feedback', err);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const fetchStats = async (role = dashboardRole) => {
    setLoadingStats(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/stats?role=${role}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) return router.push('/profile');
        throw new Error('Failed to fetch stats');
      }
      const json = await res.json();
      setData(json);

      // Fetch feedbacks
      const fbRes = await fetch('/api/feedback');
      if (fbRes.ok) {
        const fbJson = await fbRes.json();
        setFeedbacks(fbJson.feedbacks || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (!isAdminEmail(user?.email)) return router.push('/');
      fetchStats(dashboardRole);
    }
  }, [user, isLoading, router, dashboardRole]);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    
    // Group users by email to merge duplicates
    const uniqueUsersMap = new Map();
    data.users.forEach(u => {
      if (uniqueUsersMap.has(u.email)) {
        const existing = uniqueUsersMap.get(u.email);
        existing.apiCalls += u.apiCalls;
        existing._count.tripHistories += u._count.tripHistories;
        existing.tripsPlanned += u.tripsPlanned || 0;
        existing.quickTripsPlanned += u.quickTripsPlanned || 0;
        existing.apiCallsRecommendations += u.apiCallsRecommendations || 0;
        // Merge breakdown
        existing.apiCallsFlights += u.apiCallsFlights;
        existing.apiCallsTrains += u.apiCallsTrains;
        existing.apiCallsBusses += u.apiCallsBusses;
        existing.apiCallsHotels += u.apiCallsHotels;
        existing.apiCallsPlaces += u.apiCallsPlaces;
      } else {
        uniqueUsersMap.set(u.email, { ...u });
      }
    });

    let result = Array.from(uniqueUsersMap.values());

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    
    if (roleFilter === 'ADMIN') result = result.filter(u => isAdminEmail(u.email));
    if (roleFilter === 'USER') result = result.filter(u => !isAdminEmail(u.email) && u.authProvider !== 'quick');
    if (roleFilter === 'GUEST') result = result.filter(u => u.authProvider === 'quick');
    
    if (statusFilter === 'ACTIVE') result = result.filter(u => u.apiCalls > 0);
    if (statusFilter === 'INACTIVE') result = result.filter(u => u.apiCalls === 0);

    return result;
  }, [data, searchQuery, roleFilter, statusFilter]);

  if (isLoading || loadingStats) {
    return (
      <AppShell>
        <div className="w-full min-h-[calc(100vh-2rem)] flex items-center justify-center bg-[#050505]">
          <div className="flex flex-col items-center gap-6">
             <div className="relative w-16 h-16">
               <div className="absolute inset-0 border-2 border-white/10 rounded-full" />
               <div className="absolute inset-0 border-2 border-transparent border-t-white rounded-full animate-spin" />
             </div>
             <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] animate-pulse">Establishing Secure Uplink</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="w-full min-h-[calc(100vh-2rem)] flex items-center justify-center flex-col gap-4 bg-[#050505]">
          <p className="text-red-500 font-mono text-sm">SYSTEM_ERR: {error}</p>
          <button onClick={() => fetchStats()} className="text-xs bg-white text-black px-6 py-3 font-bold uppercase rounded hover:bg-white/90">Retry Uplink</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="w-full min-h-[calc(100vh-2rem)] bg-[#050505] text-[#EDEDED] p-6 lg:p-10 font-sans overflow-x-hidden relative">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-7xl mx-auto relative z-10">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
            <div className="flex items-center gap-6">
              <button onClick={() => router.push('/profile')} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all group">
                <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <div>
                <h1 className="text-3xl font-light tracking-tight text-white mb-1">Command Center</h1>
                <p className="text-xs font-mono text-white/40 uppercase tracking-widest">System Health & Telemetry</p>
              </div>
            </div>
            <button onClick={() => fetchStats()} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest group">
              <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" /> Sync
            </button>
          </div>

          {/* SECTION 1: Health & Growth (Top) */}
          <div className="mb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 border-b border-white/10 pb-2 gap-4">
              <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest">Health & Growth</h2>
              
              <div className="flex items-center gap-4">
                <div className="flex bg-black/40 border border-white/10 rounded-full p-1 relative w-fit">
                  <div 
                    className="absolute inset-y-1 bg-white/10 border border-white/20 rounded-full transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
                    style={{
                      left: timeframe === 'ALL' ? '4px' : timeframe === 'MONTHLY' ? 'calc(25% + 2px)' : timeframe === 'WEEKLY' ? 'calc(50% + 2px)' : 'calc(75% + 2px)',
                      width: 'calc(25% - 4px)'
                    }}
                  />
                  {(['ALL', 'MONTHLY', 'WEEKLY', 'DAILY'] as const).map(tf => (
                    <button 
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`relative z-10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors w-20 text-center ${timeframe === tf ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                <div className="flex bg-black/40 border border-white/10 rounded-full p-1 relative w-fit">
                  <div
                    className="absolute inset-y-1 bg-white/10 border border-white/20 rounded-full transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
                    style={{
                      left: `calc(${(['ALL', 'USER', 'ADMIN', 'GUEST'] as const).indexOf(dashboardRole) * 25}% + 4px)`,
                      width: 'calc(25% - 6px)'
                    }}
                  />
                  {(['ALL', 'USER', 'ADMIN', 'GUEST'] as const).map(role => (
                    <button
                      key={role}
                      onClick={() => setDashboardRole(role)}
                      className={`relative z-10 px-4 py-1 text-xs font-bold uppercase tracking-widest transition-colors w-24 text-center ${dashboardRole === role ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <motion.div variants={itemVariants} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                <div className="text-white/40 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-4"><Users size={14} /> Global Users</div>
                <div className="text-4xl font-light text-white"><Counter value={data.stats.totalUsers} /></div>
              </motion.div>
              <motion.div variants={itemVariants} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                <div className="text-white/40 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-4"><BarChart2 size={14} /> Total Blogs</div>
                <div className="text-4xl font-light text-[#FF8A3D]"><Counter value={data.stats.totalBlogs} /></div>
              </motion.div>
              <motion.div variants={itemVariants} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                <div className="text-white/40 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-4"><Heart size={14} /> Total Likes</div>
                <div className="text-4xl font-light text-rose-400"><Counter value={data.stats.totalLikes} /></div>
              </motion.div>
              <motion.div variants={itemVariants} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                <div className="text-white/40 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-4"><Eye size={14} /> Total Views</div>
                <div className="text-4xl font-light text-blue-400"><Counter value={data.stats.totalViews} /></div>
              </motion.div>
              <motion.div variants={itemVariants} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                <div className="text-white/40 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-4"><Activity size={14} /> Active Today</div>
                <div className="text-4xl font-light text-white"><Counter value={data.stats.activeUsersToday} /></div>
              </motion.div>
              <motion.div variants={itemVariants} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                <div className="text-white/40 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-4"><Compass size={14} /> Trips ({timeframe})</div>
                <div className="text-4xl font-light text-emerald-400"><Counter value={data.stats.detailedStats?.[timeframe]?.tripsPlanned || 0} /></div>
              </motion.div>
              <motion.div variants={itemVariants} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                <div className="text-white/40 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-4"><Compass size={14} /> Quick Trips ({timeframe})</div>
                <div className="text-4xl font-light text-purple-400"><Counter value={data.stats.detailedStats?.[timeframe]?.quickTripsPlanned || 0} /></div>
              </motion.div>
              <motion.div variants={itemVariants} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                <div className="text-white/40 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-4"><Compass size={14} /> Recommend ({timeframe})</div>
                <div className="text-4xl font-light text-blue-400"><Counter value={data.stats.detailedStats?.[timeframe]?.recommendationsUsed || 0} /></div>
              </motion.div>
              <motion.div variants={itemVariants} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                <div className="text-white/40 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-4"><TrendingUp size={14} /> API Calls Today</div>
                <div className="text-4xl font-light text-blue-400"><Counter value={data.stats.totalApiCallsToday} /></div>
              </motion.div>
              
              <motion.div variants={itemVariants} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                <div className="text-white/40 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-4"><Database size={14} /> API Calls (Lifetime)</div>
                <div className="text-4xl font-light text-white/80"><Counter value={data.stats.totalApiCallsAllTime} /></div>
              </motion.div>
              <motion.div variants={itemVariants} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                <div className="text-white/40 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-4"><CloudLightning size={14} /> Cache Hit Rate</div>
                <div className="text-4xl font-light text-indigo-400">{data.stats.cacheHitRate}</div>
              </motion.div>
              <motion.div variants={itemVariants} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                <div className="text-white/40 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-4"><AlertTriangle size={14} /> Error Rate</div>
                <div className="text-4xl font-light text-red-400">{data.stats.errorRate}</div>
              </motion.div>
              <motion.div variants={itemVariants} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                <div className="text-white/40 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-4"><DollarSign size={14} /> Est. API Cost</div>
                <div className="text-4xl font-light text-amber-400">${data.stats.costEstimateToday}</div>
              </motion.div>
            </div>
          </div>

          {/* SECTION 1.5: Advanced Analytics (Retention & Funnel) */}
          <div className="mb-12">
            <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">Advanced Analytics Engine</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Funnel Drop-off */}
              <motion.div variants={itemVariants} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-6 flex items-center gap-2"><Filter size={14} /> Trip Funnel Drop-off</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Trip Started', value: data.stats.funnelStats?.STARTED || 0, color: 'bg-blue-500' },
                    { label: 'Dates Added', value: data.stats.funnelStats?.DATES_SET || 0, color: 'bg-indigo-500' },
                    { label: 'Finalized & Saved', value: data.stats.funnelStats?.FINALIZED || 0, color: 'bg-emerald-500' }
                  ].map((step, i, arr) => {
                    const max = Math.max(arr[0].value, 1);
                    const percent = (step.value / max) * 100;
                    return (
                      <div key={step.label} className="relative">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-white/80">{step.label}</span>
                          <span className="font-mono text-white/60">{step.value} users ({Math.round(percent)}%)</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${percent}%` }} 
                            transition={{ duration: 1, delay: i * 0.2 }} 
                            className={`h-full ${step.color} rounded-full`} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Cohort Retention */}
              <motion.div variants={itemVariants} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-6 flex items-center gap-2"><Users size={14} /> Cohort Retention</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'D1 Retention', value: data.stats.retentionStats?.D1 || 0, timeframe: '> 24 hrs' },
                    { label: 'D7 Retention', value: data.stats.retentionStats?.D7 || 0, timeframe: '> 7 days' },
                    { label: 'D30 Retention', value: data.stats.retentionStats?.D30 || 0, timeframe: '> 30 days' }
                  ].map((cohort, i) => (
                    <div key={cohort.label} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">{cohort.label}</div>
                      <div className="text-2xl font-light text-white mb-1">{cohort.value.toFixed(1)}%</div>
                      <div className="text-[9px] text-white/30 font-mono">{cohort.timeframe}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 text-[10px] text-white/40 text-center font-mono flex flex-col gap-1">
                  <span><strong>D1</strong> = Users who came back after 1 Day</span>
                  <span><strong>D7</strong> = Users who came back after 1 Week</span>
                  <span><strong>D30</strong> = Users who came back after 1 Month</span>
                </div>
              </motion.div>

            </div>
          </div>

          {/* SECTION 2: Travel Usage & API (Middle) */}
          <div className="mb-12">
            <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">Travel Telemetry & Errors</h2>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* API Breakdown */}
              <motion.div variants={itemVariants} className="col-span-1 lg:col-span-7 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-6">Service Utilization</h3>
                <div className="space-y-4">
                  {Object.entries(data.stats.apiBreakdown).sort((a,b) => b[1]-a[1]).map(([key, val], i) => (
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-1.5"><span className="text-white/80">{key}</span><span className="font-mono text-white/60">{val} calls</span></div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(val / Math.max(...Object.values(data.stats.apiBreakdown), 1)) * 100}%` }} transition={{ duration: 1, delay: i * 0.1 }} className="h-full bg-blue-500 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Errors Panel */}
              <motion.div variants={itemVariants} className="col-span-1 lg:col-span-5 bg-[#110505]/80 backdrop-blur-xl border border-red-500/20 rounded-2xl p-6 flex flex-col">
                <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-6 flex items-center gap-2"><AlertTriangle size={14} /> Recent Failures</h3>
                {data.stats.errors && data.stats.errors.length > 0 ? (
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-60 pr-2">
                    {data.stats.errors.map(err => (
                      <div key={err.id} className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 text-xs">
                        <div className="flex justify-between mb-1"><span className="font-mono text-red-400">{err.endpoint}</span><span className="text-white/30">{new Date(err.createdAt).toLocaleTimeString()}</span></div>
                        <p className="text-red-200/70 truncate">{err.errorMessage}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                    <ShieldCheck size={32} className="text-emerald-500 mb-3" />
                    <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">All Systems Nominal</p>
                    <p className="text-[10px] text-white/40 mt-1">No recent external API failures detected.</p>
                  </div>
                )}
              </motion.div>

            </div>
          </div>

          {/* SECTION 3: Users & Audit (Bottom) */}
          <div>
            <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">Roster & Audit</h2>
            <motion.div variants={itemVariants} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
              
              {/* Toolbar */}
              <div className="p-4 border-b border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center bg-white/[0.02]">
                <div className="relative w-full md:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input 
                    type="text" 
                    placeholder="Search users..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Filter size={14} className="text-white/30 ml-2 md:ml-0" />
                  <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as any)} className="bg-black/50 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white/80 focus:outline-none">
                    <option value="ALL">All Roles</option>
                    <option value="ADMIN">Admins Only</option>
                    <option value="USER">Users Only</option>
                    <option value="GUEST">Guests Only</option>
                  </select>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="bg-black/50 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white/80 focus:outline-none">
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active (Has API Calls)</option>
                    <option value="INACTIVE">Inactive (0 Calls)</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-bold text-white/30 uppercase tracking-widest border-b border-white/5 bg-black/20">
                      <th className="py-4 px-6 font-medium">User</th>
                      <th className="py-4 px-6 font-medium">Contact</th>
                      <th className="py-4 px-6 font-medium">Role</th>
                      <th className="py-4 px-6 font-medium text-right">Trips</th>
                      <th className="py-4 px-6 font-medium text-right">Quick Trips</th>
                      <th className="py-4 px-6 font-medium text-right">Recommend Usages</th>
                      <th className="py-4 px-6 font-medium text-right">Total Requests</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-white/5">
                    <AnimatePresence>
                      {filteredUsers.map((u) => (
                        <React.Fragment key={u.id}>
                          <motion.tr 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                            onClick={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)}
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                {u.picture ? (
                                  <>
                                    <img 
                                      src={u.picture} 
                                      alt={u.name} 
                                      referrerPolicy="no-referrer"
                                      className="w-8 h-8 rounded-full border border-white/10 object-cover" 
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        if (e.currentTarget.nextElementSibling) {
                                          (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                                        }
                                      }}
                                    />
                                    <div style={{ display: 'none' }} className="w-8 h-8 rounded-full bg-neutral-900 border border-white/10 items-center justify-center text-[10px] font-bold text-white">
                                      {u.name.substring(0, 2).toUpperCase()}
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white">{u.name.substring(0, 2).toUpperCase()}</div>
                                )}
                                <div>
                                  <div className="text-sm font-medium text-white/90">{u.name}</div>
                                  <div className="text-[11px] font-bold text-[#FF8A3D] mt-0.5">@{u.email.split('@')[0]}</div>
                                  <div className="text-[10px] text-white/30 font-mono mt-0.5">Joined: {new Date(u.createdAt).toLocaleDateString()}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-white/50 font-mono text-xs">{u.email}</td>
                            <td className="py-4 px-6">
                              {isAdminEmail(u.email) ? (
                                <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[9px] font-bold uppercase tracking-widest text-blue-400">Admin</span>
                              ) : u.authProvider === 'quick' ? (
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold uppercase tracking-widest text-amber-400">Guest</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-white/40">User</span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col items-end w-full">
                                <span className="font-mono text-white/80">{u.tripsPlanned || 0}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col items-end w-full">
                                <span className="font-mono text-white/80">{u.quickTripsPlanned || 0}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col items-end w-full">
                                <span className="font-mono text-white/80">{u.apiCallsRecommendations || 0}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col items-end w-full">
                                <span className="font-mono text-white/80">{u.apiCalls}</span>
                                {u.apiCalls > 0 && <span className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mt-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity whitespace-nowrap">{expandedUserId === u.id ? 'Hide Details' : 'View Breakdown'}</span>}
                              </div>
                            </td>
                          </motion.tr>
                          
                          {/* Expanded Drawer */}
                          <AnimatePresence>
                            {expandedUserId === u.id && u.apiCalls > 0 && (
                              <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-black/60 border-t border-white/5 shadow-inner">
                                <td colSpan={7} className="p-0">
                                  <div className="px-6 py-4 flex flex-col md:flex-row gap-8 justify-end items-start md:items-end text-xs w-full bg-neutral-950/40">
                                    
                                    <div className="flex flex-col gap-2 items-end w-full md:w-auto">
                                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 border-b border-white/10 pb-1 w-full text-right md:min-w-[210px]">Lifetime Service Queries</span>
                                      <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 w-full md:min-w-[210px]">
                                        <span className="text-white/60 text-right">Flights:</span> <span className="font-mono text-white/90 text-right">{u.apiCallsFlights || 0}</span>
                                        <span className="text-white/60 text-right">Trains:</span> <span className="font-mono text-white/90 text-right">{u.apiCallsTrains || 0}</span>
                                        <span className="text-white/60 text-right">Buses:</span> <span className="font-mono text-white/90 text-right">{u.apiCallsBusses || 0}</span>
                                        <span className="text-white/60 text-right">Hotels:</span> <span className="font-mono text-white/90 text-right">{u.apiCallsHotels || 0}</span>
                                        <span className="text-white/60 text-right">Places:</span> <span className="font-mono text-white/90 text-right">{u.apiCallsPlaces || 0}</span>
                                        <span className="text-white/60 text-right">Recommendations:</span> <span className="font-mono text-white/90 text-right">{u.apiCallsRecommendations || 0}</span>
                                        <div className="col-span-2 border-t border-white/10 my-0.5"></div>
                                        <span className="text-emerald-400 font-bold text-right text-[11px] uppercase tracking-wider">Total Service Hits:</span> 
                                        <span className="font-mono text-emerald-400 font-bold text-right">{(u.apiCallsFlights || 0) + (u.apiCallsTrains || 0) + (u.apiCallsBusses || 0) + (u.apiCallsHotels || 0) + (u.apiCallsPlaces || 0) + (u.apiCallsRecommendations || 0)}</span>
                                      </div>
                                    </div>

                                    <div className="flex flex-col gap-2 items-end w-full md:w-auto">
                                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 border-b border-white/10 pb-1 w-full text-right md:min-w-[210px]">Status & Quota Tracker</span>
                                      <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 w-full md:min-w-[210px]">
                                        <span className="text-white/60 text-right">Last Active:</span> <span className="font-mono text-white/90 text-right">{new Date(u.lastApiCallDate).toLocaleDateString()}</span>
                                        <span className="text-blue-400 font-bold text-right text-[11px] uppercase tracking-wider">Total API Requests:</span> <span className="font-mono text-blue-400 font-bold text-right">{u.apiCalls || 0}</span>
                                      </div>
                                      <div className="mt-1 bg-white/[0.03] border border-white/5 rounded-lg p-2.5 max-w-[240px]">
                                        <p className="text-[10px] text-white/50 font-mono leading-relaxed text-right">
                                          *Note: Transport searches check Flights, Trains & Buses simultaneously (+3 service hits per call). Total API Requests counts raw HTTP calls & rate limits.*
                                        </p>
                                      </div>
                                    </div>

                                  </div>
                                </td>
                              </motion.tr>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <div className="py-12 flex flex-col items-center justify-center text-white/30 gap-3">
                    <Search size={24} className="opacity-50" />
                    <span className="font-mono uppercase tracking-widest text-xs">No records found</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

        </motion.div>

        {/* SECTION 4: Feedbacks */}
        <div className="mt-12 max-w-7xl mx-auto relative z-10">
          <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
            <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest">User Feedback</h2>
            
            <div className="flex bg-black/40 border border-white/10 rounded-full p-1 relative">
              <div 
                className="absolute inset-y-1 bg-white/10 border border-white/20 rounded-full transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
                style={{
                  left: feedbackTab === 'PENDING' ? '4px' : 'calc(50% + 2px)',
                  width: 'calc(50% - 6px)'
                }}
              />
              <button 
                onClick={() => setFeedbackTab('PENDING')}
                className={`relative z-10 px-4 py-1 text-xs font-bold uppercase tracking-widest transition-colors ${feedbackTab === 'PENDING' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
              >
                Pending
              </button>
              <button 
                onClick={() => setFeedbackTab('RESOLVED')}
                className={`relative z-10 px-4 py-1 text-xs font-bold uppercase tracking-widest transition-colors ${feedbackTab === 'RESOLVED' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
              >
                Solved
              </button>
            </div>
          </div>
          
          <motion.div variants={itemVariants} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden">
            {feedbacks.filter(fb => (feedbackTab === 'PENDING' ? fb.status !== 'RESOLVED' : fb.status === 'RESOLVED')).length > 0 ? (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                <AnimatePresence>
                  {feedbacks
                    .filter(fb => (feedbackTab === 'PENDING' ? fb.status !== 'RESOLVED' : fb.status === 'RESOLVED'))
                    .map((fb) => (
                    <motion.div 
                      key={fb.id} 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4 items-start relative group overflow-hidden"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                        <MessageSquare size={16} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <span className="text-sm font-bold text-white">{fb.user?.name || 'Anonymous User'}</span>
                            <span className="text-xs text-white/40 ml-2 font-mono">{fb.user?.email || 'No email provided'}</span>
                          </div>
                          <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{new Date(fb.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">{fb.type}</div>
                        <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap pr-32">{fb.content}</p>
                      </div>

                      {/* Action Buttons */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        {feedbackTab === 'PENDING' ? (
                          <button 
                            onClick={() => updateFeedbackStatus(fb.id, 'RESOLVED')}
                            className="flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                          >
                            <CheckCircle size={14} /> Solved
                          </button>
                        ) : (
                          <button 
                            onClick={() => updateFeedbackStatus(fb.id, 'NEW')}
                            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                          >
                            <RefreshCw size={14} /> Pending
                          </button>
                        )}
                        <button 
                          onClick={() => deleteFeedback(fb.id)}
                          className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                        >
                          <XCircle size={14} /> Remove
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-white/30 gap-3">
                {feedbackTab === 'PENDING' ? (
                  <>
                    <ShieldCheck size={32} className="opacity-50 text-emerald-500/50 mb-2" />
                    <span className="font-mono uppercase tracking-widest text-xs">All caught up! No pending feedback.</span>
                  </>
                ) : (
                  <>
                    <MessageSquare size={24} className="opacity-50 mb-2" />
                    <span className="font-mono uppercase tracking-widest text-xs">No resolved feedback yet.</span>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </div>

      </div>
    </AppShell>
  );
}

