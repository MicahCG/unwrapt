// Agent-first (Unwrapt 2.0) palette — single source of truth for the
// concierge-style screens. Mirrors the "Unwrapt 2.0 agent-first design" prototype.
export const U = {
  bg: '#EDE6D8',          // app background
  bgGradient: 'radial-gradient(120% 70% at 85% 2%, rgba(182,91,60,0.10), rgba(237,230,216,0) 58%)',
  surface: '#FAF6EE',     // card / elevated
  chip: '#F3ECDD',        // subtle chip / pill
  ink: '#2A2520',         // primary text + dark buttons
  inkSoft: '#3A332B',
  buttonText: '#F4ECDD',
  textSecondary: '#6B6256',
  muted: '#9A8E7C',
  subtle: '#837868',
  accent: '#B65B3C',      // terracotta
  accentSoft: '#FBEFE5',
  sage: '#6E7B5B',        // success / in-motion
  sageSoft: '#EEF0E4',
  slate: '#5E6B72',       // cool alt avatar
  border: 'rgba(42,37,32,0.09)',
  borderStrong: 'rgba(42,37,32,0.16)',
  cream: '#FBF6EC',
} as const;

// Rotating avatar tones used for people, matching the prototype.
export const AVATAR_TONES = [
  '#B65B3C', '#6E7B5B', '#5E6B72', '#A8675F', '#A98C5F', '#3A332B', '#7A6A53',
];

export function toneForIndex(i: number) {
  return AVATAR_TONES[i % AVATAR_TONES.length];
}

export function initialsOf(name: string) {
  return (name || '')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
