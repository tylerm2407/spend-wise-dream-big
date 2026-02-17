import { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { Button } from '@/components/ui/button';
import { Crown, CreditCard, Check, X, Apple } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface PaywallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  { name: 'Unlimited manual entries', free: true, pro: true },
  { name: 'Basic opportunity costs', free: true, pro: true },
  { name: 'Max 2 goals', free: true, pro: false },
  { name: 'Unlimited goals', free: false, pro: true },
  { name: '1 alternative per search', free: true, pro: false },
  { name: 'Unlimited AI alternatives', free: false, pro: true },
  { name: 'Credit card connection', free: false, pro: true },
  { name: 'Receipt scanning', free: false, pro: true },
  { name: 'Advanced analytics', free: false, pro: true },
  { name: 'Weekly savings challenges', free: false, pro: true },
];

export function PaywallDialog({ open, onOpenChange }: PaywallDialogProps) {
  const { openCheckout } = useSubscription();
  const { isNative, offerings, purchasePackage, loading: rcLoading } = useRevenueCat();
  const { toast } = useToast();
  const [purchasing, setPurchasing] = useState(false);

  const handleStripeSubscribe = async () => {
    await openCheckout();
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

  // Get native price string if available
  const nativePriceString = offerings.length > 0 ? offerings[0].product.priceString : '$4.99/mo';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center mb-2">
            <Crown className="w-7 h-7 text-primary-foreground" />
          </div>
          <DialogTitle className="text-xl">Upgrade to SpendWise Pro</DialogTitle>
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
          <div className="text-3xl font-bold text-primary">
            {isNative ? nativePriceString : '$4.99'}
          </div>
          <div className="text-muted-foreground text-sm">per month</div>
          <div className="text-xs text-muted-foreground mt-1">Cancel anytime</div>
        </div>

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
          <>
            <Button
              onClick={handleStripeSubscribe}
              className="w-full h-12 text-lg bg-gradient-primary glow"
              size="lg"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Subscribe to Pro
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Secure payment powered by Stripe. Cancel anytime from Settings.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
