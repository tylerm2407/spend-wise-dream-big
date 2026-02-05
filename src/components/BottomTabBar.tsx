import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, BarChart3, Lightbulb, Trophy, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/hooks/useHaptics';

const tabs = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/insights', label: 'Insights', icon: BarChart3 },
  { path: '/alternatives', label: 'Alternatives', icon: Lightbulb },
  { path: '/challenges', label: 'Challenges', icon: Trophy },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function BottomTabBar() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-tabbar border-t border-tabbar-border safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path || 
            (tab.path === '/home' && location.pathname === '/dashboard');
          const Icon = tab.icon;

          const handleTabPress = () => {
            if (!isActive) {
              triggerHaptic('selection');
            }
          };

          return (
            <Link
              key={tab.path}
              to={tab.path}
              onClick={handleTabPress}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2 relative touch-target"
              aria-label={tab.label}
            >
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute inset-x-4 -top-0.5 h-0.5 bg-cta rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <motion.div
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isActive ? 'text-cta' : 'text-muted-foreground'
                  )}
                />
              </motion.div>
              <span
                className={cn(
                  'text-2xs font-medium transition-colors',
                  isActive ? 'text-cta' : 'text-muted-foreground'
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
