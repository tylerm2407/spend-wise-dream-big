import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Search, 
  Loader2, 
  TrendingDown,
  Lightbulb,
  AlertCircle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Alternative {
  name: string;
  description: string;
  estimated_savings: string;
  tip: string;
}

export function AIAlternativeSearch() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setAlternatives([]);

    try {
      const { data, error } = await supabase.functions.invoke('suggest-alternatives', {
        body: { product: query.trim() },
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
        <div>
          <h2 className="font-semibold">AI Alternative Finder</h2>
          <p className="text-xs text-muted-foreground">Search any product for cheaper options</p>
        </div>
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
            <p className="text-sm text-muted-foreground">Finding cheaper alternatives...</p>
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
            <p className="text-sm text-muted-foreground mb-2">
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
                  <h3 className="font-medium text-success">{alt.name}</h3>
                  <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full whitespace-nowrap">
                    <TrendingDown className="h-3 w-3 inline mr-1" />
                    {alt.estimated_savings}
                  </span>
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
          </p>
        </div>
      )}
    </Card>
  );
}
