import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

export interface ConfettiParticle {
    id: number;
    originX: number;
    originY: number;
    angle: number;
    color?: string;
}

interface ConfettiParticleProps {
    originX: number;
    originY: number;
    angle: number;
    color?: string;
}

const ConfettiParticle: React.FC<ConfettiParticleProps> = ({ originX, originY, angle, color = '#526EFF' }) => {
    const scale = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Convert angle to radians
        const angleRad = (angle * Math.PI) / 180;

        // Distance and direction for particle to travel - smaller range for minimalistic feel
        const distance = 20 + Math.random() * 10; // 20-30px distance
        const deltaX = Math.cos(angleRad) * distance;
        const deltaY = Math.sin(angleRad) * distance;

        // Short, snappy animation
        const duration = 450; // Shorter duration for quick, satisfying feel

        Animated.parallel([
            // Quick scale up with bounce
            Animated.spring(scale, {
                toValue: 1,
                tension: 120,
                friction: 8,
                useNativeDriver: true,
            }),
            // Shoot out quickly with satisfying easing
            Animated.parallel([
                Animated.timing(translateX, {
                    toValue: deltaX,
                    duration,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: deltaY,
                    duration,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, []);

    // Static rotation to face the direction of travel (no animation)
    // Add 90 degrees because the tube starts vertical (pointing up) and we want it to point in the travel direction
    const staticRotation = `${angle + 90}deg`;

    return (
        <Animated.View
            style={[
                styles.confettiParticle,
                {
                    left: originX - 1.5, // Center the 3px wide particle (3/2 = 1.5)
                    top: originY - 4, // Center the 8px tall particle (8/2 = 4)
                    transform: [
                        { scale },
                        { translateX },
                        { translateY },
                        { rotate: staticRotation },
                    ],
                    opacity,
                },
            ]}
        >
            <View style={[styles.confettiDot, { backgroundColor: color }]} />
        </Animated.View>
    );
};

interface ConfettiProps {
    particles: ConfettiParticle[];
}

export const Confetti: React.FC<ConfettiProps> = ({ particles }) => {
    return (
        <>
            {particles.map((particle) => (
                <ConfettiParticle
                    key={particle.id}
                    originX={particle.originX}
                    originY={particle.originY}
                    angle={particle.angle}
                    color={particle.color}
                />
            ))}
        </>
    );
};

const styles = StyleSheet.create({
    confettiParticle: {
        position: 'absolute',
        width: 3,
        height: 8,
        zIndex: 1000,
    },
    confettiDot: {
        width: 3,
        height: 8,
        borderRadius: 1.5,
        backgroundColor: '#526EFF',
    },
});

