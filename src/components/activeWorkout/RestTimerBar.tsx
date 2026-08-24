import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

interface RestTimerBarProps {
    visible: boolean;
    remainingSeconds: number;
    progress: SharedValue<number>;
    celebrateAt?: number;
    onAdjust: (deltaSeconds: number) => void;
    onSkip: () => void;
}

const CONFETTI_COLORS = ['#526EFF', '#F9C117', '#FF5151', '#2ED573', '#B06BFF', '#FF8A3D'];
const SHADOW_OFFSET = 4;
const PRESS_ANIM_MS = 120;

interface PressButtonProps {
    label: string;
    onPress: () => void;
    buttonStyle: object;
    textStyle: object;
    hitSlop?: { top: number; bottom: number; left: number; right: number };
}

const PressButton: React.FC<PressButtonProps> = ({ label, onPress, buttonStyle, textStyle, hitSlop }) => {
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
                hitSlop={hitSlop}
            >
                <Animated.View style={[buttonStyle, { transform: [{ translateY }] }]}>
                    <Text style={textStyle}>{label}</Text>
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
    onAdjust,
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
        if (!visible) {
            frozenProgress.value = progress.value;
        }
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
        transform: [{ translateY: interpolate(anim.value, [0, 1], [36, 0]) }],
    }));

    const fillStyle = useAnimatedStyle(() => {
        const value = visibleSV.value ? progress.value : frozenProgress.value;
        return { transform: [{ scaleX: Math.max(0, Math.min(1, value)) }] };
    });

    if (!mounted && !celebrating) return null;

    const shownRemaining = visible ? remainingSeconds : frozenRemaining.current;

    return (
        <View pointerEvents={visible ? 'box-none' : 'none'} style={styles.wrapper} collapsable={false}>
            {celebrating ? <Confetti particles={particles} /> : null}
            {mounted ? (
                <Reanimated.View collapsable={false} style={[styles.toaster, toasterStyle]}>
                    <LinearGradient
                        pointerEvents="none"
                        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.92)', '#FFFFFF']}
                        locations={[0, 0.45, 1]}
                        style={styles.backdrop}
                    />
                    <View onLayout={handleCardLayout} style={styles.card}>
                <View style={styles.topRow}>
                    <View style={styles.centerTop}>
                        <Text style={styles.label}>rest</Text>
                        <Text style={styles.countdown}>{formatRestDuration(shownRemaining)}</Text>
                    </View>

                    <View style={styles.buttons}>
                        <PressButton
                            label="-15"
                            buttonStyle={styles.adjustButton}
                            textStyle={styles.adjustText}
                            hitSlop={{ top: 12, bottom: 12, left: 8, right: 6 }}
                            onPress={() => onAdjust(-15)}
                        />
                        <PressButton
                            label="+15"
                            buttonStyle={styles.adjustButton}
                            textStyle={styles.adjustText}
                            hitSlop={{ top: 12, bottom: 12, left: 6, right: 8 }}
                            onPress={() => onAdjust(15)}
                        />
                        <PressButton
                            label="done"
                            buttonStyle={styles.skipButton}
                            textStyle={styles.skipText}
                            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                            onPress={onSkip}
                        />
                    </View>
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
        paddingTop: 40,
        paddingBottom: 8,
        overflow: 'visible',
    },
    toaster: {
        overflow: 'visible',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#000000',
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 10,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    buttons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    centerTop: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 5,
    },
    label: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
    },
    countdown: {
        fontFamily: fonts.bold,
        fontSize: 20,
        color: WORKOUT_COLORS.accent,
    },
    progressTrack: {
        height: 8,
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
    pressWrap: {
        position: 'relative',
        overflow: 'visible',
    },
    pressShadow: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#252525',
        borderRadius: 10,
        transform: [{ translateY: SHADOW_OFFSET }],
    },
    adjustButton: {
        minWidth: 44,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#252525',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    adjustText: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: WORKOUT_COLORS.accent,
    },
    skipButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#252525',
        backgroundColor: WORKOUT_COLORS.accent,
    },
    skipText: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: '#fff',
    },
});
