import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card } from '@/components/ui/card';
import { TrendingUp, Calendar } from 'lucide-react';
import { usePriceHistory } from '@/hooks/usePriceHistory';

interface PriceTrendChartProps {
  productName: string;
}

const TREND_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--accent))',
  'hsl(142 76% 36%)',
  'hsl(173 80% 40%)',
  'hsl(262 83% 58%)',
];

export function PriceTrendChart({ productName }: PriceTrendChartProps) {
  const { trendData, storeNames, isLoading } = usePriceHistory(productName);

  const chartData = useMemo(() => {
    if (trendData.length === 0) return [];
    
    // Get last 10 data points for cleaner visualization
    return trendData.slice(-10);
  }, [trendData]);

  // Calculate price change stats
  const priceStats = useMemo(() => {
    if (chartData.length < 2 || storeNames.length === 0) return null;

    const firstRecord = chartData[0];
    const lastRecord = chartData[chartData.length - 1];
    
    // Find the first store with data
    const store = storeNames.find(s => 
      typeof firstRecord[s] === 'number' && typeof lastRecord[s] === 'number'
    );
    
    if (!store) return null;

    const firstPrice = firstRecord[store] as number;
    const lastPrice = lastRecord[store] as number;
    const change = lastPrice - firstPrice;
    const percentChange = ((change / firstPrice) * 100).toFixed(1);

    return {
      store,
      change,
      percentChange,
      isIncrease: change > 0,
    };
  }, [chartData, storeNames]);

  if (isLoading) {
    return (
      <Card className="p-4 mt-4 bg-muted/30 border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-sm text-muted-foreground">Loading price history...</span>
        </div>
      </Card>
    );
  }

  if (chartData.length < 2) {
    return (
      <Card className="p-4 mt-4 bg-muted/30 border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Price History</span>
        </div>
        <p className="text-xs text-muted-foreground text-center py-4">
          Search this product again to start tracking price trends over time
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 mt-4 bg-muted/30 border-border/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Price Trends
        </h3>
        {priceStats && (
          <span className={`text-xs px-2 py-1 rounded-full ${
            priceStats.isIncrease 
              ? 'bg-destructive/10 text-destructive' 
              : 'bg-success/10 text-success'
          }`}>
            {priceStats.isIncrease ? '↑' : '↓'} {Math.abs(Number(priceStats.percentChange))}%
          </span>
        )}
      </div>

      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
              width={45}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                      <p className="text-xs text-muted-foreground mb-2">{label}</p>
                      {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-sm font-medium">{entry.name}:</span>
                          <span className="text-sm text-success">${Number(entry.value).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '11px' }}
              iconSize={8}
            />
            {storeNames.map((store, index) => (
              <Line
                key={store}
                type="monotone"
                dataKey={store}
                name={store}
                stroke={TREND_COLORS[index % TREND_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: TREND_COLORS[index % TREND_COLORS.length] }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted-foreground mt-2 text-center">
        Showing your last {chartData.length} searches • Prices update with each search
      </p>
    </Card>
  );
}
