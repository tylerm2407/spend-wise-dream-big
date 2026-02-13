import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Crown, CreditCard, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface PaywallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  { name: 'Track purchases', free: true, premium: true },
  { name: 'Set savings goals', free: true, premium: true },
  { name: 'Basic spending insights', free: true, premium: true },
  { name: 'AI-powered alternatives', free: false, premium: true },
  { name: 'Weekly savings challenges', free: false, premium: true },
  { name: 'Advanced analytics', free: false, premium: true },
  { name: 'Receipt scanning', free: false, premium: true },
  { name: 'Unlimited history', free: false, premium: true },
];

export function PaywallDialog({ open, onOpenChange }: PaywallDialogProps) {
  const { openCheckout } = useSubscription();

  const handleSubscribe = async () => {
    await openCheckout();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center mb-2">
            <Crown className="w-7 h-7 text-primary-foreground" />
          </div>
          <DialogTitle className="text-xl">Unlock Cost Clarity Premium</DialogTitle>
          <DialogDescription className="text-base pt-1">
            Subscribe to access all features and take control of your spending
          </DialogDescription>
        </DialogHeader>

        {/* Feature Comparison */}
        <div className="rounded-lg border border-border overflow-hidden mt-2">
          <div className="grid grid-cols-3 bg-muted/50 p-3 text-sm font-medium">
            <span>Feature</span>
            <span className="text-center">Free</span>
            <span className="text-center text-primary">Premium</span>
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
                  <Check className="w-4 h-4 text-primary" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-primary/10 rounded-lg p-4 text-center border border-primary/20">
          <div className="text-3xl font-bold text-primary">$5</div>
          <div className="text-muted-foreground text-sm">per month</div>
          <div className="text-xs text-muted-foreground mt-1">Cancel anytime</div>
        </div>

        <Button
          onClick={handleSubscribe}
          className="w-full h-12 text-lg bg-gradient-primary glow"
          size="lg"
        >
          <CreditCard className="w-5 h-5 mr-2" />
          Subscribe Now
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Secure payment powered by Stripe. Cancel anytime from Settings.
        </p>
      </DialogContent>
    </Dialog>
  );
}
