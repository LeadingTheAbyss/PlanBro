'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { ArrowLeft, Edit2, LogOut, Map, History, Compass, ChevronRight, MessageSquare, ChevronDown, Trash2, Check, X, MapPin, Globe, BookOpen, ExternalLink, Camera, PenTool, FileText, Sun, Moon } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { UserAvatar } from '@/components/UserAvatar';
import { useTripStore } from '@/store/tripStore';
import { useItineraryStore } from '@/store/itineraryStore';
import { useBudgetStore } from '@/store/budgetStore';
import { FeedbackModal } from '@/components/FeedbackModal';
import ModernDateRangePicker from '@/components/ModernDateRangePicker';
import { ARTICLES, FEATURED_ARTICLE, Article } from '@/data/blogData';
import { readUserProfile, writeUserProfile } from '@/lib/profileStorage';
import Link from 'next/link';

let cachedTrips: any[] | null = null;
let lastFetchedTime = 0;

interface UserCustomProfile {
  displayName?: string;
  username?: string;
  pfp?: string;
  about?: string;
  city?: string;
  socials?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    youtube?: string;
    website?: string;
  };
}

function InstagramIcon({ className = "text-pink-400", size = 14 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  );
}

function TwitterIcon({ className = "text-sky-400", size = 14 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function FacebookIcon({ className = "text-blue-400", size = 14 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function YoutubeIcon({ className = "text-rose-400", size = 14 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

export default function ProfilePage() {
  const { user, fetchUser, isLoading, logout, updateProfile } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const routeUsername = params?.username ? decodeURIComponent(params.username as string) : null;
  const searchParams = useSearchParams();
  const targetUserParam = routeUsername || (searchParams ? searchParams.get('user') : null);

  const [trips, setTrips] = useState<any[]>(cachedTrips || []);
  const [loadingTrips, setLoadingTrips] = useState(!cachedTrips);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [showAllBlogs, setShowAllBlogs] = useState(false);
  const [showAllTrips, setShowAllTrips] = useState(false);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);

  // Theme toggle — AppShell hides its own header (and theme button) on /profile routes,
  // so this page needs its own switch. Mirrors AppShell's toggle mechanism for consistency.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Profile custom state
  const [customProfile, setCustomProfile] = useState<UserCustomProfile>({
    displayName: user?.name || 'Explorer',
    username: user?.username || '',
    pfp: user?.picture || '',
    about: '',
    city: 'India',
    socials: {},
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState<UserCustomProfile>(customProfile);
  const [userStories, setUserStories] = useState<Article[]>([]);
  const [userDrafts, setUserDrafts] = useState<any[]>([]);

  // Collaboration Companion state & handlers (#3)
  const [collabRequests, setCollabRequests] = useState<any[]>([]);
  const [inviteTargetUser, setInviteTargetUser] = useState('');
  const [selectedStoryToInvite, setSelectedStoryToInvite] = useState('');
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState('');

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Load custom profile & incoming collaboration invites
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (async () => {
        let fetchedBlogs: Article[] = [];
        try {
          const res = await fetch('/api/blogs');
          if (res.ok) fetchedBlogs = await res.json();
        } catch(e) {}
      try {
        const myUsername = user?.username || '';
        const myProfileData: UserCustomProfile | null = readUserProfile(user?.id);

        const isOwn = !targetUserParam || (!!myUsername && targetUserParam === myUsername);

        if (isOwn) {
          if (myProfileData) {
            myProfileData.username = myUsername;
            if (user?.picture) {
              myProfileData.pfp = user.picture;
            }
            setCustomProfile(myProfileData);
            setEditForm(myProfileData);
          } else {
            const init = {
              displayName: user?.name || 'Explorer',
              username: myUsername,
              pfp: user?.picture || '',
              about: '',
              city: 'India',
              socials: {}
            };
            setCustomProfile(init);
            setEditForm(init);
          }

          const allAvailable = [...fetchedBlogs, ...ARTICLES.slice(0, 3)];
          const myStories = allAvailable.filter(s =>
            s.author.username === myUsername ||
            s.author.name === (myProfileData?.displayName || user?.name) ||
            (s.collaborators && s.collaborators.some(c => c.username === myUsername && c.status === 'approved'))
          );
          setUserStories(myStories);
          return;
        }

        // Otherwise viewing another user's profile
        if (targetUserParam) {
          const all = [...fetchedBlogs, FEATURED_ARTICLE, ...ARTICLES];

          let foundProfile = null;
          try {
            const mockUsers = JSON.parse(localStorage.getItem('brewplans_mock_users') || '[]');
            foundProfile = mockUsers.find((u: any) => u.username === targetUserParam);
          } catch (e) {}

          // finding profile
          if (foundProfile) {
            setCustomProfile(foundProfile);
            setEditForm(foundProfile);
            setUserStories(all.filter(a => a.author.username === targetUserParam || (a.collaborators && a.collaborators.some(c => c.username === targetUserParam))));
            return;
          }

          const foundWriter = all.find(a => a.author.username === targetUserParam || (a.collaborators && a.collaborators.some(c => c.username === targetUserParam)));
          if (foundWriter) {
            const writerProfile = {
              displayName: foundWriter.author.username === targetUserParam ? foundWriter.author.name : targetUserParam,
              username: targetUserParam,
              pfp: foundWriter.author.username === targetUserParam ? foundWriter.author.avatar : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
              about: '',
              city: foundWriter.city || 'India',
              socials: {}
            };
            setCustomProfile(writerProfile);
            setEditForm(writerProfile);
            setUserStories(all.filter(a => a.author.username === targetUserParam || (a.collaborators && a.collaborators.some(c => c.username === targetUserParam))));
          }
        }

        // Load incoming collaboration requests
        const storedReqs = JSON.parse(localStorage.getItem('brewplans_collab_requests') || '[]');
        setCollabRequests(storedReqs);

        const mine = fetchedBlogs.filter((b: any) =>
          b.author?.username?.toLowerCase() === (targetUserParam || '').toLowerCase() ||
          b.collaborators?.some((c: any) => c.username.toLowerCase() === (targetUserParam || '').toLowerCase() && c.status === 'approved')
        );
        setUserStories(mine);

        // Load Drafts
        if (isOwn) {
          try {
            const drafts = JSON.parse(localStorage.getItem('brewplans_drafts') || '[]');
            setUserDrafts(drafts);
          } catch(e) {}
        }

      } catch (e) {
        console.error(e);
      }
      })();
    }
  }, [user, targetUserParam]);

  const handleApproveCollab = (requestId: string, articleSlug: string, articleTitle: string) => {
    const updatedReqs = collabRequests.map(r => r.id === requestId ? { ...r, status: 'approved' } : r);
    setCollabRequests(updatedReqs);
    if (typeof window !== 'undefined') {
      localStorage.setItem('brewplans_collab_requests', JSON.stringify(updatedReqs));

      fetch('/api/blogs')
        .then(res => res.json())
        .then(customBlogs => {
          let storyObj = [...customBlogs, ...ARTICLES, FEATURED_ARTICLE].find(s => s.slug === articleSlug || s.id === articleSlug);
          if (storyObj && !userStories.some(s => s.id === storyObj?.id)) {
            const updatedStory = {
              ...storyObj,
              collaborators: [
                ...(storyObj.collaborators || []),
                {
                  name: customProfile.displayName || 'Travel Companion',
                  username: customProfile.username || 'companion',
                  avatar: customProfile.pfp || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
                  status: 'approved'
                }
              ]
            };
            setUserStories([updatedStory, ...userStories]);
            fetch(`/api/blogs/${storyObj.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ collaborators: updatedStory.collaborators })
            });
          }
        });
    }
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleDeclineCollab = (requestId: string) => {
    const updatedReqs = collabRequests.filter(r => r.id !== requestId);
    setCollabRequests(updatedReqs);
    if (typeof window !== 'undefined') {
      localStorage.setItem('brewplans_collab_requests', JSON.stringify(updatedReqs));
    }
  };

  const handleSendInviteFromProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteTargetUser.trim() || !selectedStoryToInvite) return;
    const cleanUser = inviteTargetUser.trim().replace('@', '').toLowerCase();
    const storyObj = userStories.find(s => s.id === selectedStoryToInvite);

    if (typeof window !== 'undefined') {
      const reqs = JSON.parse(localStorage.getItem('brewplans_collab_requests') || '[]');
      const newInvite = {
        id: `req-${Date.now()}`,
        articleSlug: storyObj?.slug || selectedStoryToInvite,
        articleTitle: storyObj?.title || 'Shared Travel Dispatch',
        fromUser: customProfile.username || 'explorer',
        toUser: cleanUser,
        status: 'pending',
        avatar: customProfile.pfp || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
      };
      const updated = [newInvite, ...reqs];
      localStorage.setItem('brewplans_collab_requests', JSON.stringify(updated));
      setCollabRequests(updated);
    }
    setInviteSuccessMsg(`A request has been sent to person @${cleanUser} on their profile page! Once they approve, this story will be visible on both accounts.`);
    setInviteTargetUser('');
    setTimeout(() => setInviteSuccessMsg(''), 7000);
  };

  useEffect(() => {
    // Fetch user planned trips whenever viewing own profile
    const isStale = Date.now() - lastFetchedTime > 5 * 60 * 1000;
    if (!cachedTrips || isStale) {
      if (!cachedTrips) setLoadingTrips(true);
      fetch('/api/trips')
        .then(res => res.json())
        .then(data => {
          const fetchedTrips = data.trips || [];
          cachedTrips = fetchedTrips;
          lastFetchedTime = Date.now();
          setTrips(fetchedTrips);
          // Get drafts
          try {
            const allDrafts = JSON.parse(localStorage.getItem('brewplans_drafts') || '[]');
            setDrafts(allDrafts);
          } catch (e) {}

          setLoadingTrips(false);
        })
        .catch(() => setLoadingTrips(false));
    }
  }, []);

  const handleLogout = async () => {
    cachedTrips = null;
    lastFetchedTime = 0;
    await logout();
    router.push('/');
  };

  const handlePfpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setEditForm({ ...editForm, pfp: data.url });
      } else {
        alert('Upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed due to network error.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // Username is tied to the account (set at signup, or from the Google
    // account name) — it's not editable from this form.
    const updatedProfile = { ...editForm, username: customProfile.username };
    setCustomProfile(updatedProfile);
    setEditForm(updatedProfile);
    if (user?.id) {
      writeUserProfile(user.id, updatedProfile);
    }

    // Persist to DB using updateProfile
    if (user && updateProfile) {
      updateProfile({
        name: updatedProfile.displayName || user.name,
        picture: updatedProfile.pfp || undefined
      });
    }

    setIsEditingProfile(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const executeDeleteTrip = async (tripId: string) => {
    try {
      const res = await fetch(`/api/trips?id=${tripId}`, { method: 'DELETE' });
      if (res.ok) {
        const newTrips = trips.filter(t => t.id !== tripId);
        setTrips(newTrips);
        if (cachedTrips) {
          cachedTrips = cachedTrips.filter(t => t.id !== tripId);
        }
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } else {
        alert('Failed to delete trip.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete trip.');
    }
    setTripToDelete(null);
  };

  const handleTripClick = (trip: any) => {
    const snap = trip.snapshot as any;
    if (snap.type === 'quick-trip') {
       localStorage.setItem('quickTripData', JSON.stringify(snap));
       router.push('/quick-trip');
       return;
    }
    useTripStore.getState().loadSnapshot(snap, trip.destination);
    useItineraryStore.getState().loadSnapshot(snap);
    useBudgetStore.getState().loadSnapshot(snap);
    router.push('/plan/review');
  };

  if (isLoading && !targetUserParam) {
    return (
      <AppShell>
        <div className="w-full min-h-[calc(100vh-2rem)] bg-white dark:bg-[#0A0A0A] text-neutral-900 dark:text-[#EDEDED] flex items-center justify-center rounded-3xl border border-neutral-200 dark:border-white/5">
          <div className="flex flex-col items-center gap-6">
             <div className="w-12 h-12 border border-neutral-300 dark:border-white/20 border-t-neutral-900 dark:border-t-white rounded-full animate-spin" />
             <p className="text-[10px] font-bold text-neutral-400 dark:text-white/40 uppercase tracking-widest animate-pulse">Authenticating Profile...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const isOwnProfile = !targetUserParam || (!!user?.username && targetUserParam === user.username);

  return (
    <AppShell>
      <div className="w-full min-h-[calc(100vh-2rem)] bg-neutral-50 dark:bg-[#0A0A0A] text-neutral-900 dark:text-[#EDEDED] p-6 sm:p-10 lg:p-16 rounded-3xl font-sans relative">

        {/* Header Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 sm:gap-0 mb-10 sm:mb-14 border-b border-neutral-200 dark:border-white/10 pb-6 sm:pb-8">
          <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-8 w-full sm:w-auto">
            <button
              onClick={() => router.back()}
              className="text-neutral-400 dark:text-white/40 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-2 font-bold text-[10px] sm:text-xs uppercase tracking-widest group shrink-0"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span>Back</span>
            </button>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tighter text-neutral-900 dark:text-white shrink-0">
              {targetUserParam ? "Traveler Profile" : "My Profile"}
            </h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <button
              onClick={() => setIsDark(!isDark)}
              className="w-9 h-9 rounded-full border border-neutral-300 dark:border-white/20 hover:border-neutral-500 dark:hover:border-white/50 transition-colors flex items-center justify-center bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-300 shrink-0"
              title="Toggle Theme"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {isOwnProfile && (
              <>
                <button
                  type="button"
                  onClick={() => setIsRequestsModalOpen(true)}
                  className={`px-4 py-2 rounded-full border text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                    collabRequests.filter(r => r.status === 'pending').length > 0
                      ? 'bg-emerald-50 dark:bg-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/50 shadow-sm'
                      : 'bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 border-neutral-300 dark:border-white/15'
                  }`}
                >
                  {collabRequests.filter(r => r.status === 'pending').length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping"></span>
                  )}
                  <span>Incoming Requests ({collabRequests.filter(r => r.status === 'pending').length})</span>
                </button>

                <button
                  onClick={() => setIsFeedbackOpen(true)}
                  className="hidden sm:flex h-9 px-4 rounded-full bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 border border-neutral-200 dark:border-white/10 transition-all items-center gap-2 text-neutral-800 dark:text-white text-xs font-bold uppercase tracking-widest"
                >
                  <MessageSquare size={14} />
                  <span>Feedback</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="text-red-500/80 hover:text-red-600 dark:hover:text-red-500 transition-colors flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ml-2"
                >
                  <LogOut size={16} /> <span className="hidden sm:inline">Sign Out</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">

          {/* Left Profile Card (Identity & Socials) */}
          <div className="lg:col-span-4 flex flex-col items-start bg-white dark:bg-gradient-to-b dark:from-[#161616] dark:to-[#0E0E0E] p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-white/10 shadow-sm dark:shadow-2xl relative h-fit">

            {/* PFP Avatar Display */}
            <div className="relative mb-6">
              {customProfile.pfp ? (
                <img
                  src={customProfile.pfp}
                  alt={customProfile.displayName}
                  className="w-36 h-36 rounded-3xl object-cover border-2 border-[#FF8A3D]/40 shadow-lg"
                />
              ) : (
                <UserAvatar user={{ name: customProfile.displayName || 'User' }} className="w-36 h-36 rounded-3xl text-5xl border border-neutral-200 dark:border-white/20 shadow-lg" />
              )}

              {isOwnProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="absolute bottom-2 right-2 p-2.5 rounded-2xl bg-[#FF8A3D] text-[#1F2937] hover:bg-[#D45B0C] hover:text-white transition-all shadow-lg font-bold"
                  title="Change PFP & Details"
                >
                  <Camera size={16} />
                </button>
              )}
            </div>

            <div className="space-y-2 w-full">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{customProfile.displayName || user?.name || 'Indian Nomad'}</h2>
                {isOwnProfile && (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="p-2 rounded-xl bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/20 text-neutral-800 dark:text-white transition-all text-xs flex items-center gap-1 font-bold"
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>
                )}
              </div>
              <p className="text-xs font-bold text-[#D45B0C] dark:text-[#FFB347] tracking-wider uppercase">@{customProfile.username || 'travel_writer'}</p>

              {customProfile.city && (
                <p className="text-xs text-neutral-600 dark:text-white/70 font-bold flex items-center gap-1.5 pt-1">
                  <MapPin size={14} className="text-rose-500" />
                  <span>{customProfile.city}</span>
                </p>
              )}
            </div>

            {/* About Section */}
            <div className="pt-6 mt-6 border-t border-neutral-200 dark:border-white/10 w-full">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-neutral-400 dark:text-white/40 mb-2">About Me</h4>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 font-normal leading-relaxed">
                {customProfile.about || 'No travel bio provided yet. Click Edit to share your journey!'}
              </p>
            </div>

            {/* Socials Links Section */}
            <div className="pt-6 mt-6 border-t border-neutral-200 dark:border-white/10 w-full space-y-3">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-neutral-400 dark:text-white/40 mb-3">Verified Socials</h4>

              <div className="flex flex-wrap gap-2.5">
                {customProfile.socials?.instagram && (
                  <a
                    href={`https://instagram.com/${customProfile.socials.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border border-pink-500/30 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    <InstagramIcon size={14} className="text-white" />
                    <span>Instagram</span>
                  </a>
                )}

                {customProfile.socials?.twitter && (
                  <a
                    href={`https://x.com/${customProfile.socials.twitter.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-900 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    <TwitterIcon size={14} className="text-white" />
                    <span>X.com</span>
                  </a>
                )}

                {customProfile.socials?.facebook && (
                  <a
                    href={`https://facebook.com/${customProfile.socials.facebook}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 border border-blue-500/30 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    <FacebookIcon size={14} className="text-white" />
                    <span>Facebook</span>
                  </a>
                )}

                {customProfile.socials?.youtube && (
                  <a
                    href={customProfile.socials.youtube.startsWith('http') ? customProfile.socials.youtube : `https://${customProfile.socials.youtube}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 border border-rose-500/30 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    <YoutubeIcon size={14} className="text-white" />
                    <span>YouTube</span>
                  </a>
                )}

                {customProfile.socials?.website && (
                  <a
                    href={customProfile.socials.website.startsWith('http') ? customProfile.socials.website : `https://${customProfile.socials.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/20 border border-neutral-300 dark:border-white/20 text-neutral-800 dark:text-white text-xs font-bold transition-all shadow-xs"
                  >
                    <Globe size={14} className="text-[#D45B0C] dark:text-[#FFD166]" />
                    <span>Website</span>
                  </a>
                )}

                {!customProfile.socials?.instagram && !customProfile.socials?.twitter && !customProfile.socials?.facebook && !customProfile.socials?.youtube && !customProfile.socials?.website && (
                  <p className="text-xs text-neutral-400 dark:text-white/30 font-medium italic">No social media links attached.</p>
                )}
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-neutral-200 dark:border-white/10 w-full space-y-3 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              <div className="flex justify-between items-center">
                <span>Published Stories</span>
                <span className="font-extrabold text-[#FF8A3D]">{userStories.length} Articles</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Trips Planned in India</span>
                <span className="font-extrabold text-neutral-900 dark:text-white">{trips.length} Trips</span>
              </div>
            </div>

          </div>

          {/* Right Section: Published Blogs & Trip History */}
          <div className="lg:col-span-8 flex flex-col space-y-12">

            {/* User Published Travel Blogs Showcase */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2.5">
                  <BookOpen className="text-[#FF8A3D]" size={24} />
                  <span>Travel Stories & Collaborations ({userStories.length})</span>
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  {userStories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllBlogs(!showAllBlogs)}
                      className="text-xs font-black text-[#D45B0C] dark:text-[#FFB347] hover:text-[#FF8A3D] flex items-center gap-1.5 uppercase tracking-wider bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 px-4 py-2 rounded-full border border-[#FF8A3D]/40 transition-all shadow-xs"
                    >
                      <span>{showAllBlogs ? 'Show Less' : 'View All →'}</span>
                    </button>
                  )}
                  {isOwnProfile && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowDrafts(true)}
                        className="text-xs font-black text-neutral-500 dark:text-[#6B7280] hover:text-[#FF8A3D] flex items-center gap-1.5 uppercase tracking-wider bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 px-4 py-2 rounded-full border border-neutral-300 dark:border-neutral-700 transition-all shadow-xs"
                      >
                        <FileText size={13} />
                        <span>View Drafts ({drafts.length}/50)</span>
                      </button>
                      <Link
                        href="/blog/write"
                        className="text-xs font-black text-[#1F2937] flex items-center gap-1.5 uppercase tracking-wider bg-[#FF8A3D] hover:bg-[#FFB347] px-4 py-2 rounded-full transition-all shadow-md"
                      >
                        <Edit2 size={13} />
                        <span>Share Story</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {userStories.length === 0 ? (
                <div className="p-10 rounded-3xl bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-white/10 text-center">
                  <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400 mb-4">No published Indian travel stories yet.</p>
                  {isOwnProfile && (
                    <Link
                      href="/blog/write"
                      className="px-6 py-3 rounded-2xl bg-[#FF8A3D] text-[#1F2937] font-black text-xs uppercase tracking-wider inline-block"
                    >
                      Write First Story Now
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(showAllBlogs ? userStories : userStories.slice(0, 4)).map((story) => (
                    <div
                      key={story.id}
                      onClick={() => router.push(`/blog/u/${encodeURIComponent(story.author.username)}/${story.slug || story.id}`)}
                      className="group cursor-pointer p-5 rounded-3xl bg-white dark:bg-neutral-900/80 border border-neutral-200 dark:border-white/10 hover:border-[#FF8A3D]/60 transition-all flex flex-col justify-between shadow-sm dark:shadow-lg"
                    >
                      <div>
                        <div className="h-44 w-full rounded-2xl overflow-hidden mb-4 relative bg-neutral-100 dark:bg-neutral-800">
                          {story.videoUrl && (story.mediaType === 'article' || story.videoUrl.match(/\\.(mp4|webm|ogg)$/i)) ? (
                            <video
                              src={story.videoUrl}
                              autoPlay loop muted playsInline
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <img src={story.imageUrl} alt={story.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          )}
                          <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-white font-bold text-[11px] uppercase tracking-wider">
                            📍 {story.city || 'India'}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-lg text-neutral-900 dark:text-white group-hover:text-[#D45B0C] dark:group-hover:text-[#FFB347] transition-colors line-clamp-2 mb-2">
                          {story.title}
                        </h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-normal line-clamp-2">
                          {story.excerpt}
                        </p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-neutral-200 dark:border-white/10 flex items-center justify-between text-xs font-bold text-neutral-500 dark:text-neutral-400">
                        <span>{story.date}</span>
                        <span className="text-[#FF8A3D] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Read Dispatch →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PlanBro Wrapped Section */}
            {isOwnProfile && (
              <div className="border border-white/10 rounded-3xl p-6 lg:p-8 bg-gradient-to-br from-[#121A3F] to-[#0A0E27] relative group">
                <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                  <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#FF3D7F] rounded-full blur-[100px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
                  <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-[#F5B942] rounded-full blur-[100px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
                </div>

                <div className="relative z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                      PlanBro Wrapped
                    </h3>
                    <p className="text-sm font-light text-white/60 mt-1">Discover your AI travel persona, favorite Indian cuisine trails, and exploration stats.</p>
                  </div>

                  <button
                    onClick={() => router.push('/wrapped')}
                    className="h-12 px-8 bg-gradient-to-r from-[#FF3D7F] to-[#F5B942] text-white font-black text-xs uppercase tracking-widest rounded-full hover:scale-105 transition-all shadow-lg shrink-0 flex items-center justify-center gap-2"
                  >
                    <span>View Wrapped</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Mission History Section */}
            {isOwnProfile && (
              <div>
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
                  <Compass className="text-[#FF8A3D] dark:text-[#FFD166]" />
                  <span>My Indian Itineraries ({trips.length})</span>
                </h3>

                {loadingTrips ? (
                  <div className="p-12 text-center text-neutral-400 dark:text-white/40 border border-neutral-200 dark:border-white/10 rounded-2xl animate-pulse font-light">
                    Loading trip itineraries...
                  </div>
                ) : trips.length === 0 ? (
                  <div className="p-12 text-center border border-neutral-200 dark:border-white/10 rounded-3xl space-y-4">
                    <History size={36} className="mx-auto text-neutral-300 dark:text-white/20" />
                    <p className="text-sm text-neutral-500 dark:text-white/60 font-light">No Indian trips planned yet. Our AI planner can build your next Spiti or Goa itinerary in 10 seconds.</p>
                    <button
                      onClick={() => router.push('/plan/setup')}
                      className="h-10 px-6 bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-widest rounded-full hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors inline-block"
                    >
                      Plan Your First Trip
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {trips.map((trip, i) => {
                      const snap = trip.snapshot as any;
                      return (
                        <div
                          key={trip.id || i}
                          onClick={() => handleTripClick(trip)}
                          className="p-6 bg-white dark:bg-[#121212] hover:bg-neutral-50 dark:hover:bg-[#181818] border border-neutral-200 dark:border-white/10 rounded-3xl transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group shadow-sm dark:shadow-none"
                        >
                          <div className="flex items-center gap-6">
                            <span className="text-2xl font-extrabold text-neutral-300 dark:text-white/20 group-hover:text-[#FF8A3D] transition-colors">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <div>
                              <h4 className="text-2xl font-light text-neutral-900 dark:text-white">{trip.destination}</h4>
                              <p className="text-[10px] text-neutral-400 dark:text-white/40 font-bold uppercase tracking-widest mt-1">
                                Created {new Date(trip.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-8 md:gap-12">
                            <div className="hidden sm:flex items-center gap-6">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/blog/write?title=${encodeURIComponent(`Trip to ${trip.destination}`)}&city=${encodeURIComponent(trip.destination)}`);
                                }}
                                className="text-neutral-400 dark:text-white/40 hover:text-[#FF8A3D] transition-colors"
                                title="Write a Blog About This Trip"
                              >
                                <PenTool size={18} />
                              </button>
                              <div>
                                <p className="text-[10px] text-neutral-400 dark:text-white/40 font-bold uppercase tracking-widest mb-1">Travelers</p>
                                <p className="text-lg font-light text-neutral-900 dark:text-white">{snap.passengers?.length || 0}</p>
                              </div>
                            </div>
                            <div className="hidden sm:block">
                              <p className="text-[10px] text-neutral-400 dark:text-white/40 font-bold uppercase tracking-widest mb-1">Budget Expended</p>
                              <p className="text-lg font-light text-neutral-900 dark:text-white">₹{snap.budget?.spent?.toLocaleString('en-IN') || 0}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); setTripToDelete(trip.id); }}
                                className="text-red-500/60 dark:text-red-500/50 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-2 rounded-full transition-all"
                                title="Delete Trip"
                              >
                                <Trash2 size={18} />
                              </button>
                              <ChevronRight size={20} className="text-neutral-300 dark:text-white/20 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Edit Profile & Socials Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveProfile}
            className="bg-white dark:bg-[#141414] border-2 border-[#FF8A3D]/40 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 text-left max-h-[90vh] overflow-y-auto my-auto"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/10 pb-4">
              <h3 className="text-2xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                <Edit2 size={20} className="text-[#FF8A3D]" />
                <span>Customize Identity & Socials</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400"
              >
                <X size={20} />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase text-neutral-500 dark:text-neutral-400 mb-1">Display Name *</label>
              <input
                type="text"
                value={editForm.displayName}
                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/20 text-neutral-900 dark:text-white font-bold text-sm focus:border-[#FF8A3D] focus:outline-none"
              />
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-2 font-medium">Your handle is @{customProfile.username} — set from your account and can&apos;t be changed here.</p>
            </div>

            {/* Avatar / Profile Picture */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-neutral-500 dark:text-neutral-400 mb-3">Avatar / Profile Picture</label>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border-2 border-[#FF8A3D] shadow-md relative group">
                  <img src={editForm.pfp || customProfile.pfp || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'} alt="Current PFP" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera size={18} className="text-white" />
                  </div>
                </div>
                <div className="flex-1 flex gap-2 w-full">
                  <div className="flex-1">
                    <input
                      type="url"
                      value={editForm.pfp}
                      onChange={(e) => setEditForm({ ...editForm, pfp: e.target.value })}
                      placeholder="Paste image URL here..."
                      className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/20 text-neutral-600 dark:text-neutral-300 font-medium text-xs focus:border-[#FF8A3D] focus:outline-none"
                    />
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-2 font-medium">Use a direct link or upload an image.</p>
                  </div>
                  <div className="relative overflow-hidden flex items-center justify-center bg-[#FF8A3D] hover:bg-[#D45B0C] text-[#1F2937] hover:text-white rounded-xl px-4 h-11 text-xs font-black uppercase tracking-widest shrink-0 cursor-pointer transition-colors">
                    Upload
                    <input type="file" accept="image/*" className="absolute left-0 top-0 opacity-0 cursor-pointer h-full w-full" onChange={handlePfpUpload} />
                  </div>
                </div>
              </div>
            </div>

            {/* About & City */}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-neutral-500 dark:text-neutral-400 mb-1">About Me (Optional)</label>
                <textarea
                  rows={3}
                  value={editForm.about}
                  onChange={(e) => setEditForm({ ...editForm, about: e.target.value })}
                  placeholder="Tell fellow travelers about your travel experiences in India..."
                  className="w-full p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/20 text-neutral-800 dark:text-neutral-200 font-normal text-sm focus:border-[#FF8A3D] focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-neutral-500 dark:text-neutral-400 mb-1">Your City / Location in India (Optional)</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-500" size={16} />
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    placeholder="e.g. Mumbai, Bangalore, Delhi, Jaipur"
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/20 text-neutral-900 dark:text-white font-medium text-sm focus:border-[#FF8A3D] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Social Links Form */}
            <div className="pt-4 border-t border-neutral-200 dark:border-white/10">
              <label className="block text-xs font-black uppercase tracking-wider text-[#D45B0C] dark:text-[#FFB347] mb-3">Attach Social Media Links (Optional)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400">Instagram Handle</span>
                  <input
                    type="text"
                    value={editForm.socials?.instagram || ''}
                    onChange={(e) => setEditForm({ ...editForm, socials: { ...editForm.socials, instagram: e.target.value } })}
                    placeholder="planbro"
                    className="w-full h-10 px-3 mt-1 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/15 text-neutral-900 dark:text-white text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400">X (Twitter) Handle</span>
                  <input
                    type="text"
                    value={editForm.socials?.twitter || ''}
                    onChange={(e) => setEditForm({ ...editForm, socials: { ...editForm.socials, twitter: e.target.value } })}
                    placeholder="PlanBro"
                    className="w-full h-10 px-3 mt-1 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/15 text-neutral-900 dark:text-white text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400">Facebook Name</span>
                  <input
                    type="text"
                    value={editForm.socials?.facebook || ''}
                    onChange={(e) => setEditForm({ ...editForm, socials: { ...editForm.socials, facebook: e.target.value } })}
                    placeholder="PlanBro"
                    className="w-full h-10 px-3 mt-1 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/15 text-neutral-900 dark:text-white text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400">YouTube Channel Link</span>
                  <input
                    type="text"
                    value={editForm.socials?.youtube || ''}
                    onChange={(e) => setEditForm({ ...editForm, socials: { ...editForm.socials, youtube: e.target.value } })}
                    placeholder="youtube.com/@..."
                    className="w-full h-10 px-3 mt-1 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/15 text-neutral-900 dark:text-white text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 font-bold text-xs uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A3D] via-[#FFB347] to-[#FFD166] text-[#1F2937] font-black text-xs uppercase tracking-wider shadow-lg hover:scale-105 transition-all"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Drafts Modal */}
      {showDrafts && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={() => setShowDrafts(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 dark:text-white/50 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
              <FileText className="text-[#FF8A3D]" /> Your Saved Drafts
            </h2>
            <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-6">
              You have used {drafts.length} out of 50 available draft slots.
            </p>

            {drafts.length === 0 ? (
              <div className="text-center p-8 bg-neutral-50 dark:bg-white/5 rounded-2xl border border-neutral-200 dark:border-white/10">
                <p className="text-neutral-500 dark:text-neutral-400 font-bold mb-4">You don't have any drafts yet.</p>
                <Link
                  href="/blog/write"
                  className="px-6 py-2.5 rounded-xl bg-[#FF8A3D] text-[#1F2937] font-black text-xs uppercase tracking-wider inline-block hover:scale-105 transition-transform"
                >
                  Start Writing
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {drafts.map(draft => (
                  <div key={draft.id} className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:border-[#FF8A3D]/40 transition-colors flex items-center justify-between group">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-bold text-neutral-900 dark:text-white text-base truncate">
                        {draft.title || 'Untitled Draft'}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-xs font-bold text-neutral-500 dark:text-neutral-400">
                        <span>{draft.category || 'No Category'}</span>
                        <span>•</span>
                        <span>{draft.city || 'No Location'}</span>
                        <span>•</span>
                        <span>Last saved: {new Date(draft.lastSaved).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/blog/write?draftId=${draft.id}`}
                        className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-white/10 hover:bg-[#FF8A3D] hover:text-[#1F2937] text-neutral-800 dark:text-white font-black text-xs uppercase transition-all"
                      >
                        Resume
                      </Link>
                      <button
                        onClick={() => {
                          const newDrafts = drafts.filter(d => d.id !== draft.id);
                          setDrafts(newDrafts);
                          localStorage.setItem('brewplans_drafts', JSON.stringify(newDrafts));
                        }}
                        className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                        title="Delete draft"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />

      {/* Delete Confirmation Modal */}
      {tripToDelete && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141414] border border-neutral-200 dark:border-[#333] rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Delete Trip</h3>
            <p className="text-sm text-neutral-500 dark:text-zinc-400 mb-8">Are you sure you want to delete this trip? This action cannot be undone.</p>

            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setTripToDelete(null)}
                className="flex-1 py-3 px-4 bg-neutral-100 dark:bg-[#222] hover:bg-neutral-200 dark:hover:bg-[#333] text-neutral-800 dark:text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-colors flex justify-center items-center gap-2"
              >
                <X size={16} className="text-red-500" /> Cancel
              </button>
              <button
                onClick={() => executeDeleteTrip(tripToDelete)}
                className="flex-1 py-3 px-4 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-500 font-bold text-xs uppercase tracking-widest rounded-xl transition-colors flex justify-center items-center gap-2"
              >
                <Check size={16} className="text-green-600 dark:text-green-500" /> Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INCOMING COMPANION & COLLABORATION REQUESTS MODAL (#3) */}
      {isRequestsModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141414] border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 text-left relative overflow-hidden animate-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                  <Check size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">
                    Incoming Companion Requests
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                    Co-author invites from fellow travel writers
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRequestsModalOpen(false)}
                className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
              {collabRequests.filter(r => r.status === 'pending').length === 0 ? (
                <div className="p-8 text-center bg-neutral-50 dark:bg-white/5 rounded-2xl border border-neutral-200 dark:border-white/10">
                  <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400">No pending requests right now.</p>
                </div>
              ) : (
                collabRequests.filter(r => r.status === 'pending').map((req) => (
                  <div key={req.id} className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-left">
                      <img src={req.avatar || "https://commons.wikimedia.org/wiki/Special:FilePath/Profile_avatar_placeholder_large.png?width=100"} alt={req.fromUser} className="w-11 h-11 rounded-full object-cover ring-2 ring-[#FF8A3D]/40 shrink-0" />
                      <div>
                        <p className="text-xs font-black text-neutral-900 dark:text-white">
                          <span className="text-[#D45B0C] dark:text-[#FFB347]">@{req.fromUser}</span> invited you on:
                        </p>
                        <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-300 line-clamp-1 mt-0.5">
                          &ldquo;{req.articleTitle}&rdquo;
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleApproveCollab(req.id, req.articleSlug, req.articleTitle)}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1"
                      >
                        <Check size={14} />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineCollab(req.id)}
                        className="px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-neutral-600 dark:text-neutral-300 hover:text-rose-600 dark:hover:text-rose-300 font-bold text-xs transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end border-t border-neutral-200 dark:border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setIsRequestsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-bold text-xs uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] bg-white dark:bg-[#111] border border-green-500/40 shadow-2xl shadow-green-500/10 text-green-600 dark:text-green-400 px-6 py-3.5 rounded-full flex items-center gap-3 animate-in fade-in slide-in-from-bottom-8 duration-300">
          <Check size={18} />
          <span className="text-xs sm:text-sm font-bold tracking-wide">Profile & Socials Updated Successfully!</span>
        </div>
      )}
    </AppShell>
  );
}
