import React, { useCallback, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Animated,
    Dimensions,
    Easing,
    ScrollView,
    PanResponder,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useActiveWorkout } from '../../contexts/ActiveWorkoutContext';
import { useWorkoutOverlay } from '../../contexts/WorkoutOverlayContext';
import { useWorkoutTimer } from '../../hooks/useWorkoutTimer';
import { useRestTimer } from '../../hooks/useRestTimer';
import {
    getCompletedSetCount,
    getCompletedVolume,
    getCurrentExercise,
    getExerciseSetProgress,
} from '../../workout/workoutSelectors';
import { MINI_BAR_HEIGHT, WORKOUT_COLORS } from '../../workout/constants';
import { ActiveWorkoutHeader } from './ActiveWorkoutHeader';
import { ActiveWorkoutStatsStrip } from './ActiveWorkoutStatsStrip';
import { ActiveWorkoutBottomActions } from './ActiveWorkoutBottomActions';
import { ActiveWorkoutMiniBar } from './ActiveWorkoutMiniBar';
import { RestTimerBar } from './RestTimerBar';
import { ExerciseCard } from './ExerciseCard';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SHEET_MARGIN_H = 20;
const SHEET_MARGIN_V = 4;
const SHEET_MAX_WIDTH = 540;
const WIDGET_FLOAT_BOTTOM = 10;
const SHELL_CORNER_RADIUS = 22;
const MINI_CORNER_RADIUS = 36;

interface ActiveWorkoutOverlayProps {
    onAddExercises: () => void;
    onRequestWrapUp: () => void;
}

export const ActiveWorkoutOverlay: React.FC<ActiveWorkoutOverlayProps> = ({
    onAddExercises,
    onRequestWrapUp,
}) => {
    const insets = useSafeAreaInsets();
    const { close: closeWorkoutOverlay } = useWorkoutOverlay();
    const {
        state,
        minimize,
        expand,
        finishWorkout,
        addSet,
        updateSet,
        toggleSetComplete,
        removeSet,
        changeSetType,
        applyPreviousSet,
        updateExerciseNote,
        updateRestSeconds,
        removeExercise,
        addToSuperset,
        adjustRestTimer,
        skipRestTimer,
        clearScrollTarget,
        dispatch,
    } = useActiveWorkout();

    const workout = state.workout;
    const presentation = state.presentation;
    const isFullscreen = presentation === 'fullscreen';
    const screenHeight = Dimensions.get('window').height;
    const sheetPaddingTop = insets.top + SHEET_MARGIN_V;
    const sheetPaddingBottom = insets.bottom + SHEET_MARGIN_V;
    const expandedSheetHeight = screenHeight - sheetPaddingTop - sheetPaddingBottom;
    const innerWidth = SCREEN_WIDTH - insets.left - insets.right;
    const expandedCardWidth = Math.min(SHEET_MAX_WIDTH, innerWidth - 2 * SHEET_MARGIN_H);
    const expandedCardLeft = insets.left + (innerWidth - expandedCardWidth) / 2;
    const widgetBarWidth = innerWidth - 2 * SHEET_MARGIN_H;
    const widgetBarLeft = insets.left + SHEET_MARGIN_H;
    const widgetBottomInset = insets.bottom + WIDGET_FLOAT_BOTTOM;
    const minimizedShellTop = screenHeight - MINI_BAR_HEIGHT - widgetBottomInset;

    const expandProgress = useRef(new Animated.Value(isFullscreen ? 1 : 0)).current;
    const scrollRef = useRef<ScrollView>(null);
    const exerciseOffsetsRef = useRef<Record<string, number>>({});
    const isFullscreenRef = useRef(isFullscreen);
    isFullscreenRef.current = isFullscreen;

    const elapsedSeconds = useWorkoutTimer(workout?.startedAt);
    const handleRestComplete = useCallback(() => {
        dispatch({ type: 'CLEAR_REST_TIMER' });
    }, [dispatch]);
    const { remainingSeconds, progress, isRunning } = useRestTimer({
        restTimer: state.restTimer,
        onComplete: handleRestComplete,
    });

    useEffect(() => {
        Animated.timing(expandProgress, {
            toValue: isFullscreen ? 1 : 0,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [isFullscreen, expandProgress]);

    useEffect(() => {
        if (!state.scrollTargetExerciseId) return;
        const y = exerciseOffsetsRef.current[state.scrollTargetExerciseId];
        if (typeof y === 'number') {
            scrollRef.current?.scrollTo({ y, animated: true });
        }
        clearScrollTarget();
    }, [state.scrollTargetExerciseId, clearScrollTarget]);

    const collapsePanResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gesture) =>
                isFullscreenRef.current &&
                gesture.dy > 24 &&
                Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.5,
            onPanResponderRelease: (_, gesture) => {
                // Require a deliberate pull — avoid accidental minimize from light drags.
                if (gesture.dy > 160 || gesture.vy > 1.6) {
                    minimize();
                }
            },
        })
    ).current;

    if (!workout) return null;

    const volume = getCompletedVolume(workout, state.settings);
    const sets = getCompletedSetCount(workout, state.settings);
    const currentExercise = getCurrentExercise(workout);
    const currentProgress = currentExercise
        ? getExerciseSetProgress(currentExercise)
        : { completed: 0, total: 0 };

    const shellTop = expandProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [minimizedShellTop, sheetPaddingTop],
    });
    const shellLeft = expandProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [widgetBarLeft, expandedCardLeft],
    });
    const shellWidth = expandProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [widgetBarWidth, expandedCardWidth],
    });
    const shellHeight = expandProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [MINI_BAR_HEIGHT, expandedSheetHeight],
    });
    const shellRadius = expandProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [MINI_CORNER_RADIUS, SHELL_CORNER_RADIUS],
    });
    const backdropOpacity = expandProgress.interpolate({
        inputRange: [0, 0.15, 1],
        outputRange: [0, 1, 1],
    });
    const expandedOpacity = expandProgress.interpolate({
        inputRange: [0, 0.22, 1],
        outputRange: [0, 1, 1],
    });
    const miniOpacity = expandProgress.interpolate({
        inputRange: [0, 0.3, 1],
        outputRange: [1, 0, 0],
    });

    const supersetColorMap = new Map<string, number>();
    let supersetCounter = 0;
    workout.exercises.forEach((exercise) => {
        if (exercise.supersetId && !supersetColorMap.has(exercise.supersetId)) {
            supersetColorMap.set(exercise.supersetId, supersetCounter++);
        }
    });

    const handleFinish = () => {
        if (workout.exercises.length === 0) {
            void finishWorkout().then(() => {
                closeWorkoutOverlay();
            });
            return;
        }

        Alert.alert('Finish workout?', 'Review your session summary next.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Finish',
                onPress: onRequestWrapUp,
            },
        ]);
    };

    return (
        <>
            <Animated.View
                pointerEvents={isFullscreen ? 'auto' : 'none'}
                style={[StyleSheet.absoluteFillObject, styles.backdrop, { opacity: backdropOpacity }]}
            />

            <Animated.View
                pointerEvents="box-none"
                style={[
                    styles.shell,
                    {
                        top: shellTop,
                        left: shellLeft,
                        width: shellWidth,
                        height: shellHeight,
                        borderRadius: shellRadius,
                    },
                ]}
            >
                <Animated.View
                    pointerEvents={isFullscreen ? 'auto' : 'none'}
                    style={[styles.expandedLayer, { opacity: expandedOpacity }]}
                >
                    <ActiveWorkoutHeader
                        onCollapse={minimize}
                        onFinish={handleFinish}
                        collapsePanHandlers={collapsePanResponder.panHandlers}
                    />
                    <ActiveWorkoutStatsStrip elapsedSeconds={elapsedSeconds} volume={volume} sets={sets} />
                    <ScrollView
                        ref={scrollRef}
                        style={styles.scroll}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {workout.exercises.map((exercise) => (
                            <View
                                key={exercise.id}
                                onLayout={(event) => {
                                    exerciseOffsetsRef.current[exercise.id] = event.nativeEvent.layout.y;
                                }}
                            >
                                <ExerciseCard
                                    exercise={exercise}
                                    supersetColorIndex={
                                        exercise.supersetId
                                            ? supersetColorMap.get(exercise.supersetId)
                                            : undefined
                                    }
                                    showRpe={state.settings.showRpeColumn}
                                    onUpdateNote={(note) => updateExerciseNote(exercise.id, note)}
                                    onUpdateRestSeconds={(restSeconds) =>
                                        updateRestSeconds(exercise.id, restSeconds)
                                    }
                                    onAddSet={() => addSet(exercise.id)}
                                    onUpdateSet={(setId, patch) => updateSet(exercise.id, setId, patch)}
                                    onToggleSetComplete={(setId) => toggleSetComplete(exercise.id, setId)}
                                    onApplyPreviousSet={(setId) => applyPreviousSet(exercise.id, setId)}
                                    onChangeSetType={(setId, type) => changeSetType(exercise.id, setId, type)}
                                    onRemoveSet={(setId) => removeSet(exercise.id, setId)}
                                    onRemoveExercise={() => removeExercise(exercise.id)}
                                    onAddWarmupSets={() => {
                                        addSet(exercise.id);
                                        const latest = exercise.sets[exercise.sets.length - 1];
                                        if (latest) {
                                            changeSetType(exercise.id, latest.id, 'warmup');
                                        }
                                    }}
                                    onAddToSuperset={() => addToSuperset([exercise.id])}
                                />
                            </View>
                        ))}
                    </ScrollView>

                    {isRunning ? (
                        <RestTimerBar
                            remainingSeconds={remainingSeconds}
                            progress={progress}
                            onAdjust={adjustRestTimer}
                            onSkip={skipRestTimer}
                        />
                    ) : null}

                    <ActiveWorkoutBottomActions onAddExercises={onAddExercises} />
                </Animated.View>

                <Animated.View
                    pointerEvents={isFullscreen ? 'none' : 'auto'}
                    style={[styles.miniLayer, { opacity: miniOpacity }]}
                >
                    <ActiveWorkoutMiniBar
                        elapsedSeconds={elapsedSeconds}
                        exerciseName={currentExercise?.name ?? 'no exercise'}
                        completedSets={currentProgress.completed}
                        totalSets={currentProgress.total}
                        restRemainingSeconds={remainingSeconds}
                        restProgress={progress}
                        restActive={isRunning}
                        onExpand={expand}
                        onSkipRest={skipRestTimer}
                    />
                </Animated.View>
            </Animated.View>

            {isFullscreen ? (
                <LinearGradient
                    pointerEvents="none"
                    colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)']}
                    style={styles.bottomFade}
                />
            ) : null}
        </>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        backgroundColor: WORKOUT_COLORS.backdrop,
        zIndex: 0,
    },
    shell: {
        position: 'absolute',
        backgroundColor: WORKOUT_COLORS.background,
        borderWidth: 2.5,
        borderColor: WORKOUT_COLORS.border,
        overflow: 'hidden',
        zIndex: 10,
        shadowColor: '#000',
        shadowOpacity: 0.14,
        shadowRadius: 11,
        shadowOffset: { width: 0, height: 6 },
        elevation: 9,
    },
    expandedLayer: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 8,
        paddingBottom: 24,
    },
    miniLayer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
    },
    bottomFade: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 40,
        zIndex: 11,
    },
});
