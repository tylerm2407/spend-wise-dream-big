import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
 import { SubscriptionProvider } from "@/hooks/useSubscription";
 import { SubscriptionGate, TrialBanner } from "@/components/SubscriptionGate";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import AddPurchase from "./pages/AddPurchase";
import History from "./pages/History";
import Goals from "./pages/Goals";
import Insights from "./pages/Insights";
import Alternatives from "./pages/Alternatives";
import Challenges from "./pages/Challenges";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";

const queryClient = new QueryClient();

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

// Protected route wrapper with subscription check
function ProtectedRoute({ children, requireSubscription = true }: { children: React.ReactNode; requireSubscription?: boolean }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
   if (requireSubscription) {
     return (
       <SubscriptionGate>
         <TrialBanner />
         {children}
       </SubscriptionGate>
     );
   }
 
  return <>{children}</>;
}

// Public route wrapper (redirects if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/home" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<PublicRoute><Index /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Protected routes - Main app with tab bar */}
      <Route path="/onboarding" element={<ProtectedRoute requireSubscription={false}><Onboarding /></ProtectedRoute>} />
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/dashboard" element={<Navigate to="/home" replace />} />
      <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
      <Route path="/alternatives" element={<ProtectedRoute><Alternatives /></ProtectedRoute>} />
      <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute requireSubscription={false}><Settings /></ProtectedRoute>} />
      
      {/* Subscription success page */}
      <Route path="/subscription-success" element={<ProtectedRoute requireSubscription={false}><SubscriptionSuccess /></ProtectedRoute>} />
      
      {/* Protected routes - Secondary screens (no tab bar) */}
      <Route path="/add-purchase" element={<ProtectedRoute><AddPurchase /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
      <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
      
      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
        <TooltipProvider>
          <ThemeInitializer />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
