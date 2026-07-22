import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';

type BodySide = 'front' | 'back';

interface MuscleSelectTopBarProps {
    side: BodySide;
    onSideChange: (side: BodySide) => void;
    onClose: () => void;
}

export const MuscleSelectTopBar: React.FC<MuscleSelectTopBarProps> = ({
    side,
    onSideChange,
    onClose,
}) => {
    const insets = useSafeAreaInsets();

    const selectSide = (nextSide: BodySide) => {
        if (nextSide === side) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSideChange(nextSide);
    };

    return (
        <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
                style={styles.sideSlot}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close muscle select"
            >
                <Ionicons name="close" size={24} color={WORKOUT_COLORS.text} />
            </TouchableOpacity>

            <View style={styles.toggleRow} accessibilityRole="tablist">
                <TouchableOpacity
                    style={[styles.toggleSegment, side === 'front' && styles.toggleSegmentActive]}
                    onPress={() => selectSide('front')}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: side === 'front' }}
                >
                    <Text style={[styles.toggleText, side === 'front' && styles.toggleTextActive]}>
                        front
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleSegment, side === 'back' && styles.toggleSegmentActive]}
                    onPress={() => selectSide('back')}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: side === 'back' }}
                >
                    <Text style={[styles.toggleText, side === 'back' && styles.toggleTextActive]}>
                        back
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.sideSlot} />
        </View>
    );
};

const SIDE_SLOT = 44;

const styles = StyleSheet.create({
    bar: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: WORKOUT_COLORS.background,
    },
    sideSlot: {
        width: SIDE_SLOT,
        height: SIDE_SLOT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleRow: {
        flexDirection: 'row',
        minWidth: 160,
        borderWidth: 2,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: 999,
        padding: 3,
        backgroundColor: WORKOUT_COLORS.background,
    },
    toggleSegment: {
        flex: 1,
        minHeight: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        paddingHorizontal: 16,
    },
    toggleSegmentActive: {
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
});
