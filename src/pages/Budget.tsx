import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Plus, Trash2, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBudget, ALL_CATEGORIES, getCategoryLabel } from '@/hooks/useBudget';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/calculations';

const CATEGORY_EMOJIS: Record<string, string> = {
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

export default function Budget() {
  const { toast } = useToast();
  const {
    limits,
    isLoading,
    budgetStatuses,
    totalBudgeted,
    totalSpent,
    overBudgetCount,
    setLimit,
    deleteLimit,
    isSettingLimit,
  } = useBudget();

  const [newCategory, setNewCategory] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const usedCategories = new Set(limits.map(l => l.category));
  const availableCategories = ALL_CATEGORIES.filter(c => !usedCategories.has(c));

  const handleAdd = async () => {
    if (!newCategory || !newAmount || parseFloat(newAmount) <= 0) {
      toast({ title: 'Please select a category and enter a valid amount', variant: 'destructive' });
      return;
    }
    await setLimit({ category: newCategory, monthly_limit: parseFloat(newAmount) });
    setNewCategory('');
    setNewAmount('');
    toast({ title: `Budget set for ${getCategoryLabel(newCategory)}` });
  };

  const handleEdit = async (category: string) => {
    if (!editAmount || parseFloat(editAmount) <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    await setLimit({ category, monthly_limit: parseFloat(editAmount) });
    setEditingCategory(null);
    setEditAmount('');
    toast({ title: 'Budget updated' });
  };

  const handleDelete = async (category: string) => {
    await deleteLimit(category);
    toast({ title: `Budget removed for ${getCategoryLabel(category)}` });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  };

  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-hero">
        <header className="px-6 pt-6 pb-4">
          <h1 className="text-2xl font-bold">Monthly Budget</h1>
          <p className="text-muted-foreground text-sm mt-1">{currentMonth}</p>
        </header>

        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="px-6 space-y-5 pb-24"
        >
          {/* Summary */}
          {limits.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card className="p-5 glass-card">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Budgeted</p>
                    <p className="font-bold text-lg">{formatCurrency(totalBudgeted)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Spent</p>
                    <p className={`font-bold text-lg ${totalSpent > totalBudgeted ? 'text-destructive' : ''}`}>
                      {formatCurrency(totalSpent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                    <p className={`font-bold text-lg ${totalBudgeted - totalSpent < 0 ? 'text-destructive' : 'text-success'}`}>
                      {formatCurrency(Math.max(totalBudgeted - totalSpent, 0))}
                    </p>
                  </div>
                </div>
                {overBudgetCount > 0 && (
                  <div className="mt-3 flex items-center gap-2 p-2 bg-destructive/10 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                    <p className="text-sm text-destructive">
                      {overBudgetCount} {overBudgetCount === 1 ? 'category' : 'categories'} over budget this month
                    </p>
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {/* Budget Categories */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : budgetStatuses.length === 0 ? (
            <motion.div variants={itemVariants}>
              <Card className="p-8 glass-card text-center">
                <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium mb-1">No budgets set</p>
                <p className="text-sm text-muted-foreground">Add spending limits below to track your monthly budget.</p>
              </Card>
            </motion.div>
          ) : (
            budgetStatuses.map(status => (
              <motion.div key={status.category} variants={itemVariants}>
                <Card className={`p-4 glass-card ${status.isOverBudget ? 'border-destructive/30' : ''}`}>
                  {editingCategory === status.category ? (
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{CATEGORY_EMOJIS[status.category] ?? '📦'}</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-2">{getCategoryLabel(status.category)}</p>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={editAmount}
                            onChange={e => setEditAmount(e.target.value)}
                            placeholder="Monthly limit"
                            className="h-8 text-sm"
                            autoFocus
                          />
                          <Button size="sm" onClick={() => handleEdit(status.category)} disabled={isSettingLimit}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{CATEGORY_EMOJIS[status.category] ?? '📦'}</span>
                          <div>
                            <p className="font-medium text-sm">{getCategoryLabel(status.category)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(status.spent)} of {formatCurrency(status.limit)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {status.isOverBudget ? (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          ) : status.percentUsed >= 80 ? (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-success" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => {
                              setEditingCategory(status.category);
                              setEditAmount(String(status.limit));
                            }}
                          >
                            <TrendingUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive/70 hover:text-destructive"
                            onClick={() => handleDelete(status.category)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <Progress
                        value={status.percentUsed}
                        className={`h-2 ${status.isOverBudget ? '[&>div]:bg-destructive' : status.percentUsed >= 80 ? '[&>div]:bg-warning' : '[&>div]:bg-success'}`}
                      />
                      <p className={`text-xs mt-1 ${status.isOverBudget ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {status.isOverBudget
                          ? `${formatCurrency(Math.abs(status.remaining))} over budget`
                          : `${formatCurrency(status.remaining)} remaining`}
                      </p>
                    </>
                  )}
                </Card>
              </motion.div>
            ))
          )}

          {/* Add new budget */}
          {availableCategories.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card className="p-4 glass-card">
                <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  Add Budget Limit
                </h3>
                <div className="flex gap-2">
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger className="flex-1 h-9 text-sm">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {CATEGORY_EMOJIS[cat]} {getCategoryLabel(cat)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    placeholder="$/mo"
                    className="w-24 h-9 text-sm"
                  />
                  <Button size="sm" onClick={handleAdd} disabled={isSettingLimit} className="h-9">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </motion.main>
      </div>
    </AppLayout>
  );
}
