export const MUSCLE_GROUPS = [
    'chest',
    'shoulders',
    'arms',
    'back',
    'core',
    'legs',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
    chest: 'chest',
    shoulders: 'shoulders',
    arms: 'arms',
    back: 'back',
    core: 'core',
    legs: 'legs',
};

export type MuscleRecencyMap = Record<MuscleGroup, number | null>;

export const NEUTRAL_MUSCLE_RECENCY: MuscleRecencyMap = {
    chest: null,
    shoulders: null,
    arms: null,
    back: null,
    core: null,
    legs: null,
};

const BODY_PART_ALIASES: Record<string, MuscleGroup> = {
    chest: 'chest',
    shoulders: 'shoulders',
    shoulder: 'shoulders',
    arms: 'arms',
    arm: 'arms',
    biceps: 'arms',
    triceps: 'arms',
    back: 'back',
    lats: 'back',
    core: 'core',
    abs: 'core',
    abdominals: 'core',
    legs: 'legs',
    leg: 'legs',
    quads: 'legs',
    hamstrings: 'legs',
    glutes: 'legs',
    calves: 'legs',
};

export function mapBodyPartToMuscleGroup(bodyPart?: string, exerciseName?: string): MuscleGroup | null {
    const normalizedPart = bodyPart?.trim().toLowerCase();
    if (normalizedPart && BODY_PART_ALIASES[normalizedPart]) {
        return BODY_PART_ALIASES[normalizedPart];
    }

    const normalizedName = exerciseName?.trim().toLowerCase() ?? '';
    if (!normalizedName) return null;

    if (/(bench|fly|push-up|push up|chest)/.test(normalizedName)) return 'chest';
    if (/(shoulder|overhead|lateral raise|press)/.test(normalizedName) && !/(leg|bench)/.test(normalizedName)) {
        return 'shoulders';
    }
    if (/(curl|tricep|dip|extension)/.test(normalizedName)) return 'arms';
    if (/(row|pull|lat|deadlift|back)/.test(normalizedName)) return 'back';
    if (/(plank|crunch|core|ab)/.test(normalizedName)) return 'core';
    if (/(squat|lunge|leg|calf|rdl|press)/.test(normalizedName)) return 'legs';

    return null;
}

/** Selected muscle highlight on body map */
export const MUSCLE_SELECTED_FILL = '#FF5151';

/** Neutral fill for untracked muscles — matches divider gray used elsewhere */
export const MUSCLE_NEUTRAL_FILL = '#E0E0E0';

/** Three-step recency ramp (unselected only): 0–2d, 3–6d, 7+d */
export const MUSCLE_ACCENT_RAMP = [
    'rgba(82, 110, 255, 0.12)',
    'rgba(82, 110, 255, 0.38)',
    'rgba(82, 110, 255, 0.72)',
] as const;

export function getMuscleFillColor(daysSince: number | null): string {
    if (daysSince === null) return MUSCLE_NEUTRAL_FILL;
    if (daysSince <= 2) return MUSCLE_ACCENT_RAMP[0];
    if (daysSince <= 6) return MUSCLE_ACCENT_RAMP[1];
    return MUSCLE_ACCENT_RAMP[2];
}

/** Selected = red; unselected = flat gray on the body map. */
export function getMuscleDisplayFill(_daysSince: number | null, isSelected: boolean): string {
    if (isSelected) return MUSCLE_SELECTED_FILL;
    return MUSCLE_NEUTRAL_FILL;
}

export function formatDaysSinceLabel(daysSince: number | null): string {
    if (daysSince === null) return 'never tracked';
    if (daysSince === 0) return 'trained today';
    if (daysSince === 1) return 'trained yesterday';
    return `${daysSince} days ago`;
}

export function formatMuscleAccessibilityLabel(group: MuscleGroup, daysSince: number | null): string {
    const label = MUSCLE_GROUP_LABELS[group];
    const suffix = ', double tap to filter';
    if (daysSince === null) return `${label}, never tracked${suffix}`;
    if (daysSince === 0) return `${label}, trained today${suffix}`;
    if (daysSince === 1) return `${label}, trained yesterday${suffix}`;
    return `${label}, last trained ${daysSince} days ago${suffix}`;
}

export function formatMuscleSelectionLine(group: MuscleGroup, daysSince: number | null): string {
    const label = MUSCLE_GROUP_LABELS[group];
    if (daysSince === null) return `${label} selected · never tracked`;
    if (daysSince === 0) return `${label} selected · trained today`;
    if (daysSince === 1) return `${label} selected · trained yesterday`;
    return `${label} selected · last trained ${daysSince} days ago`;
}
