import { motion } from 'framer-motion';
import { Trophy, Award } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { WeeklySpendingChallenge } from '@/components/WeeklySpendingChallenge';
import { StreakDisplay } from '@/components/StreakDisplay';
import { AchievementBadges } from '@/components/AchievementBadges';
import { useStreaks } from '@/hooks/useStreaks';
import { Card } from '@/components/ui/card';

export default function Challenges() {
  const { currentStreak, longestStreak, streakFreezesRemaining, allAchievements } = useStreaks();

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
          {/* Streak Display */}
          <motion.div variants={itemVariants}>
            <StreakDisplay
              currentStreak={currentStreak}
              longestStreak={longestStreak}
              freezesRemaining={streakFreezesRemaining}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <WeeklySpendingChallenge />
          </motion.div>

          {/* Achievements */}
          <motion.div variants={itemVariants}>
            <Card className="p-4">
              <AchievementBadges achievements={allAchievements} />
            </Card>
          </motion.div>

          {/* Motivational Message */}
          <motion.div variants={itemVariants}>
            <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-primary" />
                <p className="text-sm">
                  {currentStreak === 0 
                    ? "Log a purchase today to start your streak!"
                    : currentStreak < 7 
                      ? `${7 - currentStreak} more days until your Week Warrior badge!`
                      : "You're on fire! Keep the momentum going."}
                </p>
              </div>
            </Card>
          </motion.div>
        </motion.main>
      </div>
    </AppLayout>
  );
}
