import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Search, 
  Loader2, 
  TrendingDown,
  Lightbulb,
  AlertCircle,
  MapPin,
  Store,
  DollarSign
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { usePriceHistory } from '@/hooks/usePriceHistory';
import { PriceComparisonChart } from './PriceComparisonChart';
import { PriceTrendChart } from './PriceTrendChart';

interface Alternative {
  name: string;
  description: string;
  estimated_savings: string;
  estimated_price?: string;
  store_name?: string;
  store_location?: string;
  tip: string;
}

export function AIAlternativeSearch() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearchedProduct, setLastSearchedProduct] = useState('');
  const { toast } = useToast();
  const { profile } = useProfile();
  const { savePricesAsync } = usePriceHistory();

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setAlternatives([]);

    try {
      const { data, error } = await supabase.functions.invoke('suggest-alternatives', {
        body: { 
          product: query.trim(),
          zipCode: profile?.zip_code || null,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        toast({
          variant: 'destructive',
          title: 'Search failed',
          description: data.error,
        });
        return;
      }

      if (data?.alternatives) {
        setAlternatives(data.alternatives);
        setLastSearchedProduct(query.trim());
        
        // Save prices to history for trend tracking
        const priceEntries = data.alternatives
          .filter((alt: Alternative) => alt.estimated_price && alt.store_name)
          .map((alt: Alternative) => {
            const priceMatch = alt.estimated_price?.match(/\$?([\d.]+)/);
            const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
            return {
              productName: query.trim(),
              storeName: alt.store_name || alt.name,
              price,
              zipCode: profile?.zip_code,
            };
          })
          .filter((entry: { price: number }) => entry.price > 0);
        
        if (priceEntries.length > 0) {
          savePricesAsync(priceEntries).catch(console.error);
        }
      }
    } catch (error) {
      console.error('Error searching for alternatives:', error);
      toast({
        variant: 'destructive',
        title: 'Search failed',
        description: 'Unable to find alternatives. Please try again.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  };

  return (
    <Card className="p-6 glass-card">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-full bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold">Alternative Finder</h2>
          <p className="text-xs text-muted-foreground">Find cheaper options with real store prices</p>
        </div>
        {profile?.zip_code && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            <MapPin className="h-3 w-3" />
            {profile.zip_code}
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="e.g. Starbucks latte, Netflix, AirPods..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9"
            disabled={isSearching}
          />
        </div>
        <Button 
          onClick={handleSearch} 
          disabled={isSearching || !query.trim()}
          className="bg-gradient-cta"
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Find'
          )}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {isSearching && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">
              Finding alternatives{profile?.zip_code ? ` near ${profile.zip_code}` : ''}...
            </p>
          </motion.div>
        )}

        {!isSearching && alternatives.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <PriceComparisonChart alternatives={alternatives} originalProduct={query} />
            <PriceTrendChart productName={lastSearchedProduct} />
            <p className="text-sm text-muted-foreground mb-2 mt-4">
              Alternatives for "<span className="font-medium text-foreground">{query}</span>"
            </p>
            {alternatives.map((alt, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-muted/50 rounded-xl border border-border/50"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-medium text-success">{alt.name}</h3>
                    {alt.store_name && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Store className="h-3 w-3" />
                        <span>{alt.store_name}</span>
                        {alt.store_location && (
                          <>
                            <span className="mx-1">•</span>
                            <MapPin className="h-3 w-3" />
                            <span>{alt.store_location}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full whitespace-nowrap">
                      <TrendingDown className="h-3 w-3 inline mr-1" />
                      {alt.estimated_savings}
                    </span>
                    {alt.estimated_price && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {alt.estimated_price}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{alt.description}</p>
                <div className="flex items-start gap-2 text-xs text-primary bg-primary/5 p-2 rounded-lg">
                  <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>{alt.tip}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {!isSearching && hasSearched && alternatives.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center justify-center py-6 text-center"
          >
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No alternatives found. Try a different search.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {!hasSearched && !isSearching && (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            Type any product or service to discover budget-friendly alternatives
            {!profile?.zip_code && (
              <span className="block mt-1 text-primary">
                Add your zip code in Settings for local store prices
              </span>
            )}
          </p>
        </div>
      )}
    </Card>
  );
}
