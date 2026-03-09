import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

const NW_KEYS = {
  email: 'nw_user_email',
  userId: 'nw_user_id',
  tier: 'nw_tier',
  loginMethod: 'nw_login_method',
  verifiedAt: 'nw_verified_at',
} as const;

// Tier from localStorage is only trusted for this long; after expiry hasNWProAccess returns false
const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

interface NovaWealthSession {
  email: string;
  userId: string;
  tier: 'free' | 'pro';
  loginMethod: 'novawealth';
  verifiedAt: number;
}

interface NovaWealthContextType {
  isNovaWealthUser: boolean;
  session: NovaWealthSession | null;
  hasNWProAccess: boolean;
  saveSession: (data: { email: string; user_id: string; tier: string }) => void;
  clearSession: () => void;
}

const NovaWealthContext = createContext<NovaWealthContextType | undefined>(undefined);

function loadSession(): NovaWealthSession | null {
  const method = localStorage.getItem(NW_KEYS.loginMethod);
  if (method !== 'novawealth') return null;
  const email = localStorage.getItem(NW_KEYS.email);
  const userId = localStorage.getItem(NW_KEYS.userId);
  const tier = localStorage.getItem(NW_KEYS.tier) as 'free' | 'pro';
  const verifiedAt = parseInt(localStorage.getItem(NW_KEYS.verifiedAt) ?? '0', 10);
  if (!email || !userId || !tier) return null;
  return { email, userId, tier, loginMethod: 'novawealth', verifiedAt };
}

export function NovaWealthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<NovaWealthSession | null>(loadSession);

  const saveSession = useCallback((data: { email: string; user_id: string; tier: string }) => {
    const verifiedAt = Date.now();
    localStorage.setItem(NW_KEYS.email, data.email);
    localStorage.setItem(NW_KEYS.userId, data.user_id);
    localStorage.setItem(NW_KEYS.tier, data.tier);
    localStorage.setItem(NW_KEYS.loginMethod, 'novawealth');
    localStorage.setItem(NW_KEYS.verifiedAt, String(verifiedAt));
    setSession({
      email: data.email,
      userId: data.user_id,
      tier: data.tier as 'free' | 'pro',
      loginMethod: 'novawealth',
      verifiedAt,
    });
  }, []);

  const clearSession = useCallback(() => {
    Object.values(NW_KEYS).forEach((k) => localStorage.removeItem(k));
    setSession(null);
  }, []);

  const isNovaWealthUser = session !== null;
  // Only trust the tier if it was server-verified within the last hour.
  // After expiry, Pro access is revoked until the user re-authenticates via NovaWealth.
  const isSessionFresh = session !== null && (Date.now() - session.verifiedAt) < SESSION_EXPIRY_MS;
  const hasNWProAccess = isSessionFresh && session?.tier === 'pro';

  return (
    <NovaWealthContext.Provider value={{ isNovaWealthUser, session, hasNWProAccess, saveSession, clearSession }}>
      {children}
    </NovaWealthContext.Provider>
  );
}

export function useNovaWealth() {
  const ctx = useContext(NovaWealthContext);
  if (!ctx) throw new Error('useNovaWealth must be used within NovaWealthProvider');
  return ctx;
}
