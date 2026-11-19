// Re-export so the app and the edge functions share one rule for how Goody's shipping reads on a card.
export { shippingLabel } from '../../supabase/functions/_shared/goodyCatalog.ts';
