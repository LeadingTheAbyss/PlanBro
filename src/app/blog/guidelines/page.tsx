import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, AlertTriangle, AlertCircle, FileText, Heart, Megaphone } from 'lucide-react';
import { BlogNavbar } from '@/components/blog/BlogNavbar';
import { BlogFooter } from '@/components/blog/BlogFooter';

export default function GuidelinesPage() {
  return (
    <div className="min-h-screen bg-[#FFF7F0] text-[#1F2937] font-sans selection:bg-[#FF8A3D]/25 flex flex-col justify-between">
      <BlogNavbar />

      <main className="max-w-4xl mx-auto px-6 sm:px-12 py-10 w-full flex-1">
        
        <div className="mb-10 text-center sm:text-left">
          <Link 
            href="/blog/write" 
            className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#6B7280] hover:text-[#FF8A3D] transition-colors py-1 mb-6"
          >
            <ArrowLeft size={14} />
            <span>Back to Writing Studio</span>
          </Link>
          <div className="flex items-center justify-center sm:justify-start gap-3 mb-3">
            <Shield className="text-[#FF8A3D] w-8 h-8 sm:w-10 sm:h-10" />
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#1F2937]">Community Guidelines</h1>
          </div>
          <p className="text-[#6B7280] font-medium max-w-2xl text-sm sm:text-base">
            To keep PlanBro a safe, inspiring, and valuable place for travelers across India, we ask all authors to strictly follow these rules when posting blogs or videos.
          </p>
        </div>

        <div className="space-y-8 pb-12">
          
          {/* Section 1 */}
          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-[#FF8A3D]/20 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-50 rounded-2xl text-red-500 shrink-0 mt-1">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1F2937] mb-3">1. Zero Tolerance for Explicit or NSFW Content</h2>
                <p className="text-sm text-[#4B5563] mb-4 leading-relaxed">
                  Our platform is meant for a general audience. We strictly prohibit:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-sm text-[#4B5563]">
                    <span className="text-[#FF8A3D] font-bold mt-0.5">•</span>
                    <span><strong>Nudity and sexually explicit material:</strong> This includes images, videos, and highly graphic text descriptions.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[#4B5563]">
                    <span className="text-[#FF8A3D] font-bold mt-0.5">•</span>
                    <span><strong>Violent or graphic content:</strong> Do not post content that glorifies violence, self-harm, or animal cruelty.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-[#FF8A3D]/20 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-50 rounded-2xl text-amber-500 shrink-0 mt-1">
                <Megaphone size={24} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1F2937] mb-3">2. No Spam or Blatant Self-Promotion</h2>
                <p className="text-sm text-[#4B5563] mb-4 leading-relaxed">
                  Readers come here for valuable insights, not sales pitches. While you are welcome to link to your personal portfolio or relevant resources, your blog must provide standalone value.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-sm text-[#4B5563]">
                    <span className="text-[#FF8A3D] font-bold mt-0.5">•</span>
                    <span><strong>No purely promotional posts:</strong> Articles that exist solely to advertise a product, service, or affiliate link will be removed.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[#4B5563]">
                    <span className="text-[#FF8A3D] font-bold mt-0.5">•</span>
                    <span><strong>No link-stuffing:</strong> Do not overload your posts with irrelevant backlinks designed to game search engine rankings.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[#4B5563]">
                    <span className="text-[#FF8A3D] font-bold mt-0.5">•</span>
                    <span><strong>No duplicate content:</strong> Do not spam the feed by posting the exact same article multiple times.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-[#FF8A3D]/20 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-100 rounded-2xl text-slate-600 shrink-0 mt-1">
                <AlertCircle size={24} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1F2937] mb-3">3. Keep It Legal and Safe (No &quot;Shady&quot; Business)</h2>
                <p className="text-sm text-[#4B5563] mb-4 leading-relaxed">
                  Do not use this platform to facilitate, encourage, or instruct others on how to participate in illegal activities.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-sm text-[#4B5563]">
                    <span className="text-[#FF8A3D] font-bold mt-0.5">•</span>
                    <span><strong>Prohibited topics include:</strong> Selling illegal goods, promoting scams, distributing malware, phishing, or sharing instructions for exploiting vulnerabilities (unless specifically framed within a recognized cybersecurity context).</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[#4B5563]">
                    <span className="text-[#FF8A3D] font-bold mt-0.5">•</span>
                    <span><strong>Doxxing:</strong> Never share someone&apos;s private, non-public information (like addresses, phone numbers, or private emails) without their explicit consent.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-[#FF8A3D]/20 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-500 shrink-0 mt-1">
                <FileText size={24} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1F2937] mb-3">4. Respect Copyright and Intellectual Property</h2>
                <p className="text-sm text-[#4B5563] mb-4 leading-relaxed">
                  You must have the right to publish the content you post.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-sm text-[#4B5563]">
                    <span className="text-[#FF8A3D] font-bold mt-0.5">•</span>
                    <span><strong>No plagiarism:</strong> Do not copy and paste articles from other websites, authors, or platforms without authorization.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[#4B5563]">
                    <span className="text-[#FF8A3D] font-bold mt-0.5">•</span>
                    <span><strong>Credit your sources:</strong> If you are quoting someone, using an image, or referencing data, provide proper attribution.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-[#FF8A3D]/20 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-500 shrink-0 mt-1">
                <Heart size={24} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1F2937] mb-3">5. Hate Speech and Harassment</h2>
                <p className="text-sm text-[#4B5563] mb-4 leading-relaxed">
                  We encourage healthy debate, but we do not tolerate abuse.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-sm text-[#4B5563]">
                    <span className="text-[#FF8A3D] font-bold mt-0.5">•</span>
                    <span><strong>No hate speech:</strong> Content that attacks, threatens, or demeans individuals or groups based on race, ethnicity, national origin, religion, sex, gender, sexual orientation, disease, or disability will result in an immediate ban.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[#4B5563]">
                    <span className="text-[#FF8A3D] font-bold mt-0.5">•</span>
                    <span><strong>No targeted harassment:</strong> Do not use your blog to bully, insult, or orchestrate campaigns against other users, individuals, or organizations.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
