import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Search,
  Trash2,
  Filter,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePurchases } from '@/hooks/usePurchases';
import { formatCurrency, calculateCostBreakdown } from '@/lib/calculations';
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

export default function History() {
  const navigate = useNavigate();
  const { purchases, deletePurchase, categoryTotals } = usePurchases();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showStats, setShowStats] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-hero pb-6">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Purchase History</h1>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                            onClick={() => deletePurchase(purchase.id)}
                            aria-label="Delete purchase"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
    </div>
  );
}