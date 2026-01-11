import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { fonts } from '../constants/fonts';

interface MacroStatusCompactProps {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    targetCalories?: number;
    targetProtein?: number;
    targetCarbs?: number;
    targetFats?: number;
}

export interface MacroStatusCompactRef {
    collapse: () => void;
}

export const MacroStatusCompact = forwardRef<MacroStatusCompactRef, MacroStatusCompactProps>(({
    calories,
    protein,
    carbs,
    fats,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFats,
}, ref) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const expandHeight = useRef(new Animated.Value(0)).current;
    const expandOpacity = useRef(new Animated.Value(0)).current;
    const containerHeight = useRef(new Animated.Value(50)).current;

    useImperativeHandle(ref, () => ({
        collapse: () => {
            setIsExpanded(false);
        },
    }));

    // Format number with commas
    const formatNumber = (num: number): string => {
        return Math.round(num).toLocaleString('en-US');
    };

    // Handle expand/collapse animation
    useEffect(() => {
        Animated.parallel([
            Animated.timing(expandHeight, {
                toValue: isExpanded ? 1 : 0,
                duration: 200,
                useNativeDriver: false,
            }),
            Animated.timing(expandOpacity, {
                toValue: isExpanded ? 1 : 0,
                duration: 200,
                useNativeDriver: false,
            }),
        ]).start();
    }, [isExpanded]);

    const isTappable = !!(targetCalories || targetProtein || targetCarbs || targetFats);

    const handlePress = () => {
        if (isTappable) {
            setIsExpanded(!isExpanded);
        }
    };

    // Handle container height animation
    useEffect(() => {
        Animated.timing(containerHeight, {
            toValue: isExpanded ? 180 : 50,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [isExpanded, containerHeight]);

    return (
        <Animated.View style={[styles.container, { height: containerHeight }]}>
            <TouchableOpacity
                activeOpacity={isTappable ? 0.7 : 1}
                onPress={handlePress}
                disabled={!isTappable}
                style={styles.touchableContent}
            >
                {/* Single-line status (collapsed) */}
                <View style={styles.statusRow}>
                    <View style={styles.calorieContainer}>
                        <Text style={styles.calorieText}>
                            {formatNumber(calories)} kcal
                        </Text>
                    </View>
                    <Text style={styles.separator}>|</Text>
                    <View style={styles.macroContainer}>
                        <View style={[styles.macroDot, styles.proteinDot]} />
                        <Text style={styles.macroText}>P {formatNumber(protein)}g</Text>
                    </View>
                    <Text style={styles.separator}>|</Text>
                    <View style={styles.macroContainerWide}>
                        <View style={[styles.macroDot, styles.carbsDot]} />
                        <Text style={styles.macroText}>C {formatNumber(carbs)}g</Text>
                    </View>
                    <Text style={styles.separator}>|</Text>
                    <View style={styles.macroContainerWide}>
                        <View style={[styles.macroDot, styles.fatsDot]} />
                        <Text style={styles.macroText}>F {formatNumber(fats)}g</Text>
                    </View>
                </View>

                {/* Expanded breakdown (text-only) */}
                {isTappable && (
                    <Animated.View
                        style={[
                            styles.expandedContainer,
                            {
                                maxHeight: expandHeight.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 130],
                                }),
                                opacity: expandOpacity,
                            },
                        ]}
                    >
                        <View style={styles.breakdownContainer}>
                            {targetCalories !== undefined && (
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>Calories</Text>
                                    <Text style={styles.breakdownValue}>
                                        {formatNumber(calories)} / {formatNumber(targetCalories)} kcal
                                    </Text>
                                </View>
                            )}
                            {targetProtein !== undefined && (
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>Protein</Text>
                                    <Text style={styles.breakdownValue}>
                                        {formatNumber(protein)}g / {formatNumber(targetProtein)}g
                                    </Text>
                                </View>
                            )}
                            {targetCarbs !== undefined && (
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>Carbs</Text>
                                    <Text style={styles.breakdownValue}>
                                        {formatNumber(carbs)}g / {formatNumber(targetCarbs)}g
                                    </Text>
                                </View>
                            )}
                            {targetFats !== undefined && (
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>Fat</Text>
                                    <Text style={styles.breakdownValue}>
                                        {formatNumber(fats)}g / {formatNumber(targetFats)}g
                                    </Text>
                                </View>
                            )}
                        </View>
                    </Animated.View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'transparent',
        borderRadius: 10,
        marginHorizontal: 22,
        marginTop: 0,
        marginBottom: 0,
        overflow: 'hidden',
    },
    touchableContent: {
        paddingTop: 10,
        paddingBottom: 4,
        paddingHorizontal: 16,
        height: '100%',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'nowrap',
    },
    calorieContainer: {
        width: 90,
        alignItems: 'center',
    },
    calorieText: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#fff',
        textTransform: 'lowercase',
        letterSpacing: -0.2,
    },
    macroContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 60,
        justifyContent: 'center',
        gap: 4,
    },
    macroContainerWide: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 65,
        justifyContent: 'center',
        gap: 4,
    },
    macroDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    proteinDot: {
        backgroundColor: '#26F170', // Green
    },
    carbsDot: {
        backgroundColor: '#FFD700', // Yellow
    },
    fatsDot: {
        backgroundColor: '#FF5151', // Red
    },
    macroText: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#fff',
        letterSpacing: -0.2,
    },
    separator: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: 'rgba(255, 255, 255, 0.5)',
        marginHorizontal: 12,
    },
    expandedContainer: {
        overflow: 'hidden',
        marginTop: 10,
        paddingTop: 4,
    },
    breakdownContainer: {
        gap: 8,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    breakdownLabel: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: '#fff',
        textTransform: 'lowercase',
        letterSpacing: -0.1,
        minWidth: 70,
    },
    breakdownValue: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#fff',
        textTransform: 'lowercase',
        letterSpacing: -0.1,
    },
    divider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginTop: 12,
    },
});

