import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface OverlayContextType {
    isAnyOverlayOpen: boolean;
    registerOverlay: (id: string, isOpen: boolean) => void;
    unregisterOverlay: (id: string) => void;
}

const OverlayContext = createContext<OverlayContextType | undefined>(undefined);

export const OverlayProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [openOverlays, setOpenOverlays] = useState<Set<string>>(new Set());

    const registerOverlay = useCallback((id: string, isOpen: boolean) => {
        setOpenOverlays(prev => {
            const next = new Set(prev);
            if (isOpen) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    }, []);

    const unregisterOverlay = useCallback((id: string) => {
        setOpenOverlays(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    }, []);

    const isAnyOverlayOpen = openOverlays.size > 0;

    return (
        <OverlayContext.Provider value={{ isAnyOverlayOpen, registerOverlay, unregisterOverlay }}>
            {children}
        </OverlayContext.Provider>
    );
};

export const useOverlay = () => {
    const context = useContext(OverlayContext);
    if (!context) {
        // Return a safe default instead of throwing, to handle cases where
        // the provider might not be available yet (e.g., during module initialization)
        return {
            isAnyOverlayOpen: false,
            registerOverlay: () => { },
            unregisterOverlay: () => { },
        };
    }
    return context;
};
