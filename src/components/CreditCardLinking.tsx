import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubscription } from '@/hooks/useSubscription';
import { usePlaidBanking } from '@/hooks/usePlaidBanking';
import { useLinkedBankAccounts } from '@/hooks/useLinkedBankAccounts';
import { BankCSVImport } from '@/components/BankCSVImport';
import {
  CreditCard,
  Plus,
  RefreshCw,
  Building2,
  Shield,
  AlertCircle,
  Trash2,
  Upload,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/calculations';

function maskDisplay(mask: string | null) {
  return mask ? `•••• ${mask}` : null;
}

function accountTypeLabel(type: string | null) {
  if (!type) return '';
  const t = type.toLowerCase();
  if (t.includes('credit')) return 'Credit Card';
  if (t.includes('checking')) return 'Checking';
  if (t.includes('savings')) return 'Savings';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Never synced';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function CreditCardLinking() {
  const { hasProAccess, openCheckout } = useSubscription();
  const { openBankLink, isLoading: isLinkLoading, plaidError, clearError } = usePlaidBanking();
  const { accounts, isLoading: accountsLoading, removeAccount, isRemoving } = useLinkedBankAccounts();
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleLinkCard = () => {
    if (!hasProAccess) { openCheckout(); return; }
    clearError();
    openBankLink();
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try { await removeAccount(id); } finally { setRemovingId(null); }
  };

  const handleCSVImport = () => {
    if (!hasProAccess) { openCheckout(); return; }
    setShowCSVImport(true);
  };

  return (
    <>
      <Card className="p-6 glass-card overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Linked Accounts</h2>
          </div>
          {accounts.length > 0 && (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 px-2" onClick={handleCSVImport}>
                <Upload className="h-3 w-3" /> Import CSV
              </Button>
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 px-2" onClick={handleLinkCard} disabled={isLinkLoading}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
          )}
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {plaidError && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2"
            >
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-destructive">Connection failed</p>
                <p className="text-xs text-muted-foreground mt-0.5">{plaidError.message}</p>
                {plaidError.reason === 'not_configured' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Add <code className="bg-muted px-1 rounded">PLAID_CLIENT_ID</code>,{' '}
                    <code className="bg-muted px-1 rounded">PLAID_SECRET</code>, and{' '}
                    <code className="bg-muted px-1 rounded">PLAID_ENV=sandbox</code> in Supabase → Edge Functions → Manage Secrets.
                  </p>
                )}
              </div>
              <button onClick={clearError} className="text-muted-foreground hover:text-foreground shrink-0">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">

          {/* Loading */}
          {accountsLoading && (
            <motion.div key="loading" className="flex justify-center py-6">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </motion.div>
          )}

          {/* Linked accounts list */}
          {!accountsLoading && accounts.length > 0 && (
            <motion.div key="accounts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {accounts.map((acct) => (
                <motion.div
                  key={acct.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-muted/50"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{acct.account_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {acct.institution_name && `${acct.institution_name} · `}
                      {accountTypeLabel(acct.account_type)}
                      {maskDisplay(acct.mask) && ` · ${maskDisplay(acct.mask)}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                      Synced {timeAgo(acct.balance_synced_at)}
                    </p>
                  </div>
                  {acct.current_balance != null && (
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{formatCurrency(acct.current_balance)}</p>
                      <p className="text-xs text-muted-foreground">balance</p>
                    </div>
                  )}
                  <button
                    onClick={() => handleRemove(acct.id)}
                    disabled={removingId === acct.id || isRemoving}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  >
                    {removingId === acct.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Empty state */}
          {!accountsLoading && accounts.length === 0 && (
            <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-4">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <CreditCard className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-medium mb-1 text-sm">Sync Your Transactions</h3>
              <p className="text-xs text-muted-foreground mb-4 max-w-[240px] mx-auto">
                Connect your bank or credit card to automatically import transactions, or upload a CSV from your bank's website.
              </p>

              <div className="flex flex-col gap-2">
                <AnimatedButton onClick={handleLinkCard} disabled={isLinkLoading} className="w-full gap-2">
                  {isLinkLoading ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" /> Connecting...</>
                  ) : (
                    <><Plus className="h-4 w-4" /> Connect via Plaid</>
                  )}
                </AnimatedButton>

                <Button variant="outline" onClick={handleCSVImport} className="w-full gap-2">
                  <Upload className="h-4 w-4" /> Upload Bank CSV
                </Button>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  <span>Bank-level encryption with Plaid</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supports 12,000+ institutions including Chase, Bank of America, Wells Fargo, and Citi
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* CSV Import Dialog */}
      <Dialog open={showCSVImport} onOpenChange={setShowCSVImport}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Import Bank Transactions
            </DialogTitle>
          </DialogHeader>
          <BankCSVImport onClose={() => setShowCSVImport(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
