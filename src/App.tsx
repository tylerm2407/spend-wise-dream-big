import { useEffect, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { GuestProvider, useGuest } from "@/hooks/useGuest";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { TrialBanner } from "@/components/SubscriptionGate";
import { ReferralCodeApplier } from "@/components/ReferralCodeApplier";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Lazy-loaded route components
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Home = lazy(() => import("./pages/Home"));
const AddPurchase = lazy(() => import("./pages/AddPurchase"));
const History = lazy(() => import("./pages/History"));
const Goals = lazy(() => import("./pages/Goals"));
const Insights = lazy(() => import("./pages/Insights"));
const Alternatives = lazy(() => import("./pages/Alternatives"));
const Challenges = lazy(() => import("./pages/Challenges"));
const Settings = lazy(() => import("./pages/Settings"));
const Invest = lazy(() => import("./pages/Invest"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Subscriptions = lazy(() => import("./pages/Subscriptions"));
const Grocery = lazy(() => import("./pages/Grocery"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 1000 * 60 * 2, // 2 minutes
    },
  },
});

// Initialize theme from localStorage
function ThemeInitializer() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);
  return null;
}

// Protected route wrapper — authenticated users AND guests can view pages
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isGuest } = useGuest();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user && !isGuest) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <>
      {user && <TrialBanner />}
      {children}
    </>
  );
}

// Public route wrapper (redirects if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isGuest } = useGuest();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (user || isGuest) {
    return <Navigate to="/home" replace />;
  }
  
  return <>{children}</>;
}

function RouteFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Nova Wealth SSO token handler
function NovaWealthTokenHandler() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const token = searchParams.get('auth_token');
    if (!token) return;

    // Remove token from URL immediately
    searchParams.delete('auth_token');
    setSearchParams(searchParams, { replace: true });

    (async () => {
      try {
        const res = await supabase.functions.invoke('validate-nova-token', {
          body: { token },
        });

        if (res.error || res.data?.error) {
          throw new Error(res.data?.error || res.error?.message || 'Token validation failed');
        }

        const { token_hash, email } = res.data;

        // Use the token hash to verify OTP and establish session
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'magiclink',
        });

        if (otpError) {
          throw new Error(otpError.message);
        }

        toast({
          title: 'Welcome from Nova Wealth!',
          description: `Signed in as ${email} with Pro access.`,
        });
        navigate('/home', { replace: true });
      } catch (err: any) {
        console.error('[NovaWealth SSO]', err);
        toast({
          title: 'SSO Login Failed',
          description: err.message || 'Could not verify Nova Wealth token.',
          variant: 'destructive',
        });
      }
    })();
  }, [searchParams, setSearchParams, navigate, toast]);

  return null;
}

function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <NovaWealthTokenHandler />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<PublicRoute><Index /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        
        {/* Protected routes - Main app with tab bar */}
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/dashboard" element={<Navigate to="/home" replace />} />
        <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
        <Route path="/alternatives" element={<ProtectedRoute><Alternatives /></ProtectedRoute>} />
        <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/invest" element={<ProtectedRoute><Invest /></ProtectedRoute>} />
        
        {/* Subscription success page */}
        <Route path="/subscription-success" element={<ProtectedRoute><SubscriptionSuccess /></ProtectedRoute>} />
        <Route path="/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
        <Route path="/grocery" element={<ProtectedRoute><Grocery /></ProtectedRoute>} />
        
        {/* Protected routes - Secondary screens (no tab bar) */}
        <Route path="/add-purchase" element={<ProtectedRoute><AddPurchase /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
        
        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <GuestProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <TooltipProvider>
              <ThemeInitializer />
              <ReferralCodeApplier />
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </GuestProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
