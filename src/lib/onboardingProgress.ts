import { supabase } from '@/integrations/supabase/client';
import { normalizeRecipientName } from '@/lib/dateUtils';

/** Screens tracked on profiles.onboarding_step. */
export type OnboardingStep =
  | 'import'
  | 'found'
  | 'addperson'
  | 'intel'
  | 'reveal'
  | 'subscription'
  | 'done';

/** Mid-flow steps that should remount AgentOnboardingFlow instead of SubscribeGate. */
export function shouldResumeOnboarding(step: string | null | undefined): boolean {
  return step === 'intel' || step === 'reveal';
}

export type DraftRecipientRow = {
  id: string;
  name: string;
  relationship: string | null;
  birthday: string | null;
  anniversary: string | null;
  interests: string[] | null;
  notes: string | null;
};

export type OnboardingProgress = {
  step: OnboardingStep | null;
  recipients: DraftRecipientRow[];
};

/** Load step + recipient drafts used to resume after app relaunch. */
export async function loadOnboardingProgress(userId: string): Promise<OnboardingProgress> {
  const [{ data: profile, error: profileError }, { data: recipients, error: recipientsError }] =
    await Promise.all([
      supabase.from('profiles').select('onboarding_step').eq('id', userId).maybeSingle(),
      supabase
        .from('recipients')
        .select('id, name, relationship, birthday, anniversary, interests, notes')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
    ]);

  if (profileError) console.error('Failed to load onboarding_step', profileError);
  if (recipientsError) console.error('Failed to load onboarding recipients', recipientsError);

  const stepRaw = (profile as { onboarding_step?: string | null } | null)?.onboarding_step ?? null;
  const step = (stepRaw as OnboardingStep | null) || null;

  return {
    step,
    recipients: (recipients || []) as DraftRecipientRow[],
  };
}

export async function setOnboardingStep(userId: string, step: OnboardingStep): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_step: step } as never)
    .eq('id', userId);
  if (error) console.error('Failed to persist onboarding_step', step, error);
}

export type DraftPersonInput = {
  name: string;
  relationship: string | null;
  birthday: string | null;
  anniversary: string | null;
  interests: string[];
  fromCalendar: boolean;
  sourceLabel?: string;
};

/**
 * Insert or update a recipient as soon as the user commits to a person in
 * onboarding (intel+). Prefer existing tables over a parallel draft store.
 */
export async function upsertDraftRecipient(
  userId: string,
  person: DraftPersonInput,
): Promise<string | null> {
  const normalized = normalizeRecipientName(person.name);
  if (!normalized) return null;

  const { data: existing, error: existingError } = await supabase
    .from('recipients')
    .select('id, name')
    .eq('user_id', userId);

  if (existingError) {
    console.error('Failed to list recipients for draft upsert', existingError);
    return null;
  }

  const match = (existing || []).find((row) => normalizeRecipientName(row.name) === normalized);
  const notes = person.fromCalendar
    ? `Imported from ${person.sourceLabel || 'calendar'} during onboarding`
    : 'Added during onboarding';

  if (match) {
    const { error } = await supabase
      .from('recipients')
      .update({
        interests: person.interests || [],
        birthday: person.birthday,
        anniversary: person.anniversary,
        relationship: person.relationship,
        notes,
      })
      .eq('id', match.id);
    if (error) {
      console.error('Failed to update draft recipient', error);
      return match.id;
    }
    return match.id;
  }

  const { data: inserted, error } = await supabase
    .from('recipients')
    .insert({
      user_id: userId,
      name: person.name,
      email: null,
      phone: null,
      address: null,
      interests: person.interests || [],
      birthday: person.birthday,
      anniversary: person.anniversary,
      relationship: person.relationship,
      notes,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to insert draft recipient', error);
    return null;
  }
  return inserted?.id ?? null;
}

/** Map a saved recipient row back into onboarding Person-shaped fields. */
export function personFieldsFromRecipient(row: DraftRecipientRow, index: number) {
  const primaryType: 'birthday' | 'anniversary' | null = row.birthday
    ? 'birthday'
    : row.anniversary
      ? 'anniversary'
      : null;
  const primaryDate = row.birthday || row.anniversary || null;
  const fromCalendar = (row.notes || '').toLowerCase().includes('imported');
  return {
    id: row.id,
    name: row.name,
    relationship: row.relationship,
    birthday: row.birthday,
    anniversary: row.anniversary,
    primaryType,
    primaryDate,
    interests: row.interests || [],
    selected: index === 0,
    fromCalendar,
  };
}
