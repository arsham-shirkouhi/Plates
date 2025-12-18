import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Dimensions, Animated, Easing, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface BorderRingAnimationProps {
    isActive: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PERIMETER = 2 * (SCREEN_WIDTH + SCREEN_HEIGHT);
const GRADIENT_SEGMENT_LENGTH = 200;
const BORDER_WIDTH = 20; // Thick border
const AURA_WIDTH = 40; // Width of the feather/aura effect

export const BorderRingAnimation: React.FC<BorderRingAnimationProps> = ({ isActive }) => {
    const progress = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const colorShift = useRef(new Animated.Value(0)).current;
    const [ringPosition, setRingPosition] = useState({ x: 0, y: 0, rotation: 0 });
    const [shouldRender, setShouldRender] = useState(false);
    const [currentProgress, setCurrentProgress] = useState(0);
    const [currentOpacity, setCurrentOpacity] = useState(0);

    useEffect(() => {
        if (isActive) {
            setShouldRender(true);
            // Fade in
            Animated.timing(opacity, {
                toValue: 1,
                duration: 400,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }).start();

            // Track opacity value
            const opacityListener = opacity.addListener(({ value }: { value: number }) => {
                setCurrentOpacity(value);
            });

            // Continuous circular animation
            const progressAnimation = Animated.loop(
                Animated.timing(progress, {
                    toValue: 1,
                    duration: 3000, // 3 seconds per full circle
                    easing: Easing.linear,
                    useNativeDriver: false,
                })
            );
            progressAnimation.start();

            // Color shift animation (subtle color changes)
            const colorAnimation = Animated.loop(
                Animated.sequence([
                    Animated.timing(colorShift, {
                        toValue: 1,
                        duration: 2000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(colorShift, {
                        toValue: 0,
                        duration: 2000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                ])
            );
            colorAnimation.start();

            // Update position listener
            const progressListener = progress.addListener(({ value }: { value: number }) => {
                setCurrentProgress(value);
                const distance = value * PERIMETER;
                const pos = getPosition(distance);
                setRingPosition(pos);
            });

            return () => {
                progressAnimation.stop();
                colorAnimation.stop();
                progress.removeListener(progressListener);
                if (opacityListener) {
                    opacity.removeListener(opacityListener);
                }
            };
        } else {
            // Fade out
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }).start(() => {
                setTimeout(() => setShouldRender(false), 100);
            });
            progress.setValue(0);
            colorShift.setValue(0);
        }
    }, [isActive]);

    // Calculate position along border
    const getPosition = (distance: number) => {
        // Top edge (left to right)
        if (distance < SCREEN_WIDTH) {
            return { x: distance, y: 0, rotation: 0 };
        }
        // Right edge (top to bottom)
        else if (distance < SCREEN_WIDTH + SCREEN_HEIGHT) {
            return { x: SCREEN_WIDTH, y: distance - SCREEN_WIDTH, rotation: 90 };
        }
        // Bottom edge (right to left)
        else if (distance < 2 * SCREEN_WIDTH + SCREEN_HEIGHT) {
            return {
                x: SCREEN_WIDTH - (distance - SCREEN_WIDTH - SCREEN_HEIGHT),
                y: SCREEN_HEIGHT,
                rotation: 180,
            };
        }
        // Left edge (bottom to top)
        else {
            return {
                x: 0,
                y: SCREEN_HEIGHT - (distance - 2 * SCREEN_WIDTH - SCREEN_HEIGHT),
                rotation: 270,
            };
        }
    };

    // Interpolate colors for gradient
    const [gradientColors, setGradientColors] = useState(['#526EFF', '#9D4EDD', '#526EFF']);

    useEffect(() => {
        if (!isActive) return;

        const colorListener = colorShift.addListener(({ value }: { value: number }) => {
            // Interpolate between blue and purple
            const r1 = Math.round(82 + (157 - 82) * value);
            const g1 = Math.round(110 + (78 - 110) * value);
            const b1 = Math.round(255 + (221 - 255) * value);

            const r2 = Math.round(157 + (82 - 157) * value);
            const g2 = Math.round(78 + (110 - 78) * value);
            const b2 = Math.round(221 + (255 - 221) * value);

            setGradientColors([
                `rgb(${r1}, ${g1}, ${b1})`,
                `rgb(${r2}, ${g2}, ${b2})`,
                `rgb(${r1}, ${g1}, ${b1})`,
            ]);
        });

        return () => {
            colorShift.removeListener(colorListener);
        };
    }, [isActive]);

    if (!shouldRender) {
        return null;
    }

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity,
                },
            ]}
            pointerEvents="none"
        >
            {/* Full border with blur and feather effect - always visible around entire perimeter */}
            {/* Top border */}
            <View style={[styles.fullBorder, styles.topBorder]}>
                <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                <LinearGradient
                    colors={['rgba(82, 110, 255, 0.4)', 'rgba(82, 110, 255, 0.6)', 'rgba(82, 110, 255, 0.4)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.fullBorderGradient}
                />
            </View>

            {/* Right border */}
            <View style={[styles.fullBorder, styles.rightBorder]}>
                <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                <LinearGradient
                    colors={['rgba(82, 110, 255, 0.4)', 'rgba(82, 110, 255, 0.6)', 'rgba(82, 110, 255, 0.4)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.fullBorderGradient}
                />
            </View>

            {/* Bottom border */}
            <View style={[styles.fullBorder, styles.bottomBorder]}>
                <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                <LinearGradient
                    colors={['rgba(82, 110, 255, 0.4)', 'rgba(82, 110, 255, 0.6)', 'rgba(82, 110, 255, 0.4)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.fullBorderGradient}
                />
            </View>

            {/* Left border */}
            <View style={[styles.fullBorder, styles.leftBorder]}>
                <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                <LinearGradient
                    colors={['rgba(82, 110, 255, 0.4)', 'rgba(82, 110, 255, 0.6)', 'rgba(82, 110, 255, 0.4)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.fullBorderGradient}
                />
            </View>

            {/* Feather/aura layers around entire border with blur */}
            {[0, 1, 2, 3, 4].map((layerIndex) => {
                const layerOpacity = currentOpacity * (0.2 - layerIndex * 0.035);
                const layerSpread = AURA_WIDTH * (layerIndex + 1) * 0.2;

                return (
                    <React.Fragment key={`aura-${layerIndex}`}>
                        {/* Top aura */}
                        <View
                            style={[
                                styles.auraBorder,
                                styles.topAura,
                                {
                                    height: BORDER_WIDTH + layerSpread,
                                    top: -layerSpread / 2,
                                    opacity: layerOpacity,
                                },
                            ]}
                        >
                            <BlurView intensity={15 - layerIndex * 2} tint="light" style={StyleSheet.absoluteFill} />
                            <LinearGradient
                                colors={[
                                    'rgba(82, 110, 255, 0)',
                                    `rgba(82, 110, 255, ${0.25 - layerIndex * 0.05})`,
                                    `rgba(157, 78, 221, ${0.3 - layerIndex * 0.05})`,
                                    `rgba(82, 110, 255, ${0.25 - layerIndex * 0.05})`,
                                    'rgba(82, 110, 255, 0)',
                                ]}
                                start={{ x: 0, y: 0.5 }}
                                end={{ x: 1, y: 0.5 }}
                                locations={[0, 0.15, 0.5, 0.85, 1]}
                                style={styles.auraGradient}
                            />
                        </View>

                        {/* Right aura */}
                        <View
                            style={[
                                styles.auraBorder,
                                styles.rightAura,
                                {
                                    width: BORDER_WIDTH + layerSpread,
                                    right: -layerSpread / 2,
                                    opacity: layerOpacity,
                                },
                            ]}
                        >
                            <BlurView intensity={15 - layerIndex * 2} tint="light" style={StyleSheet.absoluteFill} />
                            <LinearGradient
                                colors={[
                                    'rgba(82, 110, 255, 0)',
                                    `rgba(82, 110, 255, ${0.25 - layerIndex * 0.05})`,
                                    `rgba(157, 78, 221, ${0.3 - layerIndex * 0.05})`,
                                    `rgba(82, 110, 255, ${0.25 - layerIndex * 0.05})`,
                                    'rgba(82, 110, 255, 0)',
                                ]}
                                start={{ x: 0.5, y: 0 }}
                                end={{ x: 0.5, y: 1 }}
                                locations={[0, 0.15, 0.5, 0.85, 1]}
                                style={styles.auraGradient}
                            />
                        </View>

                        {/* Bottom aura */}
                        <View
                            style={[
                                styles.auraBorder,
                                styles.bottomAura,
                                {
                                    height: BORDER_WIDTH + layerSpread,
                                    bottom: -layerSpread / 2,
                                    opacity: layerOpacity,
                                },
                            ]}
                        >
                            <BlurView intensity={15 - layerIndex * 2} tint="light" style={StyleSheet.absoluteFill} />
                            <LinearGradient
                                colors={[
                                    'rgba(82, 110, 255, 0)',
                                    `rgba(82, 110, 255, ${0.25 - layerIndex * 0.05})`,
                                    `rgba(157, 78, 221, ${0.3 - layerIndex * 0.05})`,
                                    `rgba(82, 110, 255, ${0.25 - layerIndex * 0.05})`,
                                    'rgba(82, 110, 255, 0)',
                                ]}
                                start={{ x: 0, y: 0.5 }}
                                end={{ x: 1, y: 0.5 }}
                                locations={[0, 0.15, 0.5, 0.85, 1]}
                                style={styles.auraGradient}
                            />
                        </View>

                        {/* Left aura */}
                        <View
                            style={[
                                styles.auraBorder,
                                styles.leftAura,
                                {
                                    width: BORDER_WIDTH + layerSpread,
                                    left: -layerSpread / 2,
                                    opacity: layerOpacity,
                                },
                            ]}
                        >
                            <BlurView intensity={15 - layerIndex * 2} tint="light" style={StyleSheet.absoluteFill} />
                            <LinearGradient
                                colors={[
                                    'rgba(82, 110, 255, 0)',
                                    `rgba(82, 110, 255, ${0.25 - layerIndex * 0.05})`,
                                    `rgba(157, 78, 221, ${0.3 - layerIndex * 0.05})`,
                                    `rgba(82, 110, 255, ${0.25 - layerIndex * 0.05})`,
                                    'rgba(82, 110, 255, 0)',
                                ]}
                                start={{ x: 0.5, y: 0 }}
                                end={{ x: 0.5, y: 1 }}
                                locations={[0, 0.15, 0.5, 0.85, 1]}
                                style={styles.auraGradient}
                            />
                        </View>
                    </React.Fragment>
                );
            })}

            {/* Traveling purple gradient segment with blur */}
            <View
                style={[
                    styles.gradientSegment,
                    {
                        left: ringPosition.x - GRADIENT_SEGMENT_LENGTH / 2,
                        top: ringPosition.y - BORDER_WIDTH / 2,
                        width: GRADIENT_SEGMENT_LENGTH,
                        height: BORDER_WIDTH,
                        transform: [{ rotate: `${ringPosition.rotation}deg` }],
                    },
                ]}
            >
                <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFill} />
                <LinearGradient
                    colors={['rgba(157, 78, 221, 0)', '#9D4EDD', 'rgba(157, 78, 221, 0)']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    locations={[0, 0.5, 1]}
                    style={styles.gradient}
                />
            </View>

            {/* Traveling aura around purple segment with blur */}
            {[0, 1, 2, 3].map((layerIndex) => {
                const layerWidth = BORDER_WIDTH + (AURA_WIDTH / 4) * (layerIndex + 1);
                const layerOpacity = currentOpacity * (0.4 - layerIndex * 0.08);

                return (
                    <View
                        key={`traveling-aura-${layerIndex}`}
                        style={[
                            styles.travelingAura,
                            {
                                left: ringPosition.x - GRADIENT_SEGMENT_LENGTH / 2,
                                top: ringPosition.y - layerWidth / 2,
                                width: GRADIENT_SEGMENT_LENGTH,
                                height: layerWidth,
                                opacity: layerOpacity,
                                transform: [{ rotate: `${ringPosition.rotation}deg` }],
                            },
                        ]}
                    >
                        <BlurView intensity={20 - layerIndex * 3} tint="light" style={StyleSheet.absoluteFill} />
                        <LinearGradient
                            colors={[
                                'rgba(157, 78, 221, 0)',
                                `rgba(157, 78, 221, ${0.5 - layerIndex * 0.1})`,
                                `rgba(157, 78, 221, ${0.6 - layerIndex * 0.1})`,
                                `rgba(157, 78, 221, ${0.5 - layerIndex * 0.1})`,
                                'rgba(157, 78, 221, 0)',
                            ]}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            locations={[0, 0.15, 0.5, 0.85, 1]}
                            style={styles.auraGradient}
                        />
                    </View>
                );
            })}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        zIndex: 999,
        overflow: 'hidden',
    },
    fullBorder: {
        position: 'absolute',
        backgroundColor: 'rgba(82, 110, 255, 0.4)',
    },
    topBorder: {
        top: 0,
        left: 0,
        right: 0,
        height: BORDER_WIDTH,
    },
    rightBorder: {
        top: 0,
        right: 0,
        bottom: 0,
        width: BORDER_WIDTH,
    },
    bottomBorder: {
        bottom: 0,
        left: 0,
        right: 0,
        height: BORDER_WIDTH,
    },
    leftBorder: {
        top: 0,
        left: 0,
        bottom: 0,
        width: BORDER_WIDTH,
    },
    fullBorderGradient: {
        width: '100%',
        height: '100%',
    },
    auraBorder: {
        position: 'absolute',
    },
    topAura: {
        left: 0,
        right: 0,
    },
    rightAura: {
        top: 0,
        bottom: 0,
    },
    bottomAura: {
        left: 0,
        right: 0,
    },
    leftAura: {
        top: 0,
        bottom: 0,
    },
    auraGradient: {
        width: '100%',
        height: '100%',
    },
    gradientSegment: {
        position: 'absolute',
        borderRadius: BORDER_WIDTH / 2,
        overflow: 'hidden',
        zIndex: 10,
    },
    gradient: {
        width: '100%',
        height: '100%',
        borderRadius: BORDER_WIDTH / 2,
    },
    travelingAura: {
        position: 'absolute',
        borderRadius: BORDER_WIDTH / 2,
        overflow: 'hidden',
        zIndex: 9,
    },
});
