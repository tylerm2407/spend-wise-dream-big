import { AppLayout } from '@/components/AppLayout';
import { PricingCards } from '@/components/PricingCards';
import { CompoundInterestCalculator } from '@/components/CompoundInterestCalculator';

export default function Subscriptions() {
  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-hero">
        <main className="px-6 pt-6 pb-8 space-y-8">
          <PricingCards />
          <CompoundInterestCalculator />
        </main>
      </div>
    </AppLayout>
  );
}
