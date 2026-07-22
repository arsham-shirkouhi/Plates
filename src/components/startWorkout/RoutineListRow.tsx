import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import { StartWorkoutRoutine } from '../../workout/startWorkoutTypes';
import { formatRoutineSubtitle } from '../../workout/startWorkoutSelectors';

interface RoutineListRowProps {
    routine: StartWorkoutRoutine;
    onPress: () => void;
    onPreview?: () => void;
    onEdit?: () => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
    isLast?: boolean;
}

export const RoutineListRow: React.FC<RoutineListRowProps> = ({
    routine,
    onPress,
    onPreview,
    onEdit,
    onDuplicate,
    onDelete,
    isLast = false,
}) => {
    const handleLongPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const options: { text: string; onPress?: () => void; style?: 'destructive' | 'cancel' }[] = [
            { text: 'preview', onPress: onPreview },
        ];

        if (routine.source === 'user') {
            options.push({ text: 'edit', onPress: onEdit });
            options.push({ text: 'duplicate', onPress: onDuplicate });
            options.push({ text: 'delete', onPress: onDelete, style: 'destructive' });
        } else {
            options.push({ text: 'duplicate', onPress: onDuplicate });
        }

        options.push({ text: 'cancel', style: 'cancel' });

        Alert.alert(routine.name, undefined, options);
    };

    return (
        <TouchableOpacity
            style={[styles.row, !isLast && styles.rowBorder]}
            onPress={onPress}
            onLongPress={handleLongPress}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Start ${routine.name}`}
            accessibilityHint="Long press for more options"
        >
            <View style={styles.copy}>
                <Text style={styles.title}>{routine.name}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                    {formatRoutineSubtitle(routine)}
                </Text>
            </View>
            <Ionicons name="play" size={18} color={WORKOUT_COLORS.accent} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        backgroundColor: WORKOUT_COLORS.background,
    },
    rowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E0E0E0',
    },
    copy: {
        flex: 1,
        marginRight: 12,
        minWidth: 0,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
        marginBottom: 2,
    },
    subtitle: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: WORKOUT_COLORS.placeholder,
        textTransform: 'lowercase',
    },
});
