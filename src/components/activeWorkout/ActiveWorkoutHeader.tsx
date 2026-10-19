import React, { useRef } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Easing,
    type GestureResponderHandlers,
} from 'react-native';
import { WORKOUT_COLORS } from '../../workout/constants';
import { FlatArrowsIn, FlatPlus, FlatScan } from './FlatMark';

interface ActiveWorkoutHeaderProps {
    onCollapse: () => void;
    onAddExercises: () => void;
    onScanEquipment?: () => void;
    collapsePanHandlers?: GestureResponderHandlers;
}

export const ActiveWorkoutHeader: React.FC<ActiveWorkoutHeaderProps> = ({
    onCollapse,
    onAddExercises,
    onScanEquipment,
    collapsePanHandlers,
}) => {
    return (
        <View style={styles.container} {...collapsePanHandlers}>
            <View style={styles.topRow}>
                <SquareActionButton
                    onPress={onCollapse}
                    backgroundColor="#FFFFFF"
                    accessibilityLabel="Minimize workout"
                >
                    <FlatArrowsIn color={WORKOUT_COLORS.text} size={22} />
                </SquareActionButton>
                <View style={styles.spacer} />
                {onScanEquipment && (
                    <SquareActionButton
                        onPress={onScanEquipment}
                        backgroundColor="#FFFFFF"
                        accessibilityLabel="Scan gym equipment"
                        accessibilityHint="Opens the camera to identify a machine or instruction label"
                    >
                        <FlatScan color={WORKOUT_COLORS.text} size={22} />
                    </SquareActionButton>
                )}
                <SquareActionButton
                    onPress={onAddExercises}
                    backgroundColor={WORKOUT_COLORS.accent}
                    accessibilityLabel="Add exercise"
                >
                    <FlatPlus color="#FFFFFF" size={20} />
                </SquareActionButton>
            </View>
        </View>
    );
};

const SQUARE_SIZE = 50;
const SQUARE_SHADOW = 4;

function SquareActionButton({
    onPress,
    backgroundColor,
    accessibilityLabel,
    accessibilityHint,
    children,
}: {
    onPress: () => void;
    backgroundColor: string;
    accessibilityLabel: string;
    accessibilityHint?: string;
    children: React.ReactNode;
}) {
    const translateY = useRef(new Animated.Value(0)).current;
    const shadowHeight = useRef(new Animated.Value(SQUARE_SHADOW)).current;

    const handlePressIn = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: SQUARE_SHADOW,
                duration: 120,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(shadowHeight, {
                toValue: 0,
                duration: 120,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            }),
        ]).start();
    };

    const handlePressOut = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 0,
                duration: 120,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(shadowHeight, {
                toValue: SQUARE_SHADOW,
                duration: 120,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            }),
        ]).start();
    };

    return (
        <View style={styles.squareWrap}>
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.squareShadow,
                    {
                        opacity: shadowHeight.interpolate({
                            inputRange: [0, SQUARE_SHADOW],
                            outputRange: [0, 1],
                        }),
                    },
                ]}
            />
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityHint={accessibilityHint}
            >
                <Animated.View
                    style={[styles.squareFace, { backgroundColor, transform: [{ translateY }] }]}
                >
                    {children}
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 16,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
        backgroundColor: WORKOUT_COLORS.background,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    spacer: {
        flex: 1,
    },
    squareWrap: {
        width: SQUARE_SIZE,
        height: SQUARE_SIZE,
        overflow: 'visible',
    },
    squareShadow: {
        position: 'absolute',
        top: SQUARE_SHADOW,
        left: 0,
        width: SQUARE_SIZE,
        height: SQUARE_SIZE,
        borderRadius: 12,
        backgroundColor: '#252525',
    },
    squareFace: {
        width: SQUARE_SIZE,
        height: SQUARE_SIZE,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#252525',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
