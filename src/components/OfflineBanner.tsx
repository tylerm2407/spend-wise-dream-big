import { WifiOff, CloudOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { getOfflineQueueCount } from '@/hooks/useOfflineQueue';
import { motion, AnimatePresence } from 'framer-motion';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const pendingCount = getOfflineQueueCount();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2.5 flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-xs font-medium text-destructive">
              You're offline — purchases will be saved and synced when you reconnect
              {pendingCount > 0 && (
                <span className="ml-1 inline-flex items-center gap-1">
                  <CloudOff className="h-3 w-3 inline" />
                  {pendingCount} pending
                </span>
              )}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
