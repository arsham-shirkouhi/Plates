import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile } from '../../services/userService';
import {
    deleteWorkoutPreset,
    duplicateWorkoutPreset,
    getWorkoutPresets,
    saveWorkoutPresetFromExercises,
} from '../../services/workoutHistoryService';
import { useMuscleRecency } from '../../hooks/useMuscleRecency';
import { MOCK_WORKOUT_TEMPLATES } from '../../workout/mockWorkoutData';
import { WORKOUT_COLORS } from '../../workout/constants';
import { MuscleGroup, MuscleRecencyMap } from '../../workout/muscleGroups';
import {
    DEFAULT_START_WORKOUT_FILTERS,
    routineFromMockTemplate,
    routineFromUserPreset,
    StartWorkoutFilters,
    StartWorkoutRoutine,
} from '../../workout/startWorkoutTypes';
import {
    estimateDurationLabel,
    filterStartWorkoutRoutines,
    pickSuggestedWorkout,
} from '../../workout/startWorkoutSelectors';
import { buildWorkoutExercisesFromExerciseTemplates } from '../../workout/mockWorkoutData';
import { StartWorkoutHeader } from './StartWorkoutHeader';
import { SuggestedWorkoutCard } from './SuggestedWorkoutCard';
import { BodyMap } from './BodyMap';
import { WorkoutFilterBar } from './WorkoutFilterBar';
import { RoutineList } from './RoutineList';
import { EmptyWorkoutFooter } from './EmptyWorkoutFooter';

interface StartWorkoutIdleViewProps {
    onStartEmpty: () => void;
    onStartRoutine: (routine: StartWorkoutRoutine) => void;
}

export const StartWorkoutIdleView: React.FC<StartWorkoutIdleViewProps> = ({
    onStartEmpty,
    onStartRoutine,
}) => {
    const { user } = useAuth();
    const { recency, hasHistory, refresh } = useMuscleRecency(user?.id);
    const [streak, setStreak] = useState(0);
    const [filters, setFilters] = useState<StartWorkoutFilters>(DEFAULT_START_WORKOUT_FILTERS);
    const [userRoutines, setUserRoutines] = useState<StartWorkoutRoutine[]>([]);

    const loadRoutines = useCallback(async () => {
        const presets = await getWorkoutPresets(user?.id);
        setUserRoutines(
            presets.map((preset) =>
                routineFromUserPreset(preset, estimateDurationLabel(preset.exercises.length))
            )
        );
    }, [user?.id]);

    useEffect(() => {
        void loadRoutines();
    }, [loadRoutines]);

    useEffect(() => {
        if (!user) return;
        getUserProfile(user)
            .then((profile) => setStreak(profile?.streak ?? 0))
            .catch(() => setStreak(0));
    }, [user]);

    const libraryPresets = useMemo(
        () => MOCK_WORKOUT_TEMPLATES.map((template) => routineFromMockTemplate(template)),
        []
    );

    const allRoutines = useMemo(
        () => [...userRoutines, ...libraryPresets],
        [userRoutines, libraryPresets]
    );

    const filteredRoutines = useMemo(
        () => filterStartWorkoutRoutines(allRoutines, filters),
        [allRoutines, filters]
    );

    const suggestion = useMemo(
        () => pickSuggestedWorkout(allRoutines, recency, hasHistory),
        [allRoutines, recency, hasHistory]
    );

    const handleToggleMuscle = (muscle: MuscleGroup) => {
        setFilters((current) => ({
            ...current,
            muscleGroup: current.muscleGroup === muscle ? null : muscle,
        }));
    };

    const handleStartSuggested = () => {
        if (!suggestion) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onStartRoutine(suggestion.routine);
    };

    const handlePreviewRoutine = (routine: StartWorkoutRoutine) => {
        const preview = routine.exercises
            .slice(0, 6)
            .map((exercise) => exercise.name)
            .join('\n');
        Alert.alert(routine.name, preview || 'no exercises yet');
    };

    const handleDuplicateRoutine = async (routine: StartWorkoutRoutine) => {
        if (routine.source === 'user') {
            const copy = await duplicateWorkoutPreset(routine.id, user?.id);
            if (copy) {
                await loadRoutines();
                await refresh();
            }
            return;
        }

        const copy = await saveWorkoutPresetFromExercises(
            `${routine.name} copy`,
            routine.exercises,
            user?.id
        );
        if (copy) {
            await loadRoutines();
        }
    };

    const handleDeleteRoutine = async (routine: StartWorkoutRoutine) => {
        if (routine.source !== 'user') return;
        await deleteWorkoutPreset(routine.id, user?.id);
        await loadRoutines();
        await refresh();
    };

    const handleCreateForMuscle = (muscle: MuscleGroup) => {
        onStartEmpty();
    };

    return (
        <View style={styles.root}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <StartWorkoutHeader streak={streak} />

                <SuggestedWorkoutCard
                    suggestion={suggestion}
                    recency={recency}
                    hasHistory={hasHistory}
                    onStart={handleStartSuggested}
                />

                <BodyMap
                    recency={recency}
                    selectedMuscle={filters.muscleGroup}
                    onToggleMuscle={handleToggleMuscle}
                />

                <WorkoutFilterBar filters={filters} onChange={setFilters} />

                <RoutineList
                    routines={filteredRoutines}
                    activeMuscle={filters.muscleGroup}
                    onStartRoutine={(routine) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onStartRoutine(routine);
                    }}
                    onPreviewRoutine={handlePreviewRoutine}
                    onDuplicateRoutine={handleDuplicateRoutine}
                    onDeleteRoutine={handleDeleteRoutine}
                    onCreateForMuscle={handleCreateForMuscle}
                />
            </ScrollView>

            <EmptyWorkoutFooter
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onStartEmpty();
                }}
            />
        </View>
    );
};

export function routineToPendingStart(routine: StartWorkoutRoutine) {
    if (routine.template) {
        return {
            title: routine.template.title,
            exercises: buildWorkoutExercisesFromExerciseTemplates(routine.exercises),
        };
    }

    return {
        title: routine.name,
        exercises: buildWorkoutExercisesFromExerciseTemplates(routine.exercises),
    };
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: WORKOUT_COLORS.background,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 16,
    },
});
