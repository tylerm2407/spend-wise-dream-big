import { useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { useToast } from '@/hooks/use-toast';

const MILESTONES = [25, 50, 75] as const;

const MILESTONE_MESSAGES: Record<number, { title: string; description: string; emoji: string }> = {
  25: {
    title: '🚀 Quarter of the way there!',
    description: "You've saved 25% of your goal — great momentum! Keep it up.",
    emoji: '🚀',
  },
  50: {
    title: '🔥 Halfway there!',
    description: "You're 50% to your goal — you're crushing it! The finish line is in sight.",
    emoji: '🔥',
  },
  75: {
    title: '🏆 Almost there!',
    description: "75% done — you're so close! Just a little more and you'll make it.",
    emoji: '🏆',
  },
};

const MILESTONE_STORAGE_KEY = 'truecost_goal_milestones';

function getCelebratedMilestones(): Record<string, number[]> {
  try {
    return JSON.parse(localStorage.getItem(MILESTONE_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function markMilestoneCelebrated(goalId: string, milestone: number) {
  const celebrated = getCelebratedMilestones();
  if (!celebrated[goalId]) celebrated[goalId] = [];
  if (!celebrated[goalId].includes(milestone)) {
    celebrated[goalId].push(milestone);
  }
  localStorage.setItem(MILESTONE_STORAGE_KEY, JSON.stringify(celebrated));
}

export function useGoalMilestones() {
  const { toast } = useToast();
  const celebratingRef = useRef(false);

  const fireMilestoneConfetti = useCallback((milestone: number) => {
    const colors = milestone === 25
      ? ['#10b981', '#34d399']
      : milestone === 50
      ? ['#f59e0b', '#fbbf24', '#f97316']
      : ['#8b5cf6', '#a78bfa', '#ec4899'];

    confetti({
      particleCount: 60 + milestone,
      spread: 60 + milestone / 2,
      origin: { y: 0.6 },
      colors,
    });

    if (milestone >= 50) {
      setTimeout(() => {
        confetti({
          particleCount: 40,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors,
        });
        confetti({
          particleCount: 40,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors,
        });
      }, 300);
    }
  }, []);

  const checkAndCelebrateMilestones = useCallback(
    (goalId: string, goalName: string, previousProgress: number, newProgress: number) => {
      if (celebratingRef.current) return;

      const celebrated = getCelebratedMilestones();
      const goalCelebrated = celebrated[goalId] || [];

      for (const milestone of MILESTONES) {
        if (
          previousProgress < milestone &&
          newProgress >= milestone &&
          !goalCelebrated.includes(milestone)
        ) {
          celebratingRef.current = true;
          const msg = MILESTONE_MESSAGES[milestone];

          setTimeout(() => {
            fireMilestoneConfetti(milestone);
            toast({
              title: msg.title,
              description: `"${goalName}" — ${msg.description}`,
            });
            markMilestoneCelebrated(goalId, milestone);
            celebratingRef.current = false;
          }, 400);

          break; // Only celebrate one milestone at a time
        }
      }
    },
    [fireMilestoneConfetti, toast]
  );

  return { checkAndCelebrateMilestones };
}
