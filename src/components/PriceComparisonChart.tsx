import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card } from '@/components/ui/card';
import { TrendingDown } from 'lucide-react';

interface Alternative {
  name: string;
  estimated_price?: string;
  store_name?: string;
  estimated_savings: string;
}

interface PriceComparisonChartProps {
  alternatives: Alternative[];
  originalProduct: string;
}

const COLORS = [
  'hsl(var(--success))',
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(142 76% 36%)',
  'hsl(173 80% 40%)',
];

export function PriceComparisonChart({ alternatives, originalProduct }: PriceComparisonChartProps) {
  const chartData = useMemo(() => {
    return alternatives
      .filter(alt => alt.estimated_price)
      .map((alt, index) => {
        // Parse price from string like "$7.99" or "~$7.99"
        const priceMatch = alt.estimated_price?.match(/\$?([\d.]+)/);
        const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
        
        return {
          name: alt.store_name || alt.name.split(' ')[0],
          fullName: alt.name,
          price,
          savings: alt.estimated_savings,
          colorIndex: index,
        };
      })
      .filter(item => item.price > 0)
      .sort((a, b) => a.price - b.price);
  }, [alternatives]);

  if (chartData.length < 2) {
    return null;
  }

  const maxPrice = Math.max(...chartData.map(d => d.price));
  const minPrice = Math.min(...chartData.map(d => d.price));
  const savingsAmount = maxPrice - minPrice;

  return (
    <Card className="p-4 mt-4 bg-muted/30 border-border/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-success" />
          Price Comparison
        </h3>
        <span className="text-xs text-muted-foreground">
          Save up to ${savingsAmount.toFixed(2)}
        </span>
      </div>
      
      <div className="h-[160px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <XAxis 
              type="number" 
              tickFormatter={(value) => `$${value}`}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={80}
              tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                      <p className="font-medium text-sm text-foreground">{data.fullName}</p>
                      <p className="text-lg font-bold text-success">${data.price.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{data.savings} savings</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="price" 
              radius={[0, 4, 4, 0]}
              maxBarSize={28}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                  opacity={index === 0 ? 1 : 0.7 + (0.3 * (chartData.length - index) / chartData.length)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Lowest price highlighted • Prices may vary by location
      </p>
    </Card>
  );
}
