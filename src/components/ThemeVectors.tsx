import React from 'react';

export const ThemeVector = ({ theme, className }: { theme: string, className?: string }) => {
  switch (theme) {
    case 'snow_alpine_mountains':
      return (
        <svg className={className} viewBox="0 0 1000 600" preserveAspectRatio="none" fill="currentColor">
          <path d="M-50,600 L-50,300 L150,150 L350,400 L550,100 L750,350 L900,180 L1050,400 L1050,600 Z" opacity="0.4" />
          <path d="M-50,600 L-50,400 L250,200 L450,450 L650,250 L850,450 L1050,250 L1050,600 Z" opacity="0.6" />
          <path d="M-50,600 L100,350 L300,250 L500,500 L750,200 L950,450 L1050,350 L1050,600 Z" opacity="0.8" />
        </svg>
      );
    case 'tropical_beaches':
      return (
        <svg className={className} viewBox="0 0 1000 300" preserveAspectRatio="none" fill="currentColor">
          <path d="M0,300 Q150,200 300,250 T600,220 T1000,250 L1000,300 Z" opacity="0.4" />
          <path d="M0,300 Q200,220 400,270 T800,240 T1000,280 L1000,300 Z" opacity="0.6" />
          <path d="M0,300 Q250,250 500,280 T900,260 T1000,290 L1000,300 Z" opacity="0.8" />
        </svg>
      );
    case 'arid_desert':
      return (
        <svg className={className} viewBox="0 0 1000 300" preserveAspectRatio="none" fill="currentColor">
          <path d="M0,300 Q200,150 400,250 T800,180 T1000,250 L1000,300 Z" opacity="0.4" />
          <path d="M0,300 Q300,200 600,260 T1000,200 L1000,300 Z" opacity="0.6" />
        </svg>
      );
    case 'lush_jungles':
    case 'misty_tea_hills':
      return (
        <svg className={className} viewBox="0 0 1000 300" preserveAspectRatio="none" fill="currentColor">
          <path d="M0,300 Q150,100 300,200 T600,150 T1000,220 L1000,300 Z" opacity="0.3" />
          <path d="M0,300 Q200,150 400,250 T800,180 T1000,250 L1000,300 Z" opacity="0.5" />
          <path d="M0,300 Q250,200 500,280 T900,200 T1000,280 L1000,300 Z" opacity="0.7" />
        </svg>
      );
    case 'historic_heritage':
    case 'spiritual_sacred':
      return (
        <svg className={className} viewBox="0 0 1000 300" preserveAspectRatio="none" fill="currentColor">
          <path d="M100,300 L100,200 L150,150 L200,200 L200,300 Z" opacity="0.5"/>
          <path d="M300,300 L300,150 L350,100 L400,150 L400,300 Z" opacity="0.4"/>
          <path d="M500,300 L500,180 L550,130 L600,180 L600,300 Z" opacity="0.5"/>
          <path d="M700,300 L700,120 L750,70 L800,120 L800,300 Z" opacity="0.3"/>
          <path d="M900,300 L900,220 L925,190 L950,220 L950,300 Z" opacity="0.6"/>
        </svg>
      );
    case 'backwaters_lakes':
    case 'waterfalls_valleys':
      return (
        <svg className={className} viewBox="0 0 1000 300" preserveAspectRatio="none" fill="currentColor">
          <path d="M0,300 Q150,220 300,260 T600,240 T1000,270 L1000,300 Z" opacity="0.4" />
          <path d="M0,300 Q250,260 500,280 T900,260 T1000,290 L1000,300 Z" opacity="0.6" />
        </svg>
      );
    default:
      return null;
  }
};
