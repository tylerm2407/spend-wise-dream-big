import { ReactNode } from 'react';
import { BottomTabBar } from './BottomTabBar';

interface AppLayoutProps {
  children: ReactNode;
  showTabBar?: boolean;
}

export function AppLayout({ children, showTabBar = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className={showTabBar ? 'pb-20' : ''}>{children}</div>
      {showTabBar && <BottomTabBar />}
    </div>
  );
}
