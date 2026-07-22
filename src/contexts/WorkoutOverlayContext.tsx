import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { RootStackParamList } from '../navigation/navigationParamList';

export type WorkoutOverlayParams = RootStackParamList['Workout'];

type WorkoutOverlayContextValue = {
    isOpen: boolean;
    params: WorkoutOverlayParams | undefined;
    open: (p?: WorkoutOverlayParams) => void;
    close: () => void;
    mergeParams: (p: Partial<NonNullable<WorkoutOverlayParams>>) => void;
};

const WorkoutOverlayContext = createContext<WorkoutOverlayContextValue | null>(null);

export const WorkoutOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setOpen] = useState(false);
    const [params, setParams] = useState<WorkoutOverlayParams | undefined>(undefined);

    const open = useCallback((p?: WorkoutOverlayParams) => {
        setParams(p);
        setOpen(true);
    }, []);

    const close = useCallback(() => {
        setOpen(false);
        setParams(undefined);
    }, []);

    const mergeParams = useCallback((p: Partial<NonNullable<WorkoutOverlayParams>>) => {
        setParams((prev) => {
            const base = prev ?? {};
            const hasChange = (Object.keys(p) as Array<keyof typeof p>).some(
                (key) => base[key as keyof typeof base] !== p[key]
            );
            if (!hasChange) {
                return prev;
            }
            return { ...base, ...p } as WorkoutOverlayParams;
        });
    }, []);

    const value = useMemo(
        () => ({ isOpen, params, open, close, mergeParams }),
        [isOpen, params, open, close, mergeParams]
    );

    return <WorkoutOverlayContext.Provider value={value}>{children}</WorkoutOverlayContext.Provider>;
};

export function useWorkoutOverlay(): WorkoutOverlayContextValue {
    const ctx = useContext(WorkoutOverlayContext);
    if (!ctx) {
        throw new Error('useWorkoutOverlay must be used within WorkoutOverlayProvider');
    }
    return ctx;
}
