import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

const NW_KEYS = {
  email: 'nw_user_email',
  userId: 'nw_user_id',
  tier: 'nw_tier',
  loginMethod: 'nw_login_method',
} as const;

interface NovaWealthSession {
  email: string;
  userId: string;
  tier: 'free' | 'pro';
  loginMethod: 'novawealth';
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
  if (!email || !userId || !tier) return null;
  return { email, userId, tier, loginMethod: 'novawealth' };
}

export function NovaWealthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<NovaWealthSession | null>(loadSession);

  const saveSession = useCallback((data: { email: string; user_id: string; tier: string }) => {
    localStorage.setItem(NW_KEYS.email, data.email);
    localStorage.setItem(NW_KEYS.userId, data.user_id);
    localStorage.setItem(NW_KEYS.tier, data.tier);
    localStorage.setItem(NW_KEYS.loginMethod, 'novawealth');
    setSession({
      email: data.email,
      userId: data.user_id,
      tier: data.tier as 'free' | 'pro',
      loginMethod: 'novawealth',
    });
  }, []);

  const clearSession = useCallback(() => {
    Object.values(NW_KEYS).forEach((k) => localStorage.removeItem(k));
    setSession(null);
  }, []);

  const isNovaWealthUser = session !== null;
  const hasNWProAccess = session?.tier === 'pro';

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
