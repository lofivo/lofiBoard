import { createContext, useContext } from 'react';

export const WhiteboardContext = createContext(null);

export function useWhiteboardContext() {
  const ctx = useContext(WhiteboardContext);
  if (!ctx) {
    throw new Error('useWhiteboardContext must be used within WhiteboardProvider');
  }
  return ctx;
}
