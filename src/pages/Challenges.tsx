import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { WeeklySpendingChallenge } from '@/components/WeeklySpendingChallenge';

export default function Challenges() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-hero">
        {/* Header */}
        <header className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-warning/10">
              <Trophy className="h-6 w-6 text-warning" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Challenges</h1>
              <p className="text-muted-foreground text-sm">
                Complete weekly savings goals
              </p>
            </div>
          </div>
        </header>

        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="px-6 space-y-6 pb-6"
        >
          <motion.div variants={itemVariants}>
            <WeeklySpendingChallenge />
          </motion.div>
        </motion.main>
      </div>
    </AppLayout>
  );
}
