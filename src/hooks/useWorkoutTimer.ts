import { useEffect, useState } from 'react';
import { getElapsedSeconds } from '../workout/workoutSelectors';

export function useWorkoutTimer(startedAt: string | null | undefined): number {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    useEffect(() => {
        if (!startedAt) {
            setElapsedSeconds(0);
            return;
        }

        const tick = () => {
            setElapsedSeconds(getElapsedSeconds(startedAt));
        };

        tick();
        const intervalId = setInterval(tick, 1000);
        return () => clearInterval(intervalId);
    }, [startedAt]);

    return elapsedSeconds;
}
