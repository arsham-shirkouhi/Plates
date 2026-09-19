import React, { useEffect, useRef } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Reanimated, {
    Easing,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { WORKOUT_COLORS } from '../../workout/constants';
import { StartWorkoutRoutine } from '../../workout/startWorkoutTypes';
import { WorkoutExercise } from '../../workout/types';
import { PickWorkoutScreen, PendingReviewWorkout } from './PickWorkoutScreen';
import { ReviewWorkoutScreen } from './ReviewWorkoutScreen';

const FORWARD_MS = 320;
const BACK_MS = 280;
const MOVE_EASING = Easing.bezier(0.22, 1, 0.36, 1);

interface PickReviewFlowProps {
    step: 'pick' | 'review';
    pendingReview: PendingReviewWorkout | null;
    onReviewWorkout: (pending: PendingReviewWorkout) => void;
    onStartRoutine: (routine: StartWorkoutRoutine) => void;
    onStartEmpty: () => void;
    onBack: () => void;
    onReviewExited: () => void;
    onStartWorkout: (payload: { title: string; exercises: WorkoutExercise[] }) => void;
}

export const PickReviewFlow: React.FC<PickReviewFlowProps> = ({
    step,
    pendingReview,
    onReviewWorkout,
    onStartRoutine,
    onStartEmpty,
    onBack,
    onReviewExited,
    onStartWorkout,
}) => {
    const { width } = useWindowDimensions();
    const progress = useSharedValue(step === 'review' ? 1 : 0);
    const showReview = step === 'review' && !!pendingReview;
    const onReviewExitedRef = useRef(onReviewExited);
    onReviewExitedRef.current = onReviewExited;
    const hasPresentedReview = useRef(false);

    const notifyReviewExited = useRef(() => {
        hasPresentedReview.current = false;
        onReviewExitedRef.current();
    }).current;

    useEffect(() => {
        const toValue = showReview ? 1 : 0;
        if (showReview) hasPresentedReview.current = true;
        if (!showReview && !hasPresentedReview.current) return;

        progress.value = withTiming(
            toValue,
            {
                duration: toValue === 1 ? FORWARD_MS : BACK_MS,
                easing: MOVE_EASING,
            },
            (finished) => {
                if (finished && toValue === 0) {
                    runOnJS(notifyReviewExited)();
                }
            }
        );
    }, [notifyReviewExited, progress, showReview]);

    const pickStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 1], [1, 0.42]),
        transform: [
            { translateX: interpolate(progress.value, [0, 1], [0, -width * 0.22]) },
            { scale: interpolate(progress.value, [0, 1], [1, 0.98]) },
        ],
    }));

    const pickDimStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 1], [0, 0.14]),
    }));

    const reviewStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 0.18, 1], [0, 1, 1]),
        transform: [
            { translateX: interpolate(progress.value, [0, 1], [width * 0.28, 0]) },
            { translateY: interpolate(progress.value, [0, 1], [10, 0]) },
        ],
    }));

    return (
        <View style={styles.stage}>
            <Reanimated.View
                style={[styles.page, pickStyle]}
                pointerEvents={step === 'pick' ? 'auto' : 'none'}
            >
                <PickWorkoutScreen
                    onReviewWorkout={onReviewWorkout}
                    onStartRoutine={onStartRoutine}
                    onStartEmpty={onStartEmpty}
                />
                <Reanimated.View
                    pointerEvents="none"
                    style={[styles.dim, pickDimStyle]}
                />
            </Reanimated.View>

            {pendingReview ? (
                <Reanimated.View
                    style={[styles.page, styles.reviewPage, reviewStyle]}
                    pointerEvents={step === 'review' ? 'auto' : 'none'}
                >
                    <ReviewWorkoutScreen
                        key={pendingReview.exercises.map((exercise) => exercise.id).join('|')}
                        pending={pendingReview}
                        onBack={onBack}
                        onStartWorkout={onStartWorkout}
                    />
                </Reanimated.View>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    stage: {
        flex: 1,
        overflow: 'hidden',
        backgroundColor: WORKOUT_COLORS.background,
    },
    page: {
        ...StyleSheet.absoluteFill,
    },
    reviewPage: {
        backgroundColor: WORKOUT_COLORS.background,
        shadowColor: '#000',
        shadowOffset: { width: -10, height: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 12,
    },
    dim: {
        ...StyleSheet.absoluteFill,
        backgroundColor: '#000',
    },
});
