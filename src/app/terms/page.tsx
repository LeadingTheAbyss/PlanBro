'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, FileText, AlertTriangle } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState('acceptance');
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
                  { id: 'acceptance', title: '1. Acceptance of Terms' },
                  { id: 'use', title: '2. Use of the Service' },
                  { id: 'content', title: '3. User Content' },
                  { id: 'liability', title: '4. Limitations of Liability' },
                  { id: 'modifications', title: '5. Modifications' },
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
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-zinc-900 dark:text-white">Terms of Service</h1>
            <p className="text-lg text-zinc-500 dark:text-zinc-400">Last updated: July 2026</p>
          </div>

          <div className="prose prose-zinc dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-blue-600">
            <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-300 mb-10">
              Welcome to PlanBro! These Terms of Service ("Terms") govern your access to and use of our website, services, and applications. Please read these Terms carefully before using our trip planning platform.
            </p>

            <section id="acceptance" className="mb-12 scroll-mt-28">
              <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-white">1. Acceptance of Terms</h2>
              <p className="leading-relaxed text-zinc-600 dark:text-zinc-300 mb-4">
                By accessing or using our Service, you agree to be bound by these Terms and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use our Service.
              </p>
            </section>

            <section id="use" className="mb-12 scroll-mt-28">
              <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-white">2. Use of the Service</h2>
              <p className="leading-relaxed text-zinc-600 dark:text-zinc-300">
                You must provide accurate and complete information when creating an account or planning a trip. You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer or device. PlanBro is intended for personal, non-commercial use only. Our Service integrates with several third-party data providers, transport operators, and booking aggregators to provide live data. Your use of the Service is also subject to the terms and conditions of these respective third-party providers.
              </p>
            </section>

            <section id="content" className="mb-12 scroll-mt-28">
              <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-white">3. User Content</h2>
              <p className="leading-relaxed text-zinc-600 dark:text-zinc-300 mb-4">
                Our Service allows you to plan itineraries, add passengers, and share travel plans. You retain all rights to any information you submit, but you grant PlanBro a non-exclusive, worldwide, royalty-free license to use, store, and display that content solely for the purpose of providing the Service.
              </p>
            </section>

            <section id="liability" className="mb-12 scroll-mt-28">
              <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-white">4. Limitations of Liability</h2>
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl p-6 my-6">
                <h4 className="font-bold text-amber-900 dark:text-amber-500 mb-2 flex items-center gap-2">
                  <AlertTriangle size={18} /> Important Disclaimer
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  PlanBro acts as a planning tool and aggregator. We do not guarantee the real-time accuracy of transport availability, live train status, prices, or hotel bookings. Because we rely on various third-party data sources and aggregators, information such as photos, ratings, and fares may change without notice. Always verify critical travel information directly with the official service providers.
                </p>
              </div>
              <p className="leading-relaxed text-zinc-600 dark:text-zinc-300">
                To the maximum extent permitted by law, PlanBro shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including missed flights, bad hotel experiences, financial losses, or ruined vacations resulting from your use of the Service.
              </p>
            </section>

            <section id="modifications" className="mb-12 scroll-mt-28">
              <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-white">5. Modifications to the Service</h2>
              <p className="leading-relaxed text-zinc-600 dark:text-zinc-300">
                We reserve the right to modify or discontinue, temporarily or permanently, the Service (or any part thereof) with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the Service.
              </p>
            </section>
            
          </div>
        </main>
      </div>
    </div>
  );
}
