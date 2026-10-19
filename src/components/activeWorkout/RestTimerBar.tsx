import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, LayoutChangeEvent } from 'react-native';
import Reanimated, {
    Easing as ReanimatedEasing,
    interpolate,
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import { formatRestDuration } from '../../workout/workoutSelectors';
import { Confetti, ConfettiParticle } from '../Confetti';
import { FlatTick } from './FlatMark';

const DONE_SIZE = 36;

interface RestTimerBarProps {
    visible: boolean;
    remainingSeconds: number;
    progress: SharedValue<number>;
    celebrateAt?: number;
    onSkip: () => void;
}

const CONFETTI_COLORS = ['#526EFF', '#F9C117', '#FF5151', '#2ED573', '#B06BFF', '#FF8A3D'];
const SHADOW_OFFSET = 4;
const PRESS_ANIM_MS = 120;

interface PressButtonProps {
    onPress: () => void;
    children: React.ReactNode;
    accessibilityLabel: string;
}

const PressButton: React.FC<PressButtonProps> = ({
    onPress,
    children,
    accessibilityLabel,
}) => {
    const translateY = useRef(new Animated.Value(0)).current;
    const shadowOpacity = useRef(new Animated.Value(1)).current;

    const pressIn = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: SHADOW_OFFSET,
                duration: PRESS_ANIM_MS,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(shadowOpacity, {
                toValue: 0,
                duration: PRESS_ANIM_MS,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();
    };

    const pressOut = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 0,
                duration: PRESS_ANIM_MS,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(shadowOpacity, {
                toValue: 1,
                duration: PRESS_ANIM_MS,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();
    };

    return (
        <View style={styles.pressWrap}>
            <Animated.View style={[styles.pressShadow, { opacity: shadowOpacity }]} pointerEvents="none" />
            <TouchableOpacity
                onPress={onPress}
                onPressIn={pressIn}
                onPressOut={pressOut}
                activeOpacity={1}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
            >
                <Animated.View style={[styles.doneFace, { transform: [{ translateY }] }]}>
                    {children}
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
};

export const RestTimerBar: React.FC<RestTimerBarProps> = ({
    visible,
    remainingSeconds,
    progress,
    celebrateAt = 0,
    onSkip,
}) => {
    const [mounted, setMounted] = useState(visible);
    const [celebrating, setCelebrating] = useState(false);
    const [particles, setParticles] = useState<ConfettiParticle[]>([]);
    const cardLayoutRef = useRef({ x: 16, y: 0, width: 0, height: 0 });
    const frozenRemaining = useRef(remainingSeconds);
    const mountedRef = useRef(visible);
    const anim = useSharedValue(visible ? 1 : 0);
    const frozenProgress = useSharedValue(0);
    const visibleSV = useSharedValue(visible ? 1 : 0);

    if (visible) {
        frozenRemaining.current = remainingSeconds;
    }

    useEffect(() => {
        visibleSV.value = visible ? 1 : 0;
        if (!visible) frozenProgress.value = progress.value;
    }, [visible, visibleSV, frozenProgress, progress]);

    useEffect(() => {
        if (visible) {
            mountedRef.current = true;
            setMounted(true);
            anim.value = withTiming(1, {
                duration: 180,
                easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
            });
            return;
        }

        if (!mountedRef.current) return;

        const hideDuration = 180;
        anim.value = withTiming(0, {
            duration: hideDuration,
            easing: ReanimatedEasing.out(ReanimatedEasing.quad),
        });
        const hideTimeout = setTimeout(() => {
            mountedRef.current = false;
            setMounted(false);
        }, hideDuration);
        return () => clearTimeout(hideTimeout);
    }, [visible, anim]);

    useEffect(() => {
        if (!celebrateAt) return;
        const { x, y, width, height } = cardLayoutRef.current;
        const burst: ConfettiParticle[] = Array.from({ length: 12 }, (_, i) => ({
            id: celebrateAt + i,
            originX: x + width * (0.1 + Math.random() * 0.8),
            originY: y + height,
            angle: -30 - Math.random() * 120,
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        }));
        setParticles(burst);
        setCelebrating(true);
        const timeout = setTimeout(() => {
            setCelebrating(false);
            setParticles([]);
        }, 700);
        return () => clearTimeout(timeout);
    }, [celebrateAt]);

    const handleCardLayout = (event: LayoutChangeEvent) => {
        const { x, y, width, height } = event.nativeEvent.layout;
        cardLayoutRef.current = { x, y, width, height };
    };

    const toasterStyle = useAnimatedStyle(() => ({
        opacity: anim.value,
        transform: [{ translateY: interpolate(anim.value, [0, 1], [10, 0]) }],
    }));
    const fillStyle = useAnimatedStyle(() => {
        const value = visibleSV.value ? progress.value : frozenProgress.value;
        return { transform: [{ scaleX: Math.max(0, Math.min(1, 1 - value)) }] };
    });

    if (!mounted && !celebrating) return null;

    const shownRemaining = visible ? remainingSeconds : frozenRemaining.current;

    return (
        <View pointerEvents={visible ? 'box-none' : 'none'} style={styles.wrapper} collapsable={false}>
            {celebrating ? <Confetti particles={particles} /> : null}
            {mounted ? (
                <Reanimated.View collapsable={false} style={[styles.toaster, toasterStyle]}>
                    <View onLayout={handleCardLayout} style={styles.card}>
                        <View style={styles.row}>
                            <Text style={styles.label}>
                                resting:{' '}
                                <Text style={styles.time}>{formatRestDuration(shownRemaining)}</Text>
                            </Text>
                            <PressButton onPress={onSkip} accessibilityLabel="Finish rest">
                                <FlatTick color="#FFFFFF" size={16} strokeWidth={2.4} />
                            </PressButton>
                        </View>
                        <View style={styles.progressTrack}>
                            <Reanimated.View style={[styles.progressFill, fillStyle]} />
                        </View>
                    </View>
                </Reanimated.View>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: 16,
        overflow: 'visible',
    },
    toaster: {
        overflow: 'visible',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#252525',
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 12,
        gap: 14,
        overflow: 'visible',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        overflow: 'visible',
    },
    progressTrack: {
        height: 4,
        borderRadius: 999,
        backgroundColor: '#DDE2FF',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        width: '100%',
        borderRadius: 999,
        backgroundColor: WORKOUT_COLORS.accent,
        transformOrigin: 'left center',
    },
    label: {
        flex: 1,
        fontFamily: fonts.bold,
        fontSize: 16,
        color: WORKOUT_COLORS.text,
    },
    time: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: WORKOUT_COLORS.accent,
    },
    pressWrap: {
        width: DONE_SIZE,
        height: DONE_SIZE,
        overflow: 'visible',
    },
    pressShadow: {
        position: 'absolute',
        top: SHADOW_OFFSET,
        left: 0,
        width: DONE_SIZE,
        height: DONE_SIZE,
        borderRadius: 10,
        backgroundColor: '#252525',
    },
    doneFace: {
        width: DONE_SIZE,
        height: DONE_SIZE,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#252525',
        backgroundColor: WORKOUT_COLORS.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
