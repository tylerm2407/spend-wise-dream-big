import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Crown, CreditCard, Check, X, Apple, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';

interface PaywallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  { name: 'Manual expense tracking', free: true, pro: true },
  { name: 'Work-hours cost view', free: true, pro: true },
  { name: 'Up to 2 savings goals', free: true, pro: false },
  { name: 'Unlimited savings goals', free: false, pro: true },
  { name: '1 alternative per search', free: true, pro: false },
  { name: 'Unlimited AI alternatives', free: false, pro: true },
  { name: 'AI receipt scanning', free: false, pro: true },
  { name: 'Monthly AI spending recap', free: false, pro: true },
  { name: 'Weekly savings challenges', free: false, pro: true },
  { name: 'Advanced analytics & trends', free: false, pro: true },
  { name: 'Price alerts & patterns', free: false, pro: true },
];

interface ReferralValidation {
  valid: boolean;
  referrer_id: string;
  code: string;
  discount_percent: number;
}

export function PaywallDialog({ open, onOpenChange }: PaywallDialogProps) {
  const { openCheckout } = useSubscription();
  const { isNative, offerings, purchasePackage, loading: rcLoading } = useRevenueCat();
  const { user } = useAuth();
  const { toast } = useToast();
  const [purchasing, setPurchasing] = useState(false);

  // Referral state
  const [referralOpen, setReferralOpen] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralValidating, setReferralValidating] = useState(false);
  const [referralResult, setReferralResult] = useState<ReferralValidation | null>(null);
  const [referralError, setReferralError] = useState('');

  const validateReferralCode = async () => {
    if (!referralCode.trim()) return;
    setReferralValidating(true);
    setReferralError('');
    setReferralResult(null);

    try {
      const { data: secretData } = await supabase.functions.invoke('validate-nova-token', {
        body: { action: 'get-cross-app-secret' },
      });
      const crossAppSecret = secretData?.secret || '';

      const res = await fetch('https://dbwuegchdysuocbpsprd.supabase.co/functions/v1/validate-referral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': crossAppSecret,
        },
        body: JSON.stringify({
          referral_code: referralCode.trim(),
          user_email: user?.email || '',
        }),
      });
      const data = await res.json();
      if (data.valid) {
        setReferralResult(data);
      } else {
        setReferralError('Invalid referral code. Please check and try again.');
      }
    } catch {
      setReferralError('Could not validate code. Please try again.');
    } finally {
      setReferralValidating(false);
    }
  };

  const handleStripeSubscribe = async () => {
    // Store referral data before checkout so success page can track it
    if (referralResult) {
      sessionStorage.setItem('nw_referral', JSON.stringify({
        referral_code: referralResult.code,
        referrer_id: referralResult.referrer_id,
        referred_email: user?.email || '',
      }));
    }

    await openCheckout(referralResult ? {
      referral_code: referralResult.code,
      referrer_id: referralResult.referrer_id,
    } : undefined);
    onOpenChange(false);
  };

  const handleNativePurchase = async () => {
    if (offerings.length === 0) {
      toast({
        title: 'No offerings available',
        description: 'Please try again later.',
        variant: 'destructive',
      });
      return;
    }

    setPurchasing(true);
    try {
      await purchasePackage(offerings[0].identifier);
      toast({ title: 'Welcome to Pro!', description: 'Your subscription is now active.' });
      onOpenChange(false);
    } catch (err: any) {
      const isCancelled = err?.code === 1 || err?.message?.includes('cancelled');
      if (!isCancelled) {
        toast({
          title: 'Purchase failed',
          description: 'Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setPurchasing(false);
    }
  };

  const nativePriceString = offerings.length > 0 ? offerings[0].product.priceString : '$4.99/mo';
  const showDiscount = !!referralResult;
  const discountedPrice = showDiscount ? '$3.99' : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center mb-2">
            <Crown className="w-7 h-7 text-primary-foreground" />
          </div>
          <DialogTitle className="text-xl">Upgrade to CostClarity Pro</DialogTitle>
          <DialogDescription className="text-base pt-1">
            Unlock unlimited goals, AI alternatives, and all premium features
          </DialogDescription>
        </DialogHeader>

        {/* Feature Comparison */}
        <div className="rounded-lg border border-border overflow-hidden mt-2">
          <div className="grid grid-cols-3 bg-muted/50 p-3 text-sm font-medium">
            <span>Feature</span>
            <span className="text-center">Free</span>
            <span className="text-center text-primary">Pro</span>
          </div>
          <div className="divide-y divide-border">
            {features.map((feature) => (
              <div key={feature.name} className="grid grid-cols-3 p-3 text-sm items-center">
                <span className="text-muted-foreground">{feature.name}</span>
                <div className="flex justify-center">
                  {feature.free ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex justify-center">
                  {feature.pro ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-primary/10 rounded-lg p-4 text-center border border-primary/20">
          {showDiscount ? (
            <>
              <div className="text-lg line-through text-muted-foreground">$4.99</div>
              <div className="text-3xl font-bold text-primary">{discountedPrice}</div>
              <div className="text-muted-foreground text-sm">per month for first 3 months (20% off!)</div>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold text-primary">
                {isNative ? nativePriceString : '$4.99'}
              </div>
              <div className="text-muted-foreground text-sm">per month</div>
            </>
          )}
          <div className="text-xs text-muted-foreground mt-1">Cancel anytime</div>
        </div>

        {/* Referral Code Section - web only */}
        {!isNative && (
          <Collapsible open={referralOpen} onOpenChange={setReferralOpen}>
            <CollapsibleTrigger className="flex items-center justify-center gap-1 w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
              Have a referral code?
              {referralOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-1">
              <div className="flex gap-2">
                <Input
                  placeholder="NW-XXXXXXXX"
                  value={referralCode}
                  onChange={(e) => {
                    setReferralCode(e.target.value);
                    setReferralResult(null);
                    setReferralError('');
                  }}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={validateReferralCode}
                  disabled={!referralCode.trim() || referralValidating}
                  className="shrink-0"
                >
                  {referralValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                </Button>
              </div>
              {referralResult && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>20% off your first 3 paid months!</span>
                </div>
              )}
              {referralError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span>{referralError}</span>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {isNative ? (
          <>
            <Button
              onClick={handleNativePurchase}
              className="w-full h-12 text-lg bg-gradient-primary glow"
              size="lg"
              disabled={purchasing || rcLoading}
            >
              <Apple className="w-5 h-5 mr-2" />
              {purchasing ? 'Processing...' : 'Subscribe with Apple'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Payment through your Apple ID. Manage in iOS Settings → Subscriptions.
            </p>
          </>
        ) : (
          <div className="space-y-3">
            {/* Standalone CostClarity subscription */}
            <Button
              onClick={handleStripeSubscribe}
              className="w-full h-12 text-lg bg-gradient-primary glow"
              size="lg"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Subscribe to CostClarity – $4.99/mo
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Unlocks all CostClarity Pro features. Cancel anytime.
            </p>

            {/* NovaWealth bundle option */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full h-12 text-base border-primary/30 hover:border-primary/60"
              size="lg"
              onClick={() => window.open('https://novawealthhq.com/pricing', '_blank')}
            >
              <Crown className="w-5 h-5 mr-2 text-primary" />
              NovaWealth Bundle – $9.99/mo
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Unlocks CostClarity + all NovaWealth apps. Managed through NovaWealth.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
