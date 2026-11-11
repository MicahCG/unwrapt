import { useEffect, useRef, useState } from 'react';
import { mergeDictation, speechRecognitionConstructor, type DictationRecognition } from '@/lib/speechDictation';

type DictationControls = {
  supported: boolean;
  listening: boolean;
  error: string | null;
  toggle: (currentText: string, onText: (next: string) => void) => void;
};

/** Browser speech-to-text. The transcript is written into the field; Unwrapt does not receive the audio. */
export function useSpeechDictation(): DictationControls {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<DictationRecognition | null>(null);
  const baseRef = useRef('');

  useEffect(() => {
    setSupported(Boolean(speechRecognitionConstructor()));
    return () => recognitionRef.current?.abort();
  }, []);

  const stop = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const toggle = (currentText: string, onText: (next: string) => void) => {
    if (listening) {
      stop();
      return;
    }
    const Ctor = speechRecognitionConstructor();
    if (!Ctor) {
      setError('Voice input isn’t available in this browser.');
      return;
    }
    setError(null);
    baseRef.current = currentText;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
    recognition.onresult = (event) => {
      let spoken = '';
      for (let index = 0; index < event.results.length; index += 1) {
        spoken += event.results[index]?.[0]?.transcript ?? '';
      }
      onText(mergeDictation(baseRef.current, spoken));
    };
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Allow the microphone to dictate a message.');
      } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setError('Couldn’t transcribe that. Try again.');
      }
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setError('Couldn’t start voice input.');
      setListening(false);
    }
  };

  return { supported, listening, error, toggle };
}
