import { ReactNode } from 'react';
import { BottomTabBar } from './BottomTabBar';
import { NotificationBell } from './NotificationBell';
import { OfflineBanner } from './OfflineBanner';
import { useOfflineSync } from '@/hooks/useOfflineQueue';
import { useSubscription } from '@/hooks/useSubscription';
import { Badge } from '@/components/ui/badge';
import { Crown, User } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
  showTabBar?: boolean;
}

function TierBadge() {
  const { hasProAccess, isInTrial, loading } = useSubscription();
  if (loading) return null;

  if (hasProAccess) {
    return (
      <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 gap-1 text-[10px] px-2 py-0.5 shadow-sm">
        <Crown className="h-3 w-3" />
        {isInTrial ? 'Pro Trial' : 'Pro'}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1 text-[10px] px-2 py-0.5">
      <User className="h-3 w-3" />
      Free
    </Badge>
  );
}

export function AppLayout({ children, showTabBar = true }: AppLayoutProps) {

  return (
    <div className="min-h-screen bg-background pt-[env(safe-area-inset-top)]">
      <OfflineBanner />
      {/* Notification bell - fixed position */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <TierBadge />
        <NotificationBell />
      </div>
      <div className={showTabBar ? 'pb-20' : ''}>{children}</div>
      {showTabBar && <BottomTabBar />}
    </div>
  );
}
