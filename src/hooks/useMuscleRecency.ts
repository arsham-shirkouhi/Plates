import { useCallback, useEffect, useState } from 'react';
import {
    fetchMuscleRecency,
    getMuscleRecencyInitial,
    hasAnyWorkoutHistory,
    computeMuscleRecencyCoverageFromWorkouts,
    MuscleRecencyCoverage,
} from '../services/muscleRecencyService';
import { MuscleRecencyMap, NEUTRAL_MUSCLE_RECENCY } from '../workout/muscleGroups';

export function useMuscleRecency(userId?: string | null) {
    const [recency, setRecency] = useState<MuscleRecencyMap>(NEUTRAL_MUSCLE_RECENCY);
    const [hasHistory, setHasHistory] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [coverage, setCoverage] = useState<MuscleRecencyCoverage | null>(null);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        try {
            const [nextRecency, history, nextCoverage] = await Promise.all([
                fetchMuscleRecency(userId),
                hasAnyWorkoutHistory(userId),
                computeMuscleRecencyCoverageFromWorkouts(userId),
            ]);
            setRecency(nextRecency);
            setHasHistory(history);
            setCoverage(nextCoverage);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const cached = await getMuscleRecencyInitial(userId);
            if (!cancelled) {
                setRecency(cached);
                setIsLoading(false);
            }

            const [nextRecency, history, nextCoverage] = await Promise.all([
                fetchMuscleRecency(userId),
                hasAnyWorkoutHistory(userId),
                computeMuscleRecencyCoverageFromWorkouts(userId),
            ]);

            if (!cancelled) {
                setRecency(nextRecency);
                setHasHistory(history);
                setCoverage(nextCoverage);
                setIsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [userId]);

    return { recency, hasHistory, isLoading, coverage, refresh };
}
