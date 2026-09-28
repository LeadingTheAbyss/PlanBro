'use client';

import React, { useEffect, useState } from 'react';

import { useAuthStore } from '@/store/authStore';

export function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);
  const { fetchUser } = useAuthStore();

  useEffect(() => {
    setHasMounted(true);
    fetchUser();
  }, [fetchUser]);

  if (!hasMounted) {
    return <div className="min-h-screen bg-zinc-50 flex items-center justify-center text-zinc-400">Loading application...</div>;
  }

  return <>{children}</>;
}
