import { motion, AnimatePresence } from 'framer-motion';
import { useSubscription } from '@/hooks/useSubscription';
import { usePlaid } from '@/hooks/usePlaid';
import {
  CreditCard,
  Plus,
  RefreshCw,
  Building2,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

export function CreditCardLinking() {
  const { hasProAccess, openCheckout } = useSubscription();
  const { openPlaidLink, isLoading, plaidError, clearError } = usePlaid();

  const handleLinkCard = () => {
    if (!hasProAccess) {
      openCheckout();
      return;
    }
    clearError();
    openPlaidLink();
  };

  return (
    <Card className="p-6 glass-card overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Linked Cards</h2>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {plaidError && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2"
          >
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">Connection failed</p>
              <p className="text-xs text-muted-foreground mt-0.5">{plaidError.message}</p>
              {plaidError.reason === 'not_configured' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Plaid credentials are not yet configured. Set <code className="bg-muted px-1 rounded">PLAID_CLIENT_ID</code>,{' '}
                  <code className="bg-muted px-1 rounded">PLAID_SECRET</code>, and{' '}
                  <code className="bg-muted px-1 rounded">PLAID_ENV</code> in your Supabase Edge Function secrets.
                </p>
              )}
            </div>
            <button onClick={clearError} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        key="empty"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-6"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <CreditCard className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-medium mb-2">Connect Your Cards</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-[250px] mx-auto">
          Automatically sync transactions from your credit cards for smarter spending insights
        </p>
        <AnimatedButton
          onClick={handleLinkCard}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Link a Card
            </>
          )}
        </AnimatedButton>

        <p className="text-xs text-muted-foreground mt-4">
          After linking, your accounts will appear here automatically.
        </p>

        <div className="flex items-center justify-center gap-1 mt-3 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>Bank-level security with Plaid</span>
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-xl text-left">
          <p className="text-xs font-medium mb-1 flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            Supported banks
          </p>
          <p className="text-xs text-muted-foreground">
            Chase, Bank of America, Wells Fargo, Citi, American Express, and 12,000+ more institutions via Plaid.
          </p>
        </div>
      </motion.div>
    </Card>
  );
}
