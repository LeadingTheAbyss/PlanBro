'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, FileText } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState('info');
  const pathname = usePathname();
  
  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0A0A0A] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-blue-200 dark:selection:bg-blue-900">
      
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <span className="font-bold text-lg tracking-tight">PlanBro <span className="text-zinc-400 font-normal">Legal</span></span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-12">
        
        {/* Sidebar Navigation */}
        <aside className="md:w-64 shrink-0">
          <div className="sticky top-28 space-y-8">
            <div>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Legal Hub</h3>
              <nav className="space-y-1">
                <Link href="/privacy" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${pathname === '/privacy' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}>
                  <Shield size={16} /> Privacy Policy
                </Link>
                <Link href="/terms" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${pathname === '/terms' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}>
                  <FileText size={16} /> Terms of Service
                </Link>
              </nav>
            </div>

            <div className="hidden md:block">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">On this page</h3>
              <nav className="space-y-2 border-l border-zinc-200 dark:border-zinc-800">
                {[
                  { id: 'info', title: '1. Information We Collect' },
                  { id: 'use', title: '2. How We Use Info' },
                  { id: 'sharing', title: '3. Sharing Information' },
                  { id: 'security', title: '4. Data Security' },
                  { id: 'rights', title: '5. Your Rights' },
                ].map(item => (
                  <a 
                    key={item.id} 
                    href={`#${item.id}`}
                    onClick={() => setActiveSection(item.id)}
                    className={`block pl-4 py-1 text-sm transition-colors border-l-2 -ml-px ${activeSection === item.id ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                  >
                    {item.title}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 max-w-3xl">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-zinc-900 dark:text-white">Privacy Policy</h1>
            <p className="text-lg text-zinc-500 dark:text-zinc-400">Last updated: July 2026</p>
          </div>

          <div className="prose prose-zinc dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-blue-600">
            <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-300 mb-10">
              At PlanBro, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our trip planning service.
            </p>

            <section id="info" className="mb-12 scroll-mt-28">
              <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-white">1. Information We Collect</h2>
              <p className="leading-relaxed text-zinc-600 dark:text-zinc-300 mb-4">
                We collect information that you voluntarily provide to us when you register on the Service, express an interest in obtaining information about us or our products, or otherwise contact us.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-300">
                <li><strong>Personal Details:</strong> Names, email addresses, age, and gender.</li>
                <li><strong>Travel Preferences:</strong> Budgets, trip styles, favorite destinations, and dietary requirements.</li>
                <li><strong>Usage Data:</strong> How you interact with our 3D globe, itinerary builder, and recommendation engine.</li>
              </ul>
            </section>

            <section id="use" className="mb-12 scroll-mt-28">
              <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-white">2. How We Use Your Information</h2>
              <p className="leading-relaxed text-zinc-600 dark:text-zinc-300">
                We use the information we collect or receive to facilitate account creation, provide the requested travel planning services, personalize your itineraries, and improve the overall user experience. Our AI models may process your trip data to provide better hotel and transport suggestions.
              </p>
            </section>

            <section id="sharing" className="mb-12 scroll-mt-28">
              <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-white">3. Sharing Your Information</h2>
              <p className="leading-relaxed text-zinc-600 dark:text-zinc-300 mb-4">
                We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. To provide real-time travel recommendations, we may securely transmit non-identifying search queries (such as destination cities and dates) to our third-party data partners, transport operators, and booking aggregators.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-6 my-6">
                <h4 className="font-bold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <Shield size={18} /> Our Promise
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  We will <strong>never</strong> sell your personal data or travel itineraries to third-party marketers or advertisers. Any data shared with external APIs is strictly for generating your trip plans.
                </p>
              </div>
            </section>

            <section id="security" className="mb-12 scroll-mt-28">
              <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-white">4. Data Security</h2>
              <p className="leading-relaxed text-zinc-600 dark:text-zinc-300">
                We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. All data transmitted between your browser and our servers is encrypted using modern TLS protocols.
              </p>
            </section>

            <section id="rights" className="mb-12 scroll-mt-28">
              <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-white">5. Your Privacy Rights</h2>
              <p className="leading-relaxed text-zinc-600 dark:text-zinc-300">
                Depending on your location, you may have the right to request access to the personal information we collect from you, change that information, or delete it in some circumstances. You can delete your entire trip history and account data directly from the PlanBro profile settings.
              </p>
            </section>
            
          </div>
        </main>
      </div>
    </div>
  );
}
