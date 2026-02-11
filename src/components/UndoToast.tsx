import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../constants/fonts';
import * as Haptics from 'expo-haptics';

interface UndoToastProps {
    visible: boolean;
    message: string;
    onUndo: () => void;
    onDismiss?: () => void;
    duration?: number; // Auto-dismiss duration in ms (default: 3000)
    bottomOffset?: number; // Additional offset from bottom (default: 0)
    showUndo?: boolean;
    actionLabel?: string;
    onAction?: () => void;
    inline?: boolean;
    containerStyle?: StyleProp<ViewStyle>;
}

export const UndoToast: React.FC<UndoToastProps> = ({
    visible,
    message,
    onUndo,
    onDismiss,
    duration = 3000,
    bottomOffset = 0,
    showUndo = true,
    actionLabel,
    onAction,
    inline = false,
    containerStyle,
}) => {
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(inline ? 12 : -100)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (visible) {
            // Clear any existing timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Animate in
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();

            // Auto-dismiss after duration
            timeoutRef.current = setTimeout(() => {
                handleDismiss();
            }, duration);
        } else {
            handleDismiss();
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [visible]);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: inline ? 20 : -100,
                duration: 250,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 250,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start(() => {
            if (onDismiss) {
                onDismiss();
            }
        });
    };

    const handleUndo = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onUndo();
        handleDismiss();
    };

    const handleAction = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onAction) {
            onAction();
        }
        handleDismiss();
    };

    if (!visible) {
        return null;
    }

    return (
        <View
            style={[
                styles.container,
                inline ? styles.inlineContainer : { top: insets.top + 8 },
                containerStyle,
            ]}
            pointerEvents="box-none"
        >
            <Animated.View
                style={[
                    styles.toast,
                    {
                        opacity: opacityAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
                pointerEvents="auto"
            >
                <Text style={styles.toastText}>{message}</Text>
                {showUndo && (
                <TouchableOpacity onPress={handleUndo} activeOpacity={0.7}>
                    <Text style={styles.undoButtonText}>undo</Text>
                </TouchableOpacity>
                )}
                {!showUndo && actionLabel && (
                    <TouchableOpacity onPress={handleAction} activeOpacity={0.7}>
                        <Text style={styles.undoButtonText}>{actionLabel}</Text>
                    </TouchableOpacity>
                )}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        zIndex: 9999,
        elevation: 9999,
    },
    inlineContainer: {
        position: 'relative',
        top: 0,
        left: undefined,
        right: undefined,
        width: '100%',
        paddingHorizontal: 0,
        zIndex: 0,
        elevation: 0,
    },
    toast: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#252525',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    toastText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
        flex: 1,
    },
    undoButtonText: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: '#526EFF',
        textTransform: 'lowercase',
        marginLeft: 12,
    },
});

