import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubscription } from '@/hooks/useSubscription';
import { 
  CreditCard, 
  Plus, 
  Check, 
  RefreshCw, 
  Building2,
  Trash2,
  ChevronRight,
  Shield
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { cn } from '@/lib/utils';

interface LinkedCard {
  id: string;
  name: string;
  institution: string;
  lastFour: string;
  type: 'visa' | 'mastercard' | 'amex' | 'discover';
  lastSync: string;
  isActive: boolean;
}

// Mock data for demonstration
const MOCK_LINKED_CARDS: LinkedCard[] = [
  {
    id: '1',
    name: 'Chase Sapphire',
    institution: 'Chase',
    lastFour: '4821',
    type: 'visa',
    lastSync: '2 hours ago',
    isActive: true,
  },
  {
    id: '2',
    name: 'Amex Gold',
    institution: 'American Express',
    lastFour: '3001',
    type: 'amex',
    lastSync: '5 hours ago',
    isActive: true,
  },
];

const CARD_TYPE_COLORS: Record<string, string> = {
  visa: 'from-blue-600 to-blue-800',
  mastercard: 'from-orange-500 to-red-600',
  amex: 'from-slate-600 to-slate-800',
  discover: 'from-orange-400 to-orange-600',
};

const CARD_TYPE_LOGOS: Record<string, string> = {
  visa: 'VISA',
  mastercard: 'MC',
  amex: 'AMEX',
  discover: 'DISC',
};

export function CreditCardLinking() {
  const { hasProAccess, openCheckout } = useSubscription();
  const [linkedCards, setLinkedCards] = useState<LinkedCard[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const handleLinkCard = () => {
    if (!hasProAccess) {
      openCheckout();
      return;
    }
    setIsLinking(true);
    // Simulate Plaid flow - in real implementation, this would open Plaid Link
    setTimeout(() => {
      setIsLinking(false);
      // For demo purposes, show what linked cards would look like
      setShowDemo(true);
      setLinkedCards(MOCK_LINKED_CARDS);
    }, 1500);
  };

  const handleRemoveCard = (cardId: string) => {
    setLinkedCards(cards => cards.filter(c => c.id !== cardId));
    if (linkedCards.length === 1) {
      setShowDemo(false);
    }
  };

  const handleSyncAll = () => {
    // In real implementation, this would trigger a sync with Plaid
    console.log('Syncing all cards...');
  };

  return (
    <Card className="p-6 glass-card overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Linked Cards</h2>
        </div>
        {linkedCards.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs gap-1"
            onClick={handleSyncAll}
          >
            <RefreshCw className="h-3 w-3" />
            Sync
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {linkedCards.length === 0 && !showDemo ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center py-6"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-medium mb-2">Connect Your Cards</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-[250px] mx-auto">
              Automatically sync transactions from your credit cards for smarter spending insights
            </p>
            <AnimatedButton
              onClick={handleLinkCard}
              disabled={isLinking}
              className="gap-2"
            >
              {isLinking ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Link a Card
                </>
              )}
            </AnimatedButton>
            <div className="flex items-center justify-center gap-1 mt-4 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>Bank-level security with Plaid</span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="cards"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {/* Demo indicator */}
            {showDemo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-primary/10 text-primary text-xs px-3 py-2 rounded-lg mb-3 flex items-center gap-2"
              >
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                Demo Mode — This shows what linked cards will look like
              </motion.div>
            )}

            {/* Linked Cards List */}
            {linkedCards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {/* Mini Card Preview */}
                <div className={cn(
                  'relative rounded-xl p-4 text-white overflow-hidden',
                  'bg-gradient-to-br',
                  CARD_TYPE_COLORS[card.type]
                )}>
                  {/* Card Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 opacity-80" />
                        <span className="text-xs opacity-80">{card.institution}</span>
                      </div>
                      <span className="text-xs font-bold tracking-wider">
                        {CARD_TYPE_LOGOS[card.type]}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs opacity-60">••••</span>
                      <span className="text-xs opacity-60">••••</span>
                      <span className="text-xs opacity-60">••••</span>
                      <span className="text-sm font-mono font-medium">{card.lastFour}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{card.name}</p>
                        <p className="text-xs opacity-60 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Synced {card.lastSync}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveCard(card.id)}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Add Another Card Button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: linkedCards.length * 0.1 }}
              onClick={handleLinkCard}
              disabled={isLinking}
              className={cn(
                'w-full p-4 rounded-xl border-2 border-dashed border-muted-foreground/20',
                'flex items-center justify-center gap-2 text-muted-foreground',
                'hover:border-primary/50 hover:text-primary hover:bg-primary/5',
                'transition-colors'
              )}
            >
              {isLinking ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Connecting...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span className="text-sm">Add Another Card</span>
                </>
              )}
            </motion.button>

            {/* Transaction Summary Preview */}
            {linkedCards.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 p-4 bg-muted/50 rounded-xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Recent Transactions</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  {[
                    { name: 'Starbucks', amount: 5.75, category: '☕' },
                    { name: 'Amazon', amount: 32.99, category: '📦' },
                    { name: 'Uber', amount: 18.50, category: '🚗' },
                  ].map((tx, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{tx.category}</span>
                        <span className="text-muted-foreground">{tx.name}</span>
                      </div>
                      <span className="font-medium">-${tx.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3 italic">
                  Transactions auto-categorized and synced
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
