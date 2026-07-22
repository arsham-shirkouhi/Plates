import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    LayoutChangeEvent,
    Animated,
    Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { useWorkoutOverlay } from '../../contexts/WorkoutOverlayContext';
import { useMuscleRecency } from '../../hooks/useMuscleRecency';
import {
    assembleWorkoutFromMuscleGroups,
    countExercisesForMuscleGroups,
} from '../../services/workoutAssemblyService';
import { getWorkoutPresets } from '../../services/workoutHistoryService';
import { PICK_WORKOUT_LAYOUT, WORKOUT_COLORS } from '../../workout/constants';
import { MuscleGroup } from '../../workout/muscleGroups';
import { MOCK_WORKOUT_TEMPLATES } from '../../workout/mockWorkoutData';
import { estimateDurationLabel, pickSuggestedWorkout } from '../../workout/startWorkoutSelectors';
import {
    routineFromMockTemplate,
    routineFromUserPreset,
    StartWorkoutRoutine,
} from '../../workout/startWorkoutTypes';
import { WorkoutExercise } from '../../workout/types';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';
import { BODY_MAP_VIEWBOX } from '../startWorkout/bodyMapPaths';
import { SelectableBodyMapFront } from '../muscleSelect/SelectableBodyMapFront';
import { SelectableBodyMapBack } from '../muscleSelect/SelectableBodyMapBack';
import { MuscleNamePicker, MuscleNamePickerTrigger } from '../muscleSelect/MuscleNamePicker';
import { PickWorkoutTopBar } from './PickWorkoutTopBar';
import { PickWorkoutBottomBar } from './PickWorkoutBottomBar';
import { PickWorkoutSelectedList } from './PickWorkoutSelectedList';

type BodySide = 'front' | 'back';

const SELECTION_PANEL_WIDTH = 136;

export interface PendingReviewWorkout {
    selectedMuscles: MuscleGroup[];
    title: string;
    exercises: WorkoutExercise[];
}

interface PickWorkoutScreenProps {
    onReviewWorkout: (pending: PendingReviewWorkout) => void;
    onStartRoutine: (routine: StartWorkoutRoutine) => void;
    onStartEmpty: () => void;
}

export const PickWorkoutScreen: React.FC<PickWorkoutScreenProps> = ({
    onReviewWorkout,
    onStartRoutine,
    onStartEmpty,
}) => {
    const { user } = useAuth();
    const { close: closeWorkoutOverlay } = useWorkoutOverlay();
    const insets = useSafeAreaInsets();
    const { recency, hasHistory } = useMuscleRecency(user?.id);

    const [side, setSide] = useState<BodySide>('front');
    const [renderSide, setRenderSide] = useState<BodySide>('front');
    const [selectedMuscles, setSelectedMuscles] = useState<MuscleGroup[]>([]);
    const [figureLayout, setFigureLayout] = useState({ width: 0, height: 0 });
    const [bodyLayout, setBodyLayout] = useState({ left: 0, top: 0, width: 0, height: 0 });
    const [exerciseCount, setExerciseCount] = useState(0);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [userRoutines, setUserRoutines] = useState<StartWorkoutRoutine[]>([]);
    const [isReviewLoading, setIsReviewLoading] = useState(false);
    const [selectionPanelVisible, setSelectionPanelVisible] = useState(false);

    const layoutAnim = useRef(new Animated.Value(0)).current;
    const bodyFadeAnim = useRef(new Animated.Value(1)).current;
    const bodySlideAnim = useRef(new Animated.Value(0)).current;
    const flipDirection = useRef(1);
    const flipAnimating = useRef(false);

    const hasSelection = selectedMuscles.length > 0;

    const innerFigureWidth = Math.max(
        0,
        figureLayout.width - PICK_WORKOUT_LAYOUT.padding * 2
    );

    const splitMapSlotWidth = Math.max(
        0,
        innerFigureWidth - SELECTION_PANEL_WIDTH - PICK_WORKOUT_LAYOUT.itemGap
    );

    const fullScale =
        innerFigureWidth > 0 && figureLayout.height > 0
            ? Math.min(
                  innerFigureWidth / BODY_MAP_VIEWBOX.width,
                  figureLayout.height / BODY_MAP_VIEWBOX.height
              )
            : 0;

    const splitScale =
        splitMapSlotWidth > 0 && figureLayout.height > 0
            ? Math.min(
                  splitMapSlotWidth / BODY_MAP_VIEWBOX.width,
                  figureLayout.height / BODY_MAP_VIEWBOX.height
              )
            : 0;

    const svgWidthFull = Math.max(0, BODY_MAP_VIEWBOX.width * fullScale);
    const svgHeightFull = Math.max(0, BODY_MAP_VIEWBOX.height * fullScale);
    const svgWidthSplit = Math.max(0, BODY_MAP_VIEWBOX.width * splitScale);
    const svgHeightSplit = Math.max(0, BODY_MAP_VIEWBOX.height * splitScale);

    const bodyStartLeft =
        innerFigureWidth > 0 && svgWidthFull > 0 ? (innerFigureWidth - svgWidthFull) / 2 : 0;
    const bodyEndLeft =
        innerFigureWidth > 0 && svgWidthSplit > 0 ? innerFigureWidth - svgWidthSplit : bodyStartLeft;

    const bodyStartTop =
        figureLayout.height > 0 && svgHeightFull > 0
            ? Math.max(0, (figureLayout.height - svgHeightFull) / 2)
            : 0;
    const bodyEndTop =
        figureLayout.height > 0 && svgHeightSplit > 0
            ? Math.max(0, (figureLayout.height - svgHeightSplit) / 2)
            : bodyStartTop;

    const syncBodyLayout = useCallback(
        (progress: number) => {
            if (svgWidthFull <= 0 || svgHeightFull <= 0) return;

            setBodyLayout({
                left: PICK_WORKOUT_LAYOUT.padding + bodyStartLeft + (bodyEndLeft - bodyStartLeft) * progress,
                top: bodyStartTop + (bodyEndTop - bodyStartTop) * progress,
                width: svgWidthFull + (svgWidthSplit - svgWidthFull) * progress,
                height: svgHeightFull + (svgHeightSplit - svgHeightFull) * progress,
            });
        },
        [
            bodyEndLeft,
            bodyEndTop,
            bodyStartLeft,
            bodyStartTop,
            svgHeightFull,
            svgHeightSplit,
            svgWidthFull,
            svgWidthSplit,
        ]
    );

    useEffect(() => {
        if (svgWidthFull <= 0 || svgHeightFull <= 0) return;

        const listenerId = layoutAnim.addListener(({ value }) => {
            syncBodyLayout(value);
        });

        layoutAnim.stopAnimation((value) => {
            syncBodyLayout(value);
        });

        return () => {
            layoutAnim.removeListener(listenerId);
        };
    }, [layoutAnim, svgWidthFull, svgHeightFull, syncBodyLayout]);

    useEffect(() => {
        getWorkoutPresets(user?.id).then((presets) => {
            setUserRoutines(
                presets.map((preset) =>
                    routineFromUserPreset(preset, estimateDurationLabel(preset.exercises.length))
                )
            );
        });
    }, [user?.id]);

    const allRoutines = useMemo(
        () => [
            ...userRoutines,
            ...MOCK_WORKOUT_TEMPLATES.map((template) => routineFromMockTemplate(template)),
        ],
        [userRoutines]
    );

    const hasUserRoutines = userRoutines.length > 0;

    const suggestion = useMemo(
        () => pickSuggestedWorkout(allRoutines, recency, hasHistory),
        [allRoutines, recency, hasHistory]
    );

    useEffect(() => {
        if (selectedMuscles.length === 0) {
            setExerciseCount(0);
            return;
        }

        let cancelled = false;
        countExercisesForMuscleGroups(selectedMuscles, user?.id).then((count) => {
            if (!cancelled) setExerciseCount(count);
        });

        return () => {
            cancelled = true;
        };
    }, [selectedMuscles, user?.id]);

    useEffect(() => {
        if (hasSelection) {
            setSelectionPanelVisible(true);
        }

        Animated.spring(layoutAnim, {
            toValue: hasSelection ? 1 : 0,
            friction: 20,
            tension: 42,
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (finished && !hasSelection) {
                setSelectionPanelVisible(false);
            }
        });
    }, [hasSelection, layoutAnim]);

    const panelWidth = layoutAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, SELECTION_PANEL_WIDTH],
    });

    const panelOpacity = layoutAnim.interpolate({
        inputRange: [0, 0.15, 1],
        outputRange: [0, 1, 1],
    });

    const toggleMuscle = useCallback((muscle: MuscleGroup) => {
        setSelectedMuscles((current) =>
            current.includes(muscle) ? current.filter((item) => item !== muscle) : [...current, muscle]
        );
    }, []);

    const handleSideChange = useCallback(
        (nextSide: BodySide) => {
            if (nextSide === side || flipAnimating.current) return;

            flipAnimating.current = true;
            flipDirection.current = nextSide === 'back' ? 1 : -1;
            setSide(nextSide);

            Animated.parallel([
                Animated.timing(bodyFadeAnim, {
                    toValue: 0,
                    duration: 140,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(bodySlideAnim, {
                    toValue: flipDirection.current * 14,
                    duration: 140,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ]).start(({ finished }) => {
                if (!finished) {
                    bodyFadeAnim.setValue(1);
                    bodySlideAnim.setValue(0);
                    flipAnimating.current = false;
                    return;
                }

                setRenderSide(nextSide);
                bodySlideAnim.setValue(flipDirection.current * -14);

                Animated.parallel([
                    Animated.timing(bodyFadeAnim, {
                        toValue: 1,
                        duration: 220,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                    Animated.spring(bodySlideAnim, {
                        toValue: 0,
                        friction: 10,
                        tension: 80,
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    flipAnimating.current = false;
                });
            });
        },
        [side, bodyFadeAnim, bodySlideAnim]
    );

    const handleFigureLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setFigureLayout({ width, height });
    };

    const openPresets = () => {
        closeWorkoutOverlay();
        if (rootNavigationRef.isReady()) {
            rootNavigationRef.navigate('BrowseWorkouts');
        }
    };

    const handlePrimaryPress = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (selectedMuscles.length > 0) {
            if (isReviewLoading) return;
            setIsReviewLoading(true);
            try {
                const assembled = await assembleWorkoutFromMuscleGroups(selectedMuscles, user?.id);
                onReviewWorkout({
                    selectedMuscles,
                    title: assembled.title,
                    exercises: assembled.exercises,
                });
            } finally {
                setIsReviewLoading(false);
            }
            return;
        }

        if (hasUserRoutines && suggestion) {
            onStartRoutine(suggestion.routine);
            return;
        }

        openPresets();
    };

    return (
        <View style={styles.screen}>
            <SafeAreaView style={styles.upper} edges={['top']}>
                <PickWorkoutTopBar
                    side={side}
                    onSideChange={handleSideChange}
                    onClose={closeWorkoutOverlay}
                />

                <View style={styles.figureArea} onLayout={handleFigureLayout}>
                    {selectionPanelVisible ? (
                        <Animated.View
                            style={[
                                styles.selectionColumn,
                                {
                                    width: panelWidth,
                                    opacity: panelOpacity,
                                },
                            ]}
                        >
                            {selectedMuscles.length > 0 ? (
                                <PickWorkoutSelectedList
                                    selectedMuscles={selectedMuscles}
                                    exerciseCount={exerciseCount}
                                    onRemoveMuscle={toggleMuscle}
                                />
                            ) : null}
                        </Animated.View>
                    ) : null}

                    {bodyLayout.width > 0 && bodyLayout.height > 0 ? (
                        <Animated.View
                            collapsable={false}
                            style={[
                                styles.mapFrame,
                                {
                                    left: bodyLayout.left,
                                    top: bodyLayout.top,
                                    width: bodyLayout.width,
                                    height: bodyLayout.height,
                                    opacity: bodyFadeAnim,
                                    transform: [{ translateX: bodySlideAnim }],
                                },
                            ]}
                        >
                            {renderSide === 'front' ? (
                                <SelectableBodyMapFront
                                    recency={recency}
                                    selectedMuscles={selectedMuscles}
                                    onToggleMuscle={toggleMuscle}
                                    width={bodyLayout.width}
                                    height={bodyLayout.height}
                                />
                            ) : (
                                <SelectableBodyMapBack
                                    recency={recency}
                                    selectedMuscles={selectedMuscles}
                                    onToggleMuscle={toggleMuscle}
                                    width={bodyLayout.width}
                                    height={bodyLayout.height}
                                />
                            )}
                        </Animated.View>
                    ) : null}
                </View>
            </SafeAreaView>

            <View style={[styles.bottomShell, { paddingBottom: insets.bottom }]}>
                {!hasSelection ? (
                    <MuscleNamePickerTrigger onPress={() => setPickerVisible(true)} />
                ) : null}

                <PickWorkoutBottomBar
                    selectedMuscles={selectedMuscles}
                    hasUserRoutines={hasUserRoutines}
                    suggestedRoutine={suggestion?.routine ?? null}
                    onPrimaryPress={handlePrimaryPress}
                    onPresets={openPresets}
                    onNewWorkout={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onStartEmpty();
                    }}
                />
            </View>

            <MuscleNamePicker
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                selectedMuscles={selectedMuscles}
                recency={recency}
                onToggleMuscle={toggleMuscle}
            />
        </View>
    );
};

/** iPhone SE fit: figure height = screen - safe - topBar - bottomArea */
export function estimatePickWorkoutFigureHeight(screenHeight: number, safeVertical = 0): number {
    return screenHeight - safeVertical - PICK_WORKOUT_LAYOUT.topBarHeight - PICK_WORKOUT_LAYOUT.bottomAreaHeight;
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: WORKOUT_COLORS.surfaceSecondary,
    },
    upper: {
        flex: 1,
        backgroundColor: WORKOUT_COLORS.background,
        minHeight: 0,
    },
    figureArea: {
        flex: 1,
        minHeight: 0,
        paddingHorizontal: PICK_WORKOUT_LAYOUT.padding,
        overflow: 'hidden',
    },
    selectionColumn: {
        position: 'absolute',
        left: PICK_WORKOUT_LAYOUT.padding,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        overflow: 'hidden',
        zIndex: 2,
    },
    mapFrame: {
        position: 'absolute',
        overflow: 'visible',
    },
    bottomShell: {
        backgroundColor: WORKOUT_COLORS.surfaceSecondary,
    },
});
