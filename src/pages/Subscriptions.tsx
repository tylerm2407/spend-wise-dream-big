import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Crown, ExternalLink } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/calculations';

interface SubscriptionRecord {
  id: string;
  plan_name: string;
  status: string;
  amount: number;
  currency: string;
  billing_interval: string;
  next_renewal_at: string | null;
}

const statusColors: Record<string, string> = {
  active: 'bg-success/15 text-success border-success/30',
  trialing: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  past_due: 'bg-warning/15 text-warning border-warning/30',
  canceled: 'bg-destructive/15 text-destructive border-destructive/30',
};

export default function Subscriptions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasProAccess, isInTrial, subscriptionEnd, openCustomerPortal, openCheckout } = useSubscription();
  const [records, setRecords] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    async function fetchSubscriptions() {
      // Fetch from subscriptions table
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      const dbRecords = (data || []) as SubscriptionRecord[];

      // If no DB records, synthesize from the existing subscription status
      if (dbRecords.length === 0 && hasProAccess) {
        dbRecords.push({
          id: 'current',
          plan_name: 'SpendWise Pro',
          status: isInTrial ? 'trialing' : 'active',
          amount: 4.99,
          currency: 'USD',
          billing_interval: 'month',
          next_renewal_at: subscriptionEnd,
        });
      }

      setRecords(dbRecords);
      setLoading(false);
    }

    fetchSubscriptions();
  }, [user, hasProAccess, isInTrial, subscriptionEnd]);

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-hero">
        <header className="px-6 pt-6 pb-4">
          <h1 className="text-2xl font-bold">My Subscriptions</h1>
          <p className="text-muted-foreground text-sm mt-1">View your current plans and billing status</p>
        </header>

        <main className="px-6 pb-8 space-y-4">
          {loading ? (
            <>
              <Skeleton className="h-36 rounded-lg" />
              <Skeleton className="h-36 rounded-lg" />
            </>
          ) : records.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-8 text-center">
                <CreditCard className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-lg font-semibold mb-2">No active subscriptions</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Upgrade to SpendWise Pro to unlock all features.
                </p>
                <Button onClick={() => openCheckout()} className="bg-gradient-primary">
                  View Plans
                </Button>
              </Card>
            </motion.div>
          ) : (
            records.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Crown className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{sub.plan_name}</h3>
                        <Badge className={statusColors[sub.status] || statusColors.active}>
                          {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price</span>
                      <span className="font-medium">
                        {formatCurrency(sub.amount)} / {sub.billing_interval}
                      </span>
                    </div>
                    {sub.next_renewal_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {sub.status === 'canceled' ? 'Ended on' : 'Next renewal'}
                        </span>
                        <span className="font-medium">
                          {new Date(sub.next_renewal_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => openCustomerPortal()}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Manage Plan
                  </Button>
                </Card>
              </motion.div>
            ))
          )}
        </main>
      </div>
    </AppLayout>
  );
}
