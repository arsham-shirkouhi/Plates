import { MuscleGroup, MUSCLE_GROUP_LABELS } from './muscleGroups';

export function formatMuscleSelectAccessibilityLabel(
    group: MuscleGroup,
    daysSince: number | null,
    isSelected: boolean
): string {
    const label = MUSCLE_GROUP_LABELS[group];
    const state = isSelected ? 'selected' : 'not selected';
    const action = isSelected ? 'double tap to deselect' : 'double tap to select';

    if (daysSince === null) {
        return `${label}, never tracked, ${state}, ${action}`;
    }
    if (daysSince === 0) {
        return `${label}, trained today, ${state}, ${action}`;
    }
    if (daysSince === 1) {
        return `${label}, trained yesterday, ${state}, ${action}`;
    }
    return `${label}, last trained ${daysSince} days ago, ${state}, ${action}`;
}

export function formatOverduePrompt(group: MuscleGroup, daysSince: number | null): string {
    const label = MUSCLE_GROUP_LABELS[group];
    if (daysSince === null) {
        return `${label} hasn't been tracked yet.`;
    }
    if (daysSince === 0) {
        return `${label} was trained today.`;
    }
    if (daysSince === 1) {
        return `${label} hasn't been trained in 1 day.`;
    }
    return `${label} hasn't been trained in ${daysSince} days.`;
}

export function getMostOverdueMuscle(
    recency: Record<MuscleGroup, number | null>
): MuscleGroup | null {
    const ranked = (Object.keys(recency) as MuscleGroup[]).sort(
        (a, b) => (recency[b] ?? 999) - (recency[a] ?? 999)
    );
    return ranked[0] ?? null;
}

export function buildWorkoutTitleFromGroups(groups: MuscleGroup[]): string {
    if (groups.length === 0) return 'workout';
    if (groups.length === 1) return `${MUSCLE_GROUP_LABELS[groups[0]]} workout`;
    if (groups.length === 2) {
        return `${MUSCLE_GROUP_LABELS[groups[0]]} · ${MUSCLE_GROUP_LABELS[groups[1]]} workout`;
    }
    return `${groups.length} muscle workout`;
}
