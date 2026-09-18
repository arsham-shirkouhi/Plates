/**
 * Types for the WorkoutX Exercise API — https://workoutxapp.com
 *
 * Base URL: https://api.workoutxapp.com/v1
 * Auth header: X-WorkoutX-Key
 *
 * Only the exercise domain is modeled here (per project scope — body-scan API
 * is intentionally excluded).
 */

/** Raw shape returned by /v1/exercises endpoints. */
export interface WorkoutXExercise {
    /** Stable exercise id (string, e.g. "0001"). */
    id: string;
    /** Human-readable exercise name (lowercase in WorkoutX). */
    name: string;
    /** Broad body part category — see BODY_PARTS below. */
    bodyPart: string;
    /** Primary target muscle. */
    target: string;
    /** Equipment required (e.g. "barbell", "body weight", "cable"). */
    equipment: string;
    /** Absolute URL to a demonstration GIF. */
    gifUrl: string;
    /** Ordered list of step-by-step instructions. */
    instructions: string[];
    /** Additional muscles engaged. */
    secondaryMuscles?: string[];
    /** Optional difficulty tag surfaced on some endpoints. */
    difficulty?: string;
}

/** Some list endpoints wrap results as { data: [...] }, others return a bare array. */
export type WorkoutXExerciseListResponse =
    | WorkoutXExercise[]
    | { data: WorkoutXExercise[] }
    | { exercises: WorkoutXExercise[] };

/**
 * WorkoutX body-part categories as documented on the dashboard.
 * These are the exact strings accepted by /v1/exercises/bodyPart/{bodyPart}.
 */
export const WORKOUTX_BODY_PARTS = [
    'back',
    'cardio',
    'chest',
    'lower arms',
    'lower legs',
    'neck',
    'shoulders',
    'upper arms',
    'upper legs',
    'waist',
] as const;

export type WorkoutXBodyPart = (typeof WORKOUTX_BODY_PARTS)[number];
