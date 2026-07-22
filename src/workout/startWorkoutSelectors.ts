import {
    MUSCLE_GROUP_LABELS,
    MUSCLE_GROUPS,
    MuscleGroup,
    MuscleRecencyMap,
} from './muscleGroups';
import {
    DEFAULT_START_WORKOUT_FILTERS,
    StartWorkoutFilters,
    StartWorkoutRoutine,
    SuggestedWorkout,
} from './startWorkoutTypes';

function averageFreshness(muscles: MuscleGroup[], recency: MuscleRecencyMap): number {
    if (muscles.length === 0) return 0;
    const values = muscles.map((muscle) => recency[muscle] ?? 999);
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatUntrainedReason(muscles: MuscleGroup[], recency: MuscleRecencyMap): string {
    if (muscles.length === 0) return 'ready when you are';
    const top = [...muscles].sort((a, b) => (recency[b] ?? 999) - (recency[a] ?? 999))[0];
    const days = recency[top];
    const label = MUSCLE_GROUP_LABELS[top];
    if (days === null || days === undefined) return `${label} untracked`;
    if (days === 0) return `${label} trained today`;
    if (days === 1) return `${label} trained yesterday`;
    return `${label} untrained ${days} days`;
}

function formatDurationMinutes(durationLabel: string): string {
    const trimmed = durationLabel.trim().toLowerCase();
    if (trimmed.endsWith('min')) return trimmed;
    if (trimmed.endsWith('m')) return trimmed.replace(/m$/, ' min');
    if (trimmed === '—' || trimmed === '-') return '—';
    return `${trimmed} min`;
}

export function formatSuggestedDetailLine(
    suggestion: SuggestedWorkout,
    recency: MuscleRecencyMap,
    hasHistory: boolean
): string {
    const { routine, reason, isFirstTimePreset } = suggestion;
    const duration = formatDurationMinutes(routine.durationLabel);
    const facts = `${routine.exerciseCount} exercises · ${duration}`;

    if (isFirstTimePreset) {
        return `${reason.toLowerCase()} · ${facts}`;
    }

    if (!hasHistory || reason.toLowerCase() === 'ready when you are') {
        return `ready when you are · ${facts}`;
    }

    const freshest = [...routine.muscleGroups].sort(
        (a, b) => (recency[b] ?? 999) - (recency[a] ?? 999)
    );
    const reasonPart = formatUntrainedReason(freshest, recency);
    return `${reasonPart} · ${facts}`;
}

export function pickSuggestedWorkout(
    routines: StartWorkoutRoutine[],
    recency: MuscleRecencyMap,
    hasWorkoutHistory: boolean
): SuggestedWorkout | null {
    const userRoutines = routines.filter((routine) => routine.source === 'user');
    const presets = routines.filter((routine) => routine.source === 'preset');

    if (userRoutines.length === 0) {
        const preset = presets[0];
        if (!preset) return null;
        return {
            routine: preset,
            reason: 'Try a preset to get started',
            isFirstTimePreset: true,
        };
    }

    if (!hasWorkoutHistory) {
        const newest = [...userRoutines].sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
        })[0];
        return {
            routine: newest,
            reason: 'Ready when you are',
        };
    }

    const ranked = [...userRoutines].sort((a, b) => {
        return averageFreshness(b.muscleGroups, recency) - averageFreshness(a.muscleGroups, recency);
    });
    const top = ranked[0];
    if (!top) return null;

    const freshestMuscles = [...top.muscleGroups].sort((a, b) => {
        return (recency[b] ?? 999) - (recency[a] ?? 999);
    });

    return {
        routine: top,
        reason: formatUntrainedReason(freshestMuscles, recency),
    };
}

export function filterStartWorkoutRoutines(
    routines: StartWorkoutRoutine[],
    filters: StartWorkoutFilters = DEFAULT_START_WORKOUT_FILTERS
): StartWorkoutRoutine[] {
    const query = filters.searchQuery.trim().toLowerCase();

    return routines.filter((routine) => {
        if (filters.showUserRoutines && routine.source === 'user') {
            // pass
        } else if (filters.showPresets && routine.source === 'preset') {
            // pass
        } else {
            return false;
        }

        if (filters.muscleGroup && !routine.muscleGroups.includes(filters.muscleGroup)) {
            return false;
        }

        if (query && !routine.name.toLowerCase().includes(query)) {
            return false;
        }

        return true;
    });
}

export function getTopLegendMuscles(recency: MuscleRecencyMap, limit = 4): MuscleGroup[] {
    return [...MUSCLE_GROUPS]
        .sort((a, b) => (recency[b] ?? 999) - (recency[a] ?? 999))
        .slice(0, limit);
}

export function formatRoutineSubtitle(routine: StartWorkoutRoutine): string {
    if (routine.source === 'preset') {
        return `preset · ${routine.exerciseCount} exercises · ${formatDurationMinutes(routine.durationLabel)}`;
    }

    const names = routine.exercises.map((exercise) => exercise.name);
    if (names.length === 0) {
        return `${routine.exerciseCount} exercises · ${routine.durationLabel}`;
    }

    const preview = names.slice(0, 3).join(', ');
    const overflow = names.length > 3 ? ` +${names.length - 3}` : '';
    return `${preview}${overflow}`;
}

export function estimateDurationLabel(exerciseCount: number): string {
    const minutes = Math.max(20, exerciseCount * 12);
    return `${minutes} min`;
}
