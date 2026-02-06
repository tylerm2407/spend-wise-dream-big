import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';

interface Referral {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  created_at: string;
  rewarded: boolean;
}

export function useReferrals() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['referrals', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Referral[];
    },
    enabled: !!profile?.id,
  });

  const applyReferralCode = useMutation({
    mutationFn: async (referralCode: string) => {
      const { data, error } = await supabase.functions.invoke('apply-referral', {
        body: { referral_code: referralCode },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const totalReferrals = referrals.length;
  const referralsToNextReward = 5 - (totalReferrals % 5);
  const totalBonusDays = profile?.referral_bonus_days ?? 0;
  const referralCode = profile?.referral_code ?? '';

  const shareUrl = `${window.location.origin}/signup?ref=${referralCode}`;

  const shareReferral = async () => {
    const shareData = {
      title: 'Join SpendWise - True Cost',
      text: `Use my referral code ${referralCode} to join SpendWise and start saving smarter!`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        await navigator.clipboard.writeText(shareUrl);
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  return {
    referrals,
    isLoading,
    totalReferrals,
    referralsToNextReward,
    totalBonusDays,
    referralCode,
    shareUrl,
    shareReferral,
    applyReferralCode: applyReferralCode.mutateAsync,
    isApplying: applyReferralCode.isPending,
  };
}
