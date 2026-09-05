import React, { createContext, useContext, useRef } from 'react';

interface TabHistoryContextType {
  lastTabIndexRef: React.MutableRefObject<number>;
}

const TabHistoryContext = createContext<TabHistoryContextType | null>(null);

export function TabHistoryProvider({ children }: { children: React.ReactNode }) {
  const lastTabIndexRef = useRef(0);

  return (
    <TabHistoryContext.Provider value={{ lastTabIndexRef }}>
      {children}
    </TabHistoryContext.Provider>
  );
}

export function useTabHistory() {
  const context = useContext(TabHistoryContext);
  if (!context) {
    throw new Error('useTabHistory must be used within a TabHistoryProvider');
  }
  return context;
}
