import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { assembleWorkoutFromMuscleGroups } from '../../services/workoutAssemblyService';
import { PICK_WORKOUT_LAYOUT, WORKOUT_COLORS } from '../../workout/constants';
import { MuscleGroup } from '../../workout/muscleGroups';
import { StartWorkoutRoutine } from '../../workout/startWorkoutTypes';
import { WorkoutExercise } from '../../workout/types';
import { BODY_MAP_VIEWBOX } from '../startWorkout/bodyMapPaths';
import { SelectableBodyMapFront } from '../muscleSelect/SelectableBodyMapFront';
import { SelectableBodyMapBack } from '../muscleSelect/SelectableBodyMapBack';
import { MuscleNamePicker, MuscleNamePickerTrigger } from '../muscleSelect/MuscleNamePicker';
import { PickWorkoutTopBar } from './PickWorkoutTopBar';
import { PickWorkoutBottomBar } from './PickWorkoutBottomBar';
import { PickWorkoutSelectedList } from './PickWorkoutSelectedList';

type BodySide = 'front' | 'back';

const SELECTION_PANEL_WIDTH = 104;
/** Extra px the figure slides past the right edge when muscles are selected. */
const BODY_RIGHT_OFFSET = 32;

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
    onStartEmpty,
}) => {
    const { user } = useAuth();
    const { close: closeWorkoutOverlay } = useWorkoutOverlay();
    const insets = useSafeAreaInsets();
    const { recency } = useMuscleRecency(user?.id);

    const [side, setSide] = useState<BodySide>('front');
    const [renderSide, setRenderSide] = useState<BodySide>('front');
    const [selectedMuscles, setSelectedMuscles] = useState<MuscleGroup[]>([]);
    const [figureLayout, setFigureLayout] = useState({ width: 0, height: 0 });
    const [pickerVisible, setPickerVisible] = useState(false);
    const [isReviewLoading, setIsReviewLoading] = useState(false);
    const [selectionPanelVisible, setSelectionPanelVisible] = useState(false);

    const layoutAnim = useRef(new Animated.Value(0)).current;
    const bodyFadeAnim = useRef(new Animated.Value(1)).current;
    const bodySlideAnim = useRef(new Animated.Value(0)).current;
    const introAnim = useRef(new Animated.Value(0)).current;
    const introStartedRef = useRef(false);
    const flipDirection = useRef(1);
    const flipAnimating = useRef(false);

    const hasSelection = selectedMuscles.length > 0;

    const innerFigureWidth = Math.max(
        0,
        figureLayout.width - PICK_WORKOUT_LAYOUT.padding * 2
    );

    const fullScale =
        innerFigureWidth > 0 && figureLayout.height > 0
            ? Math.min(
                  innerFigureWidth / BODY_MAP_VIEWBOX.width,
                  figureLayout.height / BODY_MAP_VIEWBOX.height
              )
            : 0;

    const svgWidthFull = Math.max(0, BODY_MAP_VIEWBOX.width * fullScale);
    const svgHeightFull = Math.max(0, BODY_MAP_VIEWBOX.height * fullScale);
    // Body keeps its full size when selected — it only slides right, no shrink.

    const bodyStartLeft =
        innerFigureWidth > 0 && svgWidthFull > 0 ? (innerFigureWidth - svgWidthFull) / 2 : 0;
    const bodyEndLeft =
        innerFigureWidth > 0 && svgWidthFull > 0 ? innerFigureWidth - svgWidthFull : bodyStartLeft;

    const bodyTopOffset =
        figureLayout.height > 0 && svgHeightFull > 0
            ? Math.max(0, (figureLayout.height - svgHeightFull) / 2)
            : 0;

    const bodyReady = svgWidthFull > 0 && svgHeightFull > 0;

    // Drive left straight off the animated value so every selection toggle
    // re-runs the slide reliably (no listener → setState round-trip that could
    // go stale after a select/deselect cycle).
    const bodyLeft = layoutAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [
            PICK_WORKOUT_LAYOUT.padding + bodyStartLeft,
            PICK_WORKOUT_LAYOUT.padding + bodyEndLeft + BODY_RIGHT_OFFSET,
        ],
    });

    useEffect(() => {
        if (introStartedRef.current) return;
        if (!bodyReady) return;

        introStartedRef.current = true;
        Animated.timing(introAnim, {
            toValue: 1,
            duration: 340,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [bodyReady, introAnim]);

    useEffect(() => {
        if (hasSelection) {
            setSelectionPanelVisible(true);
        }

        Animated.timing(layoutAnim, {
            toValue: hasSelection ? 1 : 0,
            duration: 240,
            easing: Easing.out(Easing.cubic),
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
        Haptics.selectionAsync();
        setSelectedMuscles((current) =>
            current.includes(muscle)
                ? current.filter((item) => item !== muscle)
                : [...current, muscle]
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

    const handlePrimaryPress = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Body parts selected → go to the exercise-selection page for those
        // muscle groups (pulls saved/known exercises for each body part).
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

        // Nothing selected → jump straight into a blank workout.
        onStartEmpty();
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
                                    onRemoveMuscle={toggleMuscle}
                                />
                            ) : null}
                        </Animated.View>
                    ) : null}

                    {bodyReady ? (
                        <Animated.View
                            collapsable={false}
                            style={[
                                styles.mapFrame,
                                {
                                    left: bodyLeft,
                                    top: bodyTopOffset,
                                    width: svgWidthFull,
                                    height: svgHeightFull,
                                },
                            ]}
                        >
                            <Animated.View
                                style={{
                                    flex: 1,
                                    opacity: Animated.multiply(bodyFadeAnim, introAnim),
                                    transform: [
                                        { translateX: bodySlideAnim },
                                        {
                                            translateY: introAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [14, 0],
                                            }),
                                        },
                                    ],
                                }}
                            >
                                {renderSide === 'front' ? (
                                    <SelectableBodyMapFront
                                        recency={recency}
                                        selectedMuscles={selectedMuscles}
                                        onToggleMuscle={toggleMuscle}
                                        width={svgWidthFull}
                                        height={svgHeightFull}
                                    />
                                ) : (
                                    <SelectableBodyMapBack
                                        recency={recency}
                                        selectedMuscles={selectedMuscles}
                                        onToggleMuscle={toggleMuscle}
                                        width={svgWidthFull}
                                        height={svgHeightFull}
                                    />
                                )}
                            </Animated.View>
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
                    onPrimaryPress={handlePrimaryPress}
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
