import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  retryQueuedAnalyticsEvents,
  trackPageView,
} from '@/lib/productAnalytics';

const ProductAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    void trackPageView(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const retry = () => void retryQueuedAnalyticsEvents();

    retry();
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, []);

  return null;
};

export default ProductAnalytics;
