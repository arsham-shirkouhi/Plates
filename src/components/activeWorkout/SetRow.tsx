import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { fonts } from '../../constants/fonts';
import { SET_TYPE_META, WORKOUT_COLORS } from '../../workout/constants';
import { WorkoutSet, WorkoutSetType } from '../../workout/types';
import { formatPreviousSet } from '../../workout/workoutSelectors';

interface SetRowProps {
    set: WorkoutSet;
    index: number;
    showRpe?: boolean;
    onChange: (patch: Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'rpe'>>) => void;
    onToggleComplete: () => void;
    onApplyPrevious: () => void;
    onChangeType: (type: WorkoutSetType) => void;
    onRemove: () => void;
}

export const SetRow: React.FC<SetRowProps> = ({
    set,
    index,
    showRpe = false,
    onChange,
    onToggleComplete,
    onApplyPrevious,
    onChangeType,
    onRemove,
}) => {
    const [weightDraft, setWeightDraft] = useState(set.weight);
    const [repsDraft, setRepsDraft] = useState(set.reps);
    const badge = SET_TYPE_META[set.type].badge;

    useEffect(() => {
        setWeightDraft(set.weight);
        setRepsDraft(set.reps);
    }, [set.weight, set.reps, set.id]);

    const openSetTypeMenu = () => {
        Alert.alert('Set type', undefined, [
            { text: 'Warm Up Set', onPress: () => onChangeType('warmup') },
            { text: 'Normal Set', onPress: () => onChangeType('normal') },
            { text: 'Failure Set', onPress: () => onChangeType('failure') },
            { text: 'Drop Set', onPress: () => onChangeType('drop') },
            { text: 'Remove Set', style: 'destructive', onPress: onRemove },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const handleToggleComplete = () => {
        if (!set.completed) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onToggleComplete();
    };

    return (
        <View style={[styles.row, set.completed && styles.completedRow]}>
            <TouchableOpacity style={styles.setCell} onPress={openSetTypeMenu}>
                {badge ? (
                    <View style={[styles.badge, { backgroundColor: SET_TYPE_META[set.type].color }]}>
                        <Text style={styles.badgeText}>{badge}</Text>
                    </View>
                ) : (
                    <Text style={styles.setIndex}>{index + 1}</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.previousCell} onPress={onApplyPrevious}>
                <Text style={styles.previousText}>{formatPreviousSet(set.previous)}</Text>
            </TouchableOpacity>

            <TextInput
                style={[styles.input, styles.inputCell]}
                value={weightDraft}
                onChangeText={(value) => {
                    setWeightDraft(value);
                    onChange({ weight: value });
                }}
                onBlur={() => {
                    if (!weightDraft && set.previous) {
                        const next = String(set.previous.weight);
                        setWeightDraft(next);
                        onChange({ weight: next });
                    }
                }}
                keyboardType="decimal-pad"
                placeholder={set.previous ? String(set.previous.weight) : '0'}
                placeholderTextColor={WORKOUT_COLORS.placeholder}
                editable={!set.completed}
            />

            <TextInput
                style={[styles.input, styles.inputCell]}
                value={repsDraft}
                onChangeText={(value) => {
                    setRepsDraft(value);
                    onChange({ reps: value });
                }}
                onBlur={() => {
                    if (!repsDraft && set.previous) {
                        const next = String(set.previous.reps);
                        setRepsDraft(next);
                        onChange({ reps: next });
                    }
                }}
                keyboardType="number-pad"
                placeholder={set.previous ? String(set.previous.reps) : '0'}
                placeholderTextColor={WORKOUT_COLORS.placeholder}
                editable={!set.completed}
            />

            {showRpe ? (
                <TextInput
                    style={[styles.input, styles.rpeCell]}
                    value={set.rpe ?? ''}
                    onChangeText={(value) => onChange({ rpe: value })}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={WORKOUT_COLORS.placeholder}
                />
            ) : null}

            <TouchableOpacity style={styles.checkCell} onPress={handleToggleComplete}>
                <Ionicons
                    name={set.completed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={set.completed ? WORKOUT_COLORS.accent : WORKOUT_COLORS.placeholder}
                />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    completedRow: {
        backgroundColor: WORKOUT_COLORS.completedRow,
    },
    setCell: {
        width: 34,
        alignItems: 'center',
    },
    setIndex: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: WORKOUT_COLORS.text,
    },
    badge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        fontFamily: fonts.bold,
        fontSize: 11,
        color: '#fff',
    },
    previousCell: {
        flex: 1.2,
        paddingRight: 6,
    },
    previousText: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: WORKOUT_COLORS.placeholder,
    },
    input: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: WORKOUT_COLORS.text,
        textAlign: 'center',
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#FAFAFA',
    },
    inputCell: {
        width: 52,
        marginHorizontal: 2,
    },
    rpeCell: {
        width: 40,
        marginHorizontal: 2,
    },
    checkCell: {
        width: 28,
        alignItems: 'center',
    },
});
