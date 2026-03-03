import { AppLayout } from '@/components/AppLayout';
import { PricingCards } from '@/components/PricingCards';
import { CompoundInterestCalculator } from '@/components/CompoundInterestCalculator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck } from 'lucide-react';

export default function Subscriptions() {
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
          <PricingCards />
          <CompoundInterestCalculator />
        </main>
      </div>
    </AppLayout>
  );
}
