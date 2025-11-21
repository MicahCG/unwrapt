import { supabase } from '@/integrations/supabase/client';

/**
 * Toggle automation for all scheduled gifts of a recipient
 */
export const toggleRecipientAutomation = async (
  recipientId: string,
  enabled: boolean
): Promise<void> => {
  const { error } = await supabase
    .from('scheduled_gifts')
    .update({ automation_enabled: enabled })
    .eq('recipient_id', recipientId);

  if (error) {
    console.error('Error toggling recipient automation:', error);
    throw error;
  }
};

/**
 * Check if a recipient has automation enabled
 */
export const isAutomationEnabled = async (
  recipientId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('scheduled_gifts')
    .select('automation_enabled')
    .eq('recipient_id', recipientId)
    .limit(1)
    .single();

  if (error || !data) return false;
  return data.automation_enabled || false;
};
