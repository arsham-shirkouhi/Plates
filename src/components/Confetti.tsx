import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

export interface ConfettiParticle {
    id: number;
    originX: number;
    originY: number;
    angle: number;
    color?: string;
    sizeScale?: number;
    travel?: number;
}

interface ConfettiParticleProps {
    originX: number;
    originY: number;
    angle: number;
    color?: string;
    sizeScale?: number;
    travel?: number;
}

const ConfettiPiece: React.FC<ConfettiParticleProps> = ({
    originX,
    originY,
    angle,
    color = '#526EFF',
    sizeScale = 1,
    travel,
}) => {
    const scale = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const angleRad = (angle * Math.PI) / 180;
        const distance = (travel ?? 50) + Math.random() * 30;
        const deltaX = Math.cos(angleRad) * distance;
        const deltaY = Math.sin(angleRad) * distance;
        const duration = travel && travel > 100 ? 620 : 450;

        Animated.parallel([
            Animated.spring(scale, {
                toValue: 1,
                tension: 120,
                friction: 8,
                useNativeDriver: true,
            }),
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
        ]).start();
    }, []);

    const staticRotation = `${angle + 90}deg`;
    const width = 3 * sizeScale;
    const height = 8 * sizeScale;

    return (
        <Animated.View
            style={[
                styles.confettiParticle,
                {
                    width,
                    height,
                    left: originX - width / 2,
                    top: originY - height / 2,
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
            <View style={[styles.confettiDot, { width, height, borderRadius: width / 2, backgroundColor: color }]} />
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
                <ConfettiPiece
                    key={particle.id}
                    originX={particle.originX}
                    originY={particle.originY}
                    angle={particle.angle}
                    color={particle.color}
                    sizeScale={particle.sizeScale}
                    travel={particle.travel}
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

