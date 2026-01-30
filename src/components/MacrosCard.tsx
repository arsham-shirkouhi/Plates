import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { fonts } from '../constants/fonts';
import { styles as homeScreenStyles } from '../screens/HomeScreen.styles';
import * as Haptics from 'expo-haptics';

// Helper component to display animated numbers
const AnimatedNumber: React.FC<{
    value: Animated.Value;
    target: number;
    style: any;
}> = ({ value, target, style }) => {
    const [displayValue, setDisplayValue] = useState(Math.round(target));
    const isFirstRender = useRef(true);

    useEffect(() => {
        // On first render, set the value immediately
        if (isFirstRender.current) {
            setDisplayValue(Math.round(target));
            isFirstRender.current = false;
            return;
        }

        const listener = value.addListener(({ value: currentValue }) => {
            setDisplayValue(Math.round(currentValue));
        });

        return () => {
            value.removeListener(listener);
        };
    }, [value, target]);

    // Set final value when target changes (for cases where animation might not complete)
    useEffect(() => {
        if (!isFirstRender.current) {
            const timer = setTimeout(() => {
                setDisplayValue(Math.round(target));
            }, 900); // Slightly longer than animation duration
            return () => clearTimeout(timer);
        }
    }, [target]);

    return <Text style={style}>{displayValue}</Text>;
};

interface MacrosCardProps {
    macros?: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    };
    consumed?: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    };
    loading?: boolean;
}

// Internal component: Calorie Circular Progress
interface CalorieCircularProgressProps {
    totalCalories: number;
    consumedCalories: number;
}

const CalorieCircularProgress: React.FC<CalorieCircularProgressProps> = ({
    totalCalories,
    consumedCalories,
}) => {
    const remaining = Math.max(0, totalCalories - consumedCalories);
    const percentage = Math.min(100, (consumedCalories / totalCalories) * 100);

    // SVG circle parameters
    const size = 135;
    const strokeWidth = 15;
    const borderWidth = 2.5; // Match progress bar border
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;

    // Animation value for smooth progress
    const animatedValue = useRef(new Animated.Value(percentage)).current;
    const previousPercentage = useRef(percentage);
    // Initialize dashOffset based on initial percentage
    const initialDashOffset = circumference - (percentage / 100) * circumference;
    const [dashOffset, setDashOffset] = useState(initialDashOffset);

    // Animation value for number counting
    const numberAnimation = useRef(new Animated.Value(remaining)).current;
    const previousRemaining = useRef(remaining);
    
    // Track last haptic value for calories
    const lastHapticPercentage = useRef(percentage);
    
    // Track if this is the first render to prevent animation on initial load
    const isFirstRender = useRef(true);
    // Inner and outer border radii
    // Outer border: sits at the outer edge of the progress ring
    const outerBorderRadius = radius + strokeWidth / 2;
    // Inner border: sits at the inner edge of the progress ring
    const innerBorderRadius = radius - strokeWidth / 2;

    useEffect(() => {
        // On first render, set values immediately without animation
        if (isFirstRender.current) {
            animatedValue.setValue(percentage);
            numberAnimation.setValue(remaining);
            previousPercentage.current = percentage;
            previousRemaining.current = remaining;
            lastHapticPercentage.current = percentage;
            isFirstRender.current = false;
            return;
        }

        // Set animations to start from previous values
        animatedValue.setValue(previousPercentage.current);
        numberAnimation.setValue(previousRemaining.current);

        Animated.timing(animatedValue, {
            toValue: percentage,
            duration: 800,
            useNativeDriver: false,
        }).start();

        // Animate number from previous value to new value
        Animated.timing(numberAnimation, {
            toValue: remaining,
            duration: 800,
            delay: 100,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false,
        }).start();

        // Check if percentage is increasing before updating
        const wasIncreasing = percentage > previousPercentage.current;
        const oldPercentage = previousPercentage.current;

        // Update previous values
        previousPercentage.current = percentage;
        previousRemaining.current = remaining;

        // Reset haptic tracking to start from old value when increasing
        if (wasIncreasing) {
            lastHapticPercentage.current = oldPercentage;
        }

        // Listen to animated value changes and update dash offset
        const listener = animatedValue.addListener(({ value }) => {
            // When percentage is 0, offset is full circumference (no progress shown)
            // When percentage is 100, offset is 0 (full progress shown)
            const offset = circumference - (value / 100) * circumference;
            setDashOffset(offset);
            
            // Ramping haptic feedback as progress increases (only when filling up)
            const currentPercentage = value;
            const percentageDiff = currentPercentage - lastHapticPercentage.current;
            
            // Ramping haptic feedback - trigger every ~0.15% increase with intensity based on progress
            // Only trigger if value is increasing
            if (percentageDiff > 0 && percentageDiff >= 0.15) {
                // Ramp up intensity based on progress: Light (< 33%), Medium (33-66%), Heavy (> 66%)
                let hapticStyle: Haptics.ImpactFeedbackStyle;
                if (currentPercentage < 33) {
                    hapticStyle = Haptics.ImpactFeedbackStyle.Light;
                } else if (currentPercentage < 66) {
                    hapticStyle = Haptics.ImpactFeedbackStyle.Medium;
                } else {
                    hapticStyle = Haptics.ImpactFeedbackStyle.Heavy;
                }
                
                try {
                    Haptics.impactAsync(hapticStyle);
                } catch (error) {
                    // Silently fail if haptics not available
                }
                lastHapticPercentage.current = currentPercentage;
            }
        });

        return () => {
            animatedValue.removeListener(listener);
        };
    }, [percentage, circumference, remaining]);

    return (
        <View style={calorieStyles.container}>
            <View style={calorieStyles.circleContainer}>
                <Svg width={size} height={size} viewBox={`-${borderWidth * 2} -${borderWidth * 2} ${size + borderWidth * 4} ${size + borderWidth * 4}`}>
                    {/* Outer border circle (black, thicker) */}
                    <Circle
                        cx={center}
                        cy={center}
                        r={outerBorderRadius}
                        stroke="#252525"
                        strokeWidth={borderWidth * 2 + 0.5}
                        fill="transparent"
                        strokeLinecap="round"
                    />

                    {/* Background circle (very light gray) - full circle */}
                    <Circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="#F5F5F5"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeDashoffset={0}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${center} ${center})`}
                    />

                    {/* Progress circle (blue, animated) - full circle */}
                    <Circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="#4463F7"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${center} ${center})`}
                    />

                    {/* Inner border circle (black, 2px) */}
                    <Circle
                        cx={center}
                        cy={center}
                        r={innerBorderRadius}
                        stroke="#252525"
                        strokeWidth={borderWidth + 0.5}
                        fill="transparent"
                        strokeLinecap="round"
                    />
                </Svg>

                {/* Center text */}
                <View style={calorieStyles.textContainer}>
                    <AnimatedNumber
                        value={numberAnimation}
                        target={remaining}
                        style={calorieStyles.number}
                    />
                    <Text style={calorieStyles.label}>kcal left</Text>
                </View>
            </View>
        </View>
    );
};

// Internal component: Macro Progress Bar
interface MacroProgressBarProps {
    label: string;
    current: number;
    target: number;
    color: string;
    hasBottomSpacing?: boolean;
}

const MacroProgressBar: React.FC<MacroProgressBarProps> = ({
    label,
    current,
    target,
    color,
    hasBottomSpacing = true,
}) => {
    const percentage = Math.min(100, (current / target) * 100);
    const displayTarget = Math.round(target);

    // Animation for smooth progress bar fill
    const animatedWidth = useRef(new Animated.Value(percentage)).current;
    const previousPercentage = useRef(percentage);

    // Animation for number counting
    const numberAnimation = useRef(new Animated.Value(current)).current;
    const previousCurrent = useRef(current);
    
    // Track last haptic value for macro bars
    const lastHapticPercentage = useRef(percentage);
    
    // Track if this is the first render to prevent animation on initial load
    const isFirstRender = useRef(true);

    useEffect(() => {
        // On first render, set values immediately without animation
        if (isFirstRender.current) {
            animatedWidth.setValue(percentage);
            numberAnimation.setValue(current);
            previousPercentage.current = percentage;
            previousCurrent.current = current;
            lastHapticPercentage.current = percentage;
            isFirstRender.current = false;
            return;
        }

        // Set animations to start from previous values
        animatedWidth.setValue(previousPercentage.current);
        numberAnimation.setValue(previousCurrent.current);

        // Check if percentage is increasing before updating
        const wasIncreasing = percentage > previousPercentage.current;
        const oldPercentage = previousPercentage.current;

        Animated.timing(animatedWidth, {
            toValue: percentage,
            duration: 800,
            useNativeDriver: false,
        }).start();

        // Animate number from previous value to new value
        Animated.timing(numberAnimation, {
            toValue: current,
            duration: 800,
            delay: 100,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false,
        }).start();

        // Update previous values
        previousPercentage.current = percentage;
        previousCurrent.current = current;
        
        // Reset haptic tracking to start from old value when increasing
        if (wasIncreasing) {
            lastHapticPercentage.current = oldPercentage;
        }
        
        // Listen to animated value changes for haptic feedback
        const listener = animatedWidth.addListener(({ value }) => {
            const currentPercentage = value;
            const percentageDiff = currentPercentage - lastHapticPercentage.current;
            
            // Ramping haptic feedback - trigger every ~0.15% increase with intensity based on progress
            // Only trigger if value is increasing
            if (percentageDiff > 0 && percentageDiff >= 0.15) {
                // Ramp up intensity based on progress: Light (< 33%), Medium (33-66%), Heavy (> 66%)
                let hapticStyle: Haptics.ImpactFeedbackStyle;
                if (currentPercentage < 33) {
                    hapticStyle = Haptics.ImpactFeedbackStyle.Light;
                } else if (currentPercentage < 66) {
                    hapticStyle = Haptics.ImpactFeedbackStyle.Medium;
                } else {
                    hapticStyle = Haptics.ImpactFeedbackStyle.Heavy;
                }
                
                try {
                    Haptics.impactAsync(hapticStyle);
                } catch (error) {
                    // Silently fail if haptics not available
                }
                lastHapticPercentage.current = currentPercentage;
            }
        });

        return () => {
            animatedWidth.removeListener(listener);
        };
    }, [percentage, current]);

    const widthInterpolated = animatedWidth.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={[macroBarStyles.container, !hasBottomSpacing && macroBarStyles.containerNoSpacing]}>
            <View style={macroBarStyles.labelRow}>
                <Text style={macroBarStyles.label}>{label}</Text>
                <View style={macroBarStyles.valueContainer}>
                    <AnimatedNumber
                        value={numberAnimation}
                        target={current}
                        style={macroBarStyles.value}
                    />
                    <Text style={macroBarStyles.value}>/{displayTarget}g</Text>
                </View>
            </View>
            <View style={macroBarStyles.barContainer}>
                <Animated.View
                    style={[
                        macroBarStyles.barFill,
                        {
                            width: widthInterpolated,
                            backgroundColor: color
                        }
                    ]}
                />
            </View>
        </View>
    );
};

// Main component: Macros Card
export const MacrosCard: React.FC<MacrosCardProps> = ({ macros, consumed, loading = false }) => {
    // Use default values if not provided
    const defaultMacros = { calories: 2000, protein: 150, carbs: 200, fats: 65 };
    const defaultConsumed = { calories: 0, protein: 0, carbs: 0, fats: 0 };
    
    const finalMacros = macros || defaultMacros;
    const finalConsumed = consumed || defaultConsumed;

    return (
        <View style={homeScreenStyles.contentCard}>
            <View style={homeScreenStyles.cardContent}>
                {/* Left: Calorie Progress */}
                <View style={homeScreenStyles.calorieSection}>
                    <CalorieCircularProgress
                        totalCalories={finalMacros.calories}
                        consumedCalories={finalConsumed.calories}
                    />
                </View>

                {/* Right: Macro Progress Bars */}
                <View style={homeScreenStyles.macrosSection}>
                    <MacroProgressBar
                        label="protein"
                        current={finalConsumed.protein}
                        target={finalMacros.protein}
                        color="#26F170"
                        hasBottomSpacing={true}
                    />
                    <MacroProgressBar
                        label="carbs"
                        current={finalConsumed.carbs}
                        target={finalMacros.carbs}
                        color="#FFD700"
                        hasBottomSpacing={true}
                    />
                    <MacroProgressBar
                        label="fats"
                        current={finalConsumed.fats}
                        target={finalMacros.fats}
                        color="#FF5151"
                        hasBottomSpacing={false}
                    />
                </View>
            </View>
        </View>
    );
};

// Styles for CalorieCircularProgress
const calorieStyles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleContainer: {
        width: 150,
        height: 150,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    number: {
        fontSize: 24,
        fontFamily: fonts.bold,
        color: '#252525',
        marginBottom: 0,
        fontWeight: 'bold',
    },
    label: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
    },
});

// Styles for MacroProgressBar
const macroBarStyles = StyleSheet.create({
    container: {
        marginBottom: 7,
    },
    containerNoSpacing: {
        marginBottom: 5,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',

    },
    label: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    valueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    value: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#252525',
    },
    barContainer: {
        width: '100%',
        maxWidth: 220,
        height: 15,
        backgroundColor: '#F5F5F5',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#252525',
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
    },
});
