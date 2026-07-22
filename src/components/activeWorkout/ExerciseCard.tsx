import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/fonts';
import { SUPERSET_COLORS, WORKOUT_COLORS } from '../../workout/constants';
import { WorkoutExercise } from '../../workout/types';
import { formatRestDuration } from '../../workout/workoutSelectors';
import { SetTableHeader } from './SetTableHeader';
import { SetRow } from './SetRow';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ExerciseCardProps {
    exercise: WorkoutExercise;
    supersetColorIndex?: number;
    showRpe?: boolean;
    onOpenExercise: () => void;
    onUpdateNote: (note: string) => void;
    onUpdateRestSeconds: (restSeconds: number) => void;
    onAddSet: () => void;
    onUpdateSet: (
        setId: string,
        patch: Partial<{ weight: string; reps: string; rpe: string }>
    ) => void;
    onToggleSetComplete: (setId: string) => void;
    onApplyPreviousSet: (setId: string) => void;
    onChangeSetType: (setId: string, type: WorkoutExercise['sets'][number]['type']) => void;
    onRemoveSet: (setId: string) => void;
    onRemoveExercise: () => void;
    onAddWarmupSets: () => void;
    onAddToSuperset: () => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
    exercise,
    supersetColorIndex = 0,
    showRpe = false,
    onOpenExercise,
    onUpdateNote,
    onUpdateRestSeconds,
    onAddSet,
    onUpdateSet,
    onToggleSetComplete,
    onApplyPreviousSet,
    onChangeSetType,
    onRemoveSet,
    onRemoveExercise,
    onAddWarmupSets,
    onAddToSuperset,
}) => {
    const [noteVisible, setNoteVisible] = useState(!!exercise.note);
    const railColor = exercise.supersetId
        ? SUPERSET_COLORS[supersetColorIndex % SUPERSET_COLORS.length]
        : undefined;

    const openMenu = () => {
        Alert.alert(exercise.name, undefined, [
            {
                text: 'Add Note',
                onPress: () => setNoteVisible(true),
            },
            { text: 'Add Warm-up Sets', onPress: onAddWarmupSets },
            { text: 'Add to Superset', onPress: onAddToSuperset },
            { text: 'Remove Exercise', style: 'destructive', onPress: onRemoveExercise },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const openRestPicker = () => {
        Alert.alert('Rest timer', 'Choose rest duration', [
            { text: 'Off', onPress: () => onUpdateRestSeconds(0) },
            { text: '1:00', onPress: () => onUpdateRestSeconds(60) },
            { text: '1:30', onPress: () => onUpdateRestSeconds(90) },
            { text: '2:00', onPress: () => onUpdateRestSeconds(120) },
            { text: '2:30', onPress: () => onUpdateRestSeconds(150) },
            { text: '3:00', onPress: () => onUpdateRestSeconds(180) },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const handleAddSet = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onAddSet();
    };

    return (
        <View style={[styles.card, railColor ? { borderLeftColor: railColor, borderLeftWidth: 4 } : null]}>
            <View style={styles.headerRow}>
                <TouchableOpacity style={styles.titleWrap} onPress={onOpenExercise}>
                    <View style={styles.thumbnail}>
                        <Ionicons name="barbell-outline" size={18} color={WORKOUT_COLORS.accent} />
                    </View>
                    <Text style={styles.title}>{exercise.name.toLowerCase()}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
                    <Ionicons name="ellipsis-horizontal" size={20} color={WORKOUT_COLORS.text} />
                </TouchableOpacity>
            </View>

            {noteVisible ? (
                <TextInput
                    style={styles.noteInput}
                    value={exercise.note}
                    onChangeText={onUpdateNote}
                    placeholder="add a note"
                    placeholderTextColor={WORKOUT_COLORS.placeholder}
                    multiline
                />
            ) : null}

            <TouchableOpacity style={styles.restChip} onPress={openRestPicker}>
                <Text style={styles.restChipText}>⏱ {formatRestDuration(exercise.restSeconds)}</Text>
            </TouchableOpacity>

            <SetTableHeader showRpe={showRpe} />
            {exercise.sets.map((set, index) => (
                <SetRow
                    key={set.id}
                    set={set}
                    index={index}
                    showRpe={showRpe}
                    onChange={(patch) => onUpdateSet(set.id, patch)}
                    onToggleComplete={() => onToggleSetComplete(set.id)}
                    onApplyPrevious={() => onApplyPreviousSet(set.id)}
                    onChangeType={(type) => onChangeSetType(set.id, type)}
                    onRemove={() => onRemoveSet(set.id)}
                />
            ))}

            <TouchableOpacity style={styles.addSetButton} onPress={handleAddSet}>
                <Text style={styles.addSetText}>+ add set</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#ECECEC',
        marginHorizontal: 16,
        marginBottom: 14,
        overflow: 'hidden',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 8,
    },
    titleWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    thumbnail: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#EEF1FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        flex: 1,
        fontFamily: fonts.bold,
        fontSize: 16,
        color: WORKOUT_COLORS.accent,
    },
    menuButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noteInput: {
        marginHorizontal: 14,
        marginBottom: 8,
        padding: 10,
        borderRadius: 12,
        backgroundColor: '#F7F7F7',
        fontFamily: fonts.regular,
        fontSize: 14,
        color: WORKOUT_COLORS.text,
        minHeight: 44,
    },
    restChip: {
        alignSelf: 'flex-start',
        marginHorizontal: 14,
        marginBottom: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#F3F4F6',
    },
    restChipText: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: WORKOUT_COLORS.text,
    },
    addSetButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    addSetText: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: WORKOUT_COLORS.muted,
    },
});
