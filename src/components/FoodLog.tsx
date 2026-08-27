import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/fonts';
import { useAddFood } from '../context/AddFoodContext';

interface FoodItem {
    name: string;
    calories: number;
    time: string; // e.g., "5m", "15m", "41m"
}

interface FoodLogProps {
    items?: FoodItem[];
    onPress?: () => void;
}

export interface FoodLogTargetRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface FoodLogHandle {
    measureTarget: () => Promise<FoodLogTargetRect | null>;
    getTargetRect: () => FoodLogTargetRect | null;
    pulse: () => void;
}

export const FoodLog = forwardRef<FoodLogHandle, FoodLogProps>(({
    items = [],
    onPress
}, ref) => {
    const { showAddFoodSheet } = useAddFood();
    const rootRef = useRef<View>(null);
    const lastRectRef = useRef<FoodLogTargetRect | null>(null);
    const pulseAnim = useRef(new Animated.Value(0)).current;
    const isEmpty = !items || items.length === 0;
    const lastTapRef = useRef<number>(0);
    const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const DOUBLE_TAP_DELAY = 300;

    const captureRect = () => {
        const node = rootRef.current;
        if (!node) return;
        node.measureInWindow((x, y, width, height) => {
            if (width > 0 && height > 0) {
                lastRectRef.current = { x, y, width, height };
            }
        });
    };

    useImperativeHandle(ref, () => ({
        getTargetRect: () => lastRectRef.current,
        measureTarget: () =>
            new Promise((resolve) => {
                if (lastRectRef.current) {
                    resolve(lastRectRef.current);
                    captureRect();
                    return;
                }
                const node = rootRef.current;
                if (!node) {
                    resolve(null);
                    return;
                }
                node.measureInWindow((x, y, width, height) => {
                    if (width <= 0 || height <= 0) {
                        resolve(null);
                        return;
                    }
                    const rect = { x, y, width, height };
                    lastRectRef.current = rect;
                    resolve(rect);
                });
            }),
        pulse: () => {
            pulseAnim.stopAnimation();
            pulseAnim.setValue(0);
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 160,
                    easing: Easing.out(Easing.back(2.2)),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0,
                    duration: 240,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        },
    }));

    const handlePress = () => {
        const now = Date.now();

        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            if (tapTimeoutRef.current) {
                clearTimeout(tapTimeoutRef.current);
                tapTimeoutRef.current = null;
            }
            lastTapRef.current = 0;
            showAddFoodSheet();
            return;
        }

        lastTapRef.current = now;
        if (tapTimeoutRef.current) {
            clearTimeout(tapTimeoutRef.current);
        }
        tapTimeoutRef.current = setTimeout(() => {
            tapTimeoutRef.current = null;
            if (onPress) {
                onPress();
            }
        }, DOUBLE_TAP_DELAY);
    };

    const pulseScale = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.035],
    });

    return (
        <Animated.View
            ref={rootRef}
            collapsable={false}
            style={{ transform: [{ scale: pulseScale }] }}
            onLayout={captureRect}
        >
            <TouchableOpacity
                style={styles.container}
                onPress={handlePress}
                activeOpacity={0.7}
            >
                <View style={styles.header}>
                    <Text style={styles.headerText}>food log</Text>
                    <Ionicons name="chevron-forward" size={20} color="#252525" />
                </View>

                <View style={styles.separator} />

                {isEmpty ? (
                    <View style={styles.emptyStateContainer}>
                        <Text style={styles.emptyStateText}>tap to view, double tap to log meal!</Text>
                    </View>
                ) : (
                    <View style={styles.itemsContainer}>
                        {items.map((item, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.itemRow,
                                    index === 0 && styles.firstItemSpacing,
                                    index < items.length - 1 && styles.itemSpacing
                                ]}
                            >
                                <Text style={styles.itemName}>{item.name}</Text>
                                <View style={styles.itemRight}>
                                    <Text style={styles.itemCalories}>{item.calories} kcal</Text>
                                    <Image
                                        source={require('../../assets/images/icons/fire.png')}
                                        style={styles.flameIcon}
                                        resizeMode="contain"
                                    />
                                    <View style={styles.verticalSeparator} />
                                    <Text style={styles.itemTime}>{item.time}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
});

FoodLog.displayName = 'FoodLog';

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 2.5,
        borderColor: '#252525',
        paddingTop: 5,
        paddingBottom: 10,
        paddingHorizontal: 15,
        marginTop: 16,
        height: 140,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 1,
        paddingBottom: 6,
    },
    headerText: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    separator: {
        height: 2,
        backgroundColor: '#E0E0E0',
        marginHorizontal: -15,
        marginBottom: 4,
    },
    itemsContainer: {
        width: '100%',
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
        minHeight: 60,
    },
    emptyStateText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: 'rgba(37, 37, 37, 0.5)',
        textTransform: 'lowercase',
        textAlign: 'center',
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    firstItemSpacing: {
        paddingTop: 5,
    },
    itemSpacing: {
        marginBottom: 9,
    },
    itemName: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
        flex: 1,
    },
    itemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemCalories: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
        marginRight: 8,
    },
    flameIcon: {
        width: 18,
        height: 18,
        marginRight: 8,
    },
    verticalSeparator: {
        width: 1,
        height: 16,
        backgroundColor: '#E0E0E0',
        marginRight: 8,
    },
    itemTime: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        minWidth: 30,
        textAlign: 'right',
    },
});
