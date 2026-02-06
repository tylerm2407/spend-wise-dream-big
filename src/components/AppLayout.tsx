import { ReactNode } from 'react';
import { BottomTabBar } from './BottomTabBar';
import { NotificationBell } from './NotificationBell';

interface AppLayoutProps {
  children: ReactNode;
  showTabBar?: boolean;
}

export function AppLayout({ children, showTabBar = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Notification bell - fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <NotificationBell />
      </div>
      <div className={showTabBar ? 'pb-20' : ''}>{children}</div>
      {showTabBar && <BottomTabBar />}
    </div>
  );
}
