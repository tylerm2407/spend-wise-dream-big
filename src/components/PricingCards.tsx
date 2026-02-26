import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Zap, Sparkles, Check, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

const NOVAWEALTH_SUBSCRIBE_URL = 'https://novawealth.app/subscribe';

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
    yearlyPrice: 29.99,
    yearlyDiscount: 50,
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
    yearlyPrice: 249.99,
    yearlyDiscount: 31,
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
  showFreeAction?: boolean;
}

export function PricingCards({ onSelectFree, showFreeAction }: PricingCardsProps) {
  const [isYearly, setIsYearly] = useState(false);
  const { openCheckout, hasProAccess } = useSubscription();

  const handleSubscribe = (plan: Plan) => {
    if (plan.bundle) {
      window.open(NOVAWEALTH_SUBSCRIBE_URL, '_blank');
    } else if (plan.monthlyPrice > 0) {
      openCheckout();
    } else if (onSelectFree) {
      onSelectFree();
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-1">Choose Your Plan</h2>
        <p className="text-muted-foreground text-sm">Start free, upgrade anytime</p>
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
          {!isYearly && (
            <Badge className="absolute -top-3 -right-3 bg-success text-success-foreground text-[10px] px-1.5 py-0.5">
              -50%
            </Badge>
          )}
          {isYearly && (
            <Badge className="absolute -top-3 -right-3 bg-success text-success-foreground text-[10px] px-1.5 py-0.5">
              Save 50%
            </Badge>
          )}
        </div>
      </div>

      {/* Cards — side-by-side on wider screens */}
      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan, i) => {
          const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
          const interval = isYearly ? '/yr' : '/mo';
          const isCurrentPlan = plan.monthlyPrice === 0 && !hasProAccess;

          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card
                className={cn(
                  'relative p-5 glow-orb-parent overflow-hidden h-full flex flex-col',
                  plan.popular && 'border-primary/50',
                  plan.bundle && 'border-warning/50'
                )}
              >
                <div className="glow-orb-track" aria-hidden />

                {plan.popular && (
                  <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px]">
                    POPULAR
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
                    <span className="text-3xl font-bold">${price.toFixed(2)}</span>
                    <span className="text-muted-foreground text-sm">{interval}</span>
                  </div>

                  {isYearly && plan.yearlyDiscount > 0 && (
                    <p className="text-success text-xs font-medium mb-2">
                      Save {plan.yearlyDiscount}% vs monthly
                    </p>
                  )}

                  <p className="text-muted-foreground text-sm mb-4">{plan.tagline}</p>

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
                        variant="outline"
                        className="w-full"
                        onClick={() => onSelectFree?.()}
                      >
                        Sign Up Free
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
                        plan.popular && 'bg-gradient-primary text-primary-foreground',
                        plan.bundle && 'bg-gradient-cta text-cta-foreground'
                      )}
                      onClick={() => handleSubscribe(plan)}
                    >
                      {plan.bundle && <ExternalLink className="h-4 w-4 mr-2" />}
                      {hasProAccess ? 'Manage Plan' : `Get ${plan.name}`}
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
