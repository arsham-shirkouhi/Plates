import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    Dimensions,
    ScrollView,
    PanResponder,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, {
    Easing,
    Extrapolation,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
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
import { EmptyExerciseState } from './EmptyExerciseState';
import { Confetti, ConfettiParticle } from '../Confetti';

const CONFETTI_COLORS = ['#526EFF', '#F9C117', '#FF5151', '#2ED573', '#B06BFF', '#FF8A3D'];

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
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
        removeExercise,
        addToSuperset,
        startRestTimer,
        setDefaultRestSeconds,
        adjustRestTimer,
        skipRestTimer,
        clearScrollTarget,
        dispatch,
    } = useActiveWorkout();

    const workout = state.workout;
    const [expandTarget, setExpandTarget] = useState<{ id: string; nonce: number } | null>(null);
    const presentation = state.presentation;
    const isFullscreen = presentation === 'fullscreen';
    const screenHeight = SCREEN_HEIGHT;
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

    const [bottomActionsHeight, setBottomActionsHeight] = useState(0);
    const [scrollViewportH, setScrollViewportH] = useState(0);
    const [scrollContentH, setScrollContentH] = useState(0);
    const [celebration, setCelebration] = useState<ConfettiParticle[]>([]);
    const expandProgress = useSharedValue(isFullscreen ? 1 : 0);

    const handleCompletedAllSets = useCallback(
        (exerciseId: string) => {
            const list = workout?.exercises ?? [];
            const index = list.findIndex((exercise) => exercise.id === exerciseId);
            const next = list[index + 1];
            if (!next) return;
            setExpandTarget((current) => ({
                id: next.id,
                nonce: (current?.nonce ?? 0) + 1,
            }));
        },
        [workout?.exercises]
    );

    const celebrateAtPoint = useCallback((origin: { x: number; y: number }) => {
        const burst: ConfettiParticle[] = Array.from({ length: 18 }, (_, i) => ({
            id: Date.now() + i,
            originX: origin.x + (Math.random() - 0.5) * 34,
            originY: origin.y,
            angle: -30 - Math.random() * 120,
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        }));
        setCelebration(burst);
        setTimeout(() => setCelebration([]), 900);
    }, []);
    const scrollRef = useRef<ScrollView>(null);
    const exerciseOffsetsRef = useRef<Record<string, number>>({});
    const isFullscreenRef = useRef(isFullscreen);
    isFullscreenRef.current = isFullscreen;

    const elapsedSeconds = useWorkoutTimer(workout?.startedAt);
    const [restCelebrateAt, setRestCelebrateAt] = useState(0);
    const handleRestComplete = useCallback(() => {
        setRestCelebrateAt(Date.now());
        dispatch({ type: 'CLEAR_REST_TIMER' });
    }, [dispatch]);
    const { remainingSeconds, progress, isRunning } = useRestTimer({
        restTimer: state.restTimer,
        onComplete: handleRestComplete,
    });

    useEffect(() => {
        expandProgress.value = withTiming(isFullscreen ? 1 : 0, {
            duration: 180,
            easing: Easing.out(Easing.cubic),
        });
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

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: interpolate(expandProgress.value, [0, 0.15, 1], [0, 1, 1], Extrapolation.CLAMP),
    }));
    const shellStyle = useAnimatedStyle(() => ({
        top: interpolate(expandProgress.value, [0, 1], [minimizedShellTop, sheetPaddingTop]),
        left: interpolate(expandProgress.value, [0, 1], [widgetBarLeft, expandedCardLeft]),
        width: interpolate(expandProgress.value, [0, 1], [widgetBarWidth, expandedCardWidth]),
        height: interpolate(expandProgress.value, [0, 1], [MINI_BAR_HEIGHT, expandedSheetHeight]),
        borderRadius: interpolate(expandProgress.value, [0, 1], [MINI_CORNER_RADIUS, SHELL_CORNER_RADIUS]),
    }));
    const expandedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(expandProgress.value, [0, 0.22, 1], [0, 1, 1], Extrapolation.CLAMP),
    }));
    const miniStyle = useAnimatedStyle(() => ({
        opacity: interpolate(expandProgress.value, [0, 0.3, 1], [1, 0, 0], Extrapolation.CLAMP),
    }));
    const bottomFadeStyle = useAnimatedStyle(() => ({
        opacity: interpolate(expandProgress.value, [0, 0.35, 1], [1, 0, 0], Extrapolation.CLAMP),
    }));

    if (!workout) return null;

    const volume = getCompletedVolume(workout, state.settings);
    const sets = getCompletedSetCount(workout, state.settings);
    const currentExercise = getCurrentExercise(workout);
    const currentProgress = currentExercise
        ? getExerciseSetProgress(currentExercise)
        : { completed: 0, total: 0 };

    const supersetColorMap = new Map<string, number>();
    let supersetCounter = 0;
    workout.exercises.forEach((exercise) => {
        if (exercise.supersetId && !supersetColorMap.has(exercise.supersetId)) {
            supersetColorMap.set(exercise.supersetId, supersetCounter++);
        }
    });

    const isEmptyList = workout.exercises.length === 0;
    const canScroll = !isEmptyList && scrollContentH > scrollViewportH + 1;

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

    const handleStartRest = () => {
        const started = startRestTimer();
        if (!started) {
            handlePickRestDuration();
        }
    };

    const handlePickRestDuration = () => {
        Alert.alert('Rest timer', 'Choose rest duration for this workout', [
            { text: 'Off', onPress: () => setDefaultRestSeconds(0) },
            { text: '1:00', onPress: () => applyRestDuration(60) },
            { text: '1:30', onPress: () => applyRestDuration(90) },
            { text: '2:00', onPress: () => applyRestDuration(120) },
            { text: '2:30', onPress: () => applyRestDuration(150) },
            { text: '3:00', onPress: () => applyRestDuration(180) },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const applyRestDuration = (restSeconds: number) => {
        setDefaultRestSeconds(restSeconds);
        startRestTimer(restSeconds);
    };

    return (
        <View style={styles.host} pointerEvents="box-none" collapsable={false}>
            <Reanimated.View
                pointerEvents={isFullscreen ? 'auto' : 'none'}
                style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
            />

            <Reanimated.View
                pointerEvents="box-none"
                style={[styles.shell, shellStyle]}
            >
                <Reanimated.View
                    pointerEvents={isFullscreen ? 'auto' : 'none'}
                    style={[styles.expandedLayer, expandedStyle]}
                >
                    <ActiveWorkoutHeader
                        title={workout.title}
                        onCollapse={minimize}
                        onFinish={handleFinish}
                        collapsePanHandlers={collapsePanResponder.panHandlers}
                    />
                    <ActiveWorkoutStatsStrip elapsedSeconds={elapsedSeconds} volume={volume} sets={sets} />
                    {isEmptyList ? (
                        <View style={[styles.scroll, styles.emptyList]}>
                            <EmptyExerciseState onAddPress={onAddExercises} />
                        </View>
                    ) : (
                        <ScrollView
                            ref={scrollRef}
                            style={styles.scroll}
                            contentContainerStyle={styles.scrollContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={canScroll}
                            bounces={canScroll}
                            alwaysBounceVertical={canScroll}
                            overScrollMode={canScroll ? 'auto' : 'never'}
                            onLayout={(event) => setScrollViewportH(event.nativeEvent.layout.height)}
                            onContentSizeChange={(_, height) => setScrollContentH(height)}
                        >
                            {workout.exercises.map((exercise, index) => (
                                <View
                                    key={exercise.id}
                                    onLayout={(event) => {
                                        exerciseOffsetsRef.current[exercise.id] = event.nativeEvent.layout.y;
                                    }}
                                >
                                    <ExerciseCard
                                        exercise={exercise}
                                        startCollapsed={index > 0}
                                        expandNonce={expandTarget?.id === exercise.id ? expandTarget.nonce : 0}
                                        onCompletedAllSets={() => handleCompletedAllSets(exercise.id)}
                                        supersetColorIndex={
                                            exercise.supersetId
                                                ? supersetColorMap.get(exercise.supersetId)
                                                : undefined
                                        }
                                        showRpe={state.settings.showRpeColumn}
                                        onUpdateNote={(note) => updateExerciseNote(exercise.id, note)}
                                        onAddSet={() => addSet(exercise.id)}
                                        onUpdateSet={(setId, patch) => updateSet(exercise.id, setId, patch)}
                                        onToggleSetComplete={(setId) =>
                                            toggleSetComplete(exercise.id, setId)
                                        }
                                        onApplyPreviousSet={(setId) => applyPreviousSet(exercise.id, setId)}
                                        onChangeSetType={(setId, type) =>
                                            changeSetType(exercise.id, setId, type)
                                        }
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
                    )}

                    <View
                        style={styles.bottomActionsLayer}
                        onLayout={(event) => setBottomActionsHeight(event.nativeEvent.layout.height)}
                    >
                        <ActiveWorkoutBottomActions
                            onAddExercises={onAddExercises}
                            showRest={!isEmptyList}
                            restActive={isRunning}
                            onRest={handleStartRest}
                            onPickRestDuration={handlePickRestDuration}
                        />
                    </View>
                </Reanimated.View>

                <Reanimated.View
                    pointerEvents={isFullscreen ? 'none' : 'auto'}
                    style={[styles.miniLayer, miniStyle]}
                >
                    <ActiveWorkoutMiniBar
                        elapsedSeconds={elapsedSeconds}
                        exerciseName={currentExercise?.name ?? 'no exercise'}
                        completedSets={currentProgress.completed}
                        totalSets={currentProgress.total}
                        restRemainingSeconds={remainingSeconds}
                        restActive={isRunning}
                        onExpand={expand}
                        onSkipRest={skipRestTimer}
                        onCelebrate={celebrateAtPoint}
                    />
                </Reanimated.View>
            </Reanimated.View>

            <View
                pointerEvents="box-none"
                style={[
                    styles.restTimerFloat,
                    {
                        left: expandedCardLeft,
                        width: expandedCardWidth,
                        bottom: sheetPaddingBottom + bottomActionsHeight,
                    },
                ]}
            >
                <RestTimerBar
                    visible={isFullscreen && isRunning}
                    remainingSeconds={remainingSeconds}
                    progress={progress}
                    celebrateAt={restCelebrateAt}
                    onAdjust={adjustRestTimer}
                    onSkip={skipRestTimer}
                />
            </View>

            {celebration.length > 0 ? (
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                    <Confetti particles={celebration} />
                </View>
            ) : null}

            <Reanimated.View
                pointerEvents="none"
                style={[
                    styles.bottomFade,
                    bottomFadeStyle,
                    { height: MINI_BAR_HEIGHT + widgetBottomInset + 48 },
                ]}
            >
                <LinearGradient
                    colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)']}
                    style={StyleSheet.absoluteFill}
                />
            </Reanimated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    host: {
        ...StyleSheet.absoluteFill,
    },
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
    restTimerFloat: {
        position: 'absolute',
        zIndex: 12,
        overflow: 'visible',
    },
    bottomActionsLayer: {
        zIndex: 2,
        backgroundColor: WORKOUT_COLORS.background,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 8,
        paddingBottom: 24,
    },
    emptyList: {
        justifyContent: 'center',
    },
    miniLayer: {
        ...StyleSheet.absoluteFill,
        justifyContent: 'center',
    },
    bottomFade: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
    },
});
