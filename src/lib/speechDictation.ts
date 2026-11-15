/** Join a finished or in-progress dictation onto the text that was already in the field. */
export function mergeDictation(base: string, spoken: string): string {
  const addition = spoken.replace(/\s+/g, ' ').trim();
  if (!addition) return base;
  const prefix = base.replace(/\s+$/, '');
  if (!prefix) return addition;
  return `${prefix} ${addition}`;
}

export type DictationRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: DictationResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export type DictationResultEvent = {
  results: ArrayLike<{ isFinal: boolean; 0?: { transcript: string } }>;
};

type RecognitionWindow = Window & {
  SpeechRecognition?: new () => DictationRecognition;
  webkitSpeechRecognition?: new () => DictationRecognition;
};

export function speechRecognitionConstructor(): (new () => DictationRecognition) | null {
  if (typeof window === 'undefined') return null;
  const host = window as RecognitionWindow;
  return host.SpeechRecognition || host.webkitSpeechRecognition || null;
}
