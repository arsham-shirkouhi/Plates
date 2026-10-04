import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, TouchableOpacity, View } from 'react-native';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import { CalEmptyIllustration } from './CalEmptyIllustration';

const MASCOT_SIZE = 340;
const SHADOW_OFFSET = 6;
const PRESS_ANIM_MS = 120;
const POP_FROM_SCALE = 0.68;
const POP_FROM_Y = 20;

interface EmptyExerciseStateProps {
    onAddPress: () => void;
}

export const EmptyExerciseState: React.FC<EmptyExerciseStateProps> = ({ onAddPress }) => {
    const translateY = useRef(new Animated.Value(0)).current;
    const shadowOpacity = useRef(new Animated.Value(1)).current;
    const popScale = useRef(new Animated.Value(POP_FROM_SCALE)).current;
    const popOpacity = useRef(new Animated.Value(0)).current;
    const popY = useRef(new Animated.Value(POP_FROM_Y)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(popScale, {
                toValue: 1,
                tension: 160,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.spring(popY, {
                toValue: 0,
                tension: 140,
                friction: 9,
                useNativeDriver: true,
            }),
            Animated.timing(popOpacity, {
                toValue: 1,
                duration: 160,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();
    }, [popOpacity, popScale, popY]);

    const pressIn = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: SHADOW_OFFSET,
                duration: PRESS_ANIM_MS,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(shadowOpacity, {
                toValue: 0,
                duration: PRESS_ANIM_MS,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();
    };

    const pressOut = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 0,
                duration: PRESS_ANIM_MS,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(shadowOpacity, {
                toValue: 1,
                duration: PRESS_ANIM_MS,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();
    };

    return (
        <TouchableOpacity
            style={styles.wrap}
            onPress={onAddPress}
            onPressIn={pressIn}
            onPressOut={pressOut}
            activeOpacity={1}
            accessibilityRole="button"
            accessibilityLabel="Add first exercises"
        >
            <Animated.View
                style={[
                    styles.pop,
                    {
                        opacity: popOpacity,
                        transform: [{ translateY: popY }, { scale: popScale }],
                    },
                ]}
            >
                <View style={styles.mascotWrap}>
                    <Animated.View style={[styles.shadow, { opacity: shadowOpacity }]} pointerEvents="none">
                        <CalEmptyIllustration size={MASCOT_SIZE} fillOverride="#252525" />
                    </Animated.View>
                    <Animated.View style={[styles.mascot, { transform: [{ translateY }] }]}>
                        <CalEmptyIllustration size={MASCOT_SIZE} />
                    </Animated.View>
                </View>
                <Animated.Text style={[styles.title, { transform: [{ translateY }] }]}>
                    add first exercises!
                </Animated.Text>
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    wrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: 'transparent',
        overflow: 'visible',
    },
    pop: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    mascotWrap: {
        width: MASCOT_SIZE,
        height: MASCOT_SIZE,
        overflow: 'visible',
    },
    shadow: {
        position: 'absolute',
        top: SHADOW_OFFSET,
        left: 0,
        zIndex: 0,
    },
    mascot: {
        zIndex: 1,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
        marginTop: -10,
    },
});
