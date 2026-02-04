import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/calculations';
import { Database } from '@/integrations/supabase/types';

type Purchase = Database['public']['Tables']['purchases']['Row'];
type PurchaseCategory = Database['public']['Enums']['purchase_category'];

interface SpendingChartsProps {
  purchases: Purchase[];
}

const CATEGORY_COLORS: Record<PurchaseCategory, string> = {
  dining: '#14b8a6',      // teal-500
  shopping: '#f97316',    // orange-500
  transportation: '#3b82f6', // blue-500
  entertainment: '#a855f7', // purple-500
  subscriptions: '#ec4899', // pink-500
  groceries: '#22c55e',   // green-500
  health: '#ef4444',      // red-500
  utilities: '#eab308',   // yellow-500
  travel: '#06b6d4',      // cyan-500
  other: '#6b7280',       // gray-500
};

const CATEGORY_LABELS: Record<PurchaseCategory, string> = {
  dining: 'Dining',
  shopping: 'Shopping',
  transportation: 'Transport',
  entertainment: 'Entertainment',
  subscriptions: 'Subscriptions',
  groceries: 'Groceries',
  health: 'Health',
  utilities: 'Utilities',
  travel: 'Travel',
  other: 'Other',
};

export function SpendingCharts({ purchases }: SpendingChartsProps) {
  // Process data for charts
  const { dailyData, categoryData, weeklyData } = useMemo(() => {
    // Last 30 days daily spending
    const last30Days = new Map<string, number>();
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      last30Days.set(key, 0);
    }

    // Category totals
    const categories = new Map<PurchaseCategory, number>();

    // Weekly totals (last 8 weeks)
    const weeks = new Map<string, number>();
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const weekLabel = `W${8 - i}`;
      weeks.set(weekLabel, 0);
    }

    purchases.forEach((purchase) => {
      const date = purchase.purchase_date!;
      const amount = Number(purchase.amount);

      // Daily
      if (last30Days.has(date)) {
        last30Days.set(date, (last30Days.get(date) || 0) + amount);
      }

      // Category
      const cat = purchase.category as PurchaseCategory;
      categories.set(cat, (categories.get(cat) || 0) + amount);

      // Weekly
      const purchaseDate = new Date(date);
      const daysDiff = Math.floor((today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(daysDiff / 7);
      if (weekIndex >= 0 && weekIndex < 8) {
        const weekLabel = `W${8 - weekIndex}`;
        weeks.set(weekLabel, (weeks.get(weekLabel) || 0) + amount);
      }
    });

    const dailyData = Array.from(last30Days.entries()).map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount,
    }));

    const categoryData = Array.from(categories.entries())
      .map(([category, amount]) => ({
        name: CATEGORY_LABELS[category],
        value: amount,
        color: CATEGORY_COLORS[category],
      }))
      .sort((a, b) => b.value - a.value);

    const weeklyData = Array.from(weeks.entries()).map(([week, amount]) => ({
      week,
      amount,
    }));

    return { dailyData, categoryData, weeklyData };
  }, [purchases]);

  const totalSpent = categoryData.reduce((sum, cat) => sum + cat.value, 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-lg font-bold text-primary">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{data.name}</p>
          <p className="text-lg font-bold" style={{ color: data.color }}>
            {formatCurrency(data.value)}
          </p>
          <p className="text-xs text-muted-foreground">
            {((data.value / totalSpent) * 100).toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  if (purchases.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Daily Spending Trend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-4 glass-card">
          <h3 className="font-semibold mb-4">Spending Trend (30 Days)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      {/* Category Breakdown & Weekly Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-4 glass-card">
            <h3 className="font-semibold mb-4">By Category</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {categoryData.slice(0, 4).map((cat) => (
                <div key={cat.name} className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-xs text-muted-foreground">{cat.name}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Weekly Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-4 glass-card">
            <h3 className="font-semibold mb-4">Weekly Spending</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="amount"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}