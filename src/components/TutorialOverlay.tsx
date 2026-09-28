'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, X } from 'lucide-react';

export interface TutorialStep {
  targetId: string;
  title: string;
  text: string;
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  tutorialKey: string;
}

export default function TutorialOverlay({ steps, tutorialKey }: TutorialOverlayProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const hasCompleted = localStorage.getItem(`tutorial-completed-${tutorialKey}`);
    if (!hasCompleted) {
      setIsVisible(true);
    }
  }, [tutorialKey]);

  useEffect(() => {
    if (!isVisible || !mounted) return;

    const updateRect = () => {
      const step = steps[currentStepIndex];
      const el = document.getElementById(step.targetId);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    // Auto-scroll to element when step changes
    // Removed based on user feedback so the website doesn't get scrolled down
    const step = steps[currentStepIndex];
    if (step) {
      const el = document.getElementById(step.targetId);
      // if (el) {
      //   el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // }
    }

    updateRect();

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    
    const interval = setInterval(updateRect, 100);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      clearInterval(interval);
    };
  }, [currentStepIndex, isVisible, steps, mounted]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem(`tutorial-completed-${tutorialKey}`, 'true');
    const scrollContainer = document.getElementById('main-scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    localStorage.setItem(`tutorial-completed-${tutorialKey}`, 'true');
    const scrollContainer = document.getElementById('main-scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!mounted || !isVisible) return null;

  const currentStep = steps[currentStepIndex];

  let tooltipTop = 0;
  let tooltipLeft = 0;
  
  if (targetRect) {
    const isWideStep = (currentStepIndex === 4 || currentStepIndex === 0) && tutorialKey === 'plan-itinerary';
    const tooltipWidth = isWideStep ? 400 : 272;
    const tooltipHeight = isWideStep ? 350 : 220; // Approx height with video

    if (currentStepIndex === 0 && tutorialKey === 'plan-itinerary') {
      // Step 1: Place it to the right of the vault and higher up
      tooltipTop = targetRect.top + 100;
      tooltipLeft = targetRect.right + 30;
    } else {
      // Default positioning
      const spaceBelow = windowSize.height - targetRect.bottom;
      const spaceAbove = targetRect.top;
      
      if (spaceBelow < tooltipHeight + 30 && spaceAbove >= tooltipHeight + 30) {
        tooltipTop = targetRect.top - 20 - tooltipHeight; // Place above
      } else {
        tooltipTop = targetRect.bottom + 20; // Place below
      }
      tooltipLeft = targetRect.left;
    }

    // Failsafe clamps to guarantee it stays on screen vertically and horizontally
    if (tooltipTop + tooltipHeight > windowSize.height - 20) {
      tooltipTop = windowSize.height - tooltipHeight - 20;
    }
    if (tooltipTop < 20) {
      tooltipTop = 20;
    }
    if (tooltipLeft + tooltipWidth > windowSize.width - 20) {
      tooltipLeft = Math.max(20, windowSize.width - tooltipWidth - 20);
    }
  }

  const isWideStep = (currentStepIndex === 4 || currentStepIndex === 0) && tutorialKey === 'plan-itinerary';

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden font-sans">
      <AnimatePresence>
        {targetRect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            {/* Spotlight Overlay */}
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 200, damping: 25, mass: 0.8 }}
              className="absolute bg-transparent rounded-2xl"
              style={{
                top: targetRect.top - 8,
                left: targetRect.left - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
                boxShadow: "0 0 0 1.5px #b45cff, 0 0 0 6px rgba(180,92,255,0.14), 0 0 24px rgba(180,92,255,0.35), 0 0 0 9999px rgba(5,6,10,0.72)"
              }}
            />

            {/* Click Interceptor (Prevents clicking elements other than the highlighted one or the tooltip) */}
            <div className="absolute inset-0 pointer-events-auto" onClick={(e) => {
              if (
                e.clientX >= targetRect.left && e.clientX <= targetRect.right &&
                e.clientY >= targetRect.top && e.clientY <= targetRect.bottom
              ) {
                return;
              }
              e.preventDefault();
              e.stopPropagation();
            }} />

            {/* Tooltip Box */}
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.94, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              style={{
                top: tooltipTop,
                left: tooltipLeft,
              }}
              className={`absolute pointer-events-auto ${isWideStep ? 'w-[400px]' : 'w-[272px]'}`}
            >
              <div className="relative rounded-[18px] p-[18px_20px_16px] backdrop-blur-[24px] saturate-[180%] border border-[rgba(255,255,255,0.14)] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(255,255,255,0.10)] to-[rgba(255,255,255,0.02)]">
                
                {/* Nub / Pointer Removed */}

                <div className="relative z-10 flex flex-col h-full">
                  
                  {/* Gate / Step Info */}
                  <div className="font-mono text-[10.5px] tracking-[0.08em] text-[rgba(244,244,247,0.38)] uppercase mb-1.5">
                    <b className="text-[rgba(244,244,247,0.62)] font-medium">Step {currentStepIndex + 1}</b> of {steps.length}
                  </div>
                  
                  {/* Flight-path Indicator */}
                  <div className="flex items-center gap-0 mb-3.5">
                    {steps.map((_, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && (
                          <div className="flex-1 h-[1px] bg-[rgba(255,255,255,0.14)] relative mx-1 overflow-hidden">
                            <div 
                              className="absolute inset-0 bg-gradient-to-r from-[#ff6a4d] via-[#b45cff] to-[#4f7cff] origin-left transition-transform duration-500 ease-out" 
                              style={{ transform: i <= currentStepIndex ? 'scaleX(1)' : 'scaleX(0)' }} 
                            />
                          </div>
                        )}
                        <div className={`w-[7px] h-[7px] rounded-full transition-all duration-300 flex-none ${
                          i < currentStepIndex 
                            ? 'bg-[#b45cff] shadow-[0_0_8px_rgba(180,92,255,0.7)]' 
                            : i === currentStepIndex 
                              ? 'bg-[#b45cff] shadow-[0_0_8px_rgba(180,92,255,0.7)] scale-[1.3] animate-pulse' 
                              : 'bg-[rgba(255,255,255,0.18)]'
                        }`} />
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Copy Text */}
                  <div className="mb-4 flex flex-col gap-2">
                    {currentStep.title && (
                      <h3 className={`font-sans text-[15px] font-semibold leading-[1.35] tracking-[-0.01em] text-[#f4f4f7]`}>
                        {currentStep.title}
                      </h3>
                    )}

                    {currentStepIndex === 4 && tutorialKey === 'plan-itinerary' && (
                      <div className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.14)] shadow-lg my-1 bg-black/20 relative">
                        <video 
                          src="/itinerary_5.mp4" 
                          autoPlay 
                          loop 
                          muted 
                          playsInline 
                          className="w-full h-auto block"
                        />
                      </div>
                    )}
                    
                    {currentStepIndex === 0 && tutorialKey === 'plan-itinerary' && (
                      <div className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.14)] shadow-lg my-1 bg-black/20 relative">
                        <video 
                          src="/itinerary_1.mp4" 
                          autoPlay 
                          loop 
                          muted 
                          playsInline 
                          className="w-full h-auto block"
                        />
                      </div>
                    )}

                    {currentStep.text && (
                      <p className="font-sans text-[13px] leading-[1.5] text-[rgba(244,244,247,0.72)]">
                        {currentStep.text}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-auto">
                    <button
                      onClick={handleSkip}
                      className="text-[12px] text-[rgba(244,244,247,0.38)] hover:text-[rgba(244,244,247,0.62)] font-sans px-0.5 py-1 transition-colors"
                    >
                      Skip tutorial
                    </button>

                    <div className="flex items-center gap-2">
                      {currentStepIndex > 0 && (
                        <button
                          onClick={handleBack}
                          className="text-[12px] text-[rgba(244,244,247,0.62)] hover:text-[#f4f4f7] font-sans px-2 py-1 transition-colors"
                        >
                          Back
                        </button>
                      )}
                      <button
                        onClick={handleNext}
                        className="relative inline-flex items-center gap-1.5 text-white font-sans text-[13px] font-semibold px-4 py-[9px] rounded-[11px] bg-gradient-to-r from-[#ff6a4d] via-[#b45cff] to-[#4f7cff] shadow-[0_6px_18px_-6px_rgba(180,92,255,0.7)] hover:shadow-[0_8px_22px_-6px_rgba(180,92,255,0.9)] hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.97] transition-all group hover:bg-[length:160%_160%] hover:bg-[position:100%_50%]"
                        style={{ backgroundSize: '160% 160%', backgroundPosition: '0% 50%' }}
                      >
                        {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
                        <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3 transition-transform group-hover:translate-x-[2px]">
                          <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
