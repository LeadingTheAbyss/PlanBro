'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Compass, Image as ImageIcon, MapPin, Tag, Plus, 
  Trash2, Sliders, Users, Check, Send, Sparkles, DollarSign, 
  Calendar, Home, Navigation as NavIcon, PenTool, Upload, Eye, Type, FileText, X, Globe, Zap, Cloud, CloudCheck, CloudFog, CloudOff
} from 'lucide-react';
import Link from 'next/link';
import { BlogNavbar } from '@/components/blog/BlogNavbar';
import { BlogFooter } from '@/components/blog/BlogFooter';
import { RichBlogEditor } from '@/components/blog/RichBlogEditor';
import { CustomDropdown } from '@/components/blog/CustomDropdown';
import LocationAutocomplete from '@/components/LocationAutocomplete';
import { CATEGORIES, ItineraryStop, Article, ARTICLES, FEATURED_ARTICLE } from '@/data/blogData';
import { isAdminEmail } from '@/lib/admin';
import { useAuthStore } from '@/store/authStore';
import { readUserProfile } from '@/lib/profileStorage';

const BUDGET_FILTER_OPTIONS = [
  { label: 'All Budgets', value: 'All' },
  { label: '₹ Budget Explorer (< ₹8,000)', value: 'Budget Explorer (< ₹8,000)' },
  { label: '₹₹ Comfort Holiday (₹8k - ₹25k)', value: 'Comfort Holiday (₹8k - ₹25k)' },
  { label: '₹₹₹ Boutique & Heritage (₹25k+)', value: 'Boutique & Heritage (₹25k+)' },
];

const SEASON_FILTER_OPTIONS = [
  { label: 'Any Season', value: 'All' },
  { label: 'Monsoon Greenery (July - Sept)', value: 'Monsoon Greenery' },
  { label: 'Winter Sunshine (Oct - Feb)', value: 'Winter Sunshine' },
  { label: 'Summer Mountain Escape (March - June)', value: 'Summer Mountain Escape' },
];

const STAY_FILTER_OPTIONS = [
  { label: 'Any Accommodations', value: 'All' },
  { label: 'Homestays & Eco-Cottages', value: 'Homestays & Eco-Cottages' },
  { label: 'Heritage Havellis & Palaces', value: 'Heritage Havellis & Palaces' },
  { label: 'Backpacker Hostels & Camps', value: 'Backpacker Hostels & Camps' },
];

const TRANSIT_FILTER_OPTIONS = [
  { label: 'Any Transit Mode', value: 'All' },
  { label: 'Scenic Indian Railways & Express Trains', value: 'Scenic Indian Railways' },
  { label: 'Self-Drive Roadtrip (Car / Bike)', value: 'Self-Drive Roadtrip' },
  { label: 'Regional Flight & Electric Cabs', value: 'Regional Flight & Cabs' },
];

const PRESET_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1200&q=80', label: 'Goan Coastal Cove' },
  { url: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80', label: 'Spiti Himalayan Monastery' },
  { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', label: 'Misty Western Ghats' },
  { url: 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=1200&q=80', label: 'Kerala Backwaters Palm' },
  { url: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80', label: 'Rajasthan Heritage Fortress' },
  { url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80', label: 'Rishikesh Ganga Valley' },
];

export default function WriteBlogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  
  // Redirect to login if not logged in
  useEffect(() => {
    if (user === null) {
      // Give it a moment to hydrate
      const t = setTimeout(() => {
        if (!useAuthStore.getState().user) {
          router.push('/login?redirect=/blog/write');
        }
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [user, router]);
  const editId = searchParams ? searchParams.get('edit') : null;
  const [editingId, setEditingId] = useState<string | null>(null);

  // Primary Editorial State
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('Offbeat Valleys');
  const [imageUrl, setImageUrl] = useState(PRESET_IMAGES[1].url);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('Indian Explorer');
  const [username, setUsername] = useState('indian_traveler');
  const [customAvatar, setCustomAvatar] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80');

  // Format & Video State (Item 8)
  const [mediaType, setMediaType] = useState<'article' | 'upload' | 'youtube'>('article');
  const [videoUrl, setVideoUrl] = useState('');

  // Admin handle detection (Item 15)
  const [isAdmin, setIsAdmin] = useState(false);
  const [featuredOrder, setFeaturedOrder] = useState<number>(0);

  // Optional Filters & Collab
  const [budget, setBudget] = useState('');
  const [season, setSeason] = useState('');
  const [stay, setStay] = useState('');
  const [transit, setTransit] = useState('');
  const [collabUsername, setCollabUsername] = useState('');

  // UI Tabs & Toggles
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'cover' | 'location' | 'map' | 'meta' | 'collab' | 'admin'>('none');
  const [editorMode, setEditorMode] = useState<'rich' | 'markdown'>('rich');
  const [photoMode, setPhotoMode] = useState<'presets' | 'upload'>('presets');
  
  // Interactive Map Stops
  const [stops, setStops] = useState<ItineraryStop[]>([]);

  const [publishing, setPublishing] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [collabSentNotice, setCollabSentNotice] = useState<string | null>(null);
  const [isSmartFilling, setIsSmartFilling] = useState(false);

  // Drafts & Words
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...'>('Saved');
  const [draftId, setDraftId] = useState<string>('');

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedProfile = readUserProfile(user?.id);
        const savedUser = localStorage.getItem('brewplans_user');
        let currentUsername = user?.username || 'indian_traveler';
        let currentDisplayName = user?.name || 'Indian Explorer';
        let currentIsAdmin = false;

        if (savedProfile) {
          const parsed = savedProfile;
          if (parsed.username) currentUsername = parsed.username;
          if (parsed.displayName) currentDisplayName = parsed.displayName;
          if (parsed.pfp) setCustomAvatar(parsed.pfp);
          if (parsed.isAdmin) currentIsAdmin = true;
        } else if (savedUser) {
          const parsed = JSON.parse(savedUser);
          if (parsed.username) currentUsername = parsed.username;
          if (parsed.name || parsed.fullName) currentDisplayName = parsed.name || parsed.fullName;
          if (parsed.picture) setCustomAvatar(parsed.picture);
          if (parsed.isAdmin) currentIsAdmin = true;
        }

        if (isAdminEmail(user?.email)) {
          currentIsAdmin = true;
        }

        setUsername(currentUsername);
        setAuthorName(currentDisplayName);
        setIsAdmin(currentIsAdmin);
      } catch (e) {}

      // 2. If editing existing article, pre-fill all fields
      if (editId) {
        (async () => {
          try {
            const fetchRes = await fetch(`/api/blogs/${editId}`);
            let customBlogs: Article[] = [];
            if (fetchRes.ok) {
              customBlogs = [await fetchRes.json()];
            }
            const allArticles = [...customBlogs, ...ARTICLES, FEATURED_ARTICLE];
            const target = allArticles.find(a => a?.id === editId || a?.slug === editId);
            if (target) {
              setEditingId(target.id || target.slug);
              setTitle(target.title || '');
              setCity(target.city || '');
              setCategory(target.category || 'Offbeat Valleys');
              setImageUrl(target.imageUrl || 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1200&q=80');
              if (target.imageUrls) setImageUrls(target.imageUrls);
              setContent(target.content || '');
              if (target.mediaType) setMediaType(target.mediaType as any);
              if (target.videoUrl) setVideoUrl(target.videoUrl);
              if (target.author?.name) setAuthorName(target.author.name);
              if (target.author?.username) setUsername(target.author.username);
              if (target.author?.avatar) setCustomAvatar(target.author.avatar);
              if (target.featuredOrder) setFeaturedOrder(target.featuredOrder);
              if (target.itineraryStops && target.itineraryStops.length > 0) setStops(target.itineraryStops);
              if (target.budget) setBudget(target.budget);
              if (target.bestSeason) setSeason(target.bestSeason);
              if (target.accommodation) setStay(target.accommodation);
              if (target.transportMode) setTransit(target.transportMode);
            }
          } catch(e) {
            console.error(e);
          }
        })();
      } else {
        // If not editing an existing published post, see if there's a draft query
        const urlParams = new URLSearchParams(window.location.search);
        const did = urlParams.get('draftId');
        if (did) {
          try {
            const drafts = JSON.parse(localStorage.getItem('brewplans_drafts') || '[]');
            const draft = drafts.find((d: any) => d.id === did);
            if (draft) {
              setDraftId(draft.id);
              setTitle(draft.title || '');
              setCity(draft.city || '');
              setCategory(draft.category || 'Offbeat Valleys');
              setImageUrl(draft.imageUrl || PRESET_IMAGES[1].url);
              if (draft.imageUrls) setImageUrls(draft.imageUrls);
              setContent(draft.content || '');
              if (draft.mediaType) setMediaType(draft.mediaType);
              if (draft.videoUrl) setVideoUrl(draft.videoUrl);
              if (draft.featuredOrder !== undefined) setFeaturedOrder(draft.featuredOrder);
              if (draft.stops) setStops(draft.stops);
              if (draft.budget) setBudget(draft.budget);
              if (draft.season) setSeason(draft.season);
              if (draft.stay) setStay(draft.stay);
              if (draft.transit) setTransit(draft.transit);
            }
          } catch (e) {}
        } else {
          setDraftId(`draft-${Date.now()}`);
        }
      }
    }
  }, [editId, user?.id, user?.email]);

  // Auto-save Draft
  useEffect(() => {
    if (typeof window === 'undefined' || !draftId) return;
    
    const safeStringify = (data: any) => {
      const str = JSON.stringify(data);
      // aggressively strip out massive base64 images to prevent quota errors
      return str.replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g, 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1200&q=80');
    };

    const saveDraft = () => {
      setSaveStatus('Saving...');
      try {
        // Sanitize the existing drafts when reading to clean up old corruption
        const rawDrafts = localStorage.getItem('brewplans_drafts') || '[]';
        const cleanRawDrafts = rawDrafts.replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g, 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1200&q=80');
        const drafts = JSON.parse(cleanRawDrafts);

        const updatedDraft = {
          id: draftId,
          title,
          city,
          category,
          imageUrl: imageUrl && imageUrl.startsWith('data:image') ? 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1200&q=80' : imageUrl,
          imageUrls,
          content,
          mediaType,
          videoUrl,
          featuredOrder,
          stops,
          budget,
          season,
          stay,
          transit,
          lastSaved: Date.now()
        };
        
        const index = drafts.findIndex((d: any) => d.id === draftId);
        
        if (index > -1) {
          drafts[index] = updatedDraft;
        } else {
          if (drafts.length >= 50) {
            throw new Error('Draft limit reached (Max 50 drafts)');
          }
          drafts.push(updatedDraft);
        }
        
        localStorage.setItem('brewplans_drafts', safeStringify(drafts));
        
        // Update URL so a refresh doesn't lose the draft ID
        if (!editId && typeof window !== 'undefined') {
          const newUrl = new URL(window.location.href);
          if (!newUrl.searchParams.has('draftId')) {
            newUrl.searchParams.set('draftId', draftId);
            window.history.replaceState({}, '', newUrl.toString());
          }
        }
        
        setTimeout(() => setSaveStatus('Saved'), 1000);
      } catch (e: any) {
        console.error('Failed to save draft:', e);
        setTimeout(() => setSaveStatus(e.message === 'Draft limit reached (Max 50 drafts)' ? 'Error Saving (Max 50 Drafts)' as any : 'Error Saving (Image too large?)' as any), 1000);
      }
    };

    const handler = setTimeout(saveDraft, 2000);
    return () => clearTimeout(handler);
  }, [title, city, category, imageUrl, content, mediaType, videoUrl, stops, budget, season, stay, transit, draftId, editId]);

  const handleToggleDrawer = (drawer: 'cover' | 'location' | 'map' | 'meta' | 'collab' | 'admin') => {
    if (activeDrawer === drawer) setActiveDrawer('none');
    else setActiveDrawer(drawer);
  };

  const handleAddStop = () => {
    setStops([...stops, {
      day: stops.length + 1,
      title: `Day ${stops.length + 1} Excursion`,
      location: city || 'Indian Destination',
      description: 'Describe scenic route tips, sunset viewpoints, or local cuisine...'
    }]);
  };

  const handleUpdateStop = (index: number, field: keyof ItineraryStop, value: string | number) => {
    const updated = [...stops];
    updated[index] = { ...updated[index], [field]: value };
    setStops(updated);
  };

  const handleRemoveStop = (index: number) => {
    if (stops.length <= 1) return;
    setStops(stops.filter((_, idx) => idx !== index).map((stop, i) => ({ ...stop, day: i + 1 })));
  };

  const handleSmartFill = async () => {
    setIsSmartFilling(true);
    try {
      const res = await fetch('/api/admin/smart-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, city, category, content })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (data.budget) setBudget(data.budget);
        if (data.season) setSeason(data.season);
        if (data.stay) setStay(data.stay);
        if (data.transit) setTransit(data.transit);
        if (data.city) setCity(data.city);
        if (data.category) setCategory(data.category);
        if (data.stops && data.stops.length > 0) {
          setStops(data.stops.map((s: any) => ({
            day: s.day,
            title: s.title,
            location: s.location,
            description: s.description,
            coordinates: s.lat && s.lng ? { lat: s.lat, lng: s.lng } : undefined
          })));
        }
      } else {
        alert(data.error || "Failed to run Smart Fill.");
      }
    } catch(e) {
      console.error(e);
      alert("Network error while trying to run Smart Fill.");
    }
    setIsSmartFilling(false);
  };

  const uploadFileToR2 = async (file: File) => {
    try {
      const presignRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type })
      });
      const presignData = await presignRes.json();
      
      if (!presignRes.ok) {
        alert(presignData.error || 'Failed to get upload URL');
        return null;
      }

      const uploadRes = await fetch(presignData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        alert('Failed to upload file to storage bucket');
        return null;
      }
      return presignData;
    } catch (err) {
      console.error(err);
      alert('Upload failed due to network error.');
      return null;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploadingMedia(true);
    const newUrls = [...imageUrls];
    let newVideoUrl = videoUrl;

    for (let i = 0; i < files.length; i++) {
      const data = await uploadFileToR2(files[i]);
      if (data) {
        if (data.type === 'video') {
          newVideoUrl = data.publicUrl;
        } else {
          newUrls.push(data.publicUrl);
        }
      }
    }

    if (newUrls.length > 0) {
      setImageUrls(newUrls);
      setImageUrl(newUrls[0]);
    }
    if (newVideoUrl) {
      setVideoUrl(newVideoUrl);
    }
    setIsUploadingMedia(false);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedia(true);
    const data = await uploadFileToR2(file);
    if (data) {
      if (data.type === 'video') {
        setVideoUrl(data.publicUrl);
      } else {
        setImageUrl(data.publicUrl);
        setVideoUrl('');
      }
    }
    setIsUploadingMedia(false);
  };

  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      let file: File | null = null;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          file = items[i].getAsFile();
          break;
        }
      }
      
      if (!file) return;
      
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.closest('[contenteditable="true"]')) {
        return; 
      }

      setIsUploadingMedia(true);
      const data = await uploadFileToR2(file);
      if (data) {
        setImageUrl(data.publicUrl);
      }
      setIsUploadingMedia(false);
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      alert('Please enter a title!');
      return;
    }

    setPublishing(true);
    let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!slug) slug = `post-${Date.now()}`;
    const cleanedCollab = collabUsername.trim().replace('@', '');

    let generatedExcerpt = title;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const firstText = parsed.find(b => b.type === 'paragraph' || b.type === 'quote');
          if (firstText && firstText.content) {
             generatedExcerpt = firstText.content.substring(0, 160) + '...';
          } else {
             generatedExcerpt = title;
          }
        } else {
          generatedExcerpt = content.substring(0, 160) + '...';
        }
      } catch(e) {
        generatedExcerpt = content.substring(0, 160) + '...';
      }
    }

    const matchedCategory = CATEGORIES.find(c => c.label === category) || CATEGORIES.find(c => c.slug !== 'all') || CATEGORIES[0];

    const newArticle = {
      id: editingId || `blog-${Date.now()}`,
      slug,
      title,
      excerpt: generatedExcerpt,
      content,
      mediaType,
      videoUrl: videoUrl.trim() || undefined,
      category,
      categoryIcon: matchedCategory?.icon || '🌍',
      categoryBadgeBg: matchedCategory?.bg || 'bg-gray-100',
      categoryBadgeText: matchedCategory?.text || 'text-gray-800',
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1200&q=80',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      readingTime: mediaType !== 'article' ? `${mediaType === 'upload' ? 'Media Upload' : 'Video'}` : `${Math.max(1, Math.ceil((content || '').split(' ').length / 150))} min read`,
      author: {
        name: authorName || 'Indian Explorer',
        username: username || 'indian_explorer',
        avatar: customAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName || username || 'Indian Explorer')}&background=random&color=fff&size=100`
      },
      city: city || 'Goa & Western Ghats',
      likes: 1,
      commentsCount: 0,
      featuredOrder: isAdmin ? featuredOrder : 0,
      timesPlanned: 1,
      itineraryStops: stops,
      budget: budget || undefined,
      bestSeason: season || undefined,
      accommodation: stay || undefined,
      transportMode: transit || undefined,
      collaborator: cleanedCollab || undefined,
      collabStatus: cleanedCollab ? 'pending' : undefined
    };

    const safeStringify = (data: any) => {
      const str = JSON.stringify(data);
      return str.replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g, 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1200&q=80');
    };

    try {
      const payload = JSON.parse(safeStringify(newArticle));
      if (editingId) {
        await fetch(`/api/blogs/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('/api/blogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
    } catch (err) {
      console.error('Failed to save blog:', err);
    }

    // Create mock account for admin overriding
    if (isAdmin && username !== (user as any)?.username) {
      try {
        const mockUsers = JSON.parse(localStorage.getItem('brewplans_mock_users') || '[]');
        const existingIdx = mockUsers.findIndex((u: any) => u.username === username);
        const newUserObj = {
          displayName: authorName || username,
          username: username,
          pfp: customAvatar,
          about: `Explorer`,
          city: 'India',
          socials: {}
        };
        if (existingIdx !== -1) mockUsers[existingIdx] = newUserObj;
        else mockUsers.push(newUserObj);
        localStorage.setItem('brewplans_mock_users', JSON.stringify(mockUsers));
      } catch (e) {}
    }

    if (cleanedCollab) {
      const pendingReqs = JSON.parse(localStorage.getItem('brewplans_collab_requests') || '[]');
      pendingReqs.push({
        id: `collab-${Date.now()}`,
        articleSlug: slug,
        articleTitle: title,
        sender: authorName || username,
        recipient: cleanedCollab,
        status: 'pending',
        timestamp: Date.now()
      });
      localStorage.setItem('brewplans_collab_requests', JSON.stringify(pendingReqs));
      setCollabSentNotice(cleanedCollab);
    }

    // Remove from drafts if published successfully
    if (draftId) {
      try {
        const drafts = JSON.parse(localStorage.getItem('brewplans_drafts') || '[]');
        localStorage.setItem('brewplans_drafts', JSON.stringify(drafts.filter((d: any) => d.id !== draftId)));
      } catch (e) {}
    }

    setTimeout(() => {
      setPublishing(false);
      if (!cleanedCollab) {
        router.push(`/blog/u/${encodeURIComponent(newArticle.author.username)}/${encodeURIComponent(newArticle.slug)}`);
      }
    }, 600);
  };

  const categoryOptions = CATEGORIES.filter(c => c.slug !== 'all').map(c => ({
    label: c.label,
    value: c.label,
    icon: c.icon
  }));

  return (
    <div className="min-h-screen bg-[#FFF7F0] text-[#1F2937] font-sans selection:bg-[#FF8A3D]/25 flex flex-col justify-between">
      <BlogNavbar wordCount={wordCount} saveStatus={saveStatus} />

      <main className="max-w-6xl mx-auto px-6 sm:px-12 py-10 w-full">
        
        {/* Top Back Nav & Notice */}
        <div className="flex items-center justify-between mb-6 text-left">
          <Link 
            href="/blog" 
            className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#6B7280] hover:text-[#FF8A3D] transition-colors py-1"
          >
            <ArrowLeft size={14} />
            <span>Back to Community</span>
          </Link>
          
          <div className="flex items-center gap-4">
            {/* Moved wordCount and saveStatus to BlogNavbar */}
          </div>
        </div>

        {/* Collab Success Toast */}
        {collabSentNotice && (
          <div className="mb-8 p-6 rounded-3xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 shadow-xl flex items-center justify-between gap-4 animate-in fade-in zoom-in-95">
            <div>
              <h4 className="font-black text-lg flex items-center gap-2">
                <Check size={22} className="text-emerald-600" />
                <span>Story Published & Collab Invite Sent!</span>
              </h4>
              <p className="text-sm font-medium mt-1">
                An invite has been dispatched to <strong>@{collabSentNotice}</strong>. They can approve it directly from their Profile page!
              </p>
            </div>
            <button
              onClick={() => router.push(`/blog/u/${encodeURIComponent(username)}/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`)}
              className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow shrink-0"
            >
              View Article Now →
            </button>
          </div>
        )}

        {/* ULTRA-MINIMALIST WRITING CANVAS FORM */}
        <form onSubmit={handlePublish} className="text-left space-y-4">
          
          {/* POST FORMAT SELECTOR BAR */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap sm:flex-nowrap items-center p-1.5 rounded-3xl bg-white/60 backdrop-blur-md border border-[#FF8A3D]/20 shadow-sm w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setMediaType('article')}
                className={`flex-1 sm:flex-none px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex justify-center items-center gap-2 ${
                  mediaType === 'article' ? 'bg-white text-[#1F2937] shadow-sm scale-100 ring-1 ring-neutral-200' : 'text-[#6B7280] hover:text-[#4B5563] hover:bg-white/40'
                }`}
              >
                <span className="text-base">📝</span>
                <span>Article</span>
              </button>
              <button
                type="button"
                onClick={() => setMediaType('youtube')}
                className={`flex-1 sm:flex-none px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex justify-center items-center gap-2 ${
                  mediaType === 'youtube' ? 'bg-rose-500 text-white shadow-md scale-100 ring-1 ring-rose-400' : 'text-[#6B7280] hover:text-[#4B5563] hover:bg-white/40'
                }`}
              >
                <span className="text-base">🎥</span>
                <span>YouTube Link</span>
              </button>
            </div>
            {isAdmin && (
              <span className="text-[10px] font-black uppercase tracking-widest text-[#D45B0C] bg-[#FF8A3D]/20 px-3 py-1.5 rounded-full border border-[#FF8A3D]/30 shrink-0">
                👑 Admin Active
              </span>
            )}
          </div>

          {/* TOP ACTION PILLS BAR (Cover | Location | Map | Meta | Collab | Admin) */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-[#FF8A3D]/20 mb-4 select-none">
            
            {/* Left side minimal ghost triggers */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-black text-[#4B5563]">
              {mediaType === 'article' && (
                <>
                  <button 
                    type="button" 
                    onClick={() => handleToggleDrawer('cover')} 
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                      activeDrawer === 'cover' ? 'bg-[#FF8A3D] text-[#1F2937] font-black shadow-sm' : 'hover:bg-[#FFF3E6] hover:text-[#D45B0C]'
                    }`}
                  >
                    <ImageIcon size={15} />
                    <span>Cover {imageUrl ? '✓' : ''}</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleToggleDrawer('map')} 
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                      activeDrawer === 'map' ? 'bg-[#FF8A3D] text-[#1F2937] font-black shadow-sm' : 'hover:bg-[#FFF3E6] hover:text-[#D45B0C]'
                    }`}
                  >
                    <Compass size={15} />
                    <span>Route Map ({stops.length})</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => handleToggleDrawer('meta')} 
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                      activeDrawer === 'meta' ? 'bg-[#FF8A3D] text-[#1F2937] font-black shadow-sm' : 'hover:bg-[#FFF3E6] hover:text-[#D45B0C]'
                    }`}
                  >
                    <Sliders size={15} />
                    <span>Meta Filters</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => handleToggleDrawer('collab')} 
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                      activeDrawer === 'collab' ? 'bg-[#FF8A3D] text-[#1F2937] font-black shadow-sm' : 'hover:bg-[#FFF3E6] hover:text-[#D45B0C]'
                    }`}
                  >
                    <Users size={15} />
                    <span>{collabUsername ? `@${collabUsername.replace('@','')}` : '+ Collab Invite'}</span>
                  </button>

                  <button 
                    type="button" 
                    title="All information is automatically filled based on the contents of the blog"
                    onClick={handleSmartFill} 
                    disabled={isSmartFilling}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black shadow-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Sparkles size={15} /> 
                    <span>{isSmartFilling ? 'Filling...' : 'Smart Fill'}</span>
                  </button>
                </>
              )}
              
              {/* Everyone gets Location */}
              <button 
                type="button" 
                onClick={() => handleToggleDrawer('location')} 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                  activeDrawer === 'location' ? 'bg-[#FF8A3D] text-[#1F2937] font-black shadow-sm' : 'hover:bg-[#FFF3E6] hover:text-[#D45B0C]'
                }`}
              >
                <MapPin size={15} />
                <span>{city ? `City: ${city}` : '+ Destination City & Category'}</span>
              </button>

              {/* ADMIN HANDLE IMPERSONATION / AUTHOR OVERRIDE OPTION (Item 15) */}
              {isAdmin && (
                <button 
                  type="button" 
                  onClick={() => handleToggleDrawer('admin')} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                    activeDrawer === 'admin' ? 'bg-amber-400 text-[#1F2937] font-black shadow-sm' : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                  }`}
                >
                  <Sparkles size={15} />
                  <span>👑 Admin Custom Author (@{username})</span>
                </button>
              )}
            </div>


          </div>

          {/* COLLAPSABLE SETTINGS PANELS (Only shows when user clicks a top pill) */}
          {activeDrawer !== 'none' && (
            <div className="p-6 rounded-3xl bg-white/95 border-2 border-[#FF8A3D]/30 shadow-xl mb-6 relative animate-in slide-in-from-top-2 duration-200">
              <button
                type="button"
                onClick={() => setActiveDrawer('none')}
                className="absolute top-4 right-4 p-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors"
                title="Close drawer"
              >
                <X size={18} />
              </button>

              {/* 1. COVER PHOTO SELECTOR DRAWER */}
              {activeDrawer === 'cover' && (
                <div className="space-y-4 pr-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-3 border-neutral-200">
                    <div>
                      <h4 className="font-black text-base text-[#1F2937]">🖼️ Select Story Cover Banner</h4>
                      <p className="text-xs text-[#6B7280]">Pick from curated Indian travel imagery or upload your photo</p>
                    </div>
                    <div className="flex items-center bg-[#FFF3E6] p-1 rounded-2xl border border-[#FF8A3D]/30 text-xs font-black">
                      <button type="button" onClick={() => setPhotoMode('presets')} className={`px-3 py-1.5 rounded-xl ${photoMode === 'presets' ? 'bg-[#FF8A3D] text-[#1F2937]' : 'text-[#6B7280]'}`}>Preset Gallery</button>
                      <button type="button" onClick={() => setPhotoMode('upload')} className={`px-3 py-1.5 rounded-xl ${photoMode === 'upload' ? 'bg-[#FF8A3D] text-[#1F2937]' : 'text-[#6B7280]'}`}>Upload Device Photo</button>
                    </div>
                  </div>

                  {imageUrl || imageUrls.length > 0 || videoUrl ? (
                    <div className="space-y-3">
                      {videoUrl && (
                        <div className="relative rounded-2xl overflow-hidden shadow-md group bg-black h-40 w-full">
                          <video src={videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button type="button" onClick={() => setVideoUrl('')} className="px-4 py-2 bg-white text-rose-600 rounded-xl font-black text-xs uppercase shadow-lg hover:scale-105 transition-transform">
                              Remove Video
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {(imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : []).map((url, idx) => (
                        <div key={idx} className="relative rounded-2xl overflow-hidden shadow-md group bg-black h-40 w-full">
                          <img src={url} alt="Cover Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button type="button" onClick={() => {
                              const active = imageUrls.length > 0 ? imageUrls : [imageUrl];
                              const newUrls = active.filter((_, i) => i !== idx);
                              setImageUrls(newUrls);
                              setImageUrl(newUrls[0] || '');
                            }} className="px-4 py-2 bg-white text-rose-600 rounded-xl font-black text-xs uppercase shadow-lg hover:scale-105 transition-transform">
                              Remove Image
                            </button>
                          </div>
                        </div>
                      ))}

                      <label className="inline-block px-6 py-2.5 rounded-xl bg-[#FFF3E6] border border-[#FF8A3D]/40 text-[#D45B0C] font-black text-xs uppercase tracking-wider cursor-pointer shadow-sm hover:scale-105 transition-transform w-full text-center">
                        <span>+ Add More Covers (Multiple allowed)</span>
                        <input type="file" accept="image/*,video/mp4,video/webm" multiple onChange={(e) => handleFileUpload(e)} className="hidden" />
                      </label>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {PRESET_IMAGES.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => { setImageUrl(preset.url); setImageUrls([preset.url]); setVideoUrl(''); setActiveDrawer('none'); }}
                          className={`relative rounded-2xl overflow-hidden h-24 border-3 transition-all ${imageUrl === preset.url ? 'border-[#FF8A3D] shadow-lg scale-102' : 'border-transparent opacity-80 hover:opacity-100'}`}
                        >
                          <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                          <span className="absolute bottom-1 left-2 text-[10px] font-black text-white drop-shadow">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {!imageUrl && imageUrls.length === 0 && !videoUrl && (
                    <div 
                      className="p-6 rounded-2xl bg-[#FFF3E6]/60 border-2 border-dashed border-[#FF8A3D]/40 text-center space-y-2 mt-4 hover:bg-[#FFF3E6] transition-colors focus:outline-none"
                      tabIndex={0}
                      onPaste={async (e) => {
                        const items = e.clipboardData?.items;
                        if (!items) return;
                        const files: File[] = [];
                        for (let i = 0; i < items.length; i++) {
                          if (items[i].type.indexOf('image') !== -1 || items[i].type.indexOf('video') !== -1) {
                            const f = items[i].getAsFile();
                            if (f) files.push(f);
                          }
                        }
                        if (files.length > 0) {
                          e.preventDefault();
                          setIsUploadingMedia(true);
                          const newUrls = [...imageUrls];
                          let newVid = videoUrl;
                          for(const file of files) {
                            const data = await uploadFileToR2(file);
                            if(data) {
                              if(data.type === 'video') newVid = data.publicUrl;
                              else newUrls.push(data.publicUrl);
                            }
                          }
                          if(newUrls.length > 0) {
                            setImageUrls(newUrls);
                            setImageUrl(newUrls[0]);
                          }
                          if(newVid) setVideoUrl(newVid);
                          setIsUploadingMedia(false);
                          setActiveDrawer('none');
                        }
                      }}
                    >
                      <Upload size={24} className="mx-auto text-[#D45B0C]" />
                      <div className="font-bold text-sm text-[#1F2937]">Upload high-res photo or video (Max 50 MB)</div>
                      <div className="text-xs text-[#D45B0C] font-black mb-2">Or press Ctrl+V to paste media here</div>
                      <label className="inline-block px-6 py-2.5 rounded-xl bg-[#FF8A3D] text-[#1F2937] font-black text-xs uppercase tracking-wider cursor-pointer shadow hover:scale-105 transition-transform">
                        <span>Select Media (Multiple allowed)...</span>
                        <input type="file" multiple accept="image/*,video/mp4,video/webm" onChange={(e) => { handleFileUpload(e); setActiveDrawer('none'); }} className="hidden" />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* 2. DESTINATION & CATEGORY DRAWER */}
              {activeDrawer === 'location' && (
                <div className="space-y-4 pr-6">
                  <div>
                    <h4 className="font-black text-base text-[#1F2937]">📍 Destination & Category Setup</h4>
                    <p className="text-xs text-[#6B7280]">Tag the exact Indian city/state and choose where your story appears</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    <div>
                      <label className="block text-xs font-black uppercase text-[#D45B0C] mb-1">Indian City or State *</label>
                      <input
                        type="text"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        placeholder="e.g. Goa, Manali, Spiti Valley, Old Delhi, Tawang"
                        className="w-full h-11 px-4 rounded-xl bg-[#FFF7F0] border-2 border-[#FF8A3D]/30 font-bold text-sm text-[#1F2937] focus:outline-none focus:border-[#FF8A3D]"
                      />
                    </div>
                    <div>
                      <CustomDropdown
                        label={<span className="block text-xs font-black uppercase text-[#D45B0C] mb-1">Story Category *</span>}
                        value={category}
                        onChange={setCategory}
                        options={categoryOptions}
                        colorTheme="orange"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. ROUTE MAP PLOTTER DRAWER */}
              {activeDrawer === 'map' && (
                <div className="space-y-4 pr-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-base text-[#1F2937]">🗺️ Interactive Route & Itinerary Map Plotter</h4>
                      <p className="text-xs text-[#6B7280]">Readers can click numbered day pins to inspect regional spots and jump to coordinates</p>
                    </div>
                    <button type="button" onClick={handleAddStop} className="px-4 py-2 rounded-xl bg-[#FF8A3D] text-[#1F2937] font-black text-xs uppercase shadow-sm flex items-center gap-1">
                      <Plus size={15} /> <span>+ Add Stop</span>
                    </button>
                  </div>
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                    {stops.map((stop, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-neutral-900 text-white space-y-2">
                        <div className="flex items-center justify-between text-xs font-black text-[#FFB347]">
                          <span>Day {stop.day} Stop</span>
                          {stops.length > 1 && <button type="button" onClick={() => handleRemoveStop(i)} className="text-rose-400 hover:text-rose-300">Remove</button>}
                        </div>
                        <div className="bg-neutral-800 rounded-lg py-1 px-3">
                          <LocationAutocomplete
                            memberId={i.toString()}
                            value={stop.location || stop.title}
                            lat={stop.coordinates?.lat}
                            city={city}
                            placeholder="Search Ola Maps for a location..."
                            onUpdate={(idxStr, field, val) => handleUpdateStop(parseInt(idxStr), field as any, val)}
                          />
                        </div>
                        <input type="text" value={stop.description} onChange={e => handleUpdateStop(i, 'description', e.target.value)} placeholder="Activities & tips..." className="w-full bg-neutral-800 rounded-lg p-2 text-xs text-neutral-300 focus:outline-none" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. META FILTERS DRAWER */}
              {activeDrawer === 'meta' && (
                <div className="space-y-4 pr-6">
                  <div>
                    <h4 className="font-black text-base text-[#1F2937]">🏷️ Optional Reader Meta-Data Filters</h4>
                    <p className="text-xs text-[#6B7280]">Optional fields allowing Indian explorers to filter stories by budget, season, stay, and transit</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    <CustomDropdown label="Budget Tier" value={budget} onChange={setBudget} options={BUDGET_FILTER_OPTIONS.slice(1)} placeholder="Optional..." colorTheme="orange" />
                    <CustomDropdown label="Best Season" value={season} onChange={setSeason} options={SEASON_FILTER_OPTIONS.slice(1)} placeholder="Optional..." colorTheme="emerald" />
                    <CustomDropdown label="Stay Type" value={stay} onChange={setStay} options={STAY_FILTER_OPTIONS.slice(1)} placeholder="Optional..." colorTheme="sky" />
                    <CustomDropdown label="Transit Mode" value={transit} onChange={setTransit} options={TRANSIT_FILTER_OPTIONS.slice(1)} placeholder="Optional..." colorTheme="purple" />
                  </div>
                </div>
              )}

              {/* 5. COLLAB INVITE DRAWER */}
              {activeDrawer === 'collab' && (
                <div className="space-y-3 pr-6">
                  <div>
                    <h4 className="font-black text-base text-[#1F2937]">🤝 Invite Travel Companion / Blog Collab (Optional)</h4>
                    <p className="text-xs text-[#6B7280]">Once your colleague opens their Profile page and hits &ldquo;Approve&rdquo;, this blog appears on both accounts as verified co-authors!</p>
                  </div>
                  <div className="space-y-2 max-w-lg pt-1">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={collabUsername}
                        onChange={e => setCollabUsername(e.target.value)}
                        placeholder="Colleague's username (e.g. ananya_varma or rohan_dsouza)"
                        className="flex-1 h-11 px-4 rounded-xl bg-[#FFF7F0] border-2 border-[#FF8A3D]/40 font-bold text-sm text-[#1F2937] focus:outline-none"
                      />
                    </div>
                    {collabUsername.trim() && (
                      collabUsername.trim().replace('@', '').toLowerCase() === username.toLowerCase() ? (
                        <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-200">
                          ⚠️ You cannot invite yourself as a collab companion.
                        </p>
                      ) : (
                        <p className="text-xs font-bold text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-300">
                          ✓ User @{collabUsername.trim().replace('@', '')} ready — invitation will be dispatched on publish!
                        </p>
                      )
                    )}
                  </div>
                  {/* 👇 ADD THESE TWO LINES 👇 */}
                </div> 
              )} 
              {/* 👆 ADD THESE TWO LINES 👆 */}
              {/* 6. ADMIN HANDLE OVERRIDE DRAWER (Item 15) */}
              {activeDrawer === 'admin' && isAdmin && (
                <div className="space-y-4 pr-6">
                  <div>
                    <h4 className="font-black text-base text-amber-950 flex items-center gap-2">
                      <span>👑 Admin Handle Custom Author Override</span>
                    </h4>
                    <p className="text-xs text-amber-800">
                      As an admin, you can post this blog or video under any custom author handle, display name, and avatar picture.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-black uppercase text-amber-900 mb-1">Author Display Name</label>
                      <input
                        type="text"
                        value={authorName}
                        onChange={e => setAuthorName(e.target.value)}
                        placeholder="e.g. Travel Junkie"
                        className="w-full h-11 px-4 rounded-xl bg-amber-50 border-2 border-amber-300 font-bold text-sm text-[#1F2937] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-amber-900 mb-1">Author Username (@handle)</label>
                      <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value.replace('@',''))}
                        placeholder="e.g. wanderlust_99"
                        className="w-full h-11 px-4 rounded-xl bg-amber-50 border-2 border-amber-300 font-bold text-sm text-[#1F2937] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-amber-900 mb-1">Avatar / PFP Picture URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customAvatar}
                          onChange={e => setCustomAvatar(e.target.value)}
                          placeholder="https://..."
                          className="flex-1 w-full h-11 px-4 rounded-xl bg-amber-50 border-2 border-amber-300 font-bold text-sm text-[#1F2937] focus:outline-none"
                        />
                        <label className="h-11 px-4 flex items-center justify-center bg-amber-300 text-amber-950 rounded-xl cursor-pointer hover:bg-amber-400 font-bold text-xs">
                          Upload
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const reader = new FileReader();
                              reader.onload = (ev) => { if(ev.target?.result) setCustomAvatar(ev.target.result as string); };
                              reader.readAsDataURL(e.target.files[0]);
                            }
                          }} />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-amber-900 mb-1">Trending Position</label>
                      <input
                        type="number"
                        min="0"
                        value={featuredOrder}
                        onChange={e => setFeaturedOrder(parseInt(e.target.value) || 0)}
                        placeholder="0 = Not Trending"
                        className="w-full h-11 px-4 rounded-xl bg-amber-50 border-2 border-amber-300 font-bold text-sm text-[#1F2937] focus:outline-none"
                      />
                      <p className="text-[10px] text-amber-700 mt-1">Set to 1, 2, 3... to push to trending. Will auto-shift others.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MEDIA UPLOAD OR YOUTUBE FIELD */}
          {mediaType === 'youtube' && (
            <div className="p-5 rounded-3xl bg-[#FFF3E6] border-2 border-[#FF8A3D] space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase tracking-wider text-[#D45B0C]">
                  🎥 Video Link (YouTube) *
                </label>
                <span className="text-[11px] font-bold text-[#6B7280]">Supports YouTube links</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  required
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  onBlur={async () => {
                    if (!videoUrl || title) return;
                    try {
                      const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(videoUrl)}`);
                      const data = await res.json();
                      if (data.title) setTitle(data.title);
                      if (data.author_name && !content) setContent(`A video by ${data.author_name} from YouTube.`);
                    } catch (e) {
                      console.error('Failed to fetch video details', e);
                    }
                  }}
                  placeholder="Paste URL here (Auto-imports title on paste!)"
                  className="flex-1 h-12 px-4 rounded-xl bg-white border-2 border-[#FF8A3D]/40 font-bold text-sm text-[#1F2937] focus:outline-none focus:border-[#FF8A3D]"
                />
              </div>
            </div>
          )}

          {/* COVER BANNER PREVIEW (If custom image is selected AND it is an article) */}
          {(imageUrl || videoUrl) && mediaType === 'article' && (
            <div className="relative rounded-3xl overflow-hidden mb-6 max-h-[260px] group shadow-lg border-2 border-white bg-black">
              {videoUrl ? (
                <video src={videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover max-h-[260px]" />
              ) : (
                <img src={imageUrl} alt="Selected cover" className="w-full h-full object-cover max-h-[260px]" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <button type="button" onClick={() => setActiveDrawer('cover')} className="px-5 py-2 rounded-xl bg-white text-[#1F2937] font-black text-xs uppercase tracking-wider shadow">
                  Replace Cover Banner
                </button>
              </div>
            </div>
          )}

          {/* THE MASSIVE, BORDERLESS ARTICLE TITLE (Like Screenshot) */}
          <div className="pt-4 pb-2">
            <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={(mediaType === 'youtube' || mediaType === 'upload') ? "Title" : "Article Title..."}
            className="w-full text-5xl sm:text-7xl font-black bg-transparent border-0 focus:outline-none focus:ring-0 px-0 text-[#1F2937] placeholder:text-[#1F2937]/30 tracking-tight leading-none transition-all"
          />
        </div>

        {/* THE ZERO-FRICTION, BORDERLESS WRITING CANVAS */}
        {mediaType === 'article' ? (
          <div className="mt-4 min-h-[700px]">
            <RichBlogEditor 
              value={content}
              onChange={setContent}
              mode={editorMode}
              placeholder="Write your story... '/' for blocks · Tab for sub-bullets · paste images"
            />
          </div>
        ) : (
          <div className="mt-4 mb-8">
            <textarea
              value={(() => {
                try {
                  if (content?.startsWith('[') && content?.endsWith(']')) {
                    const parsed = JSON.parse(content);
                    if (Array.isArray(parsed)) return parsed.map((b: any) => b.content || '').join('\n').trim();
                  }
                } catch(e) {}
                return content;
              })()}
              onChange={e => setContent(e.target.value)}
              placeholder="Write a quick caption (optional)..."
              className="w-full min-h-[120px] p-4 bg-white/50 border border-[#FF8A3D]/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8A3D]/50 text-sm font-medium text-[#1F2937] placeholder:text-[#6B7280]"
            />
          </div>
        )}

        {/* MINIMALIST BOTTOM PUBLISH & ATTRIBUTION BAR */}
        <div className="mt-12 pt-6 border-t-2 border-[#FF8A3D]/20 flex flex-wrap items-center justify-between gap-6 bg-white/60 backdrop-blur-md p-6 rounded-3xl shadow-sm">
          {isAdmin ? (
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => handleToggleDrawer('admin')} className="hover:scale-105 transition-transform" title="Change Avatar">
                <img src={customAvatar} alt="Avatar" className="w-12 h-12 rounded-2xl border-2 border-[#FF8A3D] object-cover cursor-pointer" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <input type="text" value={authorName} onChange={e => setAuthorName(e.target.value)} className="font-black text-sm text-[#1F2937] bg-transparent border-b border-[#1F2937]/20 focus:outline-none py-0.5 w-36" placeholder="Author Name" />
                  <span className="text-xs font-bold text-[#6B7280]">(@{username})</span>
                </div>
                <div className="text-[11px] text-[#6B7280] font-medium mt-0.5">Publishing to {category} • {city || 'India'}</div>
              </div>
            </div>
          ) : (
            <div className="flex-1"></div>
          )}

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push('/profile')}
              className="px-6 py-4 rounded-2xl bg-white border-2 border-[#FF8A3D]/20 hover:border-[#FF8A3D]/60 hover:bg-[#FFF3E6] text-[#4B5563] font-black text-sm uppercase tracking-wider transition-all flex items-center gap-2"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              disabled={publishing || !!collabSentNotice}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#FF8A3D] via-[#FFB347] to-[#FFD166] hover:scale-103 active:scale-98 text-[#1F2937] font-black text-sm uppercase tracking-wider shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {publishing ? <span>Publishing Post...</span> : <span>Publish Post &amp; Map →</span>}
            </button>
          </div>
        </div>
      </form>
    </main>

    <BlogFooter />
  </div>
);}