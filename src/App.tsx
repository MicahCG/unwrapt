import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PaymentSuccess from "./pages/PaymentSuccess";
import CalendarView from "./pages/CalendarView";
import GiftHistory from "./pages/GiftHistory";
import Analytics from "./pages/Analytics";
import Wishlist from "./pages/Wishlist";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
import OAuthCallback from "./components/auth/OAuthCallback";
import SettingsOAuthCallback from "./components/auth/SettingsOAuthCallback";
import CalendarOAuthCallback from "./components/auth/CalendarOAuthCallback";

const queryClient = new QueryClient();

function App() {
  console.log('App component rendering - checking routes');
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/history" element={<GiftHistory />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/auth/callback" element={<OAuthCallback />} />
              <Route path="/auth/callback/settings" element={<SettingsOAuthCallback />} />
              <Route path="/auth/callback/calendar" element={<CalendarOAuthCallback />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
