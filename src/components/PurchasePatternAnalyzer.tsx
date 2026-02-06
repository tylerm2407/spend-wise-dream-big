import { motion } from 'framer-motion';
import { TrendingUp, ShoppingBag, Bell, BellOff, Percent } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { usePurchasePatterns } from '@/hooks/usePurchasePatterns';

const categoryIcons: Record<string, string> = {
  dining: '🍽️',
  shopping: '🛍️',
  transportation: '🚗',
  entertainment: '🎬',
  subscriptions: '📺',
  groceries: '🛒',
  health: '💊',
  utilities: '💡',
  travel: '✈️',
  other: '📦',
};

export function PurchasePatternAnalyzer() {
  const { 
    patterns, 
    frequentPatterns, 
    isLoading, 
    toggleAutoAlert, 
    updateThreshold,
    isAnalyzing 
  } = usePurchasePatterns();

  if (isLoading || isAnalyzing) {
    return (
      <Card className="p-4 glass-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-full bg-accent/10 animate-pulse">
            <TrendingUp className="h-4 w-4 text-accent" />
          </div>
          <span className="text-sm text-muted-foreground">Analyzing purchase patterns...</span>
        </div>
      </Card>
    );
  }

  if (patterns.length === 0) {
    return (
      <Card className="p-4 glass-card">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-full bg-accent/10">
            <ShoppingBag className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Smart Alerts</h3>
            <p className="text-xs text-muted-foreground">Based on your purchase history</p>
          </div>
        </div>
        <div className="text-center py-6">
          <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">
            Log more purchases to discover your buying patterns
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            We'll automatically alert you when items you buy often go on sale
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 glass-card">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-full bg-accent/10">
          <TrendingUp className="h-4 w-4 text-accent" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Smart Alerts</h3>
          <p className="text-xs text-muted-foreground">
            Auto-track {frequentPatterns.length} frequent purchases
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {patterns.slice(0, 5).map((pattern, index) => (
          <motion.div
            key={pattern.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-3 bg-muted/30 rounded-lg border border-border/50"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-lg">{categoryIcons[pattern.category] || '📦'}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{pattern.product_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Bought {pattern.purchase_count}x</span>
                    <span>•</span>
                    <span>Avg ${Number(pattern.average_price).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pattern.auto_alert_enabled ? (
                  <Bell className="h-4 w-4 text-primary" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Switch
                  checked={pattern.auto_alert_enabled}
                  onCheckedChange={(enabled) => toggleAutoAlert({ id: pattern.id, enabled })}
                />
              </div>
            </div>

            {pattern.auto_alert_enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 pt-3 border-t border-border/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Alert when price drops by:
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {pattern.alert_threshold_percent}% off
                  </Badge>
                </div>
                <Slider
                  value={[Number(pattern.alert_threshold_percent)]}
                  onValueChange={([value]) => updateThreshold({ id: pattern.id, threshold: value })}
                  min={5}
                  max={50}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>5%</span>
                  <span>50%</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}

        {patterns.length > 5 && (
          <p className="text-xs text-muted-foreground text-center">
            +{patterns.length - 5} more items tracked
          </p>
        )}
      </div>
    </Card>
  );
}
