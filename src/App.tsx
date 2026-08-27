
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import Testing from './pages/Testing';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import AppStart from "./pages/AppStart";
import Privacy from "./pages/Privacy";
import TermsOfService from "./pages/TermsOfService";
import Settings from "./pages/Settings";
import GiftHistory from "./pages/GiftHistory";
import PaymentSuccess from "./pages/PaymentSuccess";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import GiftChoice from "./pages/GiftChoice";
import ConfirmAddress from "./pages/ConfirmAddress";
import OAuthCallback from "./components/auth/OAuthCallback";
import CalendarOAuthCallback from "./components/auth/CalendarOAuthCallback";
import ScrollToTop from "@/components/ScrollToTop";
import ProductAnalytics from "@/components/ProductAnalytics";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { TheaProvider } from '@/components/TheaAgent';

const queryClient = new QueryClient();
const isProd = import.meta.env.PROD;

function App() {
  const isMarketingHost = ['unwrapt.io', 'www.unwrapt.io'].includes(window.location.hostname);

  return (
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <VercelAnalytics />
          <SpeedInsights />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <TheaProvider>
            <ScrollToTop />
            <ProductAnalytics />
            <Routes>
              <Route path="/landing" element={<Landing />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/gift-choice/:token" element={<GiftChoice />} />

              <Route path="/" element={isMarketingHost ? <Landing /> : <Index />} />

              <Route path="/app" element={<AppStart />} />

              <Route path="/settings" element={<Settings />} />
              {/* Stub destinations redirect so nav never dead-ends */}
              <Route path="/analytics" element={<Navigate to="/" replace />} />
              <Route path="/notifications" element={<Navigate to="/settings" replace />} />
              <Route path="/wishlist" element={<Navigate to="/" replace />} />
              <Route path="/gift-history" element={<GiftHistory />} />
              <Route path="/history" element={<Navigate to="/gift-history" replace />} />
              {!isProd && <Route path="/testing" element={<Testing />} />}
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment-success" element={<Navigate to="/payment/success" replace />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/confirm-address/:giftId" element={<ConfirmAddress />} />
              <Route path="/gifts/confirm-address/:giftId" element={<ConfirmAddress />} />
              <Route path="/auth/callback" element={<OAuthCallback />} />
              <Route path="/auth/calendar/callback" element={<CalendarOAuthCallback />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </TheaProvider>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
