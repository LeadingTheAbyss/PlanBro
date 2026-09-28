'use client';

import React, { useState } from 'react';

interface UserAvatarProps {
  user: { name: string; picture?: string | null };
  className?: string; // Optional custom classes (e.g., for size)
}

export function UserAvatar({ user, className = "w-8 h-8 text-xs" }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-600', 'bg-orange-600', 'bg-amber-600', 'bg-green-600', 
      'bg-emerald-600', 'bg-teal-600', 'bg-cyan-600', 'bg-blue-600', 
      'bg-indigo-600', 'bg-violet-600', 'bg-purple-600', 'bg-fuchsia-600', 'bg-pink-600', 'bg-rose-600'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (user.picture && !imgError) {
    return (
      <img 
        src={user.picture} 
        alt={user.name} 
        className={`rounded-full object-cover border border-white/20 ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={`rounded-full flex items-center justify-center font-bold tracking-widest text-white border border-white/20 shadow-sm ${getAvatarColor(user.name)} ${className}`}>
      {getInitials(user.name)}
    </div>
  );
}
