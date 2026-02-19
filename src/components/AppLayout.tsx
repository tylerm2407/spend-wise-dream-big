import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar';
import { NotificationBell } from './NotificationBell';
import { OfflineBanner } from './OfflineBanner';
import { useOfflineSync } from '@/hooks/useOfflineQueue';
import { useSubscription } from '@/hooks/useSubscription';
import { useGuest } from '@/hooks/useGuest';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, User, UserX, LogIn } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
  showTabBar?: boolean;
}

function TierBadge() {
  const { hasProAccess, isInTrial, loading } = useSubscription();
  const { isGuest } = useGuest();
  if (loading) return null;

  if (isGuest) {
    return (
      <Badge variant="secondary" className="gap-1 text-[10px] px-2 py-0.5">
        <UserX className="h-3 w-3" />
        Guest
      </Badge>
    );
  }

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

function GuestBanner() {
  const { isGuest, exitGuestMode } = useGuest();
  const navigate = useNavigate();

  if (!isGuest) return null;

  return (
    <div className="bg-muted border-b border-border px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground min-w-0">
        <UserX className="h-4 w-4 shrink-0" />
        <span className="truncate">You're browsing as a guest — data won't be saved</span>
      </div>
      <Button
        size="sm"
        className="shrink-0 h-7 px-3 text-xs bg-gradient-primary hover:opacity-90"
        onClick={() => {
          exitGuestMode();
          navigate('/signup');
        }}
      >
        <LogIn className="h-3 w-3 mr-1" />
        Sign up free
      </Button>
    </div>
  );
}

export function AppLayout({ children, showTabBar = true }: AppLayoutProps) {

  return (
    <div className="min-h-screen bg-background pt-[env(safe-area-inset-top)]">
      <OfflineBanner />
      <GuestBanner />
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
