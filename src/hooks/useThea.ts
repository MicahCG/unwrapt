import { createContext, useContext } from 'react';

export type TheaContext = {
  surface?: 'dashboard' | 'recipient' | 'catalog' | 'gift_status' | 'settings';
  recipientName?: string;
  /** Send a starter message as soon as the chat opens (VIP chat), so the user never faces a blank box. */
  autoStart?: boolean;
  /** Overrides the default starter message for this context. */
  starter?: string;
};

export type TheaApi = {
  openThea: (context?: TheaContext) => void;
};

export const TheaContextValue = createContext<TheaApi | null>(null);

export const useThea = () => {
  const value = useContext(TheaContextValue);
  if (!value) throw new Error('useThea must be used inside TheaProvider');
  return value;
};
