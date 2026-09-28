export interface Comment {
  id: string;
  author: string;
  avatar: string;
  date: string;
  content: string;
  likes: number;
}

export interface ItineraryStop {
  day: number;
  title: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  description: string;
  highlightIcon?: string;
}

export interface Collaborator {
  name: string;
  username: string;
  avatar?: string;
  status?: 'pending' | 'approved';
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  city: string; // Indian city or state region for localized filtering
  categoryIcon: string;
  categoryBadgeBg: string;
  categoryBadgeText: string;
  readingTime: string;
  author: {
    name: string;
    username: string;
    role: string;
    avatar: string;
  };
  collaborators?: Collaborator[];
  date: string;
  imageUrl: string;
  imageUrls?: string[]; // Used for multi-image cover carousels
  featured?: boolean;
  featuredOrder?: number;
  likes: number;
  views: number;
  commentsCount: number;
  controversialScore: number;
  timesPlanned: number; // How many travelers used this story to plan their itinerary
  budget?: string;
  bestSeason?: string;
  accommodation?: string;
  transportMode?: string;
  itineraryStops?: ItineraryStop[];
  content?: string; // Rich editorial content with callouts, LaTeX formulas, galleries, and embeds
  mediaType?: 'article' | 'short' | 'video';
  videoUrl?: string;
  comments: Comment[];
}

export interface DestinationCardData {
  id: string;
  name: string;
  tagline: string;
  articleCount: number;
  imageUrl: string;
  accentColor: string;
}

export const CATEGORIES = [
  { label: 'All Stories', icon: '🌐', slug: 'all', bg: 'bg-[#FF8A3D]', text: 'text-white' },
  { label: 'Beaches & Shacks', icon: '🏖', slug: 'beaches', bg: 'bg-[#FFF3E6]', text: 'text-[#FF8A3D]' },
  { label: 'Himalayas & Hills', icon: '🏔', slug: 'mountains', bg: 'bg-[#F0F9FF]', text: 'text-[#0284C7]' },
  { label: 'Street Food & Chai', icon: '☕', slug: 'food', bg: 'bg-[#FFF9E6]', text: 'text-[#D97706]' },
  { label: 'Backpacking India', icon: '🎒', slug: 'backpacking', bg: 'bg-[#F3FCEF]', text: 'text-[#4A9D2E]' },
  { label: 'Transit & Trains', icon: '🚆', slug: 'flight-tips', bg: 'bg-[#EEF7FF]', text: 'text-[#2563EB]' },
  { label: 'Budget Homestays', icon: '💰', slug: 'budget-travel', bg: 'bg-[#ECFDF5]', text: 'text-[#059669]' },
  { label: 'Hidden Gems', icon: '🌍', slug: 'hidden-gems', bg: 'bg-[#FDF4FF]', text: 'text-[#C026D3]' },
  { label: 'Romantic Retreats', icon: '❤️', slug: 'couples', bg: 'bg-[#FFF1F2]', text: 'text-[#E11D48]' },
  { label: 'Family Safaris', icon: '👨‍👩‍👧', slug: 'family', bg: 'bg-[#FEF3C7]', text: 'text-[#B45309]' },
  { label: 'Monsoon Packing', icon: '🧳', slug: 'packing', bg: 'bg-[#F1F5F9]', text: 'text-[#475569]' },
];

export const BUDGET_FILTER_OPTIONS = [
  'All Budgets',
  'Backpacker (Under ₹5k)',
  'Moderate (₹5k - ₹20k)',
  'Boutique & Luxury (> ₹20k)'
];

export const SEASON_FILTER_OPTIONS = [
  'All Seasons',
  'Monsoon Magic (July - Sep)',
  'Winter Snow & Sun (Nov - Feb)',
  'Summer Mountain Escapes (Apr - June)',
  'Year-Round'
];

export const STAY_FILTER_OPTIONS = [
  'All Stays',
  'Boutique Homestay',
  'Heritage Bungalow',
  'Wooden Houseboat',
  'Camping Tent & Eco-Lodge',
  'Backpacker Hostel'
];

export const TRANSIT_FILTER_OPTIONS = [
  'All Transit Modes',
  'Vande Bharat / Express Train',
  'Royal Enfield / SUV Roadtrip',
  'Flight + Scenic Cab',
  'Local Bus & Ferry'
];

const SAMPLE_COMMENTS: Comment[] = [
  {
    id: 'c1',
    author: 'Aravind Nair',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80',
    date: '2 hours ago',
    content: 'This itinerary makes me want to drop everything and catch an overnight express train right now! The local dhaba recommendations here are spot on.',
    likes: 14,
  },
  {
    id: 'c2',
    author: 'Priyanka Sharma',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80',
    date: '1 day ago',
    content: 'I visited this exact valley last October! Highly recommend going during early sunrise to witness the mist rising over the river before tourists wake up.',
    likes: 8,
  },
];

export const FEATURED_ARTICLE: Article = {
  id: 'featured-1',
  slug: 'beyond-spiti-valley-silence-tea-monasteries',
  title: 'Beyond Spiti Valley: Finding Silence, Butter Tea, and Monasteries in High Himachal',
  excerpt: 'We ventured far past the bustling hill stations of Manali into high-altitude trans-Himalayan valleys where time is measured by prayer flags on ancient granite. Here is how slow travel and Spiti village hospitality completely rewrote our understanding of exploration in India.',
  category: 'Himalayas & Hills',
  city: 'Spiti Valley & Manali',
  categoryIcon: '🏔',
  categoryBadgeBg: 'bg-[#FF8A3D]/15 text-[#D45B0C] border border-[#FF8A3D]/30',
  categoryBadgeText: 'text-[#FF8A3D]',
  readingTime: '9 min read',
  author: {
    name: 'Rohan D’Souza',
    username: 'rohan_dsouza',
    role: 'Himalayan Expedition Writer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  },
  collaborators: [
    {
      name: 'Ananya Varma',
      username: 'ananya_varma',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
      status: 'approved'
    }
  ],
  date: 'July 24, 2026',
  imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80',
  featured: true,
  likes: 842,
  views: 4520,
  commentsCount: 34,
  controversialScore: 15,
  timesPlanned: 254,
  budget: 'Moderate (₹5k - ₹20k)',
  bestSeason: 'Summer Mountain Escapes (Apr - June)',
  accommodation: 'Boutique Homestay',
  transportMode: 'Royal Enfield / SUV Roadtrip',
  itineraryStops: [
    {
      day: 1,
      title: 'Manali to Kaza via Atal Tunnel & Kunzum Pass',
      location: 'Kunzum Pass, Elevation 4,590m',
      coordinates: { lat: 32.395, lng: 77.635 },
      description: 'An adrenaline-filled start driving up across high mountain passes surrounded by jagged Glaciers. Stop for hot tea and Maggie at Batal dhaba.',
      highlightIcon: '🏔'
    },
    {
      day: 2,
      title: 'Key Monastery Morning Prayer & Chicham Bridge',
      location: 'Key Gompa, Spiti Valley',
      coordinates: { lat: 32.296, lng: 78.012 },
      description: 'Join Tibetan monks for early morning chanting and warm salted butter tea. Later walk across Chicham Bridge, Asia’s highest canyon suspension bridge.',
      highlightIcon: '📿'
    },
    {
      day: 3,
      title: 'Langza Fossil Hunting & Hikkim Post Office',
      location: 'Hikkim Village (4,440m)',
      coordinates: { lat: 32.247, lng: 78.075 },
      description: 'Mail handwritten postcards to loved ones from the highest post office on earth before marveling at Langza’s iconic golden Buddha statue facing the snow mountains.',
      highlightIcon: '📮'
    },
    {
      day: 4,
      title: 'Stargazing Camping at Chandratal Lake',
      location: 'Chandratal (Moon Lake)',
      coordinates: { lat: 32.482, lng: 77.615 },
      description: 'Watch the emerald green lake water shift to sapphire blue before camping under an illuminated canopy of the Milky Way galaxy.',
      highlightIcon: '⛺'
    }
  ],
  comments: [
    ...SAMPLE_COMMENTS,
    {
      id: 'c3',
      author: 'Vikaram K.',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80',
      date: '3 days ago',
      content: 'Kaza and Key Monastery have always been my dream ride. Using PlanBro to plan my road trip itinerary right now!',
      likes: 19,
    },
  ],
};

export const ARTICLES: Article[] = [
  {
    id: 'controversial-1',
    slug: 'why-never-stay-luxury-resorts-in-goa',
    title: 'Why You Should Never Stay in a Luxury Resort in Goa: The Death of Goan Culture',
    excerpt: 'All-inclusive gated commercial beach resorts in North Goa are engineered to isolate you from authentic Goan architecture, poi bakeries, and home-cooked prawn curries. Here is why true travelers choose heritage Indo-Portuguese bungalows instead.',
    category: 'Beaches & Shacks',
    city: 'Goa',
    categoryIcon: '🏖',
    categoryBadgeBg: 'bg-rose-100 text-rose-800 border border-rose-200',
    categoryBadgeText: 'text-rose-600',
    readingTime: '5 min read',
    author: {
      name: 'Ananya Varma',
      username: 'ananya_varma',
      role: 'Culture & Heritage Columnist',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    },
    date: 'July 26, 2026',
    imageUrl: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=900&q=80',
    likes: 410,
    views: 6890,
    commentsCount: 142,
    controversialScore: 98,
    timesPlanned: 189,
    budget: 'Moderate (₹5k - ₹20k)',
    bestSeason: 'Year-Round',
    accommodation: 'Heritage Bungalow',
    transportMode: 'Vande Bharat / Express Train',
    itineraryStops: [
      {
        day: 1,
        title: 'Check into Fontainhas Heritage Quarter',
        location: 'Panjim, Goa',
        coordinates: { lat: 15.498, lng: 73.832 },
        description: 'Walk through narrow Portuguese-era alleys lined with colourful ochre and cobalt homes. Breakfast on fresh poi bread and chorizo.',
        highlightIcon: '🏡'
      },
      {
        day: 2,
        title: 'Ferry Ride to Divar Island Serene Villages',
        location: 'Divar Island, Mandovi River',
        coordinates: { lat: 15.525, lng: 73.910 },
        description: 'Cross the scenic river by local ferry to explore quiet paddy fields, ancient church ruins, and friendly village fenny distilleries.',
        highlightIcon: '⛵'
      },
      {
        day: 3,
        title: 'Sunset at Cabo de Rama Untamed Cliff',
        location: 'South Goa Coastline',
        coordinates: { lat: 15.088, lng: 73.922 },
        description: 'Avoid commercial beaches by watching an uninhibited crimson sunset over the crashing waves from an ancient coastal Portuguese fortress.',
        highlightIcon: '🌅'
      }
    ],
    comments: [
      {
        id: 'con1',
        author: 'Siddharth M.',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80',
        date: '3 hours ago',
        content: 'I have to disagree! Sometimes you work 60 hours a week in Mumbai and just want to lounge by a calm resort pool without navigating crowded lanes. Both travel styles have their place.',
        likes: 45,
      },
      {
        id: 'con2',
        author: 'Neha Deshpande',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
        date: '5 hours ago',
        content: 'Spot on, Ananya. Staying in Fontainhas and Divar Island puts money directly into Goan families rather than massive international hospitalities.',
        likes: 38,
      }
    ],
  },
  {
    id: 'controversial-2',
    slug: 'stop-visiting-shimla-mussoorie-quieter-himachali-alternatives',
    title: 'Stop Visiting Shimla & Mussoorie: 6 Quieter Himachali Alternatives That Beat the Crowds',
    excerpt: 'Overtourism and mall-road traffic jams have transformed standard hill stations into chaotic weekend theme parks. It is time to retire the commercial bucket list and head to Jibhi, Tirthan Valley, and Chitkul instead.',
    category: 'Himalayas & Hills',
    city: 'Manali & Himachal',
    categoryIcon: '🏔',
    categoryBadgeBg: 'bg-[#FFF3E6] text-[#FF8A3D] border border-[#FF8A3D]/20',
    categoryBadgeText: 'text-[#FF8A3D]',
    readingTime: '6 min read',
    author: {
      name: 'Sophia Varela',
      username: 'sophia_varela',
      role: 'Mountain Nomad Editor',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    },
    date: 'July 22, 2026',
    imageUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=900&q=80',
    likes: 620,
    views: 8120,
    commentsCount: 96,
    controversialScore: 89,
    timesPlanned: 312,
    budget: 'Backpacker (Under ₹5k)',
    bestSeason: 'Summer Mountain Escapes (Apr - June)',
    accommodation: 'Camping Tent & Eco-Lodge',
    transportMode: 'Local Bus & Ferry',
    itineraryStops: [
      {
        day: 1,
        title: 'Arrival in Jibhi & Waterfall Walk',
        location: 'Jibhi, Banjar Valley',
        description: 'Check into a cozy pine wood cottage beside a musical mountain stream. Take an afternoon stroll to the secluded Jibhi forest waterfall.',
        highlightIcon: '🌲'
      },
      {
        day: 2,
        title: 'Tirthan Valley Trout Fishing & Jalori Pass',
        location: 'Great Himalayan National Park border',
        description: 'Trek up through dense rhododendron groves to Serolsar Lake and savor piping hot rajma chawal at 10,000 ft altitude.',
        highlightIcon: '🏔'
      }
    ],
    comments: [...SAMPLE_COMMENTS],
  },
  {
    id: 'jammu-1',
    slug: 'floating-paradises-wooden-houseboats-jammu-srinagar',
    title: 'Floating Paradises: The Serenity of Traditional Cedar Houseboats in Jammu & Kashmir',
    excerpt: 'Drifting along mirrored lakes surrounded by snow-draped Zabarwan peaks, while sipping warm pink Kashmiri Kahwa infused with saffron and crushed cardamom during morning shikara rides.',
    category: 'Hidden Gems',
    city: 'Jammu & Kashmir',
    categoryIcon: '🌍',
    categoryBadgeBg: 'bg-indigo-50 text-indigo-800 border border-indigo-200',
    categoryBadgeText: 'text-indigo-700',
    readingTime: '7 min read',
    author: {
      name: 'Kabir Bhat, K.',
      username: 'kabir_kashmir',
      role: 'Himalayan Heritage Writer',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    },
    date: 'July 20, 2026',
    imageUrl: 'https://images.unsplash.com/photo-1476610182048-b716b8518aae?auto=format&fit=crop&w=900&q=80',
    likes: 745,
    views: 7890,
    commentsCount: 52,
    controversialScore: 12,
    timesPlanned: 420,
    budget: 'Boutique & Luxury (> ₹20k)',
    bestSeason: 'Winter Snow & Sun (Nov - Feb)',
    accommodation: 'Wooden Houseboat',
    transportMode: 'Flight + Scenic Cab',
    itineraryStops: [
      {
        day: 1,
        title: 'Boarding the Cedar Houseboat on Dal Lake',
        location: 'Srinagar, Kashmir',
        description: 'Step into intricate hand-carved cedar wooden rooms covered in plush Pashmina draperies. Enjoy an evening saffron tea ritual on the private balcony.',
        highlightIcon: '🛶'
      },
      {
        day: 2,
        title: 'Dawn Shikara Ride to Floating Flower Market',
        location: 'Dal Lake Interior Canal',
        description: 'Wake up at 5:00 AM to drift silently among vendors trading fresh water lilies, lotus blooms, and orchard apples directly from boat to boat.',
        highlightIcon: '🌸'
      },
      {
        day: 3,
        title: 'Excursion to Gulmarg Pine Meadows',
        location: 'Gulmarg Gondola Base',
        description: 'Take the scenic alpine drive up to Gulmarg to view panoramic snow peaks and sample authentic multi-course Kashmiri Wazwan feast.',
        highlightIcon: '🍛'
      }
    ],
    comments: [...SAMPLE_COMMENTS],
  },
  {
    id: 'food-1',
    slug: 'midnight-chai-nihari-street-food-crawl-old-delhi',
    title: 'Midnight Chai & Sizzling Kebabs: A Culinary Crawl Through Old Delhi & Chandni Chowk',
    excerpt: 'Follow the comforting aroma of slow-simmered brass handis and crispy daulat ki chaat into historic labyrinth alleys where generation-old legendary ustads have mastered spices since the Mughal era.',
    category: 'Street Food & Chai',
    city: 'Delhi',
    categoryIcon: '☕',
    categoryBadgeBg: 'bg-[#FFD166]/25 text-[#B45309]',
    categoryBadgeText: 'text-[#B45309]',
    readingTime: '5 min read',
    author: {
      name: 'Kenji Sato & Tarun',
      username: 'tarun_foodie',
      role: 'Culinary Explorer',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    },
    date: 'July 15, 2026',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80',
    likes: 954,
    views: 9420,
    commentsCount: 68,
    controversialScore: 12,
    timesPlanned: 512,
    budget: 'Backpacker (Under ₹5k)',
    bestSeason: 'Winter Snow & Sun (Nov - Feb)',
    accommodation: 'Backpacker Hostel',
    transportMode: 'Vande Bharat / Express Train',
    itineraryStops: [
      {
        day: 1,
        title: 'Evening Paratha Gully & Spice Bazaar Walk',
        location: 'Chandni Chowk, Old Delhi',
        description: 'Sample crisp deep-fried rabri and dal parathas accompanied by spicy tangy potato chutney before wandering through fragrant wholesale spice courtyards.',
        highlightIcon: '🍲'
      },
      {
        day: 2,
        title: 'Jama Masjid Midnight Nihari & Kebabs',
        location: 'Matia Mahal Street, Old Delhi',
        description: 'Witness master chefs grill juicy minced kebabs over glowing charcoal and savor melt-in-the-mouth overnight slow-cooked nihari stew.',
        highlightIcon: '🔥'
      }
    ],
    comments: [...SAMPLE_COMMENTS],
  },
  {
    id: 'beach-1',
    slug: 'chasing-golden-hour-secret-coastline-gokarna-varkala',
    title: 'Chasing Golden Hour: The Untamed Turquoise Coves between Gokarna and Varkala',
    excerpt: 'Tucked beneath dramatic rust-red cliffs lie sun-drenched Arabian Sea shores completely untouched by noisy tourist crowds. Discover tranquil palm-lined sanctuaries and night luminescent beaches.',
    category: 'Beaches & Shacks',
    city: 'Goa & Gokarna',
    categoryIcon: '🏖',
    categoryBadgeBg: 'bg-[#FF8A3D]/15 text-[#C8520A]',
    categoryBadgeText: 'text-[#FF8A3D]',
    readingTime: '6 min read',
    author: {
      name: 'Sophia Varela',
      username: 'sophia_varela',
      role: 'Coastal Travel Writer',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    },
    date: 'July 18, 2026',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
    likes: 512,
    views: 4310,
    commentsCount: 24,
    controversialScore: 10,
    timesPlanned: 204,
    budget: 'Backpacker (Under ₹5k)',
    bestSeason: 'Winter Snow & Sun (Nov - Feb)',
    accommodation: 'Backpacker Hostel',
    transportMode: 'Vande Bharat / Express Train',
    comments: [...SAMPLE_COMMENTS],
  },
  {
    id: 'mountain-1',
    slug: 'waking-up-above-clouds-tawang-arunachal',
    title: 'Waking Up Above the Clouds: A Nomad’s Guide to Tawang & Meghalaya Foothills',
    excerpt: 'From living crystal root bridges spanning rushing waterfalls to ancient hilltop monastries covered in early dawn mist, here are five breathtaking Northeast expeditions accessible to any brave explorer.',
    category: 'Himalayas & Hills',
    city: 'Meghalaya & Tawang',
    categoryIcon: '🏔',
    categoryBadgeBg: 'bg-[#6EC6FF]/20 text-[#0284C7]',
    categoryBadgeText: 'text-[#0284C7]',
    readingTime: '7 min read',
    author: {
      name: 'Marcus Thorne',
      username: 'marcus_t',
      role: 'Adventure & Peak Guide',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    },
    date: 'July 16, 2026',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80',
    likes: 489,
    views: 3950,
    commentsCount: 19,
    controversialScore: 8,
    timesPlanned: 176,
    budget: 'Moderate (₹5k - ₹20k)',
    bestSeason: 'Monsoon Magic (July - Sep)',
    accommodation: 'Boutique Homestay',
    transportMode: 'Flight + Scenic Cab',
    comments: [...SAMPLE_COMMENTS],
  },
  {
    id: 'backpacking-1',
    slug: 'art-of-traveling-light-rajasthan-gujarat-25l-backpack',
    title: 'The Art of Traveling Light: 25 Days Across Rajasthan & Gujarat in a 25L Daypack',
    excerpt: 'How ditching heavy check-in luggage gave us ultimate freedom to jump onto unreserved window-seat sleeper trains, desert camel rides, and impromptu autos in Jaisalmer without missing a beat.',
    category: 'Backpacking India',
    city: 'Jaipur & Udaipur',
    categoryIcon: '🎒',
    categoryBadgeBg: 'bg-[#7ED957]/20 text-[#3D8520]',
    categoryBadgeText: 'text-[#3D8520]',
    readingTime: '8 min read',
    author: {
      name: 'Ariya Lin',
      username: 'ariya_lin',
      role: 'Minimalist Adventurer',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    },
    date: 'July 12, 2026',
    imageUrl: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=900&q=80',
    likes: 398,
    views: 3120,
    commentsCount: 42,
    controversialScore: 45,
    timesPlanned: 132,
    budget: 'Backpacker (Under ₹5k)',
    bestSeason: 'Winter Snow & Sun (Nov - Feb)',
    accommodation: 'Backpacker Hostel',
    transportMode: 'Vande Bharat / Express Train',
    comments: [...SAMPLE_COMMENTS],
  },
  {
    id: 'flight-1',
    slug: 'beating-transit-fatigue-smart-expressway-hacks-india',
    title: 'Beating Transit Fatigue: Smart Vande Bharat & Expressway Roadtrip Hacks Across India',
    excerpt: 'Unlock window hydration timing, circadian sleeper-car cabin strategies, and pit-stop dhabas that ensure you step off a 14-hour interstate journey feeling alert and energetic.',
    category: 'Transit & Trains',
    city: 'Mumbai & Pune',
    categoryIcon: '🚆',
    categoryBadgeBg: 'bg-[#6EC6FF]/20 text-[#1D4ED8]',
    categoryBadgeText: 'text-[#1D4ED8]',
    readingTime: '4 min read',
    author: {
      name: 'Dr. Aris Thorne',
      username: 'aris_thorne',
      role: 'Travel Health Specialist',
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80',
    },
    date: 'July 10, 2026',
    imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=900&q=80',
    likes: 719,
    views: 6540,
    commentsCount: 51,
    controversialScore: 20,
    timesPlanned: 298,
    budget: 'Moderate (₹5k - ₹20k)',
    bestSeason: 'Year-Round',
    accommodation: 'Boutique Homestay',
    transportMode: 'Vande Bharat / Express Train',
    comments: [...SAMPLE_COMMENTS],
  },
  {
    id: 'budget-1',
    slug: 'five-star-experiences-backpack-budget-homestays-fort-kochi',
    title: 'Five-Star Experiences on a Backpack Budget: Mastering Boutique Homestays in Fort Kochi',
    excerpt: 'You do not need an imperial budget to dine on fresh pepper prawns, watch authentic Kathakali performances, and stay in gorgeous restored colonial heritage courtyards along the Malabar Coast.',
    category: 'Budget Homestays',
    city: 'Kochi & Kerala',
    categoryIcon: '💰',
    categoryBadgeBg: 'bg-emerald-100 text-emerald-800',
    categoryBadgeText: 'text-emerald-700',
    readingTime: '6 min read',
    author: {
      name: 'Lucas Mendes',
      username: 'lucas_mendes',
      role: 'Smart Budget Strategist',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    },
    date: 'July 08, 2026',
    imageUrl: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=900&q=80',
    likes: 567,
    views: 5210,
    commentsCount: 31,
    controversialScore: 18,
    timesPlanned: 189,
    budget: 'Backpacker (Under ₹5k)',
    bestSeason: 'Winter Snow & Sun (Nov - Feb)',
    accommodation: 'Heritage Bungalow',
    transportMode: 'Local Bus & Ferry',
    comments: [...SAMPLE_COMMENTS],
  },
  {
    id: 'couples-1',
    slug: 'under-coorg-canopy-romantic-coffee-estate-retreats',
    title: 'Under the Coorg Canopy: 7 Romantic Coffee Estate Retreats Far from Commercial Crowds',
    excerpt: 'Hand-in-hand twilight walks through fragrant Arabica plantations, private plantation tastings, and candlelit balcony dinners overlooking undulating misty green Karnataka hillsides.',
    category: 'Romantic Retreats',
    city: 'Coorg & Mysore',
    categoryIcon: '❤️',
    categoryBadgeBg: 'bg-rose-100 text-rose-700',
    categoryBadgeText: 'text-rose-600',
    readingTime: '5 min read',
    author: {
      name: 'Chiara & Matteo',
      username: 'chiara_matteo',
      role: 'Romance Travel Editors',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80',
    },
    date: 'July 05, 2026',
    imageUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=900&q=80',
    likes: 612,
    views: 5890,
    commentsCount: 29,
    controversialScore: 14,
    timesPlanned: 245,
    budget: 'Boutique & Luxury (> ₹20k)',
    bestSeason: 'Monsoon Magic (July - Sep)',
    accommodation: 'Boutique Homestay',
    transportMode: 'Royal Enfield / SUV Roadtrip',
    comments: [...SAMPLE_COMMENTS],
  },
  {
    id: 'family-1',
    slug: 'no-screen-required-jim-corbett-family-tiger-safari',
    title: 'No Screen Required: Turn Jim Corbett National Park Into an Epic Family Tiger Safari',
    excerpt: 'How early morning open-top jeep safaris, majestic river crossings, and wild elephant sightings captivated our three tech-obsessed kids better than any tablet ever could.',
    category: 'Family Safaris',
    city: 'Uttarakhand & Rishikesh',
    categoryIcon: '👨‍👩‍👧',
    categoryBadgeBg: 'bg-amber-100 text-amber-800',
    categoryBadgeText: 'text-amber-700',
    readingTime: '7 min read',
    author: {
      name: 'Elena Rostova',
      username: 'elena_rostova',
      role: 'Family Travel Creator',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    },
    date: 'July 02, 2026',
    imageUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=900&q=80',
    likes: 376,
    views: 2980,
    commentsCount: 22,
    controversialScore: 15,
    timesPlanned: 114,
    budget: 'Moderate (₹5k - ₹20k)',
    bestSeason: 'Winter Snow & Sun (Nov - Feb)',
    accommodation: 'Camping Tent & Eco-Lodge',
    transportMode: 'Flight + Scenic Cab',
    comments: [...SAMPLE_COMMENTS],
  },
  {
    id: 'packing-1',
    slug: 'monsoon-packing-revolution-waterproof-gear-indian-ghats',
    title: 'Monsoon Packing Revolution: Modular Waterproof Gear for Indian Western Ghats Hikes',
    excerpt: 'Say goodbye to soaked hiking boots, ruined electronics, and soggy backpacks with a foolproof lightweight trekking strategy engineered specifically for Maharashtra monsoon treks.',
    category: 'Monsoon Packing',
    city: 'Mumbai & Pune',
    categoryIcon: '🧳',
    categoryBadgeBg: 'bg-slate-200 text-slate-800',
    categoryBadgeText: 'text-slate-700',
    readingTime: '3 min read',
    author: {
      name: 'Samir Mehta',
      username: 'samir_mehta',
      role: 'Trekking Gear Editor',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    },
    date: 'June 28, 2026',
    imageUrl: 'https://images.unsplash.com/photo-1553531384-cc64ac80f931?auto=format&fit=crop&w=900&q=80',
    likes: 284,
    views: 2450,
    commentsCount: 16,
    controversialScore: 9,
    timesPlanned: 98,
    budget: 'Backpacker (Under ₹5k)',
    bestSeason: 'Monsoon Magic (July - Sep)',
    accommodation: 'Backpacker Hostel',
    transportMode: 'Vande Bharat / Express Train',
    comments: [...SAMPLE_COMMENTS],
  },
];

export const POPULAR_DESTINATIONS: DestinationCardData[] = [
  {
    id: 'dest-goa',
    name: 'Goa & Gokarna',
    tagline: 'Sunset shores, secret coves & laid-back shacks',
    articleCount: 42,
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    accentColor: '#FF8A3D',
  },
  {
    id: 'dest-jammu',
    name: 'Jammu & Kashmir',
    tagline: 'Dal Lake boat stays, Himalayan peaks & Sufi tea',
    articleCount: 38,
    imageUrl: 'https://images.unsplash.com/photo-1476610182048-b716b8518aae?auto=format&fit=crop&w=800&q=80',
    accentColor: '#FFB347',
  },
  {
    id: 'dest-manali',
    name: 'Manali & Spiti Valley',
    tagline: 'High-altitude passes, pine monasteries & clear starry nights',
    articleCount: 35,
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    accentColor: '#6EC6FF',
  },
  {
    id: 'dest-jaipur',
    name: 'Jaipur & Udaipur',
    tagline: 'Royal heritage architecture, lake palaces & sunset courtyards',
    articleCount: 45,
    imageUrl: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=800&q=80',
    accentColor: '#FFD166',
  },
  {
    id: 'dest-rishikesh',
    name: 'Varanasi & Rishikesh',
    tagline: 'Spiritual river ghats, yoga sanctuaries & evening Aarti hymns',
    articleCount: 29,
    imageUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
    accentColor: '#7ED957',
  },
  {
    id: 'dest-kerala',
    name: 'Kochi & Kerala',
    tagline: 'God’s Own Country: Majestic palm backwaters & spice estates',
    articleCount: 34,
    imageUrl: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80',
    accentColor: '#FF8A3D',
  },
];
