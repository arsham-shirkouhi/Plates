import React, { useEffect, useRef, useState, useMemo } from 'react';
import { StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, LinearGradient as SvgLinearGradient, Stop, Rect, Mask, Circle, Path } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GLOW_THICKNESS_BASE = 50; // Base glow thickness from edge inward
const CORNER_RADIUS = 20; // Rounded corner radius

interface AuraOverlayProps {
    isActive: boolean;
}

export const AuraOverlay: React.FC<AuraOverlayProps> = ({ isActive }) => {
    const insets = useSafeAreaInsets();

    // Standard Animated values - no worklets, no reanimated
    const opacity = useRef(new Animated.Value(0)).current;
    const thicknessScale = useRef(new Animated.Value(0)).current; // Starts at 0, animates to 1 for initial reveal
    const pulseScale = useRef(new Animated.Value(1)).current; // For smooth thickness pulsation (on top of base)
    const rotation = useRef(new Animated.Value(0)).current; // For rotating purple gradient around perimeter

    // Ref to track and cancel running opacity animations
    const opacityAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
    const thicknessAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

    // State to track current thickness and rotation for SVG updates
    const [currentThickness, setCurrentThickness] = useState(0); // Start at 0
    const [rotationDeg, setRotationDeg] = useState(0); // Rotation in degrees (0-360)
    const lastRotationUpdateRef = useRef(0);
    const lastThicknessRef = useRef(0);
    const baseScaleRef = useRef(0);
    const pulseValueRef = useRef(1);
    const isActiveRef = useRef(false); // Ref to track active state for listeners (avoids stale closures)

    // 🚨 CRITICAL: Start continuous thickness pulse animation ONCE at mount - runs forever
    useEffect(() => {
        // Continuous smooth pulse - thickness goes thicker and thinner
        // Pulse scale between 1.0 (normal) and 1.3 (thicker) for smooth breathing
        const pulseAnim = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseScale, {
                    toValue: 1.3, // Thicker
                    duration: 1200, // Smooth, calm pulse
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: false, // Can't use native driver for layout properties
                }),
                Animated.timing(pulseScale, {
                    toValue: 1.0, // Thinner (back to base)
                    duration: 1200, // Smooth, calm pulse
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: false,
                }),
            ])
        );
        pulseAnim.start();

        // Continuous slow rotation animation for purple gradient - runs forever
        const rotationAnim = Animated.loop(
            Animated.timing(rotation, {
                toValue: 360, // Full rotation
                duration: 20000, // Slow rotation - 20 seconds for full loop
                easing: Easing.linear, // Linear for smooth continuous rotation
                useNativeDriver: false, // Can't use native driver for SVG transforms
            })
        );
        rotationAnim.start();

        // Track rotation value for SVG updates - only update when active to avoid re-renders during scroll
        // Use ref to check active state to avoid stale closure issues
        const rotationListener = rotation.addListener(({ value }) => {
            // Only update state when component is active (visible) - use ref to avoid stale closure
            if (isActiveRef.current) {
                setRotationDeg(value);
            }
        });

        // Track combined thickness value for SVG updates (base scale × pulse scale)
        // Use requestAnimationFrame to throttle updates and avoid crashes
        let rafId: number | null = null;

        const updateThickness = ({ value: baseScale }: { value: number }) => {
            baseScaleRef.current = baseScale;
            // Only update state when active to prevent re-renders during scroll
            if (!isActiveRef.current) return;
            if (rafId) return; // Skip if already scheduled

            rafId = requestAnimationFrame(() => {
                rafId = null;
                // Double-check isActive in case it changed - use ref to avoid stale closure
                if (!isActiveRef.current) return;
                try {
                    const safeBaseScale = Math.max(0, Math.min(1, baseScaleRef.current || 0)); // Clamp 0-1
                    const safePulseValue = Math.max(0.5, Math.min(2, pulseValueRef.current || 1)); // Clamp 0.5-2
                    const newThickness = GLOW_THICKNESS_BASE * safeBaseScale * safePulseValue;

                    // Only update if change is significant and value is valid
                    if (!isNaN(newThickness) && isFinite(newThickness) &&
                        Math.abs(newThickness - lastThicknessRef.current) > 2) {
                        lastThicknessRef.current = newThickness;
                        setCurrentThickness(Math.max(0, newThickness)); // Ensure non-negative
                    }
                } catch (error) {
                    // Silently handle errors to prevent crashes
                    console.warn('AuraOverlay thickness update error:', error);
                }
            });
        };

        const updatePulse = ({ value: pulseValue }: { value: number }) => {
            pulseValueRef.current = pulseValue;
            // Only update state when active to prevent re-renders during scroll
            if (!isActiveRef.current) return;
            if (rafId) return; // Skip if already scheduled

            rafId = requestAnimationFrame(() => {
                rafId = null;
                // Double-check isActive in case it changed - use ref to avoid stale closure
                if (!isActiveRef.current) return;
                try {
                    const safeBaseScale = Math.max(0, Math.min(1, baseScaleRef.current || 0)); // Clamp 0-1
                    const safePulseValue = Math.max(0.5, Math.min(2, pulseValueRef.current || 1)); // Clamp 0.5-2
                    const newThickness = GLOW_THICKNESS_BASE * safeBaseScale * safePulseValue;

                    // Only update if change is significant and value is valid
                    if (!isNaN(newThickness) && isFinite(newThickness) &&
                        Math.abs(newThickness - lastThicknessRef.current) > 2) {
                        lastThicknessRef.current = newThickness;
                        setCurrentThickness(Math.max(0, newThickness)); // Ensure non-negative
                    }
                } catch (error) {
                    // Silently handle errors to prevent crashes
                    console.warn('AuraOverlay pulse update error:', error);
                }
            });
        };

        // Listen to both animations with separate handlers
        const thicknessListener = thicknessScale.addListener(updateThickness);
        const pulseListener = pulseScale.addListener(updatePulse);

        return () => {
            pulseAnim.stop();
            rotationAnim.stop();
            if (thicknessListener) {
                thicknessScale.removeListener(thicknessListener);
            }
            if (pulseListener) {
                pulseScale.removeListener(pulseListener);
            }
            if (rotationListener) {
                rotation.removeListener(rotationListener);
            }
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
        };
    }, []); // Run ONCE at mount - animation NEVER restarts

    // 🚨 CRITICAL: Opacity and thickness control - instant response on press
    // Controls visibility AND initial thickness reveal
    useEffect(() => {
        // Update ref immediately so listeners can check current state (avoids stale closures)
        isActiveRef.current = isActive;

        // Cancel any running animations
        if (opacityAnimationRef.current) {
            opacityAnimationRef.current.stop();
            opacityAnimationRef.current = null;
        }
        if (thicknessAnimationRef.current) {
            thicknessAnimationRef.current.stop();
            thicknessAnimationRef.current = null;
        }

        if (isActive) {
            // Fade in instantly - ≤120ms, ensure it reaches 100% opacity
            const fadeInAnim = Animated.timing(opacity, {
                toValue: 1.0, // 100% opacity - full visibility
                duration: 120,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true, // Native driver for instant feel
            });

            opacityAnimationRef.current = fadeInAnim;
            fadeInAnim.start((finished) => {
                if (finished) {
                    opacityAnimationRef.current = null;
                }
            });

            // Animate thickness from 0 to 1 (reveal animation)
            const thicknessRevealAnim = Animated.timing(thicknessScale, {
                toValue: 1, // Full thickness
                duration: 300, // Smooth reveal
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false, // Can't use native driver for layout
            });

            thicknessAnimationRef.current = thicknessRevealAnim;
            thicknessRevealAnim.start((finished) => {
                if (finished) {
                    thicknessAnimationRef.current = null;
                }
            });
        } else {
            // Fade out quickly
            const fadeOutAnim = Animated.timing(opacity, {
                toValue: 0,
                duration: 120,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            });

            opacityAnimationRef.current = fadeOutAnim;
            fadeOutAnim.start((finished) => {
                if (finished) {
                    opacityAnimationRef.current = null;
                }
            });

            // Reset thickness to 0 when hiding
            const thicknessHideAnim = Animated.timing(thicknessScale, {
                toValue: 0,
                duration: 120,
                easing: Easing.in(Easing.ease),
                useNativeDriver: false,
            });

            thicknessAnimationRef.current = thicknessHideAnim;
            thicknessHideAnim.start((finished) => {
                if (finished) {
                    thicknessAnimationRef.current = null;
                }
            });
        }
    }, [isActive]);

    // Calculate dimensions with safe areas (static, calculated once)
    const contentWidth = SCREEN_WIDTH - insets.left - insets.right;
    const contentHeight = SCREEN_HEIGHT - insets.top - insets.bottom;
    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT / 2;
    // Calculate max distance from center to edge for radial gradient
    const maxRadius = Math.sqrt(
        Math.pow(Math.max(centerX, SCREEN_WIDTH - centerX), 2) +
        Math.pow(Math.max(centerY, SCREEN_HEIGHT - centerY), 2)
    );

    // Blue color from buttons (static) - fully opaque
    const blueColor = '#4463F7'; // This is already fully opaque hex color


    return (
        <Animated.View
            style={[
                styles.container,
                {
                    paddingTop: insets.top,
                    paddingBottom: insets.bottom,
                    paddingLeft: insets.left,
                    paddingRight: insets.right,
                    opacity: opacity, // Only press controls opacity, thickness pulse is separate
                },
            ]}
            pointerEvents="none"
        >
            <Svg
                width={SCREEN_WIDTH}
                height={SCREEN_HEIGHT}
                style={StyleSheet.absoluteFill}
            >
                <Defs>
                    {/* Calculate purple accent position along perimeter */}
                    {/* Perimeter: top (0→width) → right (0→height) → bottom (width→0) → left (height→0) */}
                    {useMemo(() => {
                        const perimeter = 2 * (SCREEN_WIDTH + SCREEN_HEIGHT);
                        const position = (rotationDeg / 360) * perimeter;
                        const purpleWidth = 60; // Width of purple accent in pixels

                        // Determine which edge and position
                        let topPos = -1, rightPos = -1, bottomPos = -1, leftPos = -1;

                        if (position <= SCREEN_WIDTH) {
                            // Top edge (left to right)
                            topPos = position / SCREEN_WIDTH;
                        } else if (position <= SCREEN_WIDTH + SCREEN_HEIGHT) {
                            // Right edge (top to bottom)
                            rightPos = (position - SCREEN_WIDTH) / SCREEN_HEIGHT;
                        } else if (position <= 2 * SCREEN_WIDTH + SCREEN_HEIGHT) {
                            // Bottom edge (right to left)
                            bottomPos = 1 - (position - SCREEN_WIDTH - SCREEN_HEIGHT) / SCREEN_WIDTH;
                        } else {
                            // Left edge (bottom to top)
                            leftPos = 1 - (position - 2 * SCREEN_WIDTH - SCREEN_HEIGHT) / SCREEN_HEIGHT;
                        }

                        const createEdgeGradient = (id: string, pos: number, direction: 'h' | 'v') => {
                            if (pos < 0) {
                                // No purple on this edge - all blue
                                return (
                                    <SvgLinearGradient id={id} x1={direction === 'h' ? "0%" : "0%"} y1={direction === 'h' ? "0%" : "0%"} x2={direction === 'h' ? "100%" : "0%"} y2={direction === 'h' ? "0%" : "100%"}>
                                        <Stop offset="0%" stopColor={blueColor} stopOpacity="1" />
                                        <Stop offset="100%" stopColor={blueColor} stopOpacity="1" />
                                    </SvgLinearGradient>
                                );
                            }

                            const purpleStart = Math.max(0, (pos - purpleWidth / (direction === 'h' ? SCREEN_WIDTH : SCREEN_HEIGHT)) * 100);
                            const purpleEnd = Math.min(100, (pos + purpleWidth / (direction === 'h' ? SCREEN_WIDTH : SCREEN_HEIGHT)) * 100);
                            const posPercent = pos * 100;

                            const stops = [
                                <Stop key="start" offset="0%" stopColor={blueColor} stopOpacity="1" />
                            ];

                            if (purpleStart > 0) {
                                stops.push(<Stop key="purple-start" offset={`${purpleStart}%`} stopColor={blueColor} stopOpacity="1" />);
                            }
                            stops.push(
                                <Stop key="before-purple" offset={`${Math.max(0, posPercent - 2)}%`} stopColor={blueColor} stopOpacity="1" />,
                                <Stop key="purple-1" offset={`${posPercent}%`} stopColor="#A855F7" stopOpacity="1" />,
                                <Stop key="purple-2" offset={`${Math.min(100, posPercent + 2)}%`} stopColor="#9333EA" stopOpacity="1" />,
                                <Stop key="purple-3" offset={`${Math.min(100, posPercent + 4)}%`} stopColor="#A855F7" stopOpacity="1" />
                            );

                            if (purpleEnd < 100) {
                                stops.push(<Stop key="purple-end" offset={`${purpleEnd}%`} stopColor={blueColor} stopOpacity="1" />);
                            }
                            stops.push(<Stop key="end" offset="100%" stopColor={blueColor} stopOpacity="1" />);

                            return (
                                <SvgLinearGradient id={id} x1={direction === 'h' ? "0%" : "0%"} y1={direction === 'h' ? "0%" : "0%"} x2={direction === 'h' ? "100%" : "0%"} y2={direction === 'h' ? "0%" : "100%"}>
                                    {stops}
                                </SvgLinearGradient>
                            );
                        };

                        return (
                            <>
                                {createEdgeGradient("topEdgeGradient", topPos, 'h')}
                                {createEdgeGradient("rightEdgeGradient", rightPos, 'v')}
                                {createEdgeGradient("bottomEdgeGradient", bottomPos, 'h')}
                                {createEdgeGradient("leftEdgeGradient", leftPos, 'v')}
                            </>
                        );
                    }, [rotationDeg, blueColor])}


                    {/* Mask - ensures center is ALWAYS fully transparent */}
                    {/* Mask gradients - white (visible) at edges, black (transparent) at center */}
                    {/* In SVG masks: white = visible, black = transparent */}
                    {/* Smooth linear fade from 100% opacity at edge to 0% at center */}
                    <SvgLinearGradient id="maskTopGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <Stop offset="0%" stopColor="white" stopOpacity="1" />
                        <Stop offset="100%" stopColor="white" stopOpacity="0" />
                    </SvgLinearGradient>

                    <SvgLinearGradient id="maskBottomGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                        <Stop offset="0%" stopColor="white" stopOpacity="1" />
                        <Stop offset="100%" stopColor="white" stopOpacity="0" />
                    </SvgLinearGradient>

                    <SvgLinearGradient id="maskLeftGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <Stop offset="0%" stopColor="white" stopOpacity="1" />
                        <Stop offset="100%" stopColor="white" stopOpacity="0" />
                    </SvgLinearGradient>

                    <SvgLinearGradient id="maskRightGradient" x1="100%" y1="0%" x2="0%" y2="0%">
                        <Stop offset="0%" stopColor="white" stopOpacity="1" />
                        <Stop offset="100%" stopColor="white" stopOpacity="0" />
                    </SvgLinearGradient>

                    <Mask id="auraMask">
                        {/* Base - start with black (transparent) */}
                        <Rect
                            x={0}
                            y={0}
                            width={SCREEN_WIDTH}
                            height={SCREEN_HEIGHT}
                            fill="black"
                        />
                        {/* Top edge glow - pulsating thickness, fades to 0 at center */}
                        <Rect
                            x={0}
                            y={0}
                            width={SCREEN_WIDTH}
                            height={Math.max(0, currentThickness)}
                            fill="url(#maskTopGradient)"
                        />
                        {/* Bottom edge glow - pulsating thickness, fades to 0 at center */}
                        <Rect
                            x={0}
                            y={Math.max(0, SCREEN_HEIGHT - currentThickness)}
                            width={SCREEN_WIDTH}
                            height={Math.max(0, currentThickness)}
                            fill="url(#maskBottomGradient)"
                        />
                        {/* Left edge glow - pulsating thickness, fades to 0 at center */}
                        <Rect
                            x={0}
                            y={0}
                            width={Math.max(0, currentThickness)}
                            height={SCREEN_HEIGHT}
                            fill="url(#maskLeftGradient)"
                        />
                        {/* Right edge glow - pulsating thickness, fades to 0 at center */}
                        <Rect
                            x={Math.max(0, SCREEN_WIDTH - currentThickness)}
                            y={0}
                            width={Math.max(0, currentThickness)}
                            height={SCREEN_HEIGHT}
                            fill="url(#maskRightGradient)"
                        />
                        {/* Center cutout - ensures center is ALWAYS fully transparent */}
                        {/* Use fixed padding based on base thickness to guarantee center is clear */}
                        <Rect
                            x={Math.max(0, insets.left + GLOW_THICKNESS_BASE * 1.2)}
                            y={Math.max(0, insets.top + GLOW_THICKNESS_BASE * 1.2)}
                            width={Math.max(0, contentWidth - GLOW_THICKNESS_BASE * 2.4)}
                            height={Math.max(0, contentHeight - GLOW_THICKNESS_BASE * 2.4)}
                            rx={CORNER_RADIUS}
                            ry={CORNER_RADIUS}
                            fill="black"
                        />
                    </Mask>
                </Defs>

                {/* Full screen blue rectangle with edge-only mask */}
                {/* Center is guaranteed to be transparent via mask cutout */}
                {/* Purple accent travels around the border perimeter */}
                <Rect
                    x={0}
                    y={0}
                    width={SCREEN_WIDTH}
                    height={SCREEN_HEIGHT}
                    fill={blueColor}
                    opacity="1"
                    mask="url(#auraMask)"
                />
            </Svg>
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
});
