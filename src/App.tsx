import { useEffect, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { GuestProvider, useGuest } from "@/hooks/useGuest";
import { NovaWealthProvider, useNovaWealth } from "@/hooks/useNovaWealth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { AppAccessProvider } from "@/hooks/useAppAccess";
import { TrialBanner } from "@/components/SubscriptionGate";
import { ReferralCodeApplier } from "@/components/ReferralCodeApplier";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
      staleTime: 1000 * 60 * 2,
    },
  },
});

function ThemeInitializer() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // Default to dark mode
      document.documentElement.classList.add('dark');
    }
  }, []);
  return null;
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isGuest } = useGuest();
  const { isNovaWealthUser } = useNovaWealth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !isGuest && !isNovaWealthUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {user && <TrialBanner />}
      {children}
    </>
  );
}

// Public route wrapper
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isGuest } = useGuest();
  const { isNovaWealthUser } = useNovaWealth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user || isGuest || isNovaWealthUser) {
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

// Nova Wealth SSO token handler — validates nw_token param
function NovaWealthTokenHandler() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { saveSession } = useNovaWealth();

  useEffect(() => {
    const token = searchParams.get('nw_token');
    if (!token) return;

    // Remove token from URL immediately
    searchParams.delete('nw_token');
    setSearchParams(searchParams, { replace: true });

    (async () => {
      try {
        const res = await fetch(
          'https://dbwuegchdysuocbpsprd.supabase.co/functions/v1/validate-auth-token',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey:
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRid3VlZ2NoZHlzdW9jYnBzcHJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzYyMTAsImV4cCI6MjA4Njc1MjIxMH0.6LEKjLXhaxeRublNoAITpVVueHwpUPuLxS0sbgcTUlE',
            },
            body: JSON.stringify({ token }),
          }
        );

        const data = await res.json();

        if (!data.valid) {
          throw new Error('Invalid or expired token');
        }

        // Store session in localStorage
        saveSession({
          email: data.email,
          user_id: data.user_id,
          tier: data.tier,
        });

        toast({
          title: 'Welcome from NovaWealth!',
          description: `Signed in as ${data.email}${data.tier === 'pro' ? ' with Pro access' : ''}.`,
        });
        navigate('/home', { replace: true });
      } catch (err: any) {
        console.error('[NovaWealth SSO]', err);
        toast({
          title: 'SSO Login Failed',
          description: err.message || 'Could not verify NovaWealth token.',
          variant: 'destructive',
        });
      }
    })();
  }, [searchParams, setSearchParams, navigate, toast, saveSession]);

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

        {/* Protected routes */}
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/dashboard" element={<Navigate to="/home" replace />} />
        <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
        <Route path="/alternatives" element={<ProtectedRoute><Alternatives /></ProtectedRoute>} />
        <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/invest" element={<ProtectedRoute><Invest /></ProtectedRoute>} />
        <Route path="/subscription-success" element={<ProtectedRoute><SubscriptionSuccess /></ProtectedRoute>} />
        <Route path="/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
        <Route path="/grocery" element={<ProtectedRoute><Grocery /></ProtectedRoute>} />
        <Route path="/add-purchase" element={<ProtectedRoute><AddPurchase /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <GuestProvider>
        <NovaWealthProvider>
          <AuthProvider>
            <AppAccessProvider>
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
            </AppAccessProvider>
          </AuthProvider>
        </NovaWealthProvider>
      </GuestProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
