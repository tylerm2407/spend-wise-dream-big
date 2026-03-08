import { useRef, useState, useCallback } from 'react';
import { Share2, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/calculations';

interface ShareSavingsCardProps {
  monthlySavings: number;
  totalAlternativesSaved: number;
  streakDays: number;
  userName?: string;
}

export function ShareSavingsCard({ monthlySavings, totalAlternativesSaved, streakDays, userName }: ShareSavingsCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  const generateImage = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 600, 400);
      grad.addColorStop(0, '#1a1040');
      grad.addColorStop(1, '#2d1b69');
      ctx.fillStyle = grad;
      ctx.roundRect(0, 0, 600, 400, 16);
      ctx.fill();

      // Accent circle
      ctx.fillStyle = 'rgba(108,99,255,0.15)';
      ctx.beginPath();
      ctx.arc(500, 80, 120, 0, Math.PI * 2);
      ctx.fill();

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
      ctx.fillText(userName ? `${userName}'s Savings` : 'My Savings This Month', 40, 60);

      // Main number
      ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#6C63FF';
      ctx.fillText(formatCurrency(monthlySavings, 0), 40, 150);

      // Stats
      ctx.font = '18px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#a0a0cc';
      ctx.fillText('saved this month', 40, 185);

      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${totalAlternativesSaved} smarter choices`, 40, 240);

      if (streakDays > 0) {
        ctx.fillText(`🔥 ${streakDays}-day streak`, 40, 275);
      }

      // CTA
      ctx.fillStyle = 'rgba(108,99,255,0.2)';
      ctx.roundRect(30, 330, 540, 50, 12);
      ctx.fill();
      ctx.font = '16px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#c0b8ff';
      ctx.textAlign = 'center';
      ctx.fillText('Track your real spending costs → costclarity.app', 300, 360);
      ctx.textAlign = 'start';

      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }, [monthlySavings, totalAlternativesSaved, streakDays, userName]);

  const handleShare = useCallback(async () => {
    const blob = await generateImage();
    if (!blob) return;

    const file = new File([blob], 'my-savings.png', { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: 'My Savings - Cost Clarity',
          text: `I saved ${formatCurrency(monthlySavings, 0)} this month with Cost Clarity!`,
          files: [file],
        });
        return;
      } catch { /* user cancelled */ }
    }

    // Fallback: download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-savings.png';
    a.click();
    URL.revokeObjectURL(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generateImage, monthlySavings]);

  if (monthlySavings <= 0) return null;

  return (
    <Card className="p-4 glass-card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Share Your Progress</h3>
          <p className="text-xs text-muted-foreground">
            You saved {formatCurrency(monthlySavings, 0)} this month!
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
          {copied ? <Check className="h-4 w-4 text-success" /> : <Share2 className="h-4 w-4" />}
          {copied ? 'Saved!' : 'Share'}
        </Button>
      </div>
    </Card>
  );
}
