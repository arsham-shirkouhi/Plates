import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { fonts } from '../../constants/fonts';
import { PICK_WORKOUT_LAYOUT, WORKOUT_COLORS } from '../../workout/constants';
import { MuscleGroup } from '../../workout/muscleGroups';

const HINT_LINE =
    'Tap muscles to build a workout, or pick up where you left off.';

interface PickWorkoutBottomBarProps {
    selectedMuscles: MuscleGroup[];
    onPrimaryPress: () => void;
}

export const PickWorkoutBottomBar: React.FC<PickWorkoutBottomBarProps> = ({
    selectedMuscles,
    onPrimaryPress,
}) => {
    const hasSelection = selectedMuscles.length > 0;

    const pressAnim = useRef(new Animated.Value(0)).current;
    const animatePress = (toValue: number) => {
        Animated.timing(pressAnim, {
            toValue,
            duration: 120,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();
    };
    const primaryTranslateY = pressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 4],
    });
    const primaryShadowOpacity = pressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
    });

    const primaryLabel = hasSelection ? 'start workout' : 'start routine';

    return (
        <View style={styles.bar}>
            <View style={styles.row1}>
                {hasSelection ? (
                    <Text style={styles.selectionHint}>
                        tap a muscle on the left to remove
                    </Text>
                ) : (
                    <Text style={styles.hintText}>{HINT_LINE}</Text>
                )}
            </View>

            <View style={styles.primaryWrap}>
                <Animated.View
                    style={[styles.primaryShadow, { opacity: primaryShadowOpacity }]}
                    pointerEvents="none"
                />
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={onPrimaryPress}
                    onPressIn={() => animatePress(1)}
                    onPressOut={() => animatePress(0)}
                    accessibilityRole="button"
                    accessibilityLabel={primaryLabel}
                >
                    <Animated.View
                        style={[
                            styles.primaryButton,
                            { transform: [{ translateY: primaryTranslateY }] },
                        ]}
                    >
                        <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
                    </Animated.View>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const {
    bottomAreaHeight,
    bottomRow1Height,
    bottomRow2Height,
    padding,
    rowGap,
    borderWidth,
    buttonRadius,
} = PICK_WORKOUT_LAYOUT;

const styles = StyleSheet.create({
    bar: {
        height: bottomAreaHeight,
        backgroundColor: WORKOUT_COLORS.surfaceSecondary,
        paddingHorizontal: padding,
        paddingVertical: padding,
        gap: rowGap,
    },
    row1: {
        height: bottomRow1Height,
        flexDirection: 'row',
        alignItems: 'center',
    },
    hintText: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 14,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
    },
    selectionHint: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 14,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
    },
    primaryWrap: {
        height: bottomRow2Height,
        position: 'relative',
    },
    primaryShadow: {
        position: 'absolute',
        top: 4,
        left: 0,
        right: 0,
        height: bottomRow2Height,
        borderRadius: buttonRadius,
        backgroundColor: WORKOUT_COLORS.border,
    },
    primaryButton: {
        height: bottomRow2Height,
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
});
