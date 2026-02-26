import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Wallet,
  Plus,
  ArrowRight,
  Building2,
  PiggyBank,
  DollarSign,
  Check,
  Trash2,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useInvestmentAccounts, getAccountTypeLabel, type InvestmentAccount } from '@/hooks/useInvestmentAccounts';
import { useSavedAlternatives } from '@/hooks/useSavedAlternatives';
import { useWeeklyChallenge } from '@/hooks/useWeeklyChallenge';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/calculations';

const ACCOUNT_TYPES: { value: InvestmentAccount['account_type']; label: string }[] = [
  { value: 'roth_ira', label: 'Roth IRA' },
  { value: 'traditional_ira', label: 'Traditional IRA' },
  { value: '401k', label: '401(k)' },
  { value: 'brokerage', label: 'Brokerage' },
  { value: 'savings', label: 'Savings Account' },
  { value: 'other', label: 'Other' },
];

export default function Invest() {
  const { toast } = useToast();
  const {
    accounts,
    transfers,
    accountsLoading,
    createAccount,
    deleteAccount,
    createTransfer,
    isCreatingAccount,
    isCreatingTransfer,
    totalInvested,
    defaultAccount,
  } = useInvestmentAccounts();
  const { favoritedAlternatives, totalSavedAmount } = useSavedAlternatives();
  const { currentChallenge } = useWeeklyChallenge();

  // Add account dialog
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({
    account_name: '',
    account_type: 'roth_ira' as InvestmentAccount['account_type'],
    institution_name: '',
  });

  // Transfer flow
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferAccountId, setTransferAccountId] = useState('');
  const [transferSourceType, setTransferSourceType] = useState<'alternative_savings' | 'challenge_savings' | 'custom' | 'purchase_savings'>('custom');
  const [transferDescription, setTransferDescription] = useState('');

  // Confirmation dialog
  const [pendingTransfer, setPendingTransfer] = useState<{
    amount: number;
    accountName: string;
    accountId: string;
    sourceType: string;
    description: string;
  } | null>(null);

  // Delete account confirmation
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  const challengeSavings = currentChallenge ? Number(currentChallenge.actual_savings) : 0;

  // Savings breakdown for display
  const savingsSources = useMemo(() => {
    const sources = [];
    if (totalSavedAmount > 0) {
      sources.push({
        label: 'Alternative Savings',
        amount: totalSavedAmount,
        type: 'alternative_savings' as const,
        description: `From ${favoritedAlternatives.length} saved alternatives`,
      });
    }
    if (challengeSavings > 0) {
      sources.push({
        label: 'Weekly Challenge',
        amount: challengeSavings,
        type: 'challenge_savings' as const,
        description: `This week's challenge savings`,
      });
    }
    return sources;
  }, [totalSavedAmount, challengeSavings, favoritedAlternatives.length]);

  const totalAvailableSavings = totalSavedAmount + challengeSavings;

  const handleAddAccount = async () => {
    if (!newAccount.account_name.trim()) {
      toast({ title: 'Please enter an account name', variant: 'destructive' });
      return;
    }
    try {
      await createAccount({
        account_name: newAccount.account_name.trim(),
        account_type: newAccount.account_type,
        institution_name: newAccount.institution_name.trim() || undefined,
        is_default: accounts.length === 0,
      });
      toast({ title: 'Account added!' });
      setShowAddAccount(false);
      setNewAccount({ account_name: '', account_type: 'roth_ira', institution_name: '' });
    } catch {
      toast({ title: 'Failed to add account', variant: 'destructive' });
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccountId) return;
    try {
      await deleteAccount(deletingAccountId);
      toast({ title: 'Account removed' });
    } catch {
      toast({ title: 'Failed to delete account', variant: 'destructive' });
    }
    setDeletingAccountId(null);
  };

  const handleStartTransfer = (sourceType: typeof transferSourceType, amount: number, description: string) => {
    if (accounts.length === 0) {
      toast({ title: 'Add an investment account first', variant: 'destructive' });
      return;
    }
    setTransferSourceType(sourceType);
    setTransferAmount(String(amount));
    setTransferDescription(description);
    setTransferAccountId(defaultAccount?.id || accounts[0]?.id || '');
    setShowTransferDialog(true);
  };

  const handleConfirmTransferIntent = () => {
    const amount = parseFloat(transferAmount);
    if (!amount || amount <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    if (!transferAccountId) {
      toast({ title: 'Select an account', variant: 'destructive' });
      return;
    }
    const account = accounts.find(a => a.id === transferAccountId);
    setPendingTransfer({
      amount,
      accountName: account ? `${account.account_name} (${getAccountTypeLabel(account.account_type)})` : '',
      accountId: transferAccountId,
      sourceType: transferSourceType,
      description: transferDescription,
    });
    setShowTransferDialog(false);
  };

  const handleExecuteTransfer = async () => {
    if (!pendingTransfer) return;
    try {
      await createTransfer({
        account_id: pendingTransfer.accountId,
        amount: pendingTransfer.amount,
        source_type: pendingTransfer.sourceType as any,
        source_description: pendingTransfer.description || undefined,
      });
      toast({
        title: 'Transfer recorded!',
        description: `${formatCurrency(pendingTransfer.amount)} queued for ${pendingTransfer.accountName}`,
      });
    } catch {
      toast({ title: 'Transfer failed', variant: 'destructive' });
    }
    setPendingTransfer(null);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const recentTransfers = transfers.slice(0, 5);

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-hero">
        <header className="px-6 pt-6 pb-4">
          <h1 className="text-2xl font-bold">Invest Your Savings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Turn what you save into wealth
          </p>
        </header>

        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="px-6 space-y-5 pb-32"
        >
          {/* Total Savings Overview */}
          <motion.div variants={itemVariants}>
            <Card className="p-6 glass-card overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-8 translate-x-8" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                  <PiggyBank className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Available to Invest</p>
                  <p className="text-3xl font-bold number-display">{formatCurrency(totalAvailableSavings)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-success" />
                <span>Total invested so far: <strong className="text-foreground">{formatCurrency(totalInvested)}</strong></span>
              </div>
            </Card>
          </motion.div>

          {/* Savings Sources */}
          <motion.div variants={itemVariants}>
            <h2 className="text-lg font-semibold mb-3">Your Savings Sources</h2>
            {savingsSources.length === 0 ? (
              <Card className="p-6 glass-card text-center">
                <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">
                  Start saving by choosing alternatives or completing challenges!
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {savingsSources.map((source) => (
                  <Card key={source.type} className="p-4 glass-card">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{source.label}</p>
                        <p className="text-xs text-muted-foreground">{source.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-success">{formatCurrency(source.amount)}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartTransfer(source.type, source.amount, source.label)}
                          disabled={accounts.length === 0}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Per-purchase savings from alternatives */}
                {favoritedAlternatives.length > 0 && (
                  <div className="mt-2">
                    <button
                      className="text-sm text-primary font-medium flex items-center gap-1 mb-2"
                      onClick={() => {}}
                    >
                      <ChevronDown className="h-3 w-3" />
                      Individual purchase savings ({favoritedAlternatives.length})
                    </button>
                    <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
                      {favoritedAlternatives.slice(0, 10).map((alt) => (
                        <div key={alt.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{alt.alternative_name}</p>
                            <p className="text-xs text-muted-foreground">{alt.category}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-success">{formatCurrency(Number(alt.savings))}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() =>
                                handleStartTransfer(
                                  'purchase_savings',
                                  Number(alt.savings),
                                  `Saved on: ${alt.alternative_name}`
                                )
                              }
                              disabled={accounts.length === 0}
                            >
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom amount */}
                <Card className="p-4 glass-card border-dashed border-primary/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Custom Amount</p>
                      <p className="text-xs text-muted-foreground">Invest any amount you choose</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleStartTransfer('custom', 0, 'Custom transfer')}
                      disabled={accounts.length === 0}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Invest
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </motion.div>

          {/* Investment Accounts */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Investment Accounts</h2>
              <Button size="sm" variant="outline" onClick={() => setShowAddAccount(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            {accounts.length === 0 ? (
              <Card className="p-6 glass-card text-center">
                <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  Add your investment accounts to start routing savings
                </p>
                <Button onClick={() => setShowAddAccount(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Account
                </Button>
              </Card>
            ) : (
              <div className="space-y-2">
                {accounts.map((account) => (
                  <Card key={account.id} className="p-4 glass-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <Wallet className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{account.account_name}</p>
                            {account.is_default && (
                              <Badge variant="secondary" className="text-2xs">Default</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {getAccountTypeLabel(account.account_type)}
                            {account.institution_name && ` · ${account.institution_name}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive h-8 w-8 p-0"
                        onClick={() => setDeletingAccountId(account.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>

          {/* Recent Transfers */}
          {recentTransfers.length > 0 && (
            <motion.div variants={itemVariants}>
              <h2 className="text-lg font-semibold mb-3">Recent Transfers</h2>
              <div className="space-y-2">
                {recentTransfers.map((transfer) => {
                  const account = accounts.find(a => a.id === transfer.account_id);
                  return (
                    <Card key={transfer.id} className="p-3 glass-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{formatCurrency(Number(transfer.amount))}</p>
                          <p className="text-xs text-muted-foreground">
                            {account?.account_name || 'Account'} · {new Date(transfer.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-2xs">
                          <Check className="h-3 w-3 mr-1" />
                          {transfer.status}
                        </Badge>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Setup Instructions Banner */}
          <motion.div variants={itemVariants}>
            <Card className="p-4 glass-card border-info/30 bg-info/5">
              <p className="text-sm font-medium text-info mb-1">🔗 Bank Integration Coming Soon</p>
              <p className="text-xs text-muted-foreground">
                Transfers are currently recorded for tracking. Automatic bank-to-broker transfers will be available once you connect your accounts via Plaid integration.
              </p>
            </Card>
          </motion.div>
        </motion.main>
      </div>

      {/* Add Account Dialog */}
      <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Investment Account</DialogTitle>
            <DialogDescription>
              Add your Roth IRA, brokerage, or savings account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input
                placeholder="e.g. My Roth IRA"
                value={newAccount.account_name}
                onChange={(e) => setNewAccount(p => ({ ...p, account_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select
                value={newAccount.account_type}
                onValueChange={(v) => setNewAccount(p => ({ ...p, account_type: v as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Institution (optional)</Label>
              <Input
                placeholder="e.g. Fidelity, Schwab, Vanguard"
                value={newAccount.institution_name}
                onChange={(e) => setNewAccount(p => ({ ...p, institution_name: e.target.value }))}
              />
            </div>
            <Button
              className="w-full bg-gradient-primary"
              onClick={handleAddAccount}
              disabled={isCreatingAccount}
            >
              {isCreatingAccount ? 'Adding...' : 'Add Account'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invest Savings</DialogTitle>
            <DialogDescription>
              Choose an account and amount to invest
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Destination Account</Label>
              <Select value={transferAccountId} onValueChange={setTransferAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.account_name} ({getAccountTypeLabel(a.account_type)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {transferDescription && (
              <p className="text-xs text-muted-foreground">Source: {transferDescription}</p>
            )}
            <Button
              className="w-full bg-gradient-primary"
              onClick={handleConfirmTransferIntent}
              disabled={!transferAmount || !transferAccountId}
            >
              Review Transfer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!pendingTransfer} onOpenChange={(open) => !open && setPendingTransfer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Investment Transfer</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">You are about to record a transfer of:</span>
              <span className="block text-2xl font-bold text-foreground">
                {pendingTransfer && formatCurrency(pendingTransfer.amount)}
              </span>
              <span className="block">
                To: <strong>{pendingTransfer?.accountName}</strong>
              </span>
              {pendingTransfer?.description && (
                <span className="block text-xs">Source: {pendingTransfer.description}</span>
              )}
              <span className="block text-xs mt-2 text-warning">
                Note: This records your intent. Actual fund movement requires bank integration (coming soon).
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecuteTransfer}
              disabled={isCreatingTransfer}
              className="bg-gradient-primary"
            >
              {isCreatingTransfer ? 'Processing...' : 'Confirm Transfer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation */}
      <AlertDialog open={!!deletingAccountId} onOpenChange={(open) => !open && setDeletingAccountId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the account and all associated transfer records. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Account</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
