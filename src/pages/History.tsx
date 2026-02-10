import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Search,
  Trash2,
  Filter,
  TrendingUp,
  Calendar,
  Pencil,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePurchases } from '@/hooks/usePurchases';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, calculateCostBreakdown } from '@/lib/calculations';
import { ExportCSVDialog } from '@/components/ExportCSVDialog';
import { HistorySkeleton, ErrorState } from '@/components/PageSkeletons';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

type PurchaseCategory = Database['public']['Enums']['purchase_category'];

const CATEGORY_ICONS: Record<PurchaseCategory, string> = {
  dining: '🍽️',
  shopping: '🛍️',
  transportation: '🚗',
  entertainment: '🎬',
  subscriptions: '📱',
  groceries: '🛒',
  health: '💊',
  utilities: '💡',
  travel: '✈️',
  other: '📦',
};

const CATEGORIES: { value: PurchaseCategory; label: string }[] = [
  { value: 'dining', label: 'Dining' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'groceries', label: 'Groceries' },
  { value: 'health', label: 'Health' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'travel', label: 'Travel' },
  { value: 'other', label: 'Other' },
];

export default function History() {
  const navigate = useNavigate();
  const { purchases, deletePurchase, updatePurchase, categoryTotals, isLoading, error } = usePurchases();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showStats, setShowStats] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<{
    id: string;
    item_name: string;
    amount: string;
    category: PurchaseCategory;
  } | null>(null);

  const openEditDialog = (purchase: typeof purchases[0]) => {
    setEditingPurchase({
      id: purchase.id,
      item_name: purchase.item_name,
      amount: String(purchase.amount),
      category: purchase.category,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingPurchase) return;
    const numAmount = parseFloat(editingPurchase.amount);
    if (!numAmount || numAmount <= 0 || !editingPurchase.item_name.trim()) {
      toast({
        title: 'Invalid input',
        description: 'Please enter a valid name and amount.',
        variant: 'destructive',
      });
      return;
    }

    updatePurchase({
      id: editingPurchase.id,
      item_name: editingPurchase.item_name.trim(),
      amount: numAmount,
      category: editingPurchase.category,
    }, {
      onSuccess: () => {
        toast({ title: 'Purchase updated' });
        setEditDialogOpen(false);
      },
    });
  };

  const filteredPurchases = purchases.filter((p) => {
    const matchesSearch = p.item_name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalFiltered = filteredPurchases.reduce((sum, p) => sum + Number(p.amount), 0);

  // Group by date
  const groupedByDate = filteredPurchases.reduce((acc, purchase) => {
    const date = new Date(purchase.purchase_date!).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(purchase);
    return acc;
  }, {} as Record<string, typeof purchases>);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero pb-6">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg px-6 py-4 border-b border-border pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold flex-1">Purchase History</h1>
          </div>
        </header>
        <HistorySkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-hero pb-6">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg px-6 py-4 border-b border-border pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold flex-1">Purchase History</h1>
          </div>
        </header>
        <ErrorState onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero pb-6">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg px-6 py-4 border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/home')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold flex-1">Purchase History</h1>
          <ExportCSVDialog purchases={purchases} />
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search purchases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[130px] h-10">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => (
                <SelectItem key={cat} value={cat}>
                  {icon} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="px-6 py-6 space-y-6">
        {/* Stats Toggle */}
        <button
          onClick={() => setShowStats(!showStats)}
          className="w-full"
        >
          <Card className={cn(
            'p-4 glass-card transition-all',
            showStats && 'ring-2 ring-primary'
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">
                    {categoryFilter === 'all' ? 'Total' : categoryFilter}
                  </p>
                  <p className="font-bold text-xl">{formatCurrency(totalFiltered)}</p>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">
                {filteredPurchases.length} purchases
              </span>
            </div>

            {/* Category Breakdown */}
            {showStats && categoryFilter === 'all' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 pt-4 border-t border-border"
              >
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(categoryTotals)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([cat, amount]) => (
                      <div
                        key={cat}
                        className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
                      >
                        <span>{CATEGORY_ICONS[cat as PurchaseCategory]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground capitalize truncate">
                            {cat}
                          </p>
                          <p className="font-medium text-sm">
                            {formatCurrency(amount, 0)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}
          </Card>
        </button>

        {/* Purchase List */}
        {filteredPurchases.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No purchases found</p>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([date, dayPurchases]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {date}
              </h3>
              <div className="space-y-2">
                {dayPurchases.map((purchase, index) => {
                  const breakdown = calculateCostBreakdown(
                    Number(purchase.amount),
                    purchase.frequency as any
                  );
                  
                  return (
                    <motion.div
                      key={purchase.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <Card className="p-4 glass-card">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-xl">
                              {CATEGORY_ICONS[purchase.category]}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium truncate">
                                  {purchase.item_name}
                                </p>
                                <p className="text-sm text-muted-foreground capitalize">
                                  {purchase.category} · {purchase.frequency}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-semibold">
                                  {formatCurrency(Number(purchase.amount))}
                                </p>
                                {purchase.frequency !== 'one-time' && (
                                  <p className="text-xs text-muted-foreground">
                                    {formatCurrency(breakdown.yearly, 0)}/yr
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => openEditDialog(purchase)}
                              aria-label="Edit purchase"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  aria-label="Delete purchase"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete purchase?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete "{purchase.item_name}" ({formatCurrency(Number(purchase.amount))}). This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deletePurchase(purchase.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Edit Purchase Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Purchase</DialogTitle>
          </DialogHeader>
          {editingPurchase && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="editItemName">Item Name</Label>
                <Input
                  id="editItemName"
                  value={editingPurchase.item_name}
                  onChange={(e) => setEditingPurchase({ ...editingPurchase, item_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editAmount">Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="editAmount"
                    type="number"
                    value={editingPurchase.amount}
                    onChange={(e) => setEditingPurchase({ ...editingPurchase, amount: e.target.value })}
                    className="pl-10"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={editingPurchase.category}
                  onValueChange={(v) => setEditingPurchase({ ...editingPurchase, category: v as PurchaseCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {CATEGORY_ICONS[cat.value]} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleSaveEdit}
                className="w-full bg-gradient-primary"
              >
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
