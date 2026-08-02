import { supabase } from '@/integrations/supabase/client';

export type FulfillmentRoute = 'exact_gift' | 'recipient_choice' | 'retailer_handoff' | 'concierge';

export type FulfillmentOption = {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  price?: number | null;
  currency?: string | null;
  rank: number;
  is_selected: boolean;
};

export type FulfillmentOrder = {
  id: string;
  scheduled_gift_id: string;
  route: FulfillmentRoute;
  confidence: 'high' | 'medium' | 'low';
  status: string;
  provider: string;
  partner_status?: string | null;
  tracking_url?: string | null;
  exception_reason?: string | null;
  created_at: string;
  updated_at: string;
  recipients?: { name: string } | null;
  scheduled_gifts?: {
    occasion: string;
    occasion_date: string;
    gift_description?: string | null;
    gift_image_url?: string | null;
    estimated_cost?: number | null;
  } | null;
  fulfillment_options?: FulfillmentOption[];
  fulfillment_events?: Array<{
    id: number;
    event_type: string;
    from_status?: string | null;
    to_status?: string | null;
    actor_type: string;
    created_at: string;
  }>;
};

type RouterResponse<T> = T & { success: boolean; error?: string };

const functionErrorMessage = async (error: unknown) => {
  if (error && typeof error === 'object' && 'context' in error) {
    const response = (error as { context?: unknown }).context;
    if (response instanceof Response) {
      try {
        const payload = await response.json() as { error?: string };
        if (payload.error) return payload.error;
      } catch {
        // Fall through to the SDK message when a response body is unavailable.
      }
    }
  }
  return error instanceof Error ? error.message : 'Fulfillment request failed';
};

const invokeRouter = async <T>(body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke<RouterResponse<T>>('fulfillment-router', { body });
  if (error) throw new Error(await functionErrorMessage(error));
  if (!data?.success) throw new Error(data?.error || 'Fulfillment request failed');
  return data;
};

export const createFulfillmentRoute = (giftId: string, route?: FulfillmentRoute) =>
  invokeRouter<{ order: FulfillmentOrder; choiceUrl: string | null; expiresAt: string | null }>({
    action: 'create_route', giftId, route,
  });

export const listFulfillmentOrders = () =>
  invokeRouter<{ orders: FulfillmentOrder[] }>({ action: 'list' });

export const rotateChoiceLink = (orderId: string) =>
  invokeRouter<{ choiceUrl: string; expiresAt: string }>({ action: 'rotate_choice_link', orderId });

export const viewGiftChoice = (token: string) =>
  invokeRouter<{
    gift: {
      recipientFirstName: string;
      occasion: string;
      occasionDate: string | null;
      status: string;
      options: FulfillmentOption[];
    };
  }>({ action: 'view_choice', token });

export const selectGiftChoice = (token: string, optionId: string) =>
  invokeRouter<{ selection: { title: string } }>({ action: 'select_choice', token, optionId });
