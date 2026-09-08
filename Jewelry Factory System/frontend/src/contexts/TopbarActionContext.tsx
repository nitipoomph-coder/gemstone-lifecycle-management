import React, { createContext, useContext, useState } from 'react';

interface TopbarActionContextType {
  topbarActions: React.ReactNode | null;
  setTopbarActions: (actions: React.ReactNode | null) => void;
}

const TopbarActionContext = createContext<TopbarActionContextType>({
  topbarActions: null,
  setTopbarActions: () => {},
});

export function TopbarActionProvider({ children }: { children: React.ReactNode }) {
  const [topbarActions, setTopbarActions] = useState<React.ReactNode | null>(null);

  return (
    <TopbarActionContext.Provider value={{ topbarActions, setTopbarActions }}>
      {children}
    </TopbarActionContext.Provider>
  );
}

export function useTopbarActions() {
  return useContext(TopbarActionContext);
}
