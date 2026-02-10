import { useState, useRef, useCallback, ReactNode } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

const THRESHOLD = 80;

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, THRESHOLD], [0, 1]);
  const rotate = useTransform(y, [0, THRESHOLD], [0, 360]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || isRefreshing) return;
    const diff = Math.max(0, (e.touches[0].clientY - startY.current) * 0.5);
    y.set(Math.min(diff, THRESHOLD + 20));
  }, [isRefreshing, y]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current || isRefreshing) return;
    pulling.current = false;

    if (y.get() >= THRESHOLD) {
      setIsRefreshing(true);
      y.set(50);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        y.set(0);
      }
    } else {
      y.set(0);
    }
  }, [isRefreshing, onRefresh, y]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      <motion.div
        style={{ opacity }}
        className="absolute left-1/2 -translate-x-1/2 top-2 z-10 flex items-center justify-center"
      >
        {isRefreshing ? (
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        ) : (
          <motion.div style={{ rotate }}>
            <Loader2 className="h-6 w-6 text-muted-foreground" />
          </motion.div>
        )}
      </motion.div>
      <motion.div style={{ y }}>
        {children}
      </motion.div>
    </div>
  );
}
