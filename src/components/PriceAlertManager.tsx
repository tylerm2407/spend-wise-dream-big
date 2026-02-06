import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing, Plus, Trash2, TrendingDown, DollarSign, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import { useToast } from '@/hooks/use-toast';

interface PriceAlertManagerProps {
  initialProduct?: string;
  initialPrice?: number;
  onClose?: () => void;
}

export function PriceAlertManager({ initialProduct, initialPrice, onClose }: PriceAlertManagerProps) {
  const [productName, setProductName] = useState(initialProduct || '');
  const [targetPrice, setTargetPrice] = useState(initialPrice?.toString() || '');
  const [showAddForm, setShowAddForm] = useState(!!initialProduct);
  const { alerts, activeAlerts, createAlert, updateAlert, deleteAlert, isCreating } = usePriceAlerts();
  const { toast } = useToast();

  const handleCreateAlert = async () => {
    if (!productName.trim() || !targetPrice) return;

    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid price',
        description: 'Please enter a valid target price.',
      });
      return;
    }

    try {
      createAlert({
        productName: productName.trim(),
        targetPrice: price,
      });
      setProductName('');
      setTargetPrice('');
      setShowAddForm(false);
      toast({
        title: 'Alert created!',
        description: `You'll be notified when ${productName} drops below $${price.toFixed(2)}`,
      });
      onClose?.();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to create alert',
        description: 'Please try again.',
      });
    }
  };

  return (
    <Card className="p-4 glass-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10">
            <BellRing className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Price Alerts</h3>
            <p className="text-xs text-muted-foreground">Get notified when prices drop</p>
          </div>
        </div>
        {!showAddForm && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setShowAddForm(true)}
            className="gap-1"
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-muted/50 rounded-lg border border-border/50"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">New Alert</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowAddForm(false);
                  setProductName('');
                  setTargetPrice('');
                  onClose?.();
                }}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Product name (e.g., Starbucks coffee)"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="text-sm"
              />
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Alert when below..."
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="pl-7 text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleCreateAlert}
                  disabled={!productName.trim() || !targetPrice || isCreating}
                  className="bg-gradient-cta"
                >
                  Set Alert
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeAlerts.length === 0 && !showAddForm ? (
        <div className="text-center py-4">
          <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-xs text-muted-foreground">
            No active alerts. Add one to track price drops!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeAlerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
            >
              <div className="flex-1">
                <p className="text-sm font-medium truncate">{alert.product_name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingDown className="h-3 w-3 text-success" />
                  <span>Alert below ${Number(alert.target_price).toFixed(2)}</span>
                  {alert.current_lowest_price && (
                    <>
                      <span>•</span>
                      <span>Current: ${Number(alert.current_lowest_price).toFixed(2)}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={alert.is_active}
                  onCheckedChange={(checked) => updateAlert({ id: alert.id, is_active: checked })}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteAlert(alert.id)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  );
}
