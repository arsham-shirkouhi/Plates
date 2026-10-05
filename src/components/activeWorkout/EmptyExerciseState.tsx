import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import { CalEmptyIllustration } from './CalEmptyIllustration';

const MASCOT_SIZE = 340;
const POP_FROM_SCALE = 0.68;
const POP_FROM_Y = 20;

interface EmptyExerciseStateProps {
    onAddPress: () => void;
}

export const EmptyExerciseState: React.FC<EmptyExerciseStateProps> = ({ onAddPress }) => {
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

    return (
        <TouchableOpacity
            style={styles.wrap}
            onPress={onAddPress}
            activeOpacity={0.85}
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
                <CalEmptyIllustration size={MASCOT_SIZE} />
                <Text style={styles.title}>add first exercises!</Text>
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
    title: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
        marginTop: -10,
    },
});
