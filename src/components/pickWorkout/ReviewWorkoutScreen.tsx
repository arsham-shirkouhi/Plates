import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    TextInput,
    Modal,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { fonts } from '../../constants/fonts';
import { PICK_WORKOUT_LAYOUT, WORKOUT_COLORS } from '../../workout/constants';
import { MUSCLE_GROUP_LABELS, MuscleGroup, mapBodyPartToMuscleGroup } from '../../workout/muscleGroups';
import { WorkoutExercise } from '../../workout/types';
import { saveWorkoutPresetFromExercises } from '../../services/workoutHistoryService';
import { useAuth } from '../../context/AuthContext';
import { PendingReviewWorkout } from './PickWorkoutScreen';

interface ReviewWorkoutScreenProps {
    pending: PendingReviewWorkout;
    onBack: () => void;
    onStartWorkout: (payload: { title: string; exercises: WorkoutExercise[] }) => void;
}

function formatExerciseMeta(exercise: WorkoutExercise): string {
    const muscle =
        mapBodyPartToMuscleGroup(undefined, exercise.name) ??
        ('chest' as MuscleGroup);
    const setCount = exercise.sets.length;
    const reps = exercise.sets[0]?.targetReps ?? exercise.sets[0]?.previous?.reps ?? 8;
    return `${setCount} sets · ${reps} reps · ${MUSCLE_GROUP_LABELS[muscle]}`;
}

export const ReviewWorkoutScreen: React.FC<ReviewWorkoutScreenProps> = ({
    pending,
    onBack,
    onStartWorkout,
}) => {
    const { user } = useAuth();
    const [exercises, setExercises] = useState<WorkoutExercise[]>(pending.exercises);
    const [saveVisible, setSaveVisible] = useState(false);
    const [routineName, setRoutineName] = useState(pending.title);

    const removeExercise = useCallback((index: number) => {
        setExercises((current) => current.filter((_, i) => i !== index));
    }, []);

    const moveExercise = useCallback((index: number, direction: -1 | 1) => {
        setExercises((current) => {
            const next = [...current];
            const target = index + direction;
            if (target < 0 || target >= next.length) return current;
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    }, []);

    const handleStart = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onStartWorkout({ title: pending.title, exercises });
    };

    const handleSaveRoutine = async () => {
        const name = routineName.trim();
        if (!name) return;
        await saveWorkoutPresetFromExercises(
            name,
            exercises.map((exercise) => ({
                exerciseId: exercise.exerciseId,
                name: exercise.name,
                restSeconds: exercise.restSeconds ?? 120,
                sets: exercise.sets.map((set) => ({
                    type: set.type,
                    previous: set.previous,
                })),
            })),
            user?.id
        );
        setSaveVisible(false);
        Alert.alert('Saved', `${name} saved as a routine.`);
    };

    if (exercises.length === 0) {
        return (
            <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
                <ReviewHeader onBack={onBack} onSave={() => setSaveVisible(true)} />
                <View style={styles.emptyBody}>
                    <Text style={styles.emptyText}>no exercises left. go back and adjust your selection.</Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={onBack}>
                        <Text style={styles.primaryButtonText}>back to selection</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
            <ReviewHeader onBack={onBack} onSave={() => setSaveVisible(true)} />

            <View style={styles.chipRow}>
                {pending.selectedMuscles.map((muscle) => (
                    <View key={muscle} style={styles.chip}>
                        <Text style={styles.chipText}>{MUSCLE_GROUP_LABELS[muscle]}</Text>
                    </View>
                ))}
            </View>

            <FlatList
                data={exercises}
                keyExtractor={(item, index) => `${item.exerciseId}-${index}`}
                contentContainerStyle={styles.listContent}
                renderItem={({ item, index }) => (
                    <View style={styles.row}>
                        <View style={styles.rowMain}>
                            <Ionicons name="reorder-three" size={20} color={WORKOUT_COLORS.placeholder} />
                            <View style={styles.rowCopy}>
                                <Text style={styles.rowTitle}>{item.name.toLowerCase()}</Text>
                                <Text style={styles.rowMeta}>{formatExerciseMeta(item)}</Text>
                            </View>
                        </View>
                        <View style={styles.rowActions}>
                            <TouchableOpacity
                                onPress={() => moveExercise(index, -1)}
                                accessibilityRole="button"
                                accessibilityLabel={`Move ${item.name} up`}
                                style={styles.iconButton}
                            >
                                <Ionicons name="chevron-up" size={18} color={WORKOUT_COLORS.text} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => moveExercise(index, 1)}
                                accessibilityRole="button"
                                accessibilityLabel={`Move ${item.name} down`}
                                style={styles.iconButton}
                            >
                                <Ionicons name="chevron-down" size={18} color={WORKOUT_COLORS.text} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => removeExercise(index)}
                                accessibilityRole="button"
                                accessibilityLabel={`Remove ${item.name}`}
                                style={styles.iconButton}
                            >
                                <Ionicons name="close" size={18} color={WORKOUT_COLORS.text} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />

            <View style={styles.footer}>
                <TouchableOpacity style={styles.primaryButton} onPress={handleStart}>
                    <Text style={styles.primaryButtonText}>start workout</Text>
                </TouchableOpacity>
            </View>

            <Modal visible={saveVisible} transparent animationType="fade" onRequestClose={() => setSaveVisible(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setSaveVisible(false)} />
                <View style={styles.modalSheet}>
                    <Text style={styles.modalTitle}>save as routine</Text>
                    <TextInput
                        style={styles.modalInput}
                        value={routineName}
                        onChangeText={setRoutineName}
                        placeholder="routine name"
                        placeholderTextColor={WORKOUT_COLORS.placeholder}
                        autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.primaryButton} onPress={handleSaveRoutine}>
                        <Text style={styles.primaryButtonText}>save</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

function ReviewHeader({ onBack, onSave }: { onBack: () => void; onSave: () => void }) {
    return (
        <View style={styles.header}>
            <TouchableOpacity
                style={styles.headerSide}
                onPress={onBack}
                accessibilityRole="button"
                accessibilityLabel="Back to pick workout"
            >
                <Ionicons name="arrow-back" size={22} color={WORKOUT_COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>review</Text>
            <TouchableOpacity
                style={styles.headerSide}
                onPress={onSave}
                accessibilityRole="button"
                accessibilityLabel="Save as routine"
            >
                <Text style={styles.headerAction}>save as routine</Text>
            </TouchableOpacity>
        </View>
    );
}

const { padding, borderWidth, buttonRadius, touchTarget } = PICK_WORKOUT_LAYOUT;

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: WORKOUT_COLORS.background,
    },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: padding,
    },
    headerSide: {
        width: touchTarget + 40,
        height: touchTarget,
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontFamily: fonts.bold,
        fontSize: 16,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    headerAction: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: WORKOUT_COLORS.placeholder,
        textTransform: 'lowercase',
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingHorizontal: padding,
        paddingBottom: padding,
    },
    chip: {
        borderWidth,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: WORKOUT_COLORS.background,
    },
    chipText: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    listContent: {
        paddingHorizontal: padding,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: WORKOUT_COLORS.divider,
    },
    rowMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rowCopy: {
        flex: 1,
    },
    rowTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    rowMeta: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: WORKOUT_COLORS.placeholder,
        textTransform: 'lowercase',
        marginTop: 2,
    },
    rowActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        padding: padding,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: WORKOUT_COLORS.divider,
    },
    primaryButton: {
        height: 44,
        backgroundColor: WORKOUT_COLORS.accent,
        borderWidth,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: buttonRadius,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: WORKOUT_COLORS.background,
        textTransform: 'lowercase',
    },
    emptyBody: {
        flex: 1,
        padding: padding,
        justifyContent: 'center',
        gap: 16,
    },
    emptyText: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
        textAlign: 'center',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: WORKOUT_COLORS.backdrop,
    },
    modalSheet: {
        marginTop: 'auto',
        backgroundColor: WORKOUT_COLORS.background,
        padding: padding,
        borderTopWidth: borderWidth,
        borderColor: WORKOUT_COLORS.border,
        gap: 16,
    },
    modalTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    modalInput: {
        borderWidth,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: buttonRadius,
        paddingHorizontal: padding,
        paddingVertical: 10,
        fontFamily: fonts.regular,
        fontSize: 16,
        color: WORKOUT_COLORS.text,
        backgroundColor: WORKOUT_COLORS.surfaceSecondary,
    },
});
