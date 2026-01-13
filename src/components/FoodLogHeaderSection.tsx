import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/fonts';
import * as Haptics from 'expo-haptics';
import { Easing } from 'react-native';

interface FoodLogHeaderSectionProps {
    protein: number;
    carbs: number;
    fats: number;
    calories: number;
    topInset?: number;
    onProfilePress?: () => void;
}

export const FoodLogHeaderSection: React.FC<FoodLogHeaderSectionProps> = ({
    protein,
    carbs,
    fats,
    calories,
    topInset = 0,
    onProfilePress,
}) => {
    // Animation values for circle positions
    const profileCircleLeft = useRef(new Animated.Value(0)).current;
    const greenCircleLeft = useRef(new Animated.Value(10)).current;

    // Animation values for count-up
    const proteinAnim = useRef(new Animated.Value(0)).current;
    const carbsAnim = useRef(new Animated.Value(0)).current;
    const fatsAnim = useRef(new Animated.Value(0)).current;
    const caloriesAnim = useRef(new Animated.Value(0)).current;

    // Track previous values and haptic states
    const prevProtein = useRef(0);
    const prevCarbs = useRef(0);
    const prevFats = useRef(0);
    const prevCalories = useRef(0);
    const lastHapticProtein = useRef(0);
    const lastHapticCarbs = useRef(0);
    const lastHapticFats = useRef(0);
    const lastHapticCalories = useRef(0);

    // Display values from animations
    const [displayProtein, setDisplayProtein] = useState(0);
    const [displayCarbs, setDisplayCarbs] = useState(0);
    const [displayFats, setDisplayFats] = useState(0);
    const [displayCalories, setDisplayCalories] = useState(0);

    const handlePressIn = () => {
        // Animate circles to stack on blue circle (at left: 20)
        Animated.parallel([
            Animated.timing(profileCircleLeft, {
                toValue: 20,
                duration: 150,
                useNativeDriver: false,
            }),
            Animated.timing(greenCircleLeft, {
                toValue: 20,
                duration: 150,
                useNativeDriver: false,
            }),
        ]).start();
    };

    const handlePressOut = () => {
        // Animate circles back to original inline positions
        Animated.parallel([
            Animated.timing(profileCircleLeft, {
                toValue: 0,
                duration: 150,
                useNativeDriver: false,
            }),
            Animated.timing(greenCircleLeft, {
                toValue: 10,
                duration: 150,
                useNativeDriver: false,
            }),
        ]).start();
    };

    // Animate values with haptic feedback
    useEffect(() => {
        const duration = 1500; // 1.5 seconds for count-up

        // Start animations from current displayed values (not previous props)
        // This ensures smooth animation even if component remounts
        const startProtein = displayProtein;
        const startCarbs = displayCarbs;
        const startFats = displayFats;
        const startCalories = displayCalories;

        // Set animations to start from current display values
        proteinAnim.setValue(startProtein);
        carbsAnim.setValue(startCarbs);
        fatsAnim.setValue(startFats);
        caloriesAnim.setValue(startCalories);

        // Reset haptic tracking to current display values
        lastHapticProtein.current = startProtein;
        lastHapticCarbs.current = startCarbs;
        lastHapticFats.current = startFats;
        lastHapticCalories.current = startCalories;

        // Animate protein
        const proteinListener = proteinAnim.addListener(({ value }) => {
            const rounded = Math.round(value);
            setDisplayProtein(rounded);

            // Haptic feedback every increment during count-up
            const diff = rounded - lastHapticProtein.current;
            if (diff >= 1) {
                try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch (error) {
                    // Silently fail if haptics not available
                }
                lastHapticProtein.current = rounded;
            }
        });

        // Animate carbs
        const carbsListener = carbsAnim.addListener(({ value }) => {
            const rounded = Math.round(value);
            setDisplayCarbs(rounded);

            // Haptic feedback every increment during count-up
            const diff = rounded - lastHapticCarbs.current;
            if (diff >= 1) {
                try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch (error) {
                    // Silently fail if haptics not available
                }
                lastHapticCarbs.current = rounded;
            }
        });

        // Animate fats
        const fatsListener = fatsAnim.addListener(({ value }) => {
            const rounded = Math.round(value);
            setDisplayFats(rounded);

            // Haptic feedback every increment during count-up
            const diff = rounded - lastHapticFats.current;
            if (diff >= 1) {
                try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch (error) {
                    // Silently fail if haptics not available
                }
                lastHapticFats.current = rounded;
            }
        });

        // Animate calories
        const caloriesListener = caloriesAnim.addListener(({ value }) => {
            const rounded = Math.round(value);
            setDisplayCalories(rounded);

            // Haptic feedback every 5 calories during count-up (more frequent for calories)
            const diff = rounded - lastHapticCalories.current;
            const threshold = calories > 50 ? 5 : 1;
            if (diff >= threshold) {
                try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch (error) {
                    // Silently fail if haptics not available
                }
                lastHapticCalories.current = rounded;
            }
        });

        // Start animations
        Animated.parallel([
            Animated.timing(proteinAnim, {
                toValue: protein,
                duration: duration,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            }),
            Animated.timing(carbsAnim, {
                toValue: carbs,
                duration: duration,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            }),
            Animated.timing(fatsAnim, {
                toValue: fats,
                duration: duration,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            }),
            Animated.timing(caloriesAnim, {
                toValue: calories,
                duration: duration,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            }),
        ]).start();

        // Update previous values
        prevProtein.current = protein;
        prevCarbs.current = carbs;
        prevFats.current = fats;
        prevCalories.current = calories;

        return () => {
            proteinAnim.removeListener(proteinListener);
            carbsAnim.removeListener(carbsListener);
            fatsAnim.removeListener(fatsListener);
            caloriesAnim.removeListener(caloriesListener);
        };
    }, [protein, carbs, fats, calories]);

    // Format number without decimals
    const formatNumber = (num: number): string => {
        return Math.round(num).toString();
    };

    return (
        <View style={[styles.container, { paddingTop: 12 }]}>
            {/* Macros and calories row */}
            <View style={styles.topRow}>
                <View style={styles.macroSection}>
                    <View style={styles.macroRow}>
                        <View style={styles.macroItem}>
                            <View style={[styles.macroDot, styles.proteinDot]} />
                            <Text style={styles.macroLabel}><Text style={styles.macroLetter}>P</Text> {formatNumber(displayProtein)}g</Text>
                        </View>
                        <Text style={styles.separator}>|</Text>
                        <View style={styles.macroItem}>
                            <View style={[styles.macroDot, styles.carbsDot]} />
                            <Text style={styles.macroLabel}><Text style={styles.macroLetter}>C</Text> {formatNumber(displayCarbs)}g</Text>
                        </View>
                        <Text style={styles.separator}>|</Text>
                        <View style={styles.macroItem}>
                            <View style={[styles.macroDot, styles.fatsDot]} />
                            <Text style={styles.macroLabel}><Text style={styles.macroLetter}>F</Text> {formatNumber(displayFats)}g</Text>
                        </View>
                    </View>
                    <View style={styles.caloriesRow}>
                        <Text style={styles.caloriesText}>{formatNumber(displayCalories)}kcal</Text>
                    </View>
                </View>

                {/* User icon */}
                <TouchableOpacity
                    onPress={onProfilePress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    style={styles.profileButton}
                >
                    <View style={styles.profileContainer}>
                        <Animated.View style={[styles.profileCircle, { left: profileCircleLeft }]}>
                            <Image
                                source={require('../../assets/images/temp_pfp.png')}
                                style={styles.profileImage}
                                resizeMode="cover"
                            />
                        </Animated.View>
                        <Animated.View style={[styles.profileCircleGreen, { left: greenCircleLeft }]} />
                        <View style={styles.profileCircleBlue} />
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        // paddingHorizontal: 25,
        paddingTop: 0,
        paddingBottom: 20,
        zIndex: 1,
        elevation: 1, // Android elevation
        marginTop: -300,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    macroSection: {
        flex: 1,
    },
    macroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: -4,
    },
    macroItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    macroDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    proteinDot: {
        backgroundColor: '#26F170',
    },
    carbsDot: {
        backgroundColor: '#FFD700',
    },
    fatsDot: {
        backgroundColor: '#FF5151',
    },
    macroLabel: {
        fontSize: 22,
        fontFamily: fonts.regular,
        color: '#fff',
        textTransform: 'lowercase',
        marginBottom: 0,
    },
    macroLetter: {
        textTransform: 'uppercase',
    },
    separator: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: 'rgba(255, 255, 255, 0.5)',
        marginHorizontal: 12,
    },
    caloriesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 1,
    },
    caloriesText: {
        fontSize: 32,
        fontFamily: fonts.bold,
        color: '#fff',
        textTransform: 'lowercase',
    },
    profileButton: {
        marginLeft: 16,
    },
    profileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        width: 80, // Main circle (60px) + blue circle extends to 80px
    },
    profileCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#252525',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        zIndex: 3,
        overflow: 'hidden',
    },
    profileImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    profileCircleGreen: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#26F170',
        borderWidth: 2,
        borderColor: '#252525',
        position: 'absolute',
        zIndex: 2,
    },
    profileCircleBlue: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#4463F7',
        borderWidth: 2,
        borderColor: '#252525',
        position: 'absolute',
        left: 20,
        zIndex: 1,
    },
});

