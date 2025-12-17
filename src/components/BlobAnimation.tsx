import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';

interface BlobAnimationProps {
    x: number;
    y: number;
    onComplete: () => void;
}

export const BlobAnimation: React.FC<BlobAnimationProps> = ({ x, y, onComplete }) => {
    const [showBlob, setShowBlob] = useState(false);
    const scale = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const pulseScale = useRef(new Animated.Value(1)).current;
    const warpX = useRef(new Animated.Value(1)).current;
    const warpY = useRef(new Animated.Value(1)).current;
    const rotation = useRef(new Animated.Value(0)).current;

    // Aura layers - multiple circles for aura effect
    const auraLayer1Scale = useRef(new Animated.Value(0)).current;
    const auraLayer1Opacity = useRef(new Animated.Value(0)).current;
    const auraLayer2Scale = useRef(new Animated.Value(0)).current;
    const auraLayer2Opacity = useRef(new Animated.Value(0)).current;
    const auraLayer3Scale = useRef(new Animated.Value(0)).current;
    const auraLayer3Opacity = useRef(new Animated.Value(0)).current;

    // Animated values for path warping (subtle circular warping)
    const pathWarp1 = useRef(new Animated.Value(0)).current;
    const pathWarp2 = useRef(new Animated.Value(0)).current;
    const pathWarp3 = useRef(new Animated.Value(0)).current;
    // Animated gradient colors
    const gradientColor1 = useRef(new Animated.Value(0)).current;
    const gradientColor2 = useRef(new Animated.Value(0)).current;
    const [blobPath, setBlobPath] = useState('');
    const [gradientColors, setGradientColors] = useState(['#526EFF', '#9D4EDD']);

    useEffect(() => {
        // Wait 1 second before showing blob
        const delayTimer = setTimeout(() => {
            setShowBlob(true);

            // Aura ball appearing animation - multiple layers expanding outward
            // Layer 3 (outermost) - appears first
            Animated.parallel([
                Animated.spring(auraLayer3Scale, {
                    toValue: 1.8,
                    tension: 40,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.sequence([
                    Animated.timing(auraLayer3Opacity, {
                        toValue: 0.3,
                        duration: 400,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(auraLayer3Opacity, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start();

            // Layer 2 (middle) - appears second
            setTimeout(() => {
                Animated.parallel([
                    Animated.spring(auraLayer2Scale, {
                        toValue: 1.4,
                        tension: 45,
                        friction: 7,
                        useNativeDriver: true,
                    }),
                    Animated.sequence([
                        Animated.timing(auraLayer2Opacity, {
                            toValue: 0.4,
                            duration: 350,
                            easing: Easing.out(Easing.ease),
                            useNativeDriver: true,
                        }),
                        Animated.timing(auraLayer2Opacity, {
                            toValue: 0,
                            duration: 250,
                            useNativeDriver: true,
                        }),
                    ]),
                ]).start();
            }, 100);

            // Layer 1 (inner) - appears third
            setTimeout(() => {
                Animated.parallel([
                    Animated.spring(auraLayer1Scale, {
                        toValue: 1.2,
                        tension: 50,
                        friction: 7,
                        useNativeDriver: true,
                    }),
                    Animated.sequence([
                        Animated.timing(auraLayer1Opacity, {
                            toValue: 0.5,
                            duration: 300,
                            easing: Easing.out(Easing.ease),
                            useNativeDriver: true,
                        }),
                        Animated.timing(auraLayer1Opacity, {
                            toValue: 0,
                            duration: 200,
                            useNativeDriver: true,
                        }),
                    ]),
                ]).start();
            }, 200);

            // Main blob - appears last
            setTimeout(() => {
                Animated.parallel([
                    Animated.spring(scale, {
                        toValue: 1,
                        tension: 50,
                        friction: 7,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 1,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]).start();
            }, 300);
        }, 1000);

        return () => clearTimeout(delayTimer);
    }, []); // Only on mount

    useEffect(() => {
        // Continuous pulsating animation
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseScale, {
                    toValue: 1.15,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseScale, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        pulseAnimation.start();

        // Warping animation - distort as it moves
        const warpAnimation = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(warpX, {
                        toValue: 1.1,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(warpX, {
                        toValue: 1,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(warpY, {
                        toValue: 0.9,
                        duration: 600,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(warpY, {
                        toValue: 1,
                        duration: 600,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.loop(
                    Animated.timing(rotation, {
                        toValue: 1,
                        duration: 3000,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    })
                ),
            ])
        );
        warpAnimation.start();

        return () => {
            pulseAnimation.stop();
            warpAnimation.stop();
        };
    }, []);

    // Animate path warping (subtle circular bubble warping)
    useEffect(() => {
        const warpAnimation = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(pathWarp1, {
                        toValue: 1,
                        duration: 3000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(pathWarp1, {
                        toValue: 0,
                        duration: 3000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(pathWarp2, {
                        toValue: 1,
                        duration: 2500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(pathWarp2, {
                        toValue: 0,
                        duration: 2500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(pathWarp3, {
                        toValue: 1,
                        duration: 2800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(pathWarp3, {
                        toValue: 0,
                        duration: 2800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                ]),
            ])
        );
        warpAnimation.start();

        // Animate gradient colors between blue and purple
        const gradientAnimation = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(gradientColor1, {
                        toValue: 1,
                        duration: 2000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(gradientColor1, {
                        toValue: 0,
                        duration: 2000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(gradientColor2, {
                        toValue: 1,
                        duration: 1800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(gradientColor2, {
                        toValue: 0,
                        duration: 1800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                ]),
            ])
        );
        gradientAnimation.start();

        return () => {
            warpAnimation.stop();
            gradientAnimation.stop();
        };
    }, []);

    // Update blob path based on warp values (smooth circular bubble with parts expanding/contracting)
    useEffect(() => {
        const updatePath = (v1: number, v2: number, v3: number) => {
            // Create smooth circular bubble path with parts that expand and contract
            // Base circle at center (35, 35) with radius ~25
            // Different parts of the circle expand/contract to create bubble warping effect
            const centerX = 35;
            const centerY = 35;
            const baseRadius = 25;

            // Warp values that make different parts bigger/smaller
            const topWarp = 1 + (v1 - 0.5) * 0.3; // Top expands/contracts
            const rightWarp = 1 + (v2 - 0.5) * 0.3; // Right expands/contracts
            const bottomWarp = 1 + (v3 - 0.5) * 0.3; // Bottom expands/contracts
            const leftWarp = 1 + ((v1 + v2) / 2 - 0.5) * 0.3; // Left expands/contracts

            // Create smooth circular path with smooth curves (C bezier curves for smooth edges)
            // Different radii for different quadrants to create warping effect
            const path = `
                M ${centerX},${centerY - baseRadius * topWarp}
                C ${centerX + baseRadius * rightWarp * 0.55},${centerY - baseRadius * topWarp}
                  ${centerX + baseRadius * rightWarp},${centerY - baseRadius * topWarp * 0.55}
                  ${centerX + baseRadius * rightWarp},${centerY}
                C ${centerX + baseRadius * rightWarp},${centerY + baseRadius * bottomWarp * 0.55}
                  ${centerX + baseRadius * rightWarp * 0.55},${centerY + baseRadius * bottomWarp}
                  ${centerX},${centerY + baseRadius * bottomWarp}
                C ${centerX - baseRadius * leftWarp * 0.55},${centerY + baseRadius * bottomWarp}
                  ${centerX - baseRadius * leftWarp},${centerY + baseRadius * bottomWarp * 0.55}
                  ${centerX - baseRadius * leftWarp},${centerY}
                C ${centerX - baseRadius * leftWarp},${centerY - baseRadius * topWarp * 0.55}
                  ${centerX - baseRadius * leftWarp * 0.55},${centerY - baseRadius * topWarp}
                  ${centerX},${centerY - baseRadius * topWarp}
                Z
            `;
            setBlobPath(path);
        };

        let v1 = 0, v2 = 0, v3 = 0;

        const listener1 = pathWarp1.addListener(({ value }) => {
            v1 = value;
            updatePath(v1, v2, v3);
        });
        const listener2 = pathWarp2.addListener(({ value }) => {
            v2 = value;
            updatePath(v1, v2, v3);
        });
        const listener3 = pathWarp3.addListener(({ value }) => {
            v3 = value;
            updatePath(v1, v2, v3);
        });

        // Initial circular path
        updatePath(0, 0, 0);

        return () => {
            pathWarp1.removeListener(listener1);
            pathWarp2.removeListener(listener2);
            pathWarp3.removeListener(listener3);
        };
    }, []);

    // Helper function to interpolate between two hex colors
    const interpolateColor = (color1: string, color2: string, t: number): string => {
        // Remove # and convert to RGB
        const hex1 = color1.replace('#', '');
        const hex2 = color2.replace('#', '');
        const r1 = parseInt(hex1.substring(0, 2), 16);
        const g1 = parseInt(hex1.substring(2, 4), 16);
        const b1 = parseInt(hex1.substring(4, 6), 16);
        const r2 = parseInt(hex2.substring(0, 2), 16);
        const g2 = parseInt(hex2.substring(2, 4), 16);
        const b2 = parseInt(hex2.substring(4, 6), 16);

        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    // Update gradient colors (blue to purple)
    useEffect(() => {
        const updateGradient = (v1: number, v2: number) => {
            // Blue colors
            const blue1 = '#526EFF';
            const blue2 = '#4463F7';
            const blue3 = '#3B58F2';

            // Purple colors
            const purple1 = '#9D4EDD';
            const purple2 = '#7B2CBF';
            const purple3 = '#6A1B9A';

            // Interpolate between blue and purple based on animation values
            const color1 = interpolateColor(blue1, purple1, v1);
            const color2 = interpolateColor(blue2, purple2, v2);
            const color3 = interpolateColor(blue3, purple3, (v1 + v2) / 2);

            setGradientColors([color1, color2, color3]);
        };

        let v1 = 0, v2 = 0;

        const listener1 = gradientColor1.addListener(({ value }) => {
            v1 = value;
            updateGradient(v1, v2);
        });
        const listener2 = gradientColor2.addListener(({ value }) => {
            v2 = value;
            updateGradient(v1, v2);
        });

        // Initial gradient (blue)
        updateGradient(0, 0);

        return () => {
            gradientColor1.removeListener(listener1);
            gradientColor2.removeListener(listener2);
        };
    }, []);

    // Trigger warp effect when position changes (being dragged)
    useEffect(() => {
        // Quick warp pulse when dragged
        Animated.sequence([
            Animated.parallel([
                Animated.timing(warpX, {
                    toValue: 1.2,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(warpY, {
                    toValue: 0.8,
                    duration: 100,
                    useNativeDriver: true,
                }),
            ]),
            Animated.parallel([
                Animated.spring(warpX, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.spring(warpY, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, [x, y]); // Trigger when position changes

    const rotate = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    // Default circular path (smooth perfect circle with C bezier curves)
    const defaultPath = `
        M 35,10
        C 42,10 50,10 50,17.5
        C 50,25 50,25 50,35
        C 50,45 50,45 50,52.5
        C 50,60 42,60 35,60
        C 28,60 20,60 20,52.5
        C 20,45 20,45 20,35
        C 20,25 20,25 20,17.5
        C 20,10 28,10 35,10
        Z
    `;

    if (!showBlob) {
        return null;
    }

    return (
        <View style={styles.container} pointerEvents="none">
            {/* Aura Layer 3 (outermost) - appears first */}
            <Animated.View
                style={[
                    styles.auraLayer,
                    {
                        opacity: auraLayer3Opacity,
                        transform: [{ scale: auraLayer3Scale }],
                    },
                ]}
            >
                <Svg width={70} height={70} viewBox="0 0 70 70">
                    <Defs>
                        <LinearGradient id="auraGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={gradientColors[0]} stopOpacity="0.1" />
                            <Stop offset="100%" stopColor={gradientColors[2] || gradientColors[1]} stopOpacity="0.2" />
                        </LinearGradient>
                    </Defs>
                    <Circle cx="35" cy="35" r="25" fill="url(#auraGradient3)" />
                </Svg>
            </Animated.View>

            {/* Aura Layer 2 (middle) - appears second */}
            <Animated.View
                style={[
                    styles.auraLayer,
                    {
                        opacity: auraLayer2Opacity,
                        transform: [{ scale: auraLayer2Scale }],
                    },
                ]}
            >
                <Svg width={70} height={70} viewBox="0 0 70 70">
                    <Defs>
                        <LinearGradient id="auraGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={gradientColors[1]} stopOpacity="0.15" />
                            <Stop offset="100%" stopColor={gradientColors[2] || gradientColors[1]} stopOpacity="0.25" />
                        </LinearGradient>
                    </Defs>
                    <Circle cx="35" cy="35" r="25" fill="url(#auraGradient2)" />
                </Svg>
            </Animated.View>

            {/* Aura Layer 1 (inner) - appears third */}
            <Animated.View
                style={[
                    styles.auraLayer,
                    {
                        opacity: auraLayer1Opacity,
                        transform: [{ scale: auraLayer1Scale }],
                    },
                ]}
            >
                <Svg width={70} height={70} viewBox="0 0 70 70">
                    <Defs>
                        <LinearGradient id="auraGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={gradientColors[0]} stopOpacity="0.2" />
                            <Stop offset="100%" stopColor={gradientColors[1]} stopOpacity="0.3" />
                        </LinearGradient>
                    </Defs>
                    <Circle cx="35" cy="35" r="25" fill="url(#auraGradient1)" />
                </Svg>
            </Animated.View>

            {/* Main blob - appears last */}
            <Animated.View
                style={[
                    styles.auraLayer,
                    {
                        opacity,
                        transform: [
                            { scale: Animated.multiply(scale, pulseScale) },
                            { scaleX: warpX },
                            { scaleY: warpY },
                            { rotate },
                        ],
                    },
                ]}
            >
                <Svg width={70} height={70} viewBox="0 0 70 70">
                    <Defs>
                        <LinearGradient id="blobGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={gradientColors[0]} stopOpacity="0.9" />
                            <Stop offset="50%" stopColor={gradientColors[1]} stopOpacity="0.95" />
                            <Stop offset="100%" stopColor={gradientColors[2] || gradientColors[1]} stopOpacity="0.9" />
                        </LinearGradient>
                    </Defs>
                    <Path
                        d={blobPath || defaultPath}
                        fill="url(#blobGradient)"
                        stroke={gradientColors[0]}
                        strokeWidth="2"
                        strokeOpacity="0.7"
                    />
                </Svg>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        width: 70,
        height: 70,
        zIndex: 1000,
        alignItems: 'center',
        justifyContent: 'center',
    },
    auraLayer: {
        position: 'absolute',
        width: 70,
        height: 70,
    },
});

