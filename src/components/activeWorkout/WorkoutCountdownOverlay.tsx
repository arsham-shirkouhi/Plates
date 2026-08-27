import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import Reanimated, {
    Easing,
    Extrapolation,
    SharedValue,
    cancelAnimation,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { fonts } from '../../constants/fonts';
import { useRegisterOverlay } from '../../contexts/OverlayContext';
import { ScrollingGridBackground } from '../ScrollingGridBackground';

interface WorkoutCountdownOverlayProps {
    visible: boolean;
    onCovered: () => void;
    onComplete: () => void;
}

const PLATE_SIZE = 156;
const STACK_OFFSET = PLATE_SIZE + 28;
const STAGGER_MS = 520;
const HOLD_MS = 900;
const EXIT_MS = 160;
const START_MS = 60;
const LAND_MS = 340;
const EXIT_BOUNCE_MS = 150;
const EXIT_OVERSHOOT = 1.3;
const MOVE_EASING = Easing.bezier(0.33, 1, 0.32, 1);
const ROLL_SPRING = {
    damping: 7.2,
    stiffness: 148,
    mass: 0.68,
    overshootClamping: false,
};

const bounceOut = () =>
    withSequence(
        withTiming(EXIT_OVERSHOOT, {
            duration: EXIT_BOUNCE_MS,
            easing: Easing.out(Easing.cubic),
        }),
        withSpring(0, ROLL_SPRING)
    );

const PLATE_BLUE = '#526EFF';
const PLATE_YELLOW = '#F9C117';
const PLATE_RED = '#FF5151';

function darken(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.floor(parseInt(hex.slice(0, 2), 16) * (1 - amount)));
    const g = Math.max(0, Math.floor(parseInt(hex.slice(2, 4), 16) * (1 - amount)));
    const b = Math.max(0, Math.floor(parseInt(hex.slice(4, 6), 16) * (1 - amount)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const BumperPlate: React.FC<{ size: number; color: string; kg: number }> = ({
    size,
    color,
    kg,
}) => {
    const cx = size / 2;
    const cy = size / 2;
    const borderWidth = Math.max(3, size * 0.028);
    const r = size / 2 - borderWidth / 2;
    const faceR = r * 0.78;
    const hubR = r * 0.2;
    const holeR = r * 0.1;
    const stamp = darken(color, 0.42);

    return (
        <Svg width={size} height={size}>
            <Circle
                cx={cx}
                cy={cy}
                r={r}
                fill={color}
                stroke="#000000"
                strokeWidth={borderWidth}
            />
            <Circle cx={cx} cy={cy} r={faceR} fill={darken(color, 0.1)} />

            <SvgText
                x={cx - faceR * 0.58}
                y={cy + size * 0.04}
                fill={stamp}
                fontSize={size * 0.13}
                fontFamily={fonts.bold}
                textAnchor="middle"
            >
                {kg}
            </SvgText>
            <SvgText
                x={cx + faceR * 0.58}
                y={cy + size * 0.04}
                fill={stamp}
                fontSize={size * 0.13}
                fontFamily={fonts.bold}
                textAnchor="middle"
            >
                {kg}
            </SvgText>

            <Circle cx={cx} cy={cy} r={hubR} fill="#D6D6D6" />
            <Circle cx={cx} cy={cy} r={holeR} fill="#FFFFFF" />
            <Circle
                cx={cx}
                cy={cy}
                r={holeR}
                fill="none"
                stroke="#8A8A8A"
                strokeWidth={1.4}
            />
        </Svg>
    );
};

const RollingPlate: React.FC<{
    progress: SharedValue<number>;
    side: 'left' | 'right';
    restY: number;
    zIndex: number;
    screenWidth: number;
    children: React.ReactNode;
}> = ({ progress, side, restY, zIndex, screenWidth, children }) => {
    const travel = screenWidth * 0.62 + PLATE_SIZE;
    const startX = side === 'left' ? -travel : travel;
    const radius = PLATE_SIZE / 2;

    const plateStyle = useAnimatedStyle(() => {
        const x = interpolate(progress.value, [0, 1], [startX, 0], Extrapolation.EXTEND);
        return {
            transform: [
                { translateY: restY },
                { translateX: x },
                { rotate: `${x / radius}rad` },
            ],
        };
    });

    return (
        <Reanimated.View
            style={[
                styles.plateWrap,
                {
                    width: PLATE_SIZE,
                    height: PLATE_SIZE,
                    left: 0,
                    top: STACK_OFFSET,
                    zIndex,
                },
                plateStyle,
            ]}
            pointerEvents="none"
        >
            <View style={styles.plateShadow} />
            <View style={styles.plateEdge} />
            {children}
        </Reanimated.View>
    );
};

export const WorkoutCountdownOverlay: React.FC<WorkoutCountdownOverlayProps> = ({
    visible,
    onCovered,
    onComplete,
}) => {
    useRegisterOverlay('WorkoutCountdownOverlay', visible);
    const { width } = useWindowDimensions();
    const [mounted, setMounted] = useState(visible);

    if (visible && !mounted) {
        setMounted(true);
    }

    const onCoveredRef = useRef(onCovered);
    onCoveredRef.current = onCovered;
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;
    const completedRef = useRef(false);
    const hasPresentedRef = useRef(false);

    const cover = useSharedValue(1);
    const p1 = useSharedValue(0);
    const p2 = useSharedValue(0);
    const p3 = useSharedValue(0);

    const finishOverlay = useRef(() => {
        if (completedRef.current) return;
        completedRef.current = true;
        setMounted(false);
        onCompleteRef.current();
    }).current;

    useEffect(() => {
        if (!visible) {
            cancelAnimation(p1);
            cancelAnimation(p2);
            cancelAnimation(p3);
            cancelAnimation(cover);
            if (hasPresentedRef.current) setMounted(false);
            return;
        }

        hasPresentedRef.current = true;
        completedRef.current = false;
        cancelAnimation(p1);
        cancelAnimation(p2);
        cancelAnimation(p3);
        cancelAnimation(cover);
        p1.value = 0;
        p2.value = 0;
        p3.value = 0;
        cover.value = 1;

        const coverTimer = setTimeout(() => {
            onCoveredRef.current();
        }, 32);

        const land1 = START_MS + LAND_MS;
        const land2 = START_MS + STAGGER_MS + LAND_MS;
        const land3 = START_MS + STAGGER_MS * 2 + LAND_MS;

        const haptic1 = setTimeout(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, land1);
        const haptic2 = setTimeout(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, land2);
        const haptic3 = setTimeout(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }, land3);

        p1.value = withDelay(START_MS, withSpring(1, ROLL_SPRING));
        p2.value = withDelay(START_MS + STAGGER_MS, withSpring(1, ROLL_SPRING));
        p3.value = withDelay(START_MS + STAGGER_MS * 2, withSpring(1, ROLL_SPRING));

        const exitAt = START_MS + STAGGER_MS * 2 + LAND_MS + HOLD_MS;
        const exitTimer = setTimeout(() => {
            p1.value = withDelay(START_MS, bounceOut());
            p2.value = withDelay(START_MS + STAGGER_MS, bounceOut());
            p3.value = withDelay(START_MS + STAGGER_MS * 2, bounceOut());
        }, exitAt);

        const fadeTimer = setTimeout(() => {
            cover.value = withTiming(0, { duration: EXIT_MS, easing: MOVE_EASING }, (done) => {
                if (done) runOnJS(finishOverlay)();
            });
        }, exitAt + START_MS + STAGGER_MS * 2 + EXIT_BOUNCE_MS + LAND_MS);

        return () => {
            clearTimeout(coverTimer);
            clearTimeout(haptic1);
            clearTimeout(haptic2);
            clearTimeout(haptic3);
            clearTimeout(exitTimer);
            clearTimeout(fadeTimer);
            cancelAnimation(p1);
            cancelAnimation(p2);
            cancelAnimation(p3);
            cancelAnimation(cover);
        };
    }, [visible, cover, p1, p2, p3, finishOverlay]);

    const coverStyle = useAnimatedStyle(() => ({
        opacity: cover.value,
    }));

    if (!mounted) return null;

    return (
        <View style={styles.root} pointerEvents="auto">
            <Reanimated.View style={[styles.cover, coverStyle]}>
                <ScrollingGridBackground />
                <View style={styles.stack}>
                    <RollingPlate
                        progress={p1}
                        side="left"
                        restY={STACK_OFFSET}
                        zIndex={1}
                        screenWidth={width}
                    >
                        <BumperPlate size={PLATE_SIZE} color={PLATE_BLUE} kg={20} />
                    </RollingPlate>
                    <RollingPlate
                        progress={p2}
                        side="right"
                        restY={0}
                        zIndex={2}
                        screenWidth={width}
                    >
                        <BumperPlate size={PLATE_SIZE} color={PLATE_YELLOW} kg={15} />
                    </RollingPlate>
                    <RollingPlate
                        progress={p3}
                        side="left"
                        restY={-STACK_OFFSET}
                        zIndex={3}
                        screenWidth={width}
                    >
                        <BumperPlate size={PLATE_SIZE} color={PLATE_RED} kg={25} />
                    </RollingPlate>
                </View>
            </Reanimated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 40,
        elevation: 40,
        overflow: 'hidden',
    },
    cover: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    stack: {
        width: PLATE_SIZE,
        height: PLATE_SIZE + STACK_OFFSET * 2,
        zIndex: 1,
    },
    plateWrap: {
        position: 'absolute',
    },
    plateShadow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: PLATE_SIZE / 2,
        backgroundColor: 'transparent',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 8,
    },
    plateEdge: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: PLATE_SIZE / 2,
        backgroundColor: '#000000',
        transform: [{ translateX: 4 }, { translateY: 5 }],
    },
});
