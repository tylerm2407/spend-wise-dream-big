import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PricingCards, ReferralDiscount } from '@/components/PricingCards';
import { CompoundInterestCalculator } from '@/components/CompoundInterestCalculator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Gift, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function Subscriptions() {
  const [referralCode, setReferralCode] = useState('');
  const [referralDiscount, setReferralDiscount] = useState<ReferralDiscount | null>(null);
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);
  const [referralStatus, setReferralStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const { toast } = useToast();

  const validateReferralCode = useCallback(async (code: string) => {
    if (!code || code.length < 4) {
      setReferralDiscount(null);
      setReferralStatus('idle');
      return;
    }

    setIsValidatingReferral(true);
    setReferralStatus('idle');

    try {
      const validateRes = await fetch(`${SUPABASE_URL}/functions/v1/validate-nw-referral`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          referral_code: code.toUpperCase(),
          referred_user_id: null,
        }),
      });
      const validateData = await validateRes.json();

      if (validateData.valid) {
        const discount: ReferralDiscount = {
          valid: true,
          percentOff: validateData.discount?.value ?? 20,
          durationMonths: validateData.discount?.duration_months ?? 3,
          referralCode: code.toUpperCase(),
          referrerId: validateData.referrer_user_id,
          referralCodeId: validateData.referral_code_id,
        };
        setReferralDiscount(discount);
        setReferralStatus('valid');
        localStorage.setItem('referral_code', code.toUpperCase());
        toast({
          title: '🎉 Referral code valid!',
          description: `${discount.percentOff}% off for your first ${discount.durationMonths} months on the monthly plan!`,
        });
      } else {
        setReferralDiscount(null);
        setReferralStatus('invalid');
        const reasons: Record<string, string> = {
          expired_or_not_found: 'This referral code is expired or invalid.',
          self_referral: "You can't use your own referral code.",
          already_used_for_app: "You've already used a referral for this app.",
          no_code_provided: 'No referral code provided.',
        };
        toast({
          title: 'Invalid referral code',
          description: reasons[validateData.reason] || 'Could not validate referral code.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Referral validation error:', err);
      setReferralStatus('idle');
    } finally {
      setIsValidatingReferral(false);
    }
  }, [toast]);

  const handleReferralChange = (value: string) => {
    const code = value.toUpperCase();
    setReferralCode(code);
    setReferralStatus('idle');
    setReferralDiscount(null);
  };

  const handleReferralPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').trim().toUpperCase();
    if (pasted) {
      setTimeout(() => validateReferralCode(pasted), 100);
    }
  };

  const handleReferralBlur = () => {
    if (referralCode && referralStatus === 'idle') {
      validateReferralCode(referralCode);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-hero">
        <main className="px-6 pt-6 pb-8 space-y-8">
          <Alert className="border-primary/30 bg-primary/5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">No credit card required</span> — enjoy your full 30-day free trial with zero charges. You'll only be asked for payment info if you choose to continue after the trial ends.
            </AlertDescription>
          </Alert>

          {/* Referral Code Input */}
          <div className="max-w-sm mx-auto">
            <Label htmlFor="sub-referralCode" className="flex items-center gap-2 mb-2">
              <Gift className="h-4 w-4 text-primary" />
              Have a referral code?
            </Label>
            <div className="relative">
              <Input
                id="sub-referralCode"
                value={referralCode}
                onChange={(e) => handleReferralChange(e.target.value)}
                onPaste={handleReferralPaste}
                onBlur={handleReferralBlur}
                placeholder="e.g. NW-A1B2C3D4"
                className="h-12 touch-target font-mono tracking-widest pr-10"
                aria-label="Referral code"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isValidatingReferral && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                {!isValidatingReferral && referralStatus === 'valid' && <CheckCircle2 className="h-5 w-5 text-success" />}
                {!isValidatingReferral && referralStatus === 'invalid' && <XCircle className="h-5 w-5 text-destructive" />}
              </div>
            </div>
            {referralStatus === 'valid' && referralDiscount && (
              <p className="text-xs text-success mt-1">
                🎉 {referralDiscount.percentOff}% off for {referralDiscount.durationMonths} months on the monthly plan!
              </p>
            )}
            {referralStatus === 'invalid' && (
              <p className="text-xs text-destructive mt-1">
                Invalid referral code. Please check and try again.
              </p>
            )}
          </div>

          <PricingCards referralDiscount={referralDiscount} />
          <CompoundInterestCalculator />
        </main>
      </div>
    </AppLayout>
  );
}
