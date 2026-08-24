import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { fonts } from '../../constants/fonts';
import { PICK_WORKOUT_LAYOUT, WORKOUT_COLORS } from '../../workout/constants';

type BodySide = 'front' | 'back';

interface PickWorkoutTopBarProps {
    side: BodySide;
    onSideChange: (side: BodySide) => void;
    onClose: () => void;
}

const TOGGLE_PADDING = 3;

export const PickWorkoutTopBar: React.FC<PickWorkoutTopBarProps> = ({
    side,
    onSideChange,
    onClose,
}) => {
    const [toggleWidth, setToggleWidth] = useState(0);
    const slideAnim = useRef(new Animated.Value(side === 'front' ? 0 : 1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const segmentWidth =
        toggleWidth > 0 ? (toggleWidth - TOGGLE_PADDING * 2 - borderWidth * 2) / 2 : 0;

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: side === 'front' ? 0 : 1,
            friction: 7,
            tension: 130,
            useNativeDriver: true,
        }).start();
    }, [side, slideAnim]);

    const selectSide = (nextSide: BodySide) => {
        if (nextSide === side) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.96,
                duration: 80,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 5,
                tension: 180,
                useNativeDriver: true,
            }),
        ]).start();

        onSideChange(nextSide);
    };

    const handleToggleLayout = (event: LayoutChangeEvent) => {
        setToggleWidth(event.nativeEvent.layout.width);
    };

    const indicatorTranslateX = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, segmentWidth],
    });

    return (
        <View style={styles.bar}>
            <View style={styles.sideLeft}>
                <TouchableOpacity
                    style={styles.sideSlot}
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Close pick workout"
                >
                    <Ionicons name="close" size={22} color={WORKOUT_COLORS.text} />
                </TouchableOpacity>
            </View>

            <Animated.View
                style={[styles.toggleRow, { transform: [{ scale: scaleAnim }] }]}
                onLayout={handleToggleLayout}
                accessibilityRole="tablist"
            >
                {segmentWidth > 0 ? (
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.toggleIndicator,
                            {
                                width: segmentWidth,
                                transform: [{ translateX: indicatorTranslateX }],
                            },
                        ]}
                    />
                ) : null}

                <TouchableOpacity
                    style={styles.toggleSegment}
                    onPress={() => selectSide('front')}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: side === 'front' }}
                >
                    <Text style={[styles.toggleText, side === 'front' && styles.toggleTextActive]}>
                        front
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.toggleSegment}
                    onPress={() => selectSide('back')}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: side === 'back' }}
                >
                    <Text style={[styles.toggleText, side === 'back' && styles.toggleTextActive]}>
                        back
                    </Text>
                </TouchableOpacity>
            </Animated.View>

            <View style={styles.sideRight} />
        </View>
    );
};

const { topBarHeight, padding, borderWidth } = PICK_WORKOUT_LAYOUT;
const SIDE_SLOT = 44;

const styles = StyleSheet.create({
    bar: {
        height: topBarHeight,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: padding,
        paddingVertical: padding,
        backgroundColor: WORKOUT_COLORS.background,
    },
    sideLeft: {
        flex: 1,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    sideRight: {
        flex: 1,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    sideSlot: {
        width: SIDE_SLOT,
        height: SIDE_SLOT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleRow: {
        flexDirection: 'row',
        minWidth: 152,
        borderWidth,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: 999,
        padding: TOGGLE_PADDING,
        backgroundColor: WORKOUT_COLORS.background,
        position: 'relative',
    },
    toggleIndicator: {
        position: 'absolute',
        top: TOGGLE_PADDING,
        left: TOGGLE_PADDING,
        height: 28,
        borderRadius: 999,
        backgroundColor: WORKOUT_COLORS.accent,
    },
    toggleSegment: {
        flex: 1,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        paddingHorizontal: padding,
        zIndex: 1,
    },
    toggleText: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    toggleTextActive: {
        fontFamily: fonts.bold,
        color: WORKOUT_COLORS.background,
    },
});
