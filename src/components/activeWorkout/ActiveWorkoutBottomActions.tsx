import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Button } from '../Button';
import { Icon } from '../icons/Icon';
import { WORKOUT_COLORS } from '../../workout/constants';

const BUTTON_HEIGHT = 50;
const SHADOW_OFFSET = 4;
const PRESS_MS = 120;

interface ActiveWorkoutBottomActionsProps {
    onAddExercises: () => void;
    showRest?: boolean;
    restActive?: boolean;
    onRest?: () => void;
    onPickRestDuration?: () => void;
}

export const ActiveWorkoutBottomActions: React.FC<ActiveWorkoutBottomActionsProps> = ({
    onAddExercises,
    showRest = false,
    restActive = false,
    onRest,
    onPickRestDuration,
}) => {
    const translateY = useRef(new Animated.Value(0)).current;
    const shadowOpacity = useRef(new Animated.Value(1)).current;

    const pressIn = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: SHADOW_OFFSET,
                duration: PRESS_MS,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(shadowOpacity, {
                toValue: 0,
                duration: PRESS_MS,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();
    };

    const pressOut = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 0,
                duration: PRESS_MS,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(shadowOpacity, {
                toValue: 1,
                duration: PRESS_MS,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();
    };

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                {showRest ? (
                    <View style={styles.restWrap}>
                        <Animated.View
                            pointerEvents="none"
                            style={[styles.restShadow, { opacity: shadowOpacity }]}
                        />
                        <TouchableOpacity
                            onPress={onRest}
                            onLongPress={onPickRestDuration}
                            delayLongPress={350}
                            onPressIn={pressIn}
                            onPressOut={pressOut}
                            activeOpacity={1}
                            accessibilityRole="button"
                            accessibilityLabel={restActive ? 'Restart rest timer' : 'Start rest timer'}
                            accessibilityHint="Long press to choose rest duration"
                        >
                            <Animated.View
                                style={[
                                    styles.restFace,
                                    restActive && styles.restFaceActive,
                                    { transform: [{ translateY }] },
                                ]}
                            >
                                <Icon
                                    name={restActive ? 'timer' : 'timer-outline'}
                                    size={24}
                                    color="#FFFFFF"
                                />
                            </Animated.View>
                        </TouchableOpacity>
                    </View>
                ) : null}
                <View style={styles.addWrap}>
                    <Button
                        title="add exercise"
                        onPress={onAddExercises}
                        containerStyle={styles.addButton}
                        buttonBodyStyle={styles.addButtonBody}
                    />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: '#ECECEC',
        backgroundColor: WORKOUT_COLORS.background,
        overflow: 'visible',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    restWrap: {
        width: BUTTON_HEIGHT,
        height: BUTTON_HEIGHT,
    },
    restShadow: {
        position: 'absolute',
        top: SHADOW_OFFSET,
        left: 0,
        width: BUTTON_HEIGHT,
        height: BUTTON_HEIGHT,
        borderRadius: 12,
        backgroundColor: '#252525',
    },
    restFace: {
        width: BUTTON_HEIGHT,
        height: BUTTON_HEIGHT,
        borderRadius: 12,
        borderWidth: 2.5,
        borderColor: '#252525',
        backgroundColor: WORKOUT_COLORS.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    restFaceActive: {
        backgroundColor: WORKOUT_COLORS.accent,
    },
    addWrap: {
        flex: 1,
        minWidth: 0,
    },
    addButton: {
        width: '100%',
    },
    addButtonBody: {
        width: '100%',
        height: BUTTON_HEIGHT,
        marginTop: 0,
        marginBottom: 0,
    },
});
