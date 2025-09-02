
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import Testing from './pages/Testing';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import AppStart from "./pages/AppStart";
import Privacy from "./pages/Privacy";
import TermsOfService from "./pages/TermsOfService";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import Notifications from "./pages/Notifications";
import GiftHistory from "./pages/GiftHistory";
import Wishlist from "./pages/Wishlist";
import PaymentSuccess from "./pages/PaymentSuccess";
import ProductionTesting from "./pages/ProductionTesting";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import OAuthCallback from "./components/auth/OAuthCallback";
import CalendarOAuthCallback from "./components/auth/CalendarOAuthCallback";
import ScrollToTop from "@/components/ScrollToTop";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ScrollToTop />
            <Routes>
              {/* Landing page route - only on main domain */}
              <Route path="/landing" element={<Landing />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/" element={window.location.hostname === 'unwrapt.io' ? <Landing /> : <Index />} />
              
              {/* App flow routes - primarily on app subdomain */}
              <Route path="/app" element={<AppStart />} />
              
              {/* Main app routes */}
              
              <Route path="/settings" element={<Settings />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/gift-history" element={<GiftHistory />} />
          <Route path="/history" element={<Navigate to="/gift-history" replace />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/testing" element={<Testing />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment-success" element={<Navigate to="/payment/success" replace />} />
          <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/auth/callback" element={<OAuthCallback />} />
              <Route path="/auth/calendar/callback" element={<CalendarOAuthCallback />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
