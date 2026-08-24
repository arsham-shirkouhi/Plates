import { useEffect, useRef, useState } from 'react';
import { useSharedValue, SharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { RestTimerState } from '../workout/types';
import { getRestProgress, getRestRemainingSeconds } from '../workout/workoutSelectors';

interface UseRestTimerOptions {
    restTimer: RestTimerState | null;
    onComplete?: () => void;
    hapticsEnabled?: boolean;
}

interface UseRestTimerResult {
    isRunning: boolean;
    remainingSeconds: number;
    progress: SharedValue<number>;
}

export function useRestTimer({
    restTimer,
    onComplete,
    hapticsEnabled = true,
}: UseRestTimerOptions): UseRestTimerResult {
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const progress = useSharedValue(0);
    const completedRef = useRef<string | null>(null);
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    useEffect(() => {
        if (!restTimer) {
            setRemainingSeconds(0);
            progress.value = 0;
            completedRef.current = null;
            return;
        }

        const tick = () => {
            const now = Date.now();
            const remaining = getRestRemainingSeconds(restTimer, now);
            progress.value = getRestProgress(restTimer, now);
            setRemainingSeconds((prev) => (prev === remaining ? prev : remaining));

            if (remaining === 0 && completedRef.current !== restTimer.setId) {
                completedRef.current = restTimer.setId;
                if (hapticsEnabled) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                onCompleteRef.current?.();
            }
        };

        tick();
        const intervalId = setInterval(tick, 100);
        return () => clearInterval(intervalId);
    }, [restTimer, hapticsEnabled, progress]);

    return {
        isRunning: !!restTimer && remainingSeconds > 0,
        remainingSeconds,
        progress,
    };
}
