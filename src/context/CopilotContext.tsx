import React, { createContext, useContext, useState, useCallback } from 'react';

export interface CopilotContextValue {
  isOpen: boolean;
  openCopilot: (query?: string) => void;
  closeCopilot: () => void;
  initialQuery?: string;
}

const CopilotContext = createContext<CopilotContextValue>({
  isOpen: false,
  openCopilot: () => {},
  closeCopilot: () => {},
  initialQuery: undefined
});

// oxlint-disable-next-line react/only-export-components
export const useCopilot = () => useContext(CopilotContext);

export const CopilotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string | undefined>(undefined);

  const openCopilot = useCallback((query?: string) => {
    setInitialQuery(query);
    setIsOpen(true);
  }, []);

  const closeCopilot = useCallback(() => {
    setIsOpen(false);
    setInitialQuery(undefined);
  }, []);

  return (
    <CopilotContext.Provider value={{ isOpen, openCopilot, closeCopilot, initialQuery }}>
      {children}
    </CopilotContext.Provider>
  );
};
