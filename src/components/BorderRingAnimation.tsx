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
            // Fade in (full opacity)
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

            // Continuous circular animation (slower)
            const progressAnimation = Animated.loop(
                Animated.timing(progress, {
                    toValue: 1,
                    duration: 6000, // 6 seconds per full circle (slower)
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

    // Interpolate colors for gradient - vibrant multi-color cycle
    const [gradientColors, setGradientColors] = useState(['#FF64C8', '#64C8FF', '#FF9632']);

    useEffect(() => {
        if (!isActive) return;

        const colorListener = colorShift.addListener(({ value }: { value: number }) => {
            // Cycle through vibrant colors: pink -> blue -> orange -> purple
            // Pink (255, 100, 200) -> Blue (100, 200, 255) -> Orange (255, 150, 50) -> Purple (200, 50, 255)
            let r1, g1, b1, r2, g2, b2;
            
            if (value < 0.33) {
                // Pink to Blue
                const t = value / 0.33;
                r1 = Math.round(255 - 155 * t);
                g1 = Math.round(100 + 100 * t);
                b1 = Math.round(200 + 55 * t);
                
                r2 = Math.round(100 + 155 * t);
                g2 = Math.round(200 - 50 * t);
                b2 = Math.round(255 - 205 * t);
            } else if (value < 0.66) {
                // Blue to Orange
                const t = (value - 0.33) / 0.33;
                r1 = Math.round(100 + 155 * t);
                g1 = Math.round(200 - 50 * t);
                b1 = Math.round(255 - 205 * t);
                
                r2 = Math.round(255);
                g2 = Math.round(150);
                b2 = Math.round(50);
            } else {
                // Orange to Purple
                const t = (value - 0.66) / 0.34;
                r1 = Math.round(255 - 55 * t);
                g1 = Math.round(150 - 100 * t);
                b1 = Math.round(50 + 205 * t);
                
                r2 = Math.round(200);
                g2 = Math.round(50);
                b2 = Math.round(255);
            }

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
            {/* Top border - Pink/Magenta fading to transparent */}
            <View style={[styles.fullBorder, styles.topBorder, styles.topBorderRounded]}>
                <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
                <LinearGradient
                    colors={[
                        'rgba(255, 100, 200, 1)', // Bright pink
                        'rgba(255, 100, 200, 0.9)',
                        'rgba(255, 100, 200, 0.7)',
                        'rgba(255, 100, 200, 0.5)',
                        'rgba(255, 100, 200, 0.3)',
                        'rgba(255, 100, 200, 0.15)',
                        'rgba(255, 100, 200, 0.05)',
                        'rgba(255, 100, 200, 0)', // Transparent
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    locations={[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1]}
                    style={styles.fullBorderGradient}
                />
            </View>

            {/* Right border - Pink fading to purple then to transparent */}
            <View style={[styles.fullBorder, styles.rightBorder, styles.rightBorderRounded]}>
                <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
                <LinearGradient
                    colors={[
                        'rgba(255, 100, 200, 1)', // Bright pink at top
                        'rgba(255, 100, 200, 0.8)',
                        'rgba(200, 50, 255, 0.6)', // Purple transition
                        'rgba(150, 50, 200, 0.4)', // Deep purple
                        'rgba(150, 50, 200, 0.2)',
                        'rgba(150, 50, 200, 0.1)',
                        'rgba(150, 50, 200, 0.05)',
                        'rgba(150, 50, 200, 0)', // Transparent at bottom
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    locations={[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1]}
                    style={styles.fullBorderGradient}
                />
            </View>

            {/* Bottom border - Orange fading to purple then to transparent */}
            <View style={[styles.fullBorder, styles.bottomBorder, styles.bottomBorderRounded]}>
                <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
                <LinearGradient
                    colors={[
                        'rgba(255, 150, 50, 1)',  // Orange/amber
                        'rgba(255, 150, 50, 0.8)',
                        'rgba(200, 50, 255, 0.6)', // Purple transition
                        'rgba(150, 50, 200, 0.4)', // Deep purple
                        'rgba(150, 50, 200, 0.2)',
                        'rgba(150, 50, 200, 0.1)',
                        'rgba(150, 50, 200, 0.05)',
                        'rgba(150, 50, 200, 0)', // Transparent
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    locations={[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1]}
                    style={styles.fullBorderGradient}
                />
            </View>

            {/* Left border - Light blue fading to orange then to transparent */}
            <View style={[styles.fullBorder, styles.leftBorder, styles.leftBorderRounded]}>
                <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
                <LinearGradient
                    colors={[
                        'rgba(100, 200, 255, 1)', // Light blue at top
                        'rgba(100, 200, 255, 0.8)',
                        'rgba(255, 150, 50, 0.6)', // Orange transition
                        'rgba(255, 150, 50, 0.4)',
                        'rgba(255, 150, 50, 0.2)',
                        'rgba(255, 150, 50, 0.1)',
                        'rgba(255, 150, 50, 0.05)',
                        'rgba(255, 150, 50, 0)', // Transparent at bottom
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    locations={[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1]}
                    style={styles.fullBorderGradient}
                />
            </View>

            {/* Feather/aura layers around entire border with blur */}
            {[0, 1, 2, 3, 4, 5, 6].map((layerIndex) => {
                // Smoother exponential fade
                const opacityMultiplier = Math.pow(0.7, layerIndex);
                const layerOpacity = currentOpacity * opacityMultiplier;
                const layerSpread = AURA_WIDTH * (layerIndex + 1) * 0.15;

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
                            <BlurView intensity={35 - layerIndex * 3} tint="light" style={StyleSheet.absoluteFill} />
                            <LinearGradient
                                colors={[
                                    `rgba(255, 100, 200, ${opacityMultiplier})`, // Bright pink - full opacity
                                    `rgba(255, 100, 200, ${opacityMultiplier * 0.9})`,
                                    `rgba(255, 100, 200, ${opacityMultiplier * 0.7})`,
                                    `rgba(255, 100, 200, ${opacityMultiplier * 0.5})`,
                                    `rgba(255, 100, 200, ${opacityMultiplier * 0.3})`,
                                    `rgba(255, 100, 200, ${opacityMultiplier * 0.15})`,
                                    `rgba(255, 100, 200, ${opacityMultiplier * 0.05})`,
                                    'rgba(255, 100, 200, 0)', // Fade to transparent
                                ]}
                                start={{ x: 0, y: 0.5 }}
                                end={{ x: 1, y: 0.5 }}
                                locations={[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1]}
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
                                    `rgba(82, 110, 255, ${1 - layerIndex * 0.2})`,
                                    `rgba(157, 78, 221, ${1 - layerIndex * 0.2})`,
                                    `rgba(82, 110, 255, ${1 - layerIndex * 0.2})`,
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
                            <BlurView intensity={35 - layerIndex * 3} tint="light" style={StyleSheet.absoluteFill} />
                            <LinearGradient
                                colors={[
                                    `rgba(255, 100, 200, ${opacityMultiplier})`, // Bright pink - full opacity
                                    `rgba(255, 100, 200, ${opacityMultiplier * 0.9})`,
                                    `rgba(255, 100, 200, ${opacityMultiplier * 0.7})`,
                                    `rgba(255, 100, 200, ${opacityMultiplier * 0.5})`,
                                    `rgba(255, 100, 200, ${opacityMultiplier * 0.3})`,
                                    `rgba(255, 100, 200, ${opacityMultiplier * 0.15})`,
                                    `rgba(255, 100, 200, ${opacityMultiplier * 0.05})`,
                                    'rgba(255, 100, 200, 0)', // Fade to transparent
                                ]}
                                start={{ x: 0, y: 0.5 }}
                                end={{ x: 1, y: 0.5 }}
                                locations={[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1]}
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
                                    `rgba(82, 110, 255, ${1 - layerIndex * 0.2})`,
                                    `rgba(157, 78, 221, ${1 - layerIndex * 0.2})`,
                                    `rgba(82, 110, 255, ${1 - layerIndex * 0.2})`,
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
                <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
                <LinearGradient
                    colors={[
                        'rgba(255, 100, 200, 1)', // Bright pink - full opacity
                        'rgba(255, 100, 200, 0.9)',
                        'rgba(255, 100, 200, 0.7)',
                        'rgba(255, 100, 200, 0.5)',
                        'rgba(255, 100, 200, 0.3)',
                        'rgba(255, 100, 200, 0.15)',
                        'rgba(255, 100, 200, 0.05)',
                        'rgba(255, 100, 200, 0)', // Fade to transparent
                    ]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    locations={[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1]}
                    style={styles.gradient}
                />
            </View>

            {/* Traveling aura around purple segment with blur */}
            {[0, 1, 2, 3, 4, 5].map((layerIndex) => {
                const layerWidth = BORDER_WIDTH + (AURA_WIDTH / 5) * (layerIndex + 1);
                // Smoother exponential fade
                const opacityMultiplier = Math.pow(0.75, layerIndex);
                const layerOpacity = currentOpacity * opacityMultiplier;

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
                        <BlurView intensity={45 - layerIndex * 4} tint="light" style={StyleSheet.absoluteFill} />
                        <LinearGradient
                            colors={[
                                `rgba(255, 100, 200, ${opacityMultiplier})`, // Bright pink - full opacity
                                `rgba(255, 100, 200, ${opacityMultiplier * 0.9})`,
                                `rgba(255, 100, 200, ${opacityMultiplier * 0.7})`,
                                `rgba(255, 100, 200, ${opacityMultiplier * 0.5})`,
                                `rgba(255, 100, 200, ${opacityMultiplier * 0.3})`,
                                `rgba(255, 100, 200, ${opacityMultiplier * 0.15})`,
                                `rgba(255, 100, 200, ${opacityMultiplier * 0.05})`,
                                'rgba(255, 100, 200, 0)', // Fade to transparent
                            ]}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            locations={[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1]}
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
        borderRadius: 20, // Rounded corners for the screen
    },
    fullBorder: {
        position: 'absolute',
        backgroundColor: 'rgba(82, 110, 255, 1)',
    },
    topBorder: {
        top: 0,
        left: 0,
        right: 0,
        height: BORDER_WIDTH,
    },
    topBorderRounded: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    rightBorder: {
        top: 0,
        right: 0,
        bottom: 0,
        width: BORDER_WIDTH,
    },
    rightBorderRounded: {
        borderTopRightRadius: 20,
        borderBottomRightRadius: 20,
    },
    bottomBorder: {
        bottom: 0,
        left: 0,
        right: 0,
        height: BORDER_WIDTH,
    },
    bottomBorderRounded: {
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    leftBorder: {
        top: 0,
        left: 0,
        bottom: 0,
        width: BORDER_WIDTH,
    },
    leftBorderRounded: {
        borderTopLeftRadius: 20,
        borderBottomLeftRadius: 20,
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
