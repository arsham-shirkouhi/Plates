import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { RestTimerState } from '../workout/types';
import { getRestProgress, getRestRemainingSeconds } from '../workout/workoutSelectors';

interface UseRestTimerOptions {
    restTimer: RestTimerState | null;
    onComplete?: () => void;
    hapticsEnabled?: boolean;
}

export function useRestTimer({
    restTimer,
    onComplete,
    hapticsEnabled = true,
}: UseRestTimerOptions) {
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const [progress, setProgress] = useState(0);
    const completedRef = useRef<string | null>(null);
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    useEffect(() => {
        if (!restTimer) {
            setRemainingSeconds(0);
            setProgress(0);
            completedRef.current = null;
            return;
        }

        const tick = () => {
            const now = Date.now();
            const remaining = getRestRemainingSeconds(restTimer, now);
            setRemainingSeconds(remaining);
            setProgress(getRestProgress(restTimer, now));

            if (remaining === 0 && completedRef.current !== restTimer.setId) {
                completedRef.current = restTimer.setId;
                if (hapticsEnabled) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                onCompleteRef.current?.();
            }
        };

        tick();
        const intervalId = setInterval(tick, 250);
        return () => clearInterval(intervalId);
    }, [restTimer, hapticsEnabled]);

    return {
        isRunning: !!restTimer && remainingSeconds > 0,
        remainingSeconds,
        progress,
    };
}
