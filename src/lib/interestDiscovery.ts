/** Recipient interest discovery: broad categories → specific signals before gifts. */

export type InterestConfidence = 'low' | 'medium' | 'high';

export type InterestSignal = {
  /** Broad starter category, when known. */
  category: string | null;
  /** Specific preference used for search/ranking. */
  interest: string;
  /** Extra free-text context from the conversation. */
  details: string | null;
  confidence: InterestConfidence;
};

/** Broad entry points for onboarding chips. Not sufficient recommendation signals alone. */
export const STARTER_CATEGORIES = [
  'Food & Cooking',
  'Coffee & Tea',
  'Fitness & Wellness',
  'Travel & Outdoors',
  'Home & Cozy',
  'Style & Beauty',
  'Tech & Gaming',
  'Books & Hobbies',
] as const;

export type StarterCategory = (typeof STARTER_CATEGORIES)[number];

type CategoryFollowUp = {
  prompt: (firstName: string) => string;
  chips: string[];
};

/** Directional follow-ups only. The agent should adapt when the user is already specific. */
export const CATEGORY_FOLLOWUPS: Record<string, CategoryFollowUp> = {
  'Food & Cooking': {
    prompt: (first) =>
      `Nice. What kind of cooking or food does ${first} get excited about?`,
    chips: ['Pasta from scratch', 'Baking', 'Grilling', 'Trying new restaurants', 'Wine with dinner'],
  },
  'Coffee & Tea': {
    prompt: (first) =>
      `Got it. Is ${first} more of a coffee person, a tea person, or both?`,
    chips: ['Specialty coffee', 'Matcha', 'Loose-leaf tea', 'Home espresso setup'],
  },
  'Fitness & Wellness': {
    prompt: (first) =>
      `Love that. What does wellness look like for ${first}?`,
    chips: ['Running', 'Pilates', 'Yoga', 'Gym / lifting', 'Recovery & self-care'],
  },
  'Travel & Outdoors': {
    prompt: (first) =>
      `Travel and outdoors covers a lot. What does that look like for ${first}?`,
    chips: ['Frequent work travel', 'Weekend hikes', 'Camping', 'Beach trips', 'City getaways'],
  },
  'Home & Cozy': {
    prompt: (first) =>
      `Cozy home vibes. What would make ${first}'s space feel more like them?`,
    chips: ['Candles & scent', 'Cooking at home', 'Reading nook', 'Plants', 'Host dinners'],
  },
  'Style & Beauty': {
    prompt: (first) =>
      `Style noted. Any lane ${first} leans into more?`,
    chips: ['Skincare', 'Fragrance', 'Fashion', 'Jewelry', 'Hair care'],
  },
  'Tech & Gaming': {
    prompt: (first) =>
      `Cool. Is ${first} more gadgets, games, or both?`,
    chips: ['PC / console gaming', 'Gadgets & accessories', 'Headphones / audio', 'Smart home'],
  },
  'Books & Hobbies': {
    prompt: (first) =>
      `Nice. What hobby or kind of books does ${first} actually spend time on?`,
    chips: ['Fiction', 'Nonfiction', 'Vinyl / music', 'Photography', 'Gardening', 'Art / making'],
  },
};

const SPECIFIC_HOBBIES = [
  'golf', 'tennis', 'soccer', 'wine', 'ceramics', 'vinyl', 'anime', 'gardening',
  'photography', 'running', 'baking', 'pilates', 'yoga', 'matcha', 'espresso',
  'hiking', 'camping', 'skincare', 'fragrance', 'whiskey', 'bourbon', 'pasta',
  'grilling', 'board games', 'gaming', 'reading', 'cooking',
];

export function isStarterCategory(label: string): boolean {
  return STARTER_CATEGORIES.some((c) => c.toLowerCase() === label.trim().toLowerCase());
}

export function estimateConfidence(label: string, details?: string | null): InterestConfidence {
  const text = `${label} ${details || ''}`.trim();
  if (!text) return 'low';
  if (isStarterCategory(label) && !details) return 'low';
  if (details && details.trim().length >= 24) return 'high';
  if (text.length >= 48) return 'high';
  const lower = label.toLowerCase();
  if (SPECIFIC_HOBBIES.some((h) => lower === h || lower.includes(h))) return 'high';
  if (label.split(/\s+/).length >= 3) return 'medium';
  return 'medium';
}

export function isDiscoveryReady(signals: InterestSignal[]): boolean {
  if (!signals.length) return false;
  if (signals.some((s) => s.confidence === 'high')) return true;
  if (signals.some((s) => s.confidence === 'medium' && (s.details?.trim().length || 0) >= 12)) return true;
  const useful = signals.filter((s) => s.confidence !== 'low');
  return useful.length >= 2;
}

/** Labels passed to gift search: prefer specific interest over bare category. */
export function searchLabelsFromSignals(signals: InterestSignal[]): string[] {
  const labels: string[] = [];
  for (const signal of signals) {
    const label = signal.interest.trim();
    if (!label) continue;
    // Prefer specific interest; if still a bare category, map to searchable keywords.
    const searchable = isStarterCategory(label) ? categorySearchTerms(label) : [label];
    for (const term of searchable) {
      if (!labels.some((l) => l.toLowerCase() === term.toLowerCase())) {
        labels.push(term);
      }
    }
  }
  return labels.slice(0, 5);
}

function categorySearchTerms(category: string): string[] {
  switch (category) {
    case 'Food & Cooking':
      return ['Cooking'];
    case 'Coffee & Tea':
      return ['Coffee', 'Tea'];
    case 'Fitness & Wellness':
      return ['Fitness'];
    case 'Travel & Outdoors':
      return ['Travel', 'Outdoors'];
    case 'Home & Cozy':
      return ['Home'];
    case 'Style & Beauty':
      return ['Fashion', 'Beauty'];
    case 'Tech & Gaming':
      return ['Tech', 'Gaming'];
    case 'Books & Hobbies':
      return ['Reading'];
    default:
      return [category];
  }
}

export function upsertSignal(
  existing: InterestSignal[],
  next: InterestSignal,
): InterestSignal[] {
  const key = next.interest.toLowerCase();
  const categoryKey = next.category?.toLowerCase() || null;

  // If refining a broad category, replace the low-confidence category row.
  if (next.category && next.interest.toLowerCase() !== next.category.toLowerCase()) {
    const withoutCategory = existing.filter(
      (s) => !(s.confidence === 'low' && s.category?.toLowerCase() === categoryKey),
    );
    const idx = withoutCategory.findIndex((s) => s.interest.toLowerCase() === key);
    if (idx >= 0) {
      const copy = [...withoutCategory];
      copy[idx] = { ...withoutCategory[idx], ...next, details: next.details || withoutCategory[idx].details };
      return copy.slice(0, 5);
    }
    return [...withoutCategory, next].slice(0, 5);
  }

  const idx = existing.findIndex((s) => s.interest.toLowerCase() === key);
  if (idx >= 0) {
    const copy = [...existing];
    copy[idx] = {
      ...existing[idx],
      ...next,
      details: next.details || existing[idx].details,
      confidence:
        confidenceRank(next.confidence) > confidenceRank(existing[idx].confidence)
          ? next.confidence
          : existing[idx].confidence,
    };
    return copy;
  }
  return [...existing, next].slice(0, 5);
}

function confidenceRank(c: InterestConfidence): number {
  return c === 'high' ? 3 : c === 'medium' ? 2 : 1;
}

export function signalFromCategory(category: string): InterestSignal {
  return {
    category,
    interest: category,
    details: null,
    confidence: 'low',
  };
}

export function signalFromText(
  text: string,
  pendingCategory: string | null,
): InterestSignal {
  const cleaned = text.replace(/^[+]/, '').trim().slice(0, 80);
  const details = text.trim().length > 40 ? text.trim().slice(0, 240) : null;
  return {
    category: pendingCategory,
    interest: cleaned || text.trim().slice(0, 80),
    details,
    confidence: estimateConfidence(cleaned, details),
  };
}

export function discoveryReadyCopy(firstName: string, signals: InterestSignal[]): string {
  const labels = searchLabelsFromSignals(signals)
    .map((l) => l.toLowerCase())
    .slice(0, 3)
    .join(', ');
  if (labels) {
    return `Okay, I think I've got a good read on ${firstName}. ${labels} gives me enough to find gifts that actually fit.`;
  }
  return `Okay, I think I've got a good read on ${firstName}. I've got enough to start finding gifts that fit.`;
}
