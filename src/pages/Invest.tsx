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
  ExternalLink,
  Info,
  BookOpen,
  CheckCircle2,
  RefreshCw,
  Link2,
  Loader2,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useInvestmentAccounts, getAccountTypeLabel, type InvestmentAccount, type InvestmentTransfer } from '@/hooks/useInvestmentAccounts';
import { usePlaid } from '@/hooks/usePlaid';
import { useSavedAlternatives } from '@/hooks/useSavedAlternatives';
import { useWeeklyChallenge } from '@/hooks/useWeeklyChallenge';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/calculations';

// ─── Account type metadata ───────────────────────────────────────────────────

const ACCOUNT_TYPES: { value: InvestmentAccount['account_type']; label: string }[] = [
  { value: 'roth_ira', label: 'Roth IRA' },
  { value: 'traditional_ira', label: 'Traditional IRA' },
  { value: '401k', label: '401(k)' },
  { value: 'brokerage', label: 'Brokerage' },
  { value: 'savings', label: 'Savings Account' },
  { value: 'other', label: 'Other' },
];

interface AccountTypeInfo {
  description: string;
  annualLimit: number | null;     // IRS 2025 contribution limit in USD, null if N/A
  catchUpLimit: number | null;    // Age 50+ catch-up limit
  taxBenefit: string;
  bestFor: string;
  setupSteps: string[];
}

const ACCOUNT_TYPE_INFO: Record<InvestmentAccount['account_type'], AccountTypeInfo> = {
  roth_ira: {
    description: 'Contributions are made with after-tax dollars. Your money grows tax-free and qualified withdrawals in retirement are tax-free.',
    annualLimit: 7000,
    catchUpLimit: 8000,
    taxBenefit: 'Tax-free growth & withdrawals',
    bestFor: 'Long-term retirement savings (especially if you expect to be in a higher tax bracket later)',
    setupSteps: [
      'Open a Roth IRA at Fidelity, Schwab, or Vanguard (takes ~10 min online)',
      'Link your checking account inside the broker\'s app',
      'Transfer funds directly from your bank to the Roth IRA',
      'Choose an investment (e.g. a target-date fund matching your retirement year)',
    ],
  },
  traditional_ira: {
    description: 'Contributions may be tax-deductible. Growth is tax-deferred, and you pay ordinary income tax on withdrawals in retirement.',
    annualLimit: 7000,
    catchUpLimit: 8000,
    taxBenefit: 'Potential tax deduction now; deferred taxes until retirement',
    bestFor: 'Anyone who wants a possible upfront tax deduction today',
    setupSteps: [
      'Open a Traditional IRA at Fidelity, Schwab, or Vanguard',
      'Link your checking account inside the broker\'s app',
      'Transfer funds directly from your bank to the IRA',
      'Pick a diversified fund (e.g. a total market index fund)',
    ],
  },
  '401k': {
    description: 'An employer-sponsored retirement plan. Contributions come from your paycheck before taxes. Many employers match a portion.',
    annualLimit: 23500,
    catchUpLimit: 31000,
    taxBenefit: 'Pre-tax contributions lower your taxable income today',
    bestFor: 'Anyone whose employer offers a match — free money!',
    setupSteps: [
      'Log into your employer\'s HR portal (e.g. Fidelity NetBenefits, Voya, Empower)',
      'Increase your contribution percentage under "Change Contributions"',
      'At minimum, contribute enough to get the full employer match',
      'Choose your investment allocation (target-date fund is the simplest pick)',
    ],
  },
  brokerage: {
    description: 'A standard taxable investment account with no contribution limits. Ideal for investing beyond retirement account limits.',
    annualLimit: null,
    catchUpLimit: null,
    taxBenefit: 'No limits; long-term gains taxed at lower capital gains rates',
    bestFor: 'Investing after maxing out tax-advantaged accounts, or saving for goals before retirement',
    setupSteps: [
      'Open a brokerage account at Fidelity, Schwab, Robinhood, or Webull',
      'Complete identity verification (takes ~5 min)',
      'Link your bank account and transfer funds',
      'Choose your investments or buy fractional shares',
    ],
  },
  savings: {
    description: 'A high-yield savings account (HYSA) earns significantly more interest than a traditional savings account — often 4–5% APY.',
    annualLimit: null,
    catchUpLimit: null,
    taxBenefit: 'FDIC insured; interest earned taxed as ordinary income',
    bestFor: 'Emergency fund, short-term goals, or parking cash before investing',
    setupSteps: [
      'Open a HYSA at Marcus by Goldman Sachs, Ally, SoFi, or your credit union',
      'Link your checking account (takes ~2 min)',
      'Set up automatic transfers from checking to savings',
      'Aim to keep 3–6 months of expenses here before investing',
    ],
  },
  other: {
    description: 'Any other investment vehicle (HSA, 529 college savings, annuity, crypto, etc.).',
    annualLimit: null,
    catchUpLimit: null,
    taxBenefit: 'Varies by account type',
    bestFor: 'Specialized goals beyond standard retirement accounts',
    setupSteps: [
      'Identify the account type and find the appropriate provider',
      'Open the account and complete verification',
      'Link your funding source (bank account)',
      'Set up contributions aligned to your goal',
    ],
  },
};

// ─── Institution quick-link map ───────────────────────────────────────────────

const INSTITUTION_LINKS: Record<string, string> = {
  fidelity: 'https://www.fidelity.com',
  schwab: 'https://www.schwab.com',
  vanguard: 'https://www.vanguard.com',
  robinhood: 'https://robinhood.com',
  'td ameritrade': 'https://www.tdameritrade.com',
  betterment: 'https://www.betterment.com',
  wealthfront: 'https://www.wealthfront.com',
  etrade: 'https://us.etrade.com',
  'e*trade': 'https://us.etrade.com',
  webull: 'https://www.webull.com',
  merrill: 'https://www.merrilledge.com',
  ally: 'https://www.ally.com',
  marcus: 'https://www.marcus.com',
  sofi: 'https://www.sofi.com',
  m1: 'https://m1.com',
  acorns: 'https://www.acorns.com',
  stash: 'https://www.stash.com',
  empower: 'https://www.empower.com',
  voya: 'https://www.voya.com',
  tiaa: 'https://www.tiaa.org',
};

function getInstitutionUrl(name: string | null): string | null {
  if (!name) return null;
  const input = name.toLowerCase().trim();
  // Exact match first
  if (INSTITUTION_LINKS[input]) return INSTITUTION_LINKS[input];
  // Partial match: check if any known key appears in the user's input or vice versa
  for (const [key, url] of Object.entries(INSTITUTION_LINKS)) {
    if (input.includes(key) || key.includes(input)) return url;
  }
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getThisYearInvested(transfers: InvestmentTransfer[], accountId: string): number {
  const thisYear = new Date().getFullYear();
  return transfers
    .filter(
      (t) =>
        t.account_id === accountId &&
        (t.status === 'confirmed' || t.status === 'completed') &&
        new Date(t.created_at).getFullYear() === thisYear,
    )
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SetupGuide({ onAddAccount }: { onAddAccount: () => void }) {
  const [open, setOpen] = useState(true);
  const steps = [
    {
      icon: <Building2 className="h-4 w-4" />,
      title: 'Add your account',
      detail: 'Name your Roth IRA, 401(k), or savings account here so CostClarity knows where to route your savings.',
    },
    {
      icon: <PiggyBank className="h-4 w-4" />,
      title: 'Record a transfer',
      detail: 'Tap the arrow button next to any savings source (alternatives, challenges, or a custom amount) to log how much you want to invest.',
    },
    {
      icon: <ExternalLink className="h-4 w-4" />,
      title: 'Move the money',
      detail: 'Open your broker\'s app and manually transfer the same amount from your bank. CostClarity tracks your intent — you complete the actual transfer.',
    },
  ];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="glass-card border-primary/20 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between text-left">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">How to get started</span>
              <Badge variant="secondary" className="text-2xs">3 steps</Badge>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    {step.icon}
                  </div>
                  {i < steps.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="pb-3">
                  <p className="font-medium text-sm">
                    <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                </div>
              </div>
            ))}
            <Button size="sm" className="w-full bg-gradient-primary mt-1" onClick={onAddAccount}>
              <Plus className="h-4 w-4 mr-1" />
              Add Your First Account
            </Button>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

interface AccountTypeHintProps {
  type: InvestmentAccount['account_type'];
}

function AccountTypeHint({ type }: AccountTypeHintProps) {
  const info = ACCOUNT_TYPE_INFO[type];
  return (
    <div className="rounded-lg bg-muted/60 p-3 space-y-1.5 text-xs">
      <p className="text-muted-foreground leading-relaxed">{info.description}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
        {info.annualLimit && (
          <span className="text-success font-medium">
            ${info.annualLimit.toLocaleString()} / yr limit
          </span>
        )}
        <span className="text-muted-foreground">{info.taxBenefit}</span>
      </div>
    </div>
  );
}

interface ContributionProgressProps {
  invested: number;
  limit: number | null;
  accountType: InvestmentAccount['account_type'];
}

function ContributionProgress({ invested, limit, accountType }: ContributionProgressProps) {
  if (!limit || invested === 0) return null;
  const pct = Math.min((invested / limit) * 100, 100);
  const remaining = Math.max(limit - invested, 0);
  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between text-2xs text-muted-foreground">
        <span>{new Date().getFullYear()} contributions</span>
        <span>{formatCurrency(invested)} / {formatCurrency(limit)}</span>
      </div>
      <Progress value={pct} className="h-1.5" />
      {remaining > 0 ? (
        <p className="text-2xs text-muted-foreground">
          {formatCurrency(remaining)} remaining before {accountType === '401k' ? '401(k)' : 'IRA'} limit
        </p>
      ) : (
        <p className="text-2xs text-success font-medium">Annual limit reached!</p>
      )}
    </div>
  );
}

interface NextStepsDialogProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  accountName: string;
  accountType: InvestmentAccount['account_type'];
  institutionName: string | null;
}

function NextStepsDialog({ open, onClose, amount, accountName, accountType, institutionName }: NextStepsDialogProps) {
  const info = ACCOUNT_TYPE_INFO[accountType];
  const institutionUrl = getInstitutionUrl(institutionName);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-success/15 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-success" />
            </div>
            <DialogTitle>Transfer Recorded!</DialogTitle>
          </div>
          <DialogDescription>
            {formatCurrency(amount)} logged for <strong>{accountName}</strong>. Now complete the actual transfer:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Steps */}
          <div className="space-y-2">
            {info.setupSteps.map((step, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-2xs flex items-center justify-center font-semibold mt-0.5">
                  {i + 1}
                </div>
                <p className="text-sm text-muted-foreground leading-snug">{step}</p>
              </div>
            ))}
          </div>

          {/* Institution quick link */}
          {institutionUrl ? (
            <Button
              className="w-full"
              variant="outline"
              onClick={() => window.open(institutionUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open {institutionName}
            </Button>
          ) : institutionName ? (
            <Button
              className="w-full"
              variant="outline"
              onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(institutionName + ' login')}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Find {institutionName} online
            </Button>
          ) : (
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <Info className="h-3 w-3 inline mr-1" />
              Tip: Add an institution name to your account so we can link you directly.
            </div>
          )}

          {info.annualLimit && (
            <div className="rounded-lg bg-info/5 border border-info/20 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Contribution limit:</span>{' '}
              ${info.annualLimit.toLocaleString()} per year ({info.catchUpLimit && `$${info.catchUpLimit.toLocaleString()} if age 50+`}).{' '}
              {info.taxBenefit}.
            </div>
          )}

          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Invest() {
  const { toast } = useToast();
  const {
    accounts,
    transfers,
    accountsLoading,
    createAccount,
    deleteAccount,
    createTransfer,
    syncBalance,
    isCreatingAccount,
    isCreatingTransfer,
    isSyncingBalance,
    totalInvested,
    defaultAccount,
  } = useInvestmentAccounts();
  const { openPlaidLink, isLoading: isPlaidLoading, plaidError, clearError } = usePlaid();
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
  const [transferSourceType, setTransferSourceType] = useState<
    'alternative_savings' | 'challenge_savings' | 'custom' | 'purchase_savings'
  >('custom');
  const [transferDescription, setTransferDescription] = useState('');

  // Confirmation dialog
  const [pendingTransfer, setPendingTransfer] = useState<{
    amount: number;
    accountName: string;
    accountId: string;
    accountType: InvestmentAccount['account_type'];
    institutionName: string | null;
    sourceType: string;
    description: string;
  } | null>(null);

  // Post-transfer next-steps dialog
  const [nextSteps, setNextSteps] = useState<{
    amount: number;
    accountName: string;
    accountType: InvestmentAccount['account_type'];
    institutionName: string | null;
  } | null>(null);

  // Delete account confirmation
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  // Per-purchase savings collapsible
  const [showIndividual, setShowIndividual] = useState(false);

  const challengeSavings = currentChallenge ? Number(currentChallenge.actual_savings) : 0;

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
        description: "This week's challenge savings",
      });
    }
    return sources;
  }, [totalSavedAmount, challengeSavings, favoritedAlternatives.length]);

  const totalAvailableSavings = totalSavedAmount + challengeSavings;

  // ── Handlers ────────────────────────────────────────────────────────────────

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

  const handleStartTransfer = (
    sourceType: typeof transferSourceType,
    amount: number,
    description: string,
  ) => {
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
    const account = accounts.find((a) => a.id === transferAccountId);
    setPendingTransfer({
      amount,
      accountName: account
        ? `${account.account_name} (${getAccountTypeLabel(account.account_type)})`
        : '',
      accountId: transferAccountId,
      accountType: account?.account_type ?? 'other',
      institutionName: account?.institution_name ?? null,
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
      // Show post-transfer next-steps instead of just a toast
      setNextSteps({
        amount: pendingTransfer.amount,
        accountName: pendingTransfer.accountName,
        accountType: pendingTransfer.accountType,
        institutionName: pendingTransfer.institutionName,
      });
    } catch {
      toast({ title: 'Transfer failed', variant: 'destructive' });
    }
    setPendingTransfer(null);
  };

  // ── Animation ───────────────────────────────────────────────────────────────

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const recentTransfers = transfers.slice(0, 5);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-hero">
        <header className="px-6 pt-6 pb-4">
          <h1 className="text-2xl font-bold">Invest Your Savings</h1>
          <p className="text-muted-foreground text-sm mt-1">Turn what you save into wealth</p>
        </header>

        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="px-6 space-y-5 pb-32"
        >
          {/* Setup guide — always shown, collapsible */}
          <motion.div variants={itemVariants}>
            <SetupGuide onAddAccount={() => setShowAddAccount(true)} />
          </motion.div>

          {/* Plaid error / setup instructions */}
          {plaidError && (
            <motion.div variants={itemVariants}>
              <Card className={`p-4 glass-card border-destructive/30 bg-destructive/5`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    {plaidError.reason === 'not_configured' ? (
                      <>
                        <p className="text-sm font-semibold text-destructive mb-1">
                          Plaid API keys not configured
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          To enable account syncing, add your Plaid credentials to Supabase:
                        </p>
                        <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                          <li>Go to <strong>dashboard.plaid.com</strong> → create a free account</li>
                          <li>Copy your <strong>Client ID</strong> and <strong>Sandbox Secret</strong></li>
                          <li>In Supabase → <strong>Edge Functions → Manage Secrets</strong> → add:</li>
                        </ol>
                        <div className="mt-2 rounded bg-muted px-3 py-2 text-xs font-mono space-y-1">
                          <p>PLAID_CLIENT_ID = your_client_id</p>
                          <p>PLAID_SECRET = your_secret</p>
                          <p>PLAID_ENV = sandbox</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3 w-full"
                          onClick={() => window.open('https://dashboard.plaid.com', '_blank')}
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Open Plaid Dashboard
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-destructive mb-1">
                          Sync failed
                        </p>
                        <p className="text-xs text-muted-foreground">{plaidError.message}</p>
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground flex-shrink-0"
                    onClick={clearError}
                  >
                    ×
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

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
                  <p className="text-3xl font-bold number-display">
                    {formatCurrency(totalAvailableSavings)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-success" />
                <span>
                  Total invested so far:{' '}
                  <strong className="text-foreground">{formatCurrency(totalInvested)}</strong>
                </span>
              </div>
            </Card>
          </motion.div>

          {/* Investment Accounts */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Investment Accounts</h2>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={openPlaidLink}
                  disabled={isPlaidLoading}
                  className="bg-gradient-primary text-primary-foreground"
                >
                  {isPlaidLoading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-1" />
                  )}
                  {isPlaidLoading ? 'Connecting...' : 'Sync Account'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddAccount(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Manual
                </Button>
              </div>
            </div>

            {accounts.length === 0 ? (
              <Card className="p-6 glass-card text-center">
                <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium mb-1">Connect your brokerage</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Sync your Roth IRA, 401(k), or brokerage account to see your real balance here.
                </p>
                <Button
                  className="w-full bg-gradient-primary mb-2"
                  onClick={openPlaidLink}
                  disabled={isPlaidLoading}
                >
                  {isPlaidLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  {isPlaidLoading ? 'Connecting...' : 'Sync via Plaid'}
                </Button>
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setShowAddAccount(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add manually instead
                </Button>
              </Card>
            ) : (
              <div className="space-y-2">
                {accounts.map((account) => {
                  const info = ACCOUNT_TYPE_INFO[account.account_type];
                  const yearInvested = getThisYearInvested(transfers, account.id);
                  const institutionUrl = getInstitutionUrl(account.institution_name);

                  return (
                    <Card key={account.id} className="p-4 glass-card">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Wallet className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium truncate">{account.account_name}</p>
                              {account.is_default && (
                                <Badge variant="secondary" className="text-2xs">Default</Badge>
                              )}
                              {account.plaid_account_id && (
                                <Badge variant="outline" className="text-2xs text-success border-success/40">
                                  Synced
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {getAccountTypeLabel(account.account_type)}
                              {account.institution_name && ` · ${account.institution_name}`}
                            </p>

                            {/* Real Plaid balance */}
                            {account.plaid_balance != null && (
                              <div className="mt-1">
                                <p className="text-lg font-bold text-success">
                                  {formatCurrency(account.plaid_balance)}
                                </p>
                                {account.plaid_balance_synced_at && (
                                  <p className="text-2xs text-muted-foreground">
                                    Synced {new Date(account.plaid_balance_synced_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Contribution progress bar */}
                            <ContributionProgress
                              invested={yearInvested}
                              limit={info.annualLimit}
                              accountType={account.account_type}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Sync balance button (only for Plaid-linked accounts) */}
                          {account.plaid_account_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-success"
                              onClick={async () => {
                                try {
                                  await syncBalance(account.id);
                                  toast({ title: "Balance synced", description: `${account.account_name} balance updated successfully.` });
                                } catch (err: any) {
                                  const msg = err?.message?.includes('ITEM_LOGIN_REQUIRED')
                                    ? 'Your bank connection needs to be re-authorized. Please reconnect your account.'
                                    : err?.message?.includes('rate limit')
                                    ? 'Too many requests. Please try again in a few minutes.'
                                    : 'Unable to sync balance. Please try again later.';
                                  toast({
                                    variant: "destructive",
                                    title: "Sync failed",
                                    description: msg,
                                    action: (
                                      <ToastAction altText="Retry sync" onClick={() => syncBalance(account.id).catch(() => {})}>
                                        Retry
                                      </ToastAction>
                                    ),
                                  });
                                }
                              }}
                              disabled={isSyncingBalance}
                              title="Refresh balance"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${isSyncingBalance ? 'animate-spin' : ''}`} />
                            </Button>
                          )}
                          {/* Institution link */}
                          {institutionUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                              onClick={() => window.open(institutionUrl, '_blank')}
                              title={`Open ${account.institution_name}`}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive h-8 w-8 p-0"
                            onClick={() => setDeletingAccountId(account.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
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
                          onClick={() =>
                            handleStartTransfer(source.type, source.amount, source.label)
                          }
                          disabled={accounts.length === 0}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Per-purchase savings collapsible */}
                {favoritedAlternatives.length > 0 && (
                  <Collapsible open={showIndividual} onOpenChange={setShowIndividual}>
                    <CollapsibleTrigger asChild>
                      <button className="text-sm text-primary font-medium flex items-center gap-1 mb-2">
                        <ChevronDown
                          className={`h-3 w-3 transition-transform ${showIndividual ? 'rotate-180' : ''}`}
                        />
                        Individual purchase savings ({favoritedAlternatives.length})
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
                        {favoritedAlternatives.slice(0, 10).map((alt) => (
                          <div
                            key={alt.id}
                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{alt.alternative_name}</p>
                              <p className="text-xs text-muted-foreground">{alt.category}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-success">
                                {formatCurrency(Number(alt.savings))}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() =>
                                  handleStartTransfer(
                                    'purchase_savings',
                                    Number(alt.savings),
                                    `Saved on: ${alt.alternative_name}`,
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
                    </CollapsibleContent>
                  </Collapsible>
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

          {/* Recent Transfers */}
          {recentTransfers.length > 0 && (
            <motion.div variants={itemVariants}>
              <h2 className="text-lg font-semibold mb-3">Recent Transfers</h2>
              <div className="space-y-2">
                {recentTransfers.map((transfer) => {
                  const account = accounts.find((a) => a.id === transfer.account_id);
                  return (
                    <Card key={transfer.id} className="p-3 glass-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {formatCurrency(Number(transfer.amount))}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {account?.account_name || 'Account'} ·{' '}
                            {new Date(transfer.created_at).toLocaleDateString()}
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

          {/* Contribution limits reference */}
          <motion.div variants={itemVariants}>
            <Card className="p-4 glass-card">
              <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <Info className="h-4 w-4 text-primary" />
                2025 IRS Contribution Limits
              </p>
              <div className="space-y-1.5">
                {[
                  { label: 'Roth IRA / Traditional IRA', limit: '$7,000 ($8,000 if age 50+)' },
                  { label: '401(k)', limit: '$23,500 ($31,000 if age 50+)' },
                  { label: 'HSA (Self-only / Family)', limit: '$4,300 / $8,550' },
                  { label: 'Brokerage / Savings', limit: 'No limit' },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium">{row.limit}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </motion.main>
      </div>

      {/* ── Add Account Dialog ───────────────────────────────────────────────── */}
      <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Investment Account</DialogTitle>
            <DialogDescription>
              Add your Roth IRA, 401(k), brokerage, or savings account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select
                value={newAccount.account_type}
                onValueChange={(v) =>
                  setNewAccount((p) => ({ ...p, account_type: v as any }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                      {ACCOUNT_TYPE_INFO[t.value].annualLimit &&
                        ` — up to $${ACCOUNT_TYPE_INFO[t.value].annualLimit!.toLocaleString()}/yr`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Contextual hint for selected type */}
              <AccountTypeHint type={newAccount.account_type} />
            </div>

            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input
                placeholder="e.g. My Roth IRA"
                value={newAccount.account_name}
                onChange={(e) =>
                  setNewAccount((p) => ({ ...p, account_name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>
                Institution{' '}
                <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </Label>
              <Input
                placeholder="e.g. Fidelity, Schwab, Vanguard"
                value={newAccount.institution_name}
                onChange={(e) =>
                  setNewAccount((p) => ({ ...p, institution_name: e.target.value }))
                }
              />
              <p className="text-2xs text-muted-foreground">
                Adding an institution lets us link you directly to their site when you're ready to transfer.
              </p>
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

      {/* ── Transfer Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invest Savings</DialogTitle>
            <DialogDescription>Choose an account and amount to invest</DialogDescription>
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
                  {accounts.map((a) => (
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
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <Info className="h-3 w-3 inline mr-1" />
              After recording, we'll show you the exact steps to move the money in your broker's app.
            </div>
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

      {/* ── Confirmation Dialog ──────────────────────────────────────────────── */}
      <AlertDialog
        open={!!pendingTransfer}
        onOpenChange={(open) => !open && setPendingTransfer(null)}
      >
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
              <span className="block text-xs mt-2 text-muted-foreground">
                We'll show you the steps to complete the actual transfer in your broker's app.
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
              {isCreatingTransfer ? 'Processing...' : 'Confirm & See Steps'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Post-Transfer Next Steps Dialog ─────────────────────────────────── */}
      {nextSteps && (
        <NextStepsDialog
          open={!!nextSteps}
          onClose={() => setNextSteps(null)}
          amount={nextSteps.amount}
          accountName={nextSteps.accountName}
          accountType={nextSteps.accountType}
          institutionName={nextSteps.institutionName}
        />
      )}

      {/* ── Delete Account Confirmation ──────────────────────────────────────── */}
      <AlertDialog
        open={!!deletingAccountId}
        onOpenChange={(open) => !open && setDeletingAccountId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the account and all associated transfer records. This cannot be
              undone.
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
