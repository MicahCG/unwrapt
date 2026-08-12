import { createContext, useContext } from 'react';

export type TheaContext = {
  surface?: 'dashboard' | 'recipient' | 'catalog' | 'gift_status' | 'settings';
  recipientName?: string;
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
