import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { fonts } from '../../constants/fonts';

interface WorkoutCountdownOverlayProps {
    visible: boolean;
    onComplete: () => void;
}

const COUNTDOWN_SECONDS = 3;

export const WorkoutCountdownOverlay: React.FC<WorkoutCountdownOverlayProps> = ({
    visible,
    onComplete,
}) => {
    const [count, setCount] = useState(COUNTDOWN_SECONDS);
    const scaleAnim = useRef(new Animated.Value(0.6)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const completedRef = useRef(false);

    useEffect(() => {
        if (!visible) {
            setCount(COUNTDOWN_SECONDS);
            completedRef.current = false;
            return;
        }

        let current = COUNTDOWN_SECONDS;
        setCount(current);

        const pulse = () => {
            scaleAnim.setValue(0.55);
            opacityAnim.setValue(0.2);
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 120,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 180,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        };

        pulse();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const intervalId = setInterval(() => {
            current -= 1;
            if (current > 0) {
                setCount(current);
                pulse();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                return;
            }

            clearInterval(intervalId);
            setCount(0);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            if (!completedRef.current) {
                completedRef.current = true;
                onComplete();
            }
        }, 900);

        return () => clearInterval(intervalId);
    }, [visible, onComplete, opacityAnim, scaleAnim]);

    if (!visible) return null;

    const label = count > 0 ? String(count) : 'go!';

    return (
        <Modal visible transparent animationType="fade" statusBarTranslucent>
            <View style={styles.backdrop}>
                <Animated.Text
                    style={[
                        styles.countText,
                        {
                            opacity: opacityAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    {label}
                </Animated.Text>
                <Text style={styles.subtitle}>
                    {count > 0 ? 'get ready' : 'let\'s move'}
                </Text>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    countText: {
        fontFamily: fonts.bold,
        fontSize: 120,
        color: '#fff',
        textTransform: 'lowercase',
    },
    subtitle: {
        marginTop: 12,
        fontFamily: fonts.regular,
        fontSize: 18,
        color: 'rgba(255,255,255,0.82)',
        textTransform: 'lowercase',
    },
});
