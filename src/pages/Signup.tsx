import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Gift, UserX, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGuest } from '@/hooks/useGuest';
import { PricingCards, ReferralDiscount } from '@/components/PricingCards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { lovable } from '@/integrations/lovable/index';

const SOURCE_APP = 'costclarity';
const NW_API_BASE = 'https://dbwuegchdysuocbpsprd.supabase.co/functions/v1';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function Signup() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [referralDiscount, setReferralDiscount] = useState<ReferralDiscount | null>(null);
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);
  const [referralStatus, setReferralStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const { signUp } = useAuth();
  const { enterGuestMode } = useGuest();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Pre-fill referral code from URL param or localStorage
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      const code = ref.toUpperCase();
      setReferralCode(code);
      localStorage.setItem('referral_code', code);
      validateReferralCode(code);
    } else {
      const stored = localStorage.getItem('referral_code');
      if (stored) {
        setReferralCode(stored);
        validateReferralCode(stored);
      }
    }
  }, [searchParams]);

  const validateReferralCode = useCallback(async (code: string) => {
    if (!code || code.length < 4) {
      setReferralDiscount(null);
      setReferralStatus('idle');
      return;
    }

    setIsValidatingReferral(true);
    setReferralStatus('idle');

    try {
      const validateRes = await fetch(`${SUPABASE_URL}/functions/v1/validate-nw-referral`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          referral_code: code.toUpperCase(),
          referred_user_id: null,
        }),
      });
      const validateData = await validateRes.json();

      if (validateData.valid) {
        const discount: ReferralDiscount = {
          valid: true,
          percentOff: validateData.discount?.value ?? 20,
          durationMonths: validateData.discount?.duration_months ?? 3,
          referralCode: code.toUpperCase(),
          referrerId: validateData.referrer_user_id,
          referralCodeId: validateData.referral_code_id,
        };
        setReferralDiscount(discount);
        setReferralStatus('valid');
        localStorage.setItem('referral_code', code.toUpperCase());
        toast({
          title: '🎉 Referral code valid!',
          description: `${discount.percentOff}% off for your first ${discount.durationMonths} months has been applied.`,
        });
      } else {
        setReferralDiscount(null);
        setReferralStatus('invalid');
        localStorage.removeItem('referral_code');
        const reasons: Record<string, string> = {
          expired_or_not_found: 'This referral code is expired or invalid.',
          self_referral: "You can't use your own referral code.",
          already_used_for_app: "You've already used a referral for this app.",
          no_code_provided: 'No referral code provided.',
        };
        toast({
          title: 'Invalid referral code',
          description: reasons[validateData.reason] || 'Could not validate referral code.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Referral validation error:', err);
      setReferralStatus('idle');
    } finally {
      setIsValidatingReferral(false);
    }
  }, [toast]);

  const handleReferralChange = (value: string) => {
    const code = value.toUpperCase();
    setReferralCode(code);
    setReferralStatus('idle');
    setReferralDiscount(null);
  };

  const handleReferralPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').trim().toUpperCase();
    if (pasted) {
      setTimeout(() => validateReferralCode(pasted), 100);
    }
  };

  const handleReferralBlur = () => {
    if (referralCode && referralStatus === 'idle') {
      validateReferralCode(referralCode);
    }
  };

  const handleSelectPlan = (planName: string) => {
    setSelectedPlan(planName);
    if (planName === 'Free') {
      document.getElementById('signup-form')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPlan) {
      toast({
        title: 'Select a plan',
        description: 'Please choose a subscription tier before creating your account.',
        variant: 'destructive',
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: 'Passwords don\'t match',
        description: 'Please make sure your passwords match.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    const { error } = await signUp(email, password);
    
    if (error) {
      toast({
        title: 'Sign up failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      if (referralCode) {
        localStorage.setItem('pending_referral_code', referralCode);
      }
      toast({
        title: 'Check your email',
        description: 'We sent you a confirmation link to verify your account.',
      });
      navigate('/login');
    }
    
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    if (!selectedPlan) {
      toast({
        title: 'Select a plan',
        description: 'Please choose a subscription tier before signing up.',
        variant: 'destructive',
      });
      return;
    }
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast({
        title: 'Google sign in failed',
        description: result.error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAppleSignIn = async () => {
    if (!selectedPlan) {
      toast({
        title: 'Select a plan',
        description: 'Please choose a subscription tier before signing up.',
        variant: 'destructive',
      });
      return;
    }
    const result = await lovable.auth.signInWithOAuth('apple', {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast({
        title: 'Apple sign in failed',
        description: result.error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-full max-w-3xl"
        >
          {/* Logo */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gradient-primary">Cost Clarity</h1>
            <p className="text-muted-foreground mt-2">See what your spending really costs you</p>
          </div>

          {/* Referral Code - moved before pricing cards so discount shows */}
          <div className="max-w-sm mx-auto mb-6">
            <Label htmlFor="referralCode" className="flex items-center gap-2 mb-2">
              <Gift className="h-4 w-4 text-primary" />
              Referral Code (optional)
            </Label>
            <div className="relative">
              <Input
                id="referralCode"
                value={referralCode}
                onChange={(e) => handleReferralChange(e.target.value)}
                onPaste={handleReferralPaste}
                onBlur={handleReferralBlur}
                placeholder="e.g. NW-A1B2C3D4"
                className="h-12 touch-target font-mono tracking-widest pr-10"
                aria-label="Referral code"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isValidatingReferral && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                {!isValidatingReferral && referralStatus === 'valid' && <CheckCircle2 className="h-5 w-5 text-success" />}
                {!isValidatingReferral && referralStatus === 'invalid' && <XCircle className="h-5 w-5 text-destructive" />}
              </div>
            </div>
            {referralStatus === 'valid' && referralDiscount && (
              <p className="text-xs text-success mt-1">
                🎉 {referralDiscount.percentOff}% off for {referralDiscount.durationMonths} months applied to paid plans below!
              </p>
            )}
            {referralStatus === 'invalid' && (
              <p className="text-xs text-destructive mt-1">
                Invalid referral code. Please check and try again.
              </p>
            )}
          </div>

          {/* Pricing Cards */}
          <div className="mb-8">
            <PricingCards
              showFreeAction
              onSelectPlan={handleSelectPlan}
              onSelectFree={() => {
                setSelectedPlan('Free');
                document.getElementById('signup-form')?.scrollIntoView({ behavior: 'smooth' });
              }}
              selectedPlan={selectedPlan}
              referralDiscount={referralDiscount}
            />
          </div>

          {/* Plan selection warning */}
          {!selectedPlan && (
            <div className="max-w-sm mx-auto mb-4 flex items-center gap-2 text-sm text-warning p-3 bg-warning/10 rounded-lg border border-warning/20">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>Please select a plan above to create your account</span>
            </div>
          )}

          {/* Signup Form */}
          <div className="max-w-sm mx-auto">

          <form id="signup-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 touch-target"
                  required
                  aria-label="Email address"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 touch-target"
                  required
                  aria-label="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 h-12 touch-target"
                  required
                  aria-label="Confirm password"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 touch-target bg-gradient-primary hover:opacity-90 transition-opacity"
              disabled={isLoading || !selectedPlan}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Create account{selectedPlan ? ` — ${selectedPlan} plan` : ''}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Sign In */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 touch-target"
            onClick={handleGoogleSignIn}
            disabled={!selectedPlan}
          >
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          {/* Apple Sign In */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 touch-target mt-3"
            onClick={handleAppleSignIn}
            disabled={!selectedPlan}
          >
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continue with Apple
          </Button>

          {/* Continue as Guest */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="w-full h-12 touch-target text-muted-foreground hover:text-foreground"
            onClick={() => { enterGuestMode(); navigate('/home'); }}
          >
            <UserX className="h-4 w-4 mr-2" />
            Continue as Guest
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-1">
            No account needed — basic features only, no data saved
          </p>

          {/* Login link */}
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>

          {/* Legal links */}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            By signing up, you agree to our{' '}
            <Link to="/terms-of-service" className="text-primary hover:underline">Terms</Link>
            {' '}and{' '}
            <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
          </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
