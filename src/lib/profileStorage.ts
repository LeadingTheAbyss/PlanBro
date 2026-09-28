export interface StoredUserProfile {
  displayName?: string;
  username?: string;
  pfp?: string;
  about?: string;
  city?: string;
  email?: string;
  isAdmin?: boolean;
  socials?: Record<string, string | undefined>;
}

function scopedProfileKey(userId?: string | null): string | null {
  return userId ? `brewplans_user_profile_${userId}` : null;
}

// Custom profile data (display name, avatar, bio, socials) is scoped per
// account — without this, switching accounts in the same browser leaks the
// previous account's cached identity into the new one.
export function readUserProfile(userId?: string | null): StoredUserProfile | null {
  if (typeof window === 'undefined') return null;
  const key = scopedProfileKey(userId);
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeUserProfile(userId: string, data: StoredUserProfile): void {
  if (typeof window === 'undefined') return;
  const key = scopedProfileKey(userId);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}
