import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, Copy, Share2, Users, Check, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useReferrals } from '@/hooks/useReferrals';
import { useToast } from '@/hooks/use-toast';

export function ReferralProgram() {
  const {
    totalReferrals,
    referralsToNextReward,
    totalBonusDays,
    referralCode,
    shareUrl,
    shareReferral,
  } = useReferrals();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const progressToNext = ((5 - referralsToNextReward) / 5) * 100;

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast({ title: 'Referral code copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: 'Referral link copied!' });
  };

  const handleShare = async () => {
    await shareReferral();
    toast({ title: 'Share dialog opened!' });
  };

  return (
    <div className="space-y-4">
      {/* Stats Header */}
      <Card className="p-6 glass-card border-primary/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Gift className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Referral Program</h3>
            <p className="text-sm text-muted-foreground">
              Get 30 days free for every 5 friends you refer
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="text-center p-3 rounded-xl bg-muted/50">
            <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">{totalReferrals}</p>
            <p className="text-xs text-muted-foreground">Referred</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/50">
            <Trophy className="h-5 w-5 mx-auto mb-1 text-warning" />
            <p className="text-xl font-bold">{Math.floor(totalReferrals / 5)}</p>
            <p className="text-xs text-muted-foreground">Rewards</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/50">
            <Gift className="h-5 w-5 mx-auto mb-1 text-success" />
            <p className="text-xl font-bold">{totalBonusDays}</p>
            <p className="text-xs text-muted-foreground">Free Days</p>
          </div>
        </div>

        {/* Progress to Next Reward */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress to next reward</span>
            <span className="font-medium">
              {5 - referralsToNextReward}/5 referrals
            </span>
          </div>
          <Progress value={progressToNext} className="h-3" />
          <p className="text-xs text-muted-foreground text-center">
            {referralsToNextReward} more {referralsToNextReward === 1 ? 'referral' : 'referrals'} until your next 30 free days!
          </p>
        </div>
      </Card>

      {/* Referral Code */}
      <Card className="p-5 glass-card">
        <h4 className="font-medium mb-3">Your Referral Code</h4>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={referralCode}
              readOnly
              className="font-mono text-lg text-center tracking-widest font-bold pr-10"
            />
            <button
              onClick={handleCopyCode}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? (
                <Check className="h-5 w-5 text-success" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCopyLink}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
          <Button
            className="flex-1 bg-gradient-primary"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </Card>

      {/* How it Works */}
      <Card className="p-5 glass-card">
        <h4 className="font-medium mb-3">How It Works</h4>
        <div className="space-y-3">
          {[
            { step: '1', text: 'Share your unique referral code or link with friends' },
            { step: '2', text: 'They sign up using your code' },
            { step: '3', text: 'For every 5 friends who join, you get 30 days free!' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">{item.step}</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">{item.text}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
