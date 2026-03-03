import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

/**
 * Automatically tracks a pending NovaWealth referral after a user signs up.
 * Also applies the legacy local referral code if present.
 */
export function ReferralCodeApplier() {
  const { user } = useAuth();
  const { toast } = useToast();
  const applied = useRef(false);

  useEffect(() => {
    if (!user || applied.current) return;

    const nwReferralCode = localStorage.getItem('nw_referral_code');
    const nwReferrerId = localStorage.getItem('nw_referrer_id');
    const pendingCode = localStorage.getItem('pending_referral_code');

    if (!nwReferralCode && !pendingCode) return;

    applied.current = true;

    const applyReferrals = async () => {
      // 1. Track NovaWealth cross-app referral (server-side)
      if (nwReferralCode && nwReferrerId) {
        try {
          const { data, error } = await supabase.functions.invoke('track-nw-referral', {
            body: {
              referral_code: nwReferralCode,
              referrer_user_id: nwReferrerId,
              event: 'signup',
            },
          });

          if (!error && data?.success) {
            toast({
              title: '🎉 Referral tracked!',
              description: 'Your referral has been recorded. Welcome aboard!',
            });
          } else {
            console.log('NW referral tracking skipped:', error?.message || data?.error);
          }
        } catch (err) {
          console.log('NW referral tracking error:', err);
        } finally {
          localStorage.removeItem('nw_referral_code');
          localStorage.removeItem('nw_referrer_id');
          localStorage.removeItem('referral_code');
        }
      }

      // 2. Legacy local referral code
      if (pendingCode && !nwReferralCode) {
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
      }
    };

    applyReferrals();
  }, [user, toast]);

  return null;
}
