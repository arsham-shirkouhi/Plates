import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';

interface EmptyWorkoutFooterProps {
    onPress: () => void;
}

export const EmptyWorkoutFooter: React.FC<EmptyWorkoutFooterProps> = ({ onPress }) => {
    return (
        <TouchableOpacity
            style={styles.footer}
            onPress={onPress}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Start an empty workout"
        >
            <Text style={styles.label}>start an empty workout</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    footer: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#D8D8D8',
        paddingVertical: 16,
        alignItems: 'center',
        backgroundColor: WORKOUT_COLORS.background,
    },
    label: {
        fontFamily: fonts.regular,
        fontSize: 15,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
    },
});
