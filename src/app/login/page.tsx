'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Zap, ChevronDown, KeyRound, Eye, EyeOff } from 'lucide-react';
import Script from 'next/script';
import Link from 'next/link';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const pendingActionRef = useRef<null | (() => void)>(null);
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const [showQuickSignup, setShowQuickSignup] = useState(false);
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const [showUsernameLogin, setShowUsernameLogin] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

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

  // --- Turnstile (Cloudflare bot check, shared by Quick Start + username login) ---
  const renderTurnstile = () => {
    if (!turnstileRef.current || !window.turnstile || turnstileWidgetId.current) return;

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) {
      // NEXT_PUBLIC_ vars are inlined at build time — if this is undefined here,
      // the deployment this is running on was built without the env var set
      // (e.g. added to a local .env but never added to Vercel's project env vars).
      console.error('NEXT_PUBLIC_TURNSTILE_SITE_KEY is missing from this build — Turnstile cannot render.');
      setErrorMsg('Human verification is not configured for this deployment. Please contact support.');
      return;
    }

    try {
      turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
        sitekey: siteKey,
        theme: 'light',
        callback: (token: string) => {
          setTurnstileToken(token);
          // If a click happened before the token was ready, run it now
          if (pendingActionRef.current) {
            if (pendingTimeoutRef.current) {
              clearTimeout(pendingTimeoutRef.current);
              pendingTimeoutRef.current = null;
            }
            const action = pendingActionRef.current;
            pendingActionRef.current = null;
            action();
          }
        },
        'error-callback': (errorCode: unknown) => {
          // Without this, a click that's still waiting on a token would be stuck
          // forever with the button disabled and no feedback — this is what was
          // causing the infinite "loading" state.
          console.error('Turnstile error-callback fired:', errorCode);
          if (pendingTimeoutRef.current) {
            clearTimeout(pendingTimeoutRef.current);
            pendingTimeoutRef.current = null;
          }
          pendingActionRef.current = null;
          setIsLoading(false);
          setErrorMsg('Human verification failed to load. Please refresh the page and try again.');
        },
      });
    } catch (renderError) {
      console.error('Turnstile render() threw:', renderError);
      setErrorMsg('Human verification failed to load. Please refresh the page and try again.');
    }
  };

  const resetTurnstile = () => {
    setTurnstileToken(null);
    if (window.turnstile && turnstileWidgetId.current) {
      window.turnstile.reset(turnstileWidgetId.current);
    }
  };

  // Runs `action` once a Turnstile token is available — immediately if we
  // already have one, otherwise as soon as the widget's callback resolves.
  // Falls back to a visible error instead of hanging forever if no token
  // shows up within a reasonable time (blocked script, ad-blocker, etc).
  const withVerification = (action: () => void) => {
    setErrorMsg(null);
    if (turnstileToken) {
      action();
      return;
    }

    pendingActionRef.current = action;
    setIsLoading(true);

    if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
    pendingTimeoutRef.current = setTimeout(() => {
      if (pendingActionRef.current) {
        pendingActionRef.current = null;
        setIsLoading(false);
        setErrorMsg('Verification timed out. Please refresh the page and try again.');
      }
    }, 10000);
  };

  // --- Quick Sign Up (user picks their own username & password) ---
  const doQuickSignup = async () => {
    if (!signupUsername.trim() || !signupPassword) {
      setErrorMsg('Please choose a username and password.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/quick-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: signupUsername.trim(), password: signupPassword, turnstileToken }),
      });
      const data = await res.json();
      resetTurnstile();

      if (res.ok) {
        redirectTo();
      } else {
        setErrorMsg(data.error || 'Could not create your account. Please try again.');
        setIsLoading(false);
      }
    } catch (error) {
      resetTurnstile();
      setErrorMsg(`Error: ${String(error)}`);
      setIsLoading(false);
    }
  };

  // --- Quick Login (returning quick-signup users) ---
  const doQuickLogin = async () => {
    if (!loginUsername.trim() || !loginPassword) {
      setErrorMsg('Please enter your username and password.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/quick-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword, turnstileToken }),
      });
      resetTurnstile();

      if (res.ok) {
        redirectTo();
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || 'Login failed. Please check your username and password.');
        setIsLoading(false);
      }
    } catch (error) {
      resetTurnstile();
      setErrorMsg(`Error: ${String(error)}`);
      setIsLoading(false);
    }
  };

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
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          onLoad={renderTurnstile}
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

          <div className="w-full flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Quick Start */}
          <button
            onClick={() => setShowQuickSignup(v => !v)}
            className="w-full flex items-center justify-center gap-2 bg-[#FF8A3D] hover:bg-[#FFB347] text-[#1F2937] font-bold text-sm py-3.5 rounded-full transition-colors mb-4"
          >
            <Zap size={16} />
            Guest Mode (No Email Address Required)
            <ChevronDown size={14} className={`transition-transform ${showQuickSignup ? 'rotate-180' : ''}`} />
          </button>

          {showQuickSignup && (
            <div className="w-full mb-6 text-left bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="flex items-center gap-1.5 text-slate-500 text-xs font-medium leading-relaxed">
                Pick your username and password.
              </p>
              <input
                type="text"
                placeholder="Choose a username"
                value={signupUsername}
                onChange={e => setSignupUsername(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-slate-400 transition-colors"
              />
              <div className="relative">
                <input
                  type={showSignupPassword ? 'text' : 'password'}
                  placeholder="Choose a password"
                  value={signupPassword}
                  onChange={e => setSignupPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') withVerification(doQuickSignup); }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-800 focus:outline-none focus:border-slate-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                >
                  {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button
                onClick={() => withVerification(doQuickSignup)}
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm py-3 rounded-full transition-colors"
              >
                Create Account
              </button>
            </div>
          )}

          {/* Returning quick-signup users */}
          <button
            onClick={() => setShowUsernameLogin(v => !v)}
            className="w-full flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900 text-xs font-bold transition-colors mb-4"
          >
            <KeyRound size={12} />
            Already have a Quick Start account?
            <ChevronDown size={14} className={`transition-transform ${showUsernameLogin ? 'rotate-180' : ''}`} />
          </button>

          {showUsernameLogin && (
            <div className="w-full space-y-3 mb-6 text-left animate-in fade-in slide-in-from-top-2 duration-200">
              <input
                type="text"
                placeholder="Username"
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-slate-400 transition-colors"
              />
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') withVerification(doQuickLogin); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-800 focus:outline-none focus:border-slate-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button
                onClick={() => withVerification(doQuickLogin)}
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm py-3 rounded-full transition-colors"
              >
                Log In
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="w-full bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-6 text-left break-words">
              {errorMsg}
            </div>
          )}

          {/* Invisible/managed Cloudflare Turnstile widget — usually renders nothing visible */}
          <div ref={turnstileRef} className="flex justify-center mb-2" />

          <p className="text-center text-slate-400 text-xs leading-relaxed">
            By signing in, you agree to our <br />
            <Link href="/terms" className="text-indigo-500 hover:text-indigo-600 font-medium">Terms of Service</Link> and <Link href="/privacy" className="text-indigo-500 hover:text-indigo-600 font-medium">Privacy Policy</Link>
          </p>
        </div>

      </div>
    </div>
  );
}
