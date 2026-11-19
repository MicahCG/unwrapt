import { supabase } from '@/integrations/supabase/client';

export type AddressFields = { street: string; city: string; state: string; zip_code: string; country: string };

export type AddressCheck =
  /** Street confirmed as a real address, matching what was typed. */
  | { status: 'verified' }
  /** A real address exists but it's written differently (typo, abbreviation, wrong ZIP): offer it. */
  | { status: 'suggest'; suggestion: Pick<AddressFields, 'street' | 'city' | 'state' | 'zip_code'> }
  /** Format is fine but no such street was found. A warning, not a blocker. */
  | { status: 'notfound' }
  /** Clearly wrong (ZIP doesn't belong to that state, bad format...). */
  | { status: 'invalid'; errors: string[] }
  /** Not checked (non-US, PO box, or the service is unavailable). Never blocks saving. */
  | { status: 'unchecked' };

export const isAddressComplete = (a: AddressFields) =>
  Boolean(a.street.trim() && a.city.trim() && a.state.trim() && a.zip_code.trim());

/** Ask validate-address whether this is a real address. Network/service problems return 'unchecked'. */
export const checkAddress = async (a: AddressFields): Promise<AddressCheck> => {
  if (a.country.trim() !== 'United States') return { status: 'unchecked' };
  try {
    const { data, error } = await supabase.functions.invoke('validate-address', {
      body: { street: a.street.trim(), city: a.city.trim(), state: a.state.trim(), zipCode: a.zip_code.trim(), country: a.country },
    });
    if (error || !data) return { status: 'unchecked' };
    if (data.valid === false) return { status: 'invalid', errors: (data.errors as string[]) || ['This address could not be verified'] };
    if (!data.streetChecked) return { status: 'unchecked' };
    if (data.suggestion) {
      const s = data.suggestion as { street: string; city: string; state: string; zip: string };
      return { status: 'suggest', suggestion: { street: s.street, city: s.city, state: s.state, zip_code: s.zip } };
    }
    return data.streetFound ? { status: 'verified' } : { status: 'notfound' };
  } catch {
    return { status: 'unchecked' };
  }
};
