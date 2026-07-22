import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useWorkoutOverlay } from '../contexts/WorkoutOverlayContext';
import { useActiveWorkout } from '../contexts/ActiveWorkoutContext';
import { useAuth } from '../context/AuthContext';
import { isOverlayVisible } from '../workout/workoutSelectors';
import {
    buildWorkoutExercisesFromExerciseTemplates,
    buildWorkoutExercisesFromTemplate,
    getMockWorkoutTemplate,
} from '../workout/mockWorkoutData';
import { SavedWorkoutSummary } from '../workout/workoutHistoryTypes';
import {
    getSelectableWorkouts,
    getWorkoutTemplateExercises,
    markWorkoutCompleted,
    saveCompletedWorkout,
    saveWorkoutPreset,
} from '../services/workoutHistoryService';
import { ActiveWorkoutOverlay } from '../components/activeWorkout/ActiveWorkoutOverlay';
import { AddExerciseOverlay } from '../components/AddExerciseOverlay';
import { WorkoutCountdownOverlay } from '../components/activeWorkout/WorkoutCountdownOverlay';
import { WorkoutWrapUpOverlay } from '../components/activeWorkout/WorkoutWrapUpOverlay';
import { PickWorkoutScreen, PendingReviewWorkout } from '../components/pickWorkout/PickWorkoutScreen';
import { ReviewWorkoutScreen } from '../components/pickWorkout/ReviewWorkoutScreen';
import { routineToPendingStart } from '../components/startWorkout/StartWorkoutIdleView';
import { StartWorkoutRoutine } from '../workout/startWorkoutTypes';
import { rootNavigationRef } from '../navigation/rootNavigationRef';
import { WorkoutExercise } from '../workout/types';

type PendingStart = {
    title?: string;
    exercises?: WorkoutExercise[];
};

export const ActiveWorkoutScreen: React.FC = () => {
    const { params, mergeParams, close: closeWorkoutOverlay } = useWorkoutOverlay();
    const {
        state,
        startWorkout,
        addExercises,
        expand,
        wrapUpSummary,
        requestWrapUp,
        commitFinishWorkout,
    } = useActiveWorkout();
    const { user } = useAuth();

    const [showAddExerciseOverlay, setShowAddExerciseOverlay] = useState(false);
    const [showCountdown, setShowCountdown] = useState(false);
    const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkoutSummary[]>([]);

    const consumedStartKeyRef = useRef<string | null>(null);
    const consumedPromptRef = useRef(false);
    const pendingStartRef = useRef<PendingStart | null>(null);

    const [logWorkoutStep, setLogWorkoutStep] = useState<'pick' | 'review'>('pick');
    const [pendingReview, setPendingReview] = useState<PendingReviewWorkout | null>(null);

    useEffect(() => {
        if (state.workout) return;
        consumedStartKeyRef.current = null;
        consumedPromptRef.current = false;
        setLogWorkoutStep('pick');
        setPendingReview(null);
    }, [state.workout]);

    useEffect(() => {
        if (!state.isHydrated) return;

        let cancelled = false;
        (async () => {
            const workouts = await getSelectableWorkouts(user?.id);
            if (!cancelled) setSavedWorkouts(workouts);
        })();

        return () => {
            cancelled = true;
        };
    }, [state.isHydrated, user?.id]);

    const startWorkoutDirect = useCallback(
        (pending: PendingStart) => {
            startWorkout(pending);
            expand();
        },
        [expand, startWorkout]
    );

    const queueWorkoutStart = useCallback((pending: PendingStart) => {
        pendingStartRef.current = pending;
        setShowCountdown(true);
    }, []);

    const beginPendingWorkout = useCallback(() => {
        const pending = pendingStartRef.current ?? { title: 'workout' };
        startWorkoutDirect(pending);
        pendingStartRef.current = null;
        setShowCountdown(false);
    }, [startWorkoutDirect]);

    const startWorkoutType = params?.startWorkoutType;
    const workoutId = params?.workoutId;
    const startWorkoutPrompt = params?.startWorkoutPrompt;

    useEffect(() => {
        if (!startWorkoutType || state.workout) return;

        const startKey = `${startWorkoutType}-${workoutId ?? ''}`;
        if (consumedStartKeyRef.current === startKey) return;
        consumedStartKeyRef.current = startKey;

        if (startWorkoutType === 'schedule') {
            mergeParams({ startWorkoutType: undefined });
            return;
        }

        const loadAndStart = async () => {
            const template = workoutId ? getMockWorkoutTemplate(workoutId) : undefined;
            if (template) {
                queueWorkoutStart({
                    title: template.title,
                    exercises: buildWorkoutExercisesFromTemplate(template),
                });
                return;
            }

            if (workoutId) {
                const storedExercises = await getWorkoutTemplateExercises(workoutId, user?.id);
                if (storedExercises) {
                    const saved = savedWorkouts.find((item) => item.id === workoutId);
                    queueWorkoutStart({
                        title: saved?.name ?? 'workout',
                        exercises: buildWorkoutExercisesFromExerciseTemplates(storedExercises),
                    });
                    return;
                }
            }

            queueWorkoutStart({ title: 'workout' });
        };

        void loadAndStart();
        mergeParams({ startWorkoutType: undefined, workoutId: undefined });
    }, [
        startWorkoutType,
        workoutId,
        state.workout,
        mergeParams,
        queueWorkoutStart,
        savedWorkouts,
        user?.id,
    ]);

    useEffect(() => {
        if (!startWorkoutPrompt || state.workout || consumedPromptRef.current) {
            return;
        }

        consumedPromptRef.current = true;
        mergeParams({ startWorkoutPrompt: undefined });
    }, [startWorkoutPrompt, state.workout, mergeParams]);

    const handleSelectExercise = (exercise: { id: string; name: string }) => {
        addExercises([{ exerciseId: exercise.id, name: exercise.name }]);
    };

    const handleOpenExercise = (exerciseId: string) => {
        if (rootNavigationRef.isReady()) {
            rootNavigationRef.navigate('ExerciseInfo', { exerciseId });
        }
    };

    const handleStartFromRoutine = useCallback(
        (routine: StartWorkoutRoutine) => {
            startWorkoutDirect(routineToPendingStart(routine));
        },
        [startWorkoutDirect]
    );

    const handleWrapUpDone = async () => {
        if (wrapUpSummary) {
            await saveCompletedWorkout(wrapUpSummary, user?.id);
            setSavedWorkouts(await getSelectableWorkouts(user?.id));
        }
        await commitFinishWorkout();
        closeWorkoutOverlay();
    };

    const handleSavePreset = async (title: string) => {
        if (!wrapUpSummary) return;
        await saveWorkoutPreset(wrapUpSummary, title, user?.id);
        setSavedWorkouts(await getSelectableWorkouts(user?.id));
    };

    if (!state.isHydrated) {
        return null;
    }

    return (
        <>
            {wrapUpSummary ? (
                <WorkoutWrapUpOverlay
                    key={wrapUpSummary.completedAt}
                    visible
                    summary={wrapUpSummary}
                    onDone={handleWrapUpDone}
                    onSavePreset={handleSavePreset}
                />
            ) : null}

            <WorkoutCountdownOverlay visible={showCountdown} onComplete={beginPendingWorkout} />

            {state.workout && isOverlayVisible(state.presentation) ? (
                <>
                    <ActiveWorkoutOverlay
                        onAddExercises={() => setShowAddExerciseOverlay(true)}
                        onOpenExercise={handleOpenExercise}
                        onRequestWrapUp={requestWrapUp}
                    />
                    <AddExerciseOverlay
                        visible={showAddExerciseOverlay}
                        onClose={() => setShowAddExerciseOverlay(false)}
                        onSelectExercise={handleSelectExercise}
                        currentExerciseIds={state.workout.exercises.map((exercise) => exercise.exerciseId)}
                        currentExerciseNames={state.workout.exercises.map((exercise) => exercise.name)}
                    />
                </>
            ) : !wrapUpSummary && !showCountdown ? (
                logWorkoutStep === 'review' && pendingReview ? (
                    <ReviewWorkoutScreen
                        pending={pendingReview}
                        onBack={() => setLogWorkoutStep('pick')}
                        onStartWorkout={startWorkoutDirect}
                    />
                ) : (
                    <PickWorkoutScreen
                        onReviewWorkout={(pending) => {
                            setPendingReview(pending);
                            setLogWorkoutStep('review');
                        }}
                        onStartRoutine={handleStartFromRoutine}
                        onStartEmpty={() => startWorkoutDirect({ title: 'workout' })}
                    />
                )
            ) : null}
        </>
    );
};
