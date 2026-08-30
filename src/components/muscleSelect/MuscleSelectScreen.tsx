import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { useWorkoutOverlay } from '../../contexts/WorkoutOverlayContext';
import { useMuscleRecency } from '../../hooks/useMuscleRecency';
import { assembleWorkoutFromMuscleGroups, countExercisesForMuscleGroups } from '../../services/workoutAssemblyService';
import { getWorkoutPresets } from '../../services/workoutHistoryService';
import { WORKOUT_COLORS } from '../../workout/constants';
import { MuscleGroup } from '../../workout/muscleGroups';
import {
    formatOverduePrompt,
    getMostOverdueMuscle,
} from '../../workout/muscleSelectSelectors';
import { MOCK_WORKOUT_TEMPLATES } from '../../workout/mockWorkoutData';
import { pickSuggestedWorkout } from '../../workout/startWorkoutSelectors';
import {
    routineFromMockTemplate,
    routineFromUserPreset,
    StartWorkoutRoutine,
} from '../../workout/startWorkoutTypes';
import { estimateDurationLabel } from '../../workout/startWorkoutSelectors';
import { WorkoutExercise } from '../../workout/types';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';
import { ScrollingGridBackground } from '../ScrollingGridBackground';
import { BODY_MAP_VIEWBOX } from '../startWorkout/bodyMapPaths';
import { SelectableBodyMapFront } from './SelectableBodyMapFront';
import { SelectableBodyMapBack } from './SelectableBodyMapBack';
import { MuscleSelectTopBar } from './MuscleSelectTopBar';
import { MuscleSelectBottomBar } from './MuscleSelectBottomBar';
import { MuscleNamePicker, MuscleNamePickerTrigger } from './MuscleNamePicker';

type BodySide = 'front' | 'back';

interface MuscleSelectScreenProps {
    onStartWorkout: (payload: { title: string; exercises: WorkoutExercise[] }) => void;
    onStartRoutine: (routine: StartWorkoutRoutine) => void;
    onStartEmpty: () => void;
}

export const MuscleSelectScreen: React.FC<MuscleSelectScreenProps> = ({
    onStartWorkout,
    onStartRoutine,
    onStartEmpty,
}) => {
    const { user } = useAuth();
    const { close: closeWorkoutOverlay } = useWorkoutOverlay();
    const { recency, hasHistory } = useMuscleRecency(user?.id);

    const [side, setSide] = useState<BodySide>('front');
    const [selectedMuscles, setSelectedMuscles] = useState<MuscleGroup[]>([]);
    const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
    const [exerciseCount, setExerciseCount] = useState<number | null>(null);
    const [isCountLoading, setIsCountLoading] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [userRoutines, setUserRoutines] = useState<StartWorkoutRoutine[]>([]);

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

    const suggestion = useMemo(
        () => pickSuggestedWorkout(allRoutines, recency, hasHistory),
        [allRoutines, recency, hasHistory]
    );

    const overdueMuscle = useMemo(() => getMostOverdueMuscle(recency), [recency]);
    const overdueLine = useMemo(() => {
        if (!overdueMuscle) return 'select muscles to build a workout.';
        return formatOverduePrompt(overdueMuscle, recency[overdueMuscle]);
    }, [overdueMuscle, recency]);

    useEffect(() => {
        if (selectedMuscles.length === 0) {
            setExerciseCount(null);
            return;
        }

        let cancelled = false;
        setIsCountLoading(true);
        countExercisesForMuscleGroups(selectedMuscles, user?.id)
            .then((count) => {
                if (!cancelled) setExerciseCount(count);
            })
            .finally(() => {
                if (!cancelled) setIsCountLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [selectedMuscles, user?.id]);

    const toggleMuscle = useCallback((muscle: MuscleGroup) => {
        setSelectedMuscles((current) =>
            current.includes(muscle) ? current.filter((item) => item !== muscle) : [...current, muscle]
        );
    }, []);

    const flipSide = useCallback((nextSide: BodySide) => {
        setSide(nextSide);
    }, []);

    const handleMapLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setMapSize({ width, height });
    };

    const scale = Math.min(
        mapSize.width / BODY_MAP_VIEWBOX.width,
        mapSize.height / BODY_MAP_VIEWBOX.height
    );
    const svgWidth = BODY_MAP_VIEWBOX.width * scale;
    const svgHeight = BODY_MAP_VIEWBOX.height * scale;

    const handleStartWorkout = async () => {
        if (selectedMuscles.length === 0 || isStarting) return;
        setIsStarting(true);
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const assembled = await assembleWorkoutFromMuscleGroups(selectedMuscles, user?.id);
            onStartWorkout(assembled);
        } finally {
            setIsStarting(false);
        }
    };

    const handlePresets = () => {
        closeWorkoutOverlay();
        if (rootNavigationRef.isReady()) {
            rootNavigationRef.navigate('BrowseWorkouts');
        }
    };

    return (
        <View style={styles.root}>
            <ScrollingGridBackground />
            <MuscleSelectTopBar
                side={side}
                onSideChange={flipSide}
                onClose={closeWorkoutOverlay}
            />

            <View style={styles.figureArea} onLayout={handleMapLayout}>
                {mapSize.width > 0 && mapSize.height > 0 ? (
                    <View style={{ width: svgWidth, height: svgHeight }}>
                        {side === 'front' ? (
                            <SelectableBodyMapFront
                                recency={recency}
                                selectedMuscles={selectedMuscles}
                                onToggleMuscle={toggleMuscle}
                                width={svgWidth}
                                height={svgHeight}
                            />
                        ) : (
                            <SelectableBodyMapBack
                                recency={recency}
                                selectedMuscles={selectedMuscles}
                                onToggleMuscle={toggleMuscle}
                                width={svgWidth}
                                height={svgHeight}
                            />
                        )}
                    </View>
                ) : null}
            </View>

            <MuscleNamePickerTrigger onPress={() => setPickerVisible(true)} />

            <MuscleSelectBottomBar
                selectedMuscles={selectedMuscles}
                exerciseCount={exerciseCount}
                isCountLoading={isCountLoading}
                overdueLine={overdueLine}
                suggestedRoutine={suggestion?.routine ?? null}
                onStartWorkout={handleStartWorkout}
                onStartSuggested={() => {
                    if (!suggestion) return;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onStartRoutine(suggestion.routine);
                }}
                onPresets={handlePresets}
                onEmptyWorkout={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onStartEmpty();
                }}
                onRemoveMuscle={toggleMuscle}
                isStarting={isStarting}
            />

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

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: WORKOUT_COLORS.background,
    },
    figureArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
});
