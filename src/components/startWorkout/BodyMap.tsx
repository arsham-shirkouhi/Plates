import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import {
    formatMuscleSelectionLine,
    MUSCLE_ACCENT_RAMP,
    MuscleGroup,
    MuscleRecencyMap,
} from '../../workout/muscleGroups';
import { BodyMapFront } from './BodyMapFront';
import { BodyMapBack } from './BodyMapBack';

interface BodyMapProps {
    recency: MuscleRecencyMap;
    selectedMuscle: MuscleGroup | null;
    onToggleMuscle: (muscle: MuscleGroup) => void;
}

type BodySide = 'front' | 'back';

export const BodyMap: React.FC<BodyMapProps> = ({ recency, selectedMuscle, onToggleMuscle }) => {
    const [side, setSide] = useState<BodySide>('front');

    return (
        <View style={styles.container}>
            <View style={styles.toggleRow}>
                <TouchableOpacity
                    style={[styles.togglePill, side === 'front' && styles.togglePillActive]}
                    onPress={() => setSide('front')}
                    accessibilityRole="button"
                    accessibilityState={{ selected: side === 'front' }}
                >
                    <Text style={[styles.toggleText, side === 'front' && styles.toggleTextActive]}>
                        front
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.togglePill, side === 'back' && styles.togglePillActive]}
                    onPress={() => setSide('back')}
                    accessibilityRole="button"
                    accessibilityState={{ selected: side === 'back' }}
                >
                    <Text style={[styles.toggleText, side === 'back' && styles.toggleTextActive]}>
                        back
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.figureWrap}>
                {side === 'front' ? (
                    <BodyMapFront
                        recency={recency}
                        selectedMuscle={selectedMuscle}
                        onToggleMuscle={onToggleMuscle}
                    />
                ) : (
                    <BodyMapBack
                        recency={recency}
                        selectedMuscle={selectedMuscle}
                        onToggleMuscle={onToggleMuscle}
                    />
                )}
            </View>

            <View style={styles.legendBlock}>
                <LinearGradient
                    colors={[MUSCLE_ACCENT_RAMP[0], MUSCLE_ACCENT_RAMP[4]]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.gradientBar}
                />
                <View style={styles.legendLabels}>
                    <Text style={styles.legendLabel}>trained</Text>
                    <Text style={styles.legendLabel}>overdue</Text>
                </View>
                {selectedMuscle ? (
                    <Text style={styles.selectionLine}>
                        {formatMuscleSelectionLine(selectedMuscle, recency[selectedMuscle])}
                    </Text>
                ) : null}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginBottom: 18,
    },
    toggleRow: {
        flexDirection: 'row',
        borderWidth: 2,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: 999,
        padding: 3,
        marginBottom: 12,
        backgroundColor: WORKOUT_COLORS.background,
    },
    togglePill: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 999,
    },
    togglePillActive: {
        backgroundColor: WORKOUT_COLORS.text,
    },
    toggleText: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    toggleTextActive: {
        fontFamily: fonts.bold,
        color: WORKOUT_COLORS.background,
    },
    figureWrap: {
        alignItems: 'center',
    },
    legendBlock: {
        width: '100%',
        marginTop: 12,
    },
    gradientBar: {
        height: 4,
        borderRadius: 2,
        width: '100%',
    },
    legendLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    legendLabel: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: WORKOUT_COLORS.placeholder,
        textTransform: 'lowercase',
    },
    selectionLine: {
        marginTop: 8,
        fontFamily: fonts.regular,
        fontSize: 13,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
        textAlign: 'center',
    },
});
