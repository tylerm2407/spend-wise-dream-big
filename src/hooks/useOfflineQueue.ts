import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type PurchaseInsert = Database['public']['Tables']['purchases']['Insert'];

const QUEUE_KEY = 'truecost_offline_queue';

interface QueuedPurchase {
  id: string;
  data: Omit<PurchaseInsert, 'user_id'>;
  timestamp: number;
}

function getQueue(): QueuedPurchase[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedPurchase[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function addToOfflineQueue(purchase: Omit<PurchaseInsert, 'user_id'>) {
  const queue = getQueue();
  queue.push({
    id: crypto.randomUUID(),
    data: purchase,
    timestamp: Date.now(),
  });
  saveQueue(queue);
}

export function getOfflineQueueCount(): number {
  return getQueue().length;
}

export function useOfflineSync() {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const isSyncing = useRef(false);

  const syncQueue = useCallback(async () => {
    if (!user || isSyncing.current) return;

    const queue = getQueue();
    if (queue.length === 0) return;

    isSyncing.current = true;
    let synced = 0;
    const failed: QueuedPurchase[] = [];

    for (const item of queue) {
      try {
        const { error } = await supabase
          .from('purchases')
          .insert({ ...item.data, user_id: user.id });

        if (error) throw error;
        synced++;
      } catch {
        failed.push(item);
      }
    }

    saveQueue(failed);
    isSyncing.current = false;

    if (synced > 0) {
      queryClient.invalidateQueries({ queryKey: ['purchases', user.id] });
      toast.success(`Synced ${synced} offline purchase${synced > 1 ? 's' : ''}`, {
        description: failed.length > 0 ? `${failed.length} still pending` : undefined,
      });
    }
  }, [user, queryClient]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && user) {
      syncQueue();
    }
  }, [isOnline, user, syncQueue]);

  return { syncQueue, pendingCount: getQueue().length };
}
