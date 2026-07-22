import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import { MOCK_WORKOUT_TEMPLATES, MockWorkoutTemplate } from '../../workout/mockWorkoutData';

interface PreloadedWorkoutListProps {
    onSelect: (template: MockWorkoutTemplate) => void;
    title?: string;
}

export const PreloadedWorkoutList: React.FC<PreloadedWorkoutListProps> = ({
    onSelect,
    title = 'preloaded workouts',
}) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>use these while the database is unavailable</Text>
            <View style={styles.list}>
                {MOCK_WORKOUT_TEMPLATES.map((template) => (
                    <TouchableOpacity
                        key={template.id}
                        style={styles.card}
                        onPress={() => onSelect(template)}
                        activeOpacity={0.85}
                    >
                        <View style={styles.cardTop}>
                            <Text style={styles.cardTitle}>{template.title}</Text>
                            <Text style={styles.cardDuration}>{template.durationLabel}</Text>
                        </View>
                        <Text style={styles.cardDescription}>{template.description}</Text>
                        <Text style={styles.cardMeta}>
                            {template.exerciseCount} exercises · previous session data included
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: WORKOUT_COLORS.text,
        marginBottom: 4,
    },
    subtitle: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: WORKOUT_COLORS.muted,
        marginBottom: 12,
    },
    list: {
        gap: 10,
    },
    card: {
        borderWidth: 2.5,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: 10,
        padding: 14,
        backgroundColor: WORKOUT_COLORS.background,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    cardTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: WORKOUT_COLORS.text,
    },
    cardDuration: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: WORKOUT_COLORS.accent,
    },
    cardDescription: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: WORKOUT_COLORS.muted,
        marginBottom: 4,
    },
    cardMeta: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: WORKOUT_COLORS.placeholder,
    },
});
