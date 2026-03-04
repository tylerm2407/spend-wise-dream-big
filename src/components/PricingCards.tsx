import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Zap, Sparkles, Check, ExternalLink, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useNovaWealth } from '@/hooks/useNovaWealth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const SOURCE_APP = 'costclarity';
const NW_API_BASE = 'https://dbwuegchdysuocbpsprd.supabase.co/functions/v1';
const NOVAWEALTH_SUBSCRIBE_URL = 'https://novawealth.app/subscribe';

const MONTHLY_PRICE_ID = 'price_1T1WqDAmUZkn8na4hChXph3w';
const YEARLY_PRICE_ID = 'price_1T75ERAmUZkn8na4I6ev6nDI';

interface PlanFeature {
  text: string;
}

interface Plan {
  name: string;
  icon: React.ReactNode;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyDiscount: number;
  tagline: string;
  features: PlanFeature[];
  popular?: boolean;
  bundle?: boolean;
}

export interface ReferralDiscount {
  valid: boolean;
  percentOff: number;
  durationMonths: number;
  referralCode: string;
  referrerId: string;
  referralCodeId?: string;
}

const plans: Plan[] = [
  {
    name: 'Free',
    icon: <Sparkles className="h-5 w-5" />,
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyDiscount: 0,
    tagline: 'Get started with the basics',
    features: [
      { text: 'Basic spending tracking' },
      { text: 'Up to 2 goals' },
      { text: 'Manual purchase entry only' },
    ],
  },
  {
    name: 'Pro',
    icon: <Crown className="h-5 w-5" />,
    monthlyPrice: 4.99,
    yearlyPrice: 35.93,
    yearlyDiscount: 40,
    tagline: 'Unlock your full potential',
    popular: true,
    features: [
      { text: 'Unlimited goals' },
      { text: 'AI insights & alternatives' },
      { text: 'Credit card linking' },
      { text: 'Advanced analytics' },
      { text: 'Priority support' },
    ],
  },
  {
    name: 'Bundle',
    icon: <Zap className="h-5 w-5" />,
    monthlyPrice: 29.99,
    yearlyPrice: 215.93,
    yearlyDiscount: 40,
    tagline: 'NovaWealth ecosystem',
    bundle: true,
    features: [
      { text: 'Everything in Pro' },
      { text: 'Access to all Nova apps' },
      { text: 'Unified subscription' },
      { text: 'Cross-app insights' },
    ],
  },
];

interface PricingCardsProps {
  onSelectFree?: () => void;
  onSelectPlan?: (planName: string) => void;
  showFreeAction?: boolean;
  selectedPlan?: string | null;
  referralDiscount?: ReferralDiscount | null;
}

export function PricingCards({ onSelectFree, onSelectPlan, showFreeAction, selectedPlan, referralDiscount }: PricingCardsProps) {
  const [isYearly, setIsYearly] = useState(false);
  const { openCheckout, hasProAccess } = useSubscription();
  const { hasNWProAccess } = useNovaWealth();
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const { toast } = useToast();

  // Referral discounts only apply to monthly plans
  const getDiscountedPrice = (price: number, plan: Plan): number | null => {
    if (!referralDiscount?.valid || plan.monthlyPrice === 0 || isYearly) return null;
    const discounted = price * (1 - referralDiscount.percentOff / 100);
    return Math.round(discounted * 100) / 100;
  };

  const handleCardClick = async (plan: Plan) => {
    // If onSelectPlan is provided, just select the plan (used on signup page)
    if (onSelectPlan) {
      onSelectPlan(plan.name);
      return;
    }

    if (plan.bundle) {
      window.open(NOVAWEALTH_SUBSCRIBE_URL, '_blank');
    } else if (plan.monthlyPrice > 0) {
      setCheckoutLoading(true);
      try {
        const storedCode = localStorage.getItem('referral_code');
        let referralCode: string | null = (!isYearly && referralDiscount?.valid) ? referralDiscount.referralCode : null;
        let referrerId: string | null = (!isYearly && referralDiscount?.valid) ? referralDiscount.referrerId : null;

        // If no pre-validated discount and monthly, try to validate on the fly
        if (!referralCode && storedCode && !isYearly) {
          try {
            const validateRes = await fetch(`${NW_API_BASE}/validate-referral`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                referral_code: storedCode,
                source_app: SOURCE_APP,
                referred_user_id: null,
              }),
            });
            const validateData = await validateRes.json();
            if (validateData.valid) {
              referralCode = storedCode;
              referrerId = validateData.referrer_user_id;
            }
          } catch (err) {
            console.error('Referral validation failed:', err);
          }
        }

        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: {
            unauthenticated: true,
            referral_code: referralCode,
            referrer_id: referrerId,
            price_id: isYearly ? YEARLY_PRICE_ID : MONTHLY_PRICE_ID,
          },
        });
        if (error || data?.error) {
          console.error('Checkout error:', error?.message || data?.error);
          toast({
            title: 'Checkout failed',
            description: 'Could not start checkout. Please try again.',
            variant: 'destructive',
          });
          return;
        }
        if (data?.url) {
          if (referralCode && referrerId) {
            localStorage.setItem('nw_referral_code', referralCode);
            localStorage.setItem('nw_referrer_id', referrerId);
          }
          window.open(data.url, '_blank');
        }
      } catch (err) {
        console.error('Failed to create checkout:', err);
        toast({
          title: 'Checkout failed',
          description: 'Something went wrong. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setCheckoutLoading(false);
      }
    } else {
      if (onSelectFree) {
        onSelectFree();
      } else {
        navigate('/signup');
      }
    }
  };

  const novaWealthLoginUrl = `https://novawealthhqcom.lovable.app/login?redirect_app=Cost Clarity&redirect_uri=${encodeURIComponent(`${window.location.origin}/login`)}`;

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-1">Choose Your Plan</h2>
        <p className="text-muted-foreground text-sm">Start free, upgrade anytime</p>
        {referralDiscount?.valid && (
          <Badge className="mt-2 bg-success text-success-foreground">
            🎉 {referralDiscount.percentOff}% off for {referralDiscount.durationMonths} months applied!
            {isYearly && <span className="ml-1">(monthly plans only)</span>}
          </Badge>
        )}
      </div>

      {/* Toggle */}
      <div className="flex justify-center mb-8">
        <div className="relative inline-flex items-center rounded-full border border-border bg-muted p-1">
          <button
            onClick={() => setIsYearly(false)}
            className={cn(
              'relative z-10 rounded-full px-5 py-1.5 text-sm font-medium transition-colors',
              !isYearly ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsYearly(true)}
            className={cn(
              'relative z-10 rounded-full px-5 py-1.5 text-sm font-medium transition-colors',
              isYearly ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            Yearly
          </button>
          <Badge className="absolute -top-3 -right-3 bg-success text-success-foreground text-[10px] px-1.5 py-0.5">
            Save 40%
          </Badge>
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan, i) => {
          const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
          const interval = isYearly ? '/yr' : '/mo';
          const isCurrentPlan = plan.monthlyPrice === 0 && !hasProAccess;
          const discountedPrice = getDiscountedPrice(price, plan);
          const isSelected = selectedPlan === plan.name;
          const monthlyEquivalent = isYearly && plan.yearlyPrice > 0
            ? Math.round((plan.yearlyPrice / 12) * 100) / 100
            : null;

          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card
                onClick={() => handleCardClick(plan)}
                className={cn(
                  'relative p-5 h-full flex flex-col cursor-pointer transition-all hover:shadow-lg',
                  plan.popular && 'border-primary/50',
                  plan.bundle && 'border-warning/50',
                  isSelected && 'ring-2 ring-primary border-primary shadow-lg'
                )}
              >

                {plan.popular && (
                  <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px]">
                    POPULAR
                  </Badge>
                )}

                {isSelected && (
                  <Badge className="absolute top-3 left-3 bg-success text-success-foreground text-[10px]">
                    SELECTED
                  </Badge>
                )}

                <div className="relative z-10 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={cn(
                        'p-1.5 rounded-lg',
                        plan.popular ? 'bg-primary/15' : plan.bundle ? 'bg-warning/15' : 'bg-muted'
                      )}
                    >
                      {plan.icon}
                    </div>
                    <span className="font-semibold">{plan.name}</span>
                  </div>

                  <div className="mb-2">
                    {discountedPrice !== null ? (
                      <>
                        <span className="text-lg line-through text-muted-foreground mr-2">${price.toFixed(2)}</span>
                        <span className="text-3xl font-bold text-success">${discountedPrice.toFixed(2)}</span>
                        <span className="text-muted-foreground text-sm">{interval}</span>
                        <p className="text-success text-xs font-medium mt-1">
                          {referralDiscount!.percentOff}% off for {referralDiscount!.durationMonths} months
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold">${price.toFixed(2)}</span>
                        <span className="text-muted-foreground text-sm">{interval}</span>
                      </>
                    )}
                  </div>

                  {isYearly && plan.yearlyDiscount > 0 && (
                    <div className="mb-2">
                      <p className="text-success text-xs font-medium">
                        Save {plan.yearlyDiscount}% vs monthly
                      </p>
                      {monthlyEquivalent && (
                        <p className="text-muted-foreground text-xs">
                          Just ${monthlyEquivalent.toFixed(2)}/mo
                        </p>
                      )}
                      {referralDiscount?.valid && (
                        <p className="text-muted-foreground text-[10px] italic mt-0.5">
                          Referral discount applies to monthly plans only
                        </p>
                      )}
                    </div>
                  )}

                  <p className="text-muted-foreground text-sm mb-2">{plan.tagline}</p>

                  {plan.monthlyPrice > 0 && (
                    <p className="text-xs font-semibold text-primary mb-4">
                      🎉 30-day free trial included
                    </p>
                  )}

                  {plan.monthlyPrice === 0 && <div className="mb-4" />}

                  <ul className="space-y-2 mb-5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f.text} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-success flex-shrink-0" />
                        <span>{f.text}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.monthlyPrice === 0 ? (
                    showFreeAction ? (
                      <Button
                        variant={isSelected ? 'default' : 'outline'}
                        className="w-full"
                        onClick={(e) => { e.stopPropagation(); handleCardClick(plan); }}
                      >
                        {isSelected ? '✓ Selected' : 'Sign Up Free'}
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled={isCurrentPlan}>
                        {isCurrentPlan ? 'Current Plan' : 'Free Forever'}
                      </Button>
                    )
                  ) : (
                    <Button
                      className={cn(
                        'w-full',
                        plan.popular && !isSelected && 'bg-gradient-primary text-primary-foreground',
                        plan.bundle && !isSelected && 'bg-gradient-cta text-cta-foreground',
                        isSelected && 'bg-success text-success-foreground'
                      )}
                      disabled={checkoutLoading}
                      onClick={(e) => { e.stopPropagation(); handleCardClick(plan); }}
                    >
                      {checkoutLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : plan.bundle ? (
                        <ExternalLink className="h-4 w-4 mr-2" />
                      ) : null}
                      {isSelected ? '✓ Selected' : hasProAccess ? 'Manage Plan' : `Get ${plan.name}`}
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* NovaWealth Pro note */}
      {!hasNWProAccess && (
        <p className="text-center text-sm text-muted-foreground mt-6">
          Already a NovaWealth Pro subscriber? You have full access —{' '}
          <a
            href={novaWealthLoginUrl}
            className="text-primary font-medium hover:underline"
          >
            Log in with NovaWealth
          </a>
        </p>
      )}
    </div>
  );
}
