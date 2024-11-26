import { createContext, useContext } from 'react';

interface SyncContextType {
  lastSentMessages: Map<string, { timestamp: number; roi: any }>;
}

export const SyncContext = createContext<SyncContextType>({
  lastSentMessages: new Map()
});

export const useSyncContext = () => useContext(SyncContext); 