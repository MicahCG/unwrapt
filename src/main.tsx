
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import "./index.css";

// Import pages
import Index from "./pages/Index.tsx";
import Analytics from "./pages/Analytics.tsx";
import Settings from "./pages/Settings.tsx";
import Notifications from "./pages/Notifications.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import PaymentSuccess from "./pages/PaymentSuccess.tsx";
import ProductionTesting from "./pages/ProductionTesting.tsx";
import CalendarView from "./pages/CalendarView.tsx";
import GiftHistory from "./pages/GiftHistory.tsx";
import Wishlist from "./pages/Wishlist.tsx";
import NotFound from "./pages/NotFound.tsx";

// Import auth components
import { AuthProvider } from "./components/auth/AuthProvider";
import LoginPage from "./components/auth/LoginPage";
import OAuthCallback from "./components/auth/OAuthCallback";
import CalendarOAuthCallback from "./components/auth/CalendarOAuthCallback";
import SettingsOAuthCallback from "./components/auth/SettingsOAuthCallback";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/auth/calendar/callback" element={<CalendarOAuthCallback />} />
            <Route path="/auth/settings/callback" element={<SettingsOAuthCallback />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/" element={<App />}>
              <Route index element={<Index />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="onboarding" element={<Onboarding />} />
              <Route path="calendar" element={<CalendarView />} />
              <Route path="history" element={<GiftHistory />} />
              <Route path="wishlist" element={<Wishlist />} />
              <Route path="testing" element={<ProductionTesting />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
