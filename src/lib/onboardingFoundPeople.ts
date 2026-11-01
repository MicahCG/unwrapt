/**
 * Onboarding shows only the first few people it finds and saves just the one the user picks.
 * Everyone it found is kept here so the plan page can offer to bring the others in, and Thea's
 * chat imports them once the user has subscribed (skipping anyone already saved).
 */
export type FoundPerson = { name: string; birthday: string | null; anniversary: string | null };

type Stored = { people: FoundPerson[]; sourceLabel: string; savedAt: number };

const KEY = 'unwrapt_onboarding_found_people';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const keyFor = (userId: string) => `${KEY}:${userId}`;
const dateOnly = (date: string | null) => (date ? date.split('T')[0] : null);

export function saveOnboardingFoundPeople(userId: string, people: FoundPerson[], sourceLabel: string): void {
  try {
    if (!people.length) {
      localStorage.removeItem(keyFor(userId));
      return;
    }
    const stored: Stored = {
      people: people.map((p) => ({ name: p.name, birthday: dateOnly(p.birthday), anniversary: dateOnly(p.anniversary) })),
      sourceLabel,
      savedAt: Date.now(),
    };
    localStorage.setItem(keyFor(userId), JSON.stringify(stored));
  } catch {
    /* storage unavailable; Google Calendar users are still covered by the chat's calendar import */
  }
}

export function loadOnboardingFoundPeople(userId: string): Stored | null {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const stored = JSON.parse(raw) as Stored;
    if (!Array.isArray(stored?.people) || Date.now() - (stored.savedAt || 0) > MAX_AGE_MS) {
      localStorage.removeItem(keyFor(userId));
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

export function clearOnboardingFoundPeople(userId: string): void {
  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    /* storage unavailable */
  }
}
