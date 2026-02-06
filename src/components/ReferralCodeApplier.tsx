import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

/**
 * Automatically applies a pending referral code stored in localStorage
 * after a user signs up and confirms their email.
 */
export function ReferralCodeApplier() {
  const { user } = useAuth();
  const { toast } = useToast();
  const applied = useRef(false);

  useEffect(() => {
    if (!user || applied.current) return;

    const pendingCode = localStorage.getItem('pending_referral_code');
    if (!pendingCode) return;

    applied.current = true;

    const applyCode = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('apply-referral', {
          body: { referral_code: pendingCode },
        });

        if (error || data?.error) {
          console.log('Referral apply skipped:', error?.message || data?.error);
        } else {
          toast({
            title: '🎉 Referral applied!',
            description: 'Your referral has been recorded. Thanks for joining through a friend!',
          });
        }
      } catch (err) {
        console.log('Referral apply error:', err);
      } finally {
        localStorage.removeItem('pending_referral_code');
      }
    };

    applyCode();
  }, [user, toast]);

  return null;
}
