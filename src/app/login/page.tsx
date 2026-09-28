'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Script from 'next/script';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const redirectTo = () => {
    const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
    router.push(redirect);
  };

  // --- Google Sign-In ---
  const handleCredentialResponse = async (response: any) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential })
      });

      if (res.ok) {
        redirectTo();
      } else {
        const errorText = await res.text();
        console.error('Login failed:', res.status, errorText);
        setErrorMsg(`Login failed (${res.status}): ${errorText}`);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorMsg(`Error: ${String(error)}`);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initGoogle = () => {
      if (typeof window !== 'undefined' && (window as any).google && googleButtonRef.current) {
        (window as any).google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });
        (window as any).google.accounts.id.renderButton(
          googleButtonRef.current,
          { theme: 'outline', size: 'large', width: 300, text: 'continue_with' }
        );
      }
    };

    if (typeof window !== 'undefined' && (window as any).google) {
      initGoogle();
    } else {
      window.addEventListener('google-loaded', initGoogle);
      return () => window.removeEventListener('google-loaded', initGoogle);
    }
  }, []);

  return (
    <div className="min-h-screen relative text-slate-800 overflow-hidden landing-body" style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#D0CBC7' }}>
      {/* Homepage Sky Background Elements */}
      <div className="content !h-screen !min-h-screen">
        <div className="sunset !h-screen !min-h-screen !absolute !top-0 !left-0 !w-full !z-0">
          <div className="silhouette-back !absolute !bottom-0 !w-full" style={{ opacity: 0.8, transform: 'translateY(0vh)' }}></div>
          <div className="silhouette-front !absolute !bottom-0 !w-full" style={{ opacity: 1, transform: 'translateY(0vh)' }}></div>
        </div>
      </div>

      <div className="absolute inset-0 z-10 flex flex-col p-4 pt-24 md:pt-4 overflow-y-auto">
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="lazyOnload"
          onLoad={() => {
            window.dispatchEvent(new Event('google-loaded'));
          }}
        />

        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors z-20 group font-semibold"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </button>

        {/* The White Box */}
        <div className="w-full max-w-md bg-white/90 backdrop-blur-xl shadow-2xl rounded-3xl p-6 md:p-10 flex flex-col items-center text-center relative z-10 border border-white/50 mx-auto my-auto shrink-0">

          {/* Logo area */}
          <div className="mb-8 relative flex items-center justify-center">
            <img src="/large_logo_2.png" alt="PlanBro Logo" className="h-auto w-50 object-contain rounded-2xl shadow-lg" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-3">Welcome Back</h1>
          <p className="text-slate-500 text-sm mb-8 px-4 leading-relaxed font-medium">
            To ensure the continued availability and optimal performance of our services, we kindly require users to log in. This measure helps us manage our limited system resources effectively and prevents potential misuse. We sincerely appreciate your understanding and cooperation.
          </p>

          {/* Google Auth Button Container */}
          <div className="w-full flex justify-center h-[44px] mb-4 relative">
            <div ref={googleButtonRef} className={isLoading ? 'hidden' : ''}></div>
            {isLoading && (
              <div className="flex items-center justify-center w-full h-full text-indigo-600 bg-white/50 backdrop-blur-sm rounded-full">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="font-medium text-sm">Please wait...</span>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="w-full bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-6 text-left break-words">
              {errorMsg}
            </div>
          )}

          <p className="text-center text-slate-400 text-xs leading-relaxed">
            By signing in, you agree to our <br />
            <Link href="/terms" className="text-indigo-500 hover:text-indigo-600 font-medium">Terms of Service</Link> and <Link href="/privacy" className="text-indigo-500 hover:text-indigo-600 font-medium">Privacy Policy</Link>
          </p>
        </div>

      </div>
    </div>
  );
}
