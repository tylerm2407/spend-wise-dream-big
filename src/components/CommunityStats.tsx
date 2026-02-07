import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/calculations';
import { useAuth } from '@/hooks/useAuth';

interface CommunityStatsData {
  total_participants: number;
  completed_count: number;
  total_count: number;
  avg_savings: number;
  completion_rate: number;
}

export function CommunityStats() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['community-challenge-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_community_challenge_stats');
      if (error) throw error;
      return data as unknown as CommunityStatsData;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // cache 5 min
  });

  if (!stats || stats.total_participants < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="p-4 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/15">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Community This Week</span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-primary">{stats.completion_rate}%</p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              of users beat their challenge
            </p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{stats.total_participants}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              active challengers
            </p>
          </div>
          <div>
            <p className="text-lg font-bold text-success">
              {formatCurrency(stats.avg_savings, 0)}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              avg saved this week
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
