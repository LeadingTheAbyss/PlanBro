'use client';

import React from 'react';
import { useDestinationTheme } from '@/hooks/useDestinationTheme';
import { usePathname } from 'next/navigation';

export function PlanThemeWrapper({ children }: { children: React.ReactNode }) {
  const { activeTheme, dynamicBg, currentTheme } = useDestinationTheme();
  const pathname = usePathname();
  
  // Do not apply on non-plan pages just in case this wrapper is accidentally used elsewhere
  if (!pathname.startsWith('/plan')) {
    return <>{children}</>;
  }

  return (
    <div 
      className={`w-full h-full flex flex-col transition-all duration-1000 overflow-hidden ${!dynamicBg ? activeTheme.bg : ''}`} 
      style={{ backgroundColor: dynamicBg || undefined }}
    >
      {/* Faded Background Image */}
      {currentTheme !== 'default' && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div 
            className="absolute inset-0 opacity-[0.15] mix-blend-overlay transition-all duration-1000 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${activeTheme.imageUrl})` }}
          />
        </div>
      )}
      
      {/* Page Content */}
      <div className="relative z-10 w-full h-full flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
