import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    ScrollView,
    Alert,
    Platform,
    Animated,
    Easing,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import { Workout, WorkoutExercise, WorkoutSet } from '../../workout/types';
import { WorkoutWrapUpSummary } from '../../workout/workoutHistoryTypes';
import { formatWorkoutClock } from '../../workout/workoutSelectors';
import { Button } from '../Button';
import { Confetti, ConfettiParticle } from '../Confetti';
import { useRegisterOverlay } from '../../contexts/OverlayContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const CONTENT_WIDTH = 360;
const CONFETTI_COLORS = ['#526EFF', '#252525', '#34A853', '#FFD600', '#E53935', '#FF5151', '#8E24AA'];

function weightOf(set: WorkoutSet): number {
    return parseFloat(set.weight) || 0;
}

function repsOf(set: WorkoutSet): number {
    return parseInt(set.reps, 10) || 0;
}

function completedSetsOf(exercise: WorkoutExercise): WorkoutSet[] {
    return exercise.sets.filter((set) => set.completed);
}

function setVolume(set: WorkoutSet): number {
    return weightOf(set) * repsOf(set);
}

function sessionHeadline(seconds: number, sets: number): string {
    if (sets <= 0) return 'session logged';
    if (seconds < 15 * 60) return 'quick session';
    if (seconds >= 70 * 60) return 'long session';
    if (sets >= 25) return 'you put in work';
    return 'session complete';
}

interface Standout {
    eyebrow: string;
    name: string;
    detail: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
}

function buildStandouts(workout: Workout): Standout[] {
    const lifts: Array<{
        exercise: WorkoutExercise;
        set: WorkoutSet;
        weight: number;
        reps: number;
        volume: number;
    }> = [];

    workout.exercises.forEach((exercise) => {
        completedSetsOf(exercise).forEach((set) => {
            lifts.push({
                exercise,
                set,
                weight: weightOf(set),
                reps: repsOf(set),
                volume: setVolume(set),
            });
        });
    });

    const standouts: Standout[] = [];
    const used = new Set<string>();

    const heaviest = [...lifts].sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
    if (heaviest && heaviest.weight > 0) {
        used.add(heaviest.exercise.id);
        standouts.push({
            eyebrow: 'the heavy one',
            name: heaviest.exercise.name,
            detail: `${heaviest.weight} kg × ${heaviest.reps}`,
            icon: 'barbell-outline',
        });
    }

    const biggest = [...lifts].sort((a, b) => b.volume - a.volume)[0];
    if (biggest && biggest.volume > 0 && !used.has(biggest.exercise.id)) {
        used.add(biggest.exercise.id);
        standouts.push({
            eyebrow: 'the big set',
            name: biggest.exercise.name,
            detail: `${biggest.weight} kg × ${biggest.reps} · ${Math.round(biggest.volume)} kg moved`,
            icon: 'flash-outline',
        });
    }

    const pr = lifts
        .filter(
            (lift) =>
                lift.set.previous &&
                lift.weight > 0 &&
                lift.weight > lift.set.previous.weight
        )
        .sort(
            (a, b) =>
                b.weight - (b.set.previous?.weight ?? 0) - (a.weight - (a.set.previous?.weight ?? 0))
        )[0];
    if (pr && !used.has(pr.exercise.id)) {
        const jump = Math.round(pr.weight - (pr.set.previous?.weight ?? 0));
        used.add(pr.exercise.id);
        standouts.push({
            eyebrow: 'beat last time',
            name: pr.exercise.name,
            detail: `+${jump} kg · ${pr.weight} kg × ${pr.reps}`,
            icon: 'trending-up-outline',
        });
    }

    const grinder = [...workout.exercises]
        .map((exercise) => ({ exercise, count: completedSetsOf(exercise).length }))
        .sort((a, b) => b.count - a.count)[0];
    if (grinder && grinder.count >= 4 && standouts.length < 3 && !used.has(grinder.exercise.id)) {
        standouts.push({
            eyebrow: 'the grinder',
            name: grinder.exercise.name,
            detail: `${grinder.count} sets completed`,
            icon: 'repeat-outline',
        });
    }

    return standouts.slice(0, 3);
}

const AnimatedNumber: React.FC<{
    value: Animated.Value;
    target: number;
    style: object;
    format?: (value: number) => string;
}> = ({ value, target, style, format }) => {
    const safeTarget = Number.isFinite(target) ? Math.max(0, Math.round(target)) : 0;
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const listener = value.addListener(({ value: currentValue }) => {
            if (Number.isFinite(currentValue)) {
                setDisplayValue(Math.max(0, Math.round(currentValue)));
            }
        });
        return () => value.removeListener(listener);
    }, [value]);

    useEffect(() => {
        const timer = setTimeout(() => setDisplayValue(safeTarget), 1200);
        return () => clearTimeout(timer);
    }, [safeTarget]);

    return <Text style={style}>{format ? format(displayValue) : `${displayValue}`}</Text>;
};

function ClockFace({ seconds, style }: { seconds: number; style: object }) {
    const parts = formatWorkoutClock(Math.max(0, Math.round(seconds))).split(':');
    return (
        <Text style={style} numberOfLines={1} adjustsFontSizeToFit>
            {parts.map((part, index) => (
                <React.Fragment key={`${part}-${index}`}>
                    {index > 0 ? <Text style={styles.recapColon}>:</Text> : null}
                    {part}
                </React.Fragment>
            ))}
        </Text>
    );
}

function AnimatedClock({
    value,
    target,
    style,
}: {
    value: Animated.Value;
    target: number;
    style: object;
}) {
    const safeTarget = Number.isFinite(target) ? Math.max(0, Math.round(target)) : 0;
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const listener = value.addListener(({ value: currentValue }) => {
            if (Number.isFinite(currentValue)) {
                setDisplayValue(Math.max(0, Math.round(currentValue)));
            }
        });
        return () => value.removeListener(listener);
    }, [value]);

    useEffect(() => {
        const timer = setTimeout(() => setDisplayValue(safeTarget), 1100);
        return () => clearTimeout(timer);
    }, [safeTarget]);

    return <ClockFace seconds={displayValue} style={style} />;
}

function RecapStat({
    label,
    children,
    emphasize,
}: {
    label: string;
    children: React.ReactNode;
    emphasize?: boolean;
}) {
    return (
        <View style={styles.recapStat}>
            {children}
            <Text style={[styles.recapStatLabel, emphasize && styles.recapStatLabelEmph]}>{label}</Text>
        </View>
    );
}

function RecapCard({
    seconds,
    volume,
    sets,
    exercises,
    durationAnim,
    volumeAnim,
    setsAnim,
    exercisesAnim,
}: {
    seconds: number;
    volume: number;
    sets: number;
    exercises: number;
    durationAnim: Animated.Value;
    volumeAnim: Animated.Value;
    setsAnim: Animated.Value;
    exercisesAnim: Animated.Value;
}) {
    const cardScale = useRef(new Animated.Value(0.94)).current;
    const cardOpacity = useRef(new Animated.Value(0)).current;
    const clockBounce = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(cardScale, {
                toValue: 1,
                tension: 140,
                friction: 12,
                useNativeDriver: true,
            }),
            Animated.timing(cardOpacity, {
                toValue: 1,
                duration: 240,
                useNativeDriver: true,
            }),
        ]).start();

        const bounce = setTimeout(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Animated.sequence([
                Animated.timing(clockBounce, {
                    toValue: 1.05,
                    duration: 140,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.spring(clockBounce, {
                    toValue: 1,
                    tension: 220,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();
        }, 920);

        return () => clearTimeout(bounce);
    }, [cardOpacity, cardScale, clockBounce]);

    return (
        <Animated.View
            style={[
                styles.recapCard,
                { opacity: cardOpacity, transform: [{ scale: cardScale }] },
            ]}
        >
            <View style={styles.recapAccent} />
            <Animated.View style={[styles.recapTimeBlock, { transform: [{ scale: clockBounce }] }]}>
                <View style={styles.recapTimeLabelRow}>
                    <Ionicons name="stopwatch-outline" size={13} color={WORKOUT_COLORS.accent} />
                    <Text style={styles.recapTimeLabel}>elapsed</Text>
                </View>
                <AnimatedClock value={durationAnim} target={seconds} style={styles.recapTime} />
            </Animated.View>

            <View style={styles.recapDivider} />

            <View style={styles.recapStats}>
                <RecapStat label="kg moved" emphasize>
                    <AnimatedNumber
                        value={volumeAnim}
                        target={Math.round(volume)}
                        style={[styles.recapStatValue, styles.recapStatValueEmph]}
                        format={(value) =>
                            value >= 10000
                                ? `${(value / 1000).toFixed(1)}k`
                                : value.toLocaleString()
                        }
                    />
                </RecapStat>
                <View style={styles.recapStatRule} />
                <RecapStat label="sets">
                    <AnimatedNumber
                        value={setsAnim}
                        target={sets}
                        style={styles.recapStatValue}
                    />
                </RecapStat>
                <View style={styles.recapStatRule} />
                <RecapStat label="lifts">
                    <AnimatedNumber
                        value={exercisesAnim}
                        target={exercises}
                        style={styles.recapStatValue}
                    />
                </RecapStat>
            </View>
        </Animated.View>
    );
}

interface ConfettiBit {
    id: number;
    x: number;
    delay: number;
    color: string;
    width: number;
    height: number;
    radius: number;
    drift: number;
    spin: string;
    duration: number;
    distance: number;
}

function FallingBit({ bit }: { bit: ConfettiBit }) {
    const translateY = useRef(new Animated.Value(-28)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const rotate = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const fadeHold = Math.max(200, bit.duration - 480);
        const animation = Animated.sequence([
            Animated.delay(bit.delay),
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: bit.distance,
                    duration: bit.duration,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(translateX, {
                    toValue: bit.drift,
                    duration: bit.duration,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(rotate, {
                    toValue: 1,
                    duration: bit.duration,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.sequence([
                    Animated.timing(opacity, {
                        toValue: 1,
                        duration: 120,
                        useNativeDriver: true,
                    }),
                    Animated.delay(fadeHold),
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: 360,
                        useNativeDriver: true,
                    }),
                ]),
            ]),
        ]);
        animation.start();
        return () => animation.stop();
    }, [bit, opacity, rotate, translateX, translateY]);

    const spin = rotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', bit.spin],
    });

    return (
        <Animated.View
            pointerEvents="none"
            style={{
                position: 'absolute',
                left: bit.x,
                top: 0,
                width: bit.width,
                height: bit.height,
                borderRadius: bit.radius,
                backgroundColor: bit.color,
                opacity,
                transform: [{ translateY }, { translateX }, { rotate: spin }],
            }}
        />
    );
}

function makeFallingBits(): ConfettiBit[] {
    return Array.from({ length: 56 }, (_, index) => {
        const round = index % 4 === 0;
        const size = round ? 6 + Math.random() * 5 : 5 + Math.random() * 6;
        return {
            id: index,
            x: Math.random() * SCREEN_WIDTH,
            delay: Math.random() * 560,
            color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
            width: size,
            height: round ? size : 9 + Math.random() * 10,
            radius: round ? size / 2 : 2,
            drift: (Math.random() - 0.5) * 110,
            spin: `${Math.random() > 0.5 ? '' : '-'}${200 + Math.random() * 280}deg`,
            duration: 1500 + Math.random() * 900,
            distance: SCREEN_HEIGHT * (0.48 + Math.random() * 0.4),
        };
    });
}

interface WorkoutWrapUpOverlayProps {
    visible: boolean;
    summary: WorkoutWrapUpSummary | null;
    onDone: () => void;
    onSavePreset: (title: string) => void;
}

export const WorkoutWrapUpOverlay: React.FC<WorkoutWrapUpOverlayProps> = ({
    visible,
    summary,
    onDone,
    onSavePreset,
}) => {
    useRegisterOverlay('WorkoutWrapUpOverlay', visible);
    const [savedPreset, setSavedPreset] = useState(false);
    const [confettiParticles, setConfettiParticles] = useState<ConfettiParticle[]>([]);
    const [fallingBits, setFallingBits] = useState<ConfettiBit[]>([]);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const rotateTopRight = useRef(new Animated.Value(0)).current;
    const rotateBottomLeft = useRef(new Animated.Value(0)).current;
    const statAnims = useRef({
        duration: new Animated.Value(0),
        sets: new Animated.Value(0),
        volume: new Animated.Value(0),
        exercises: new Animated.Value(0),
    }).current;

    const recap = useMemo(() => {
        if (!summary) return null;
        const standouts = buildStandouts(summary.workout);
        return {
            headline: sessionHeadline(summary.elapsedSeconds, summary.sets),
            standouts,
        };
    }, [summary]);

    useEffect(() => {
        if (!visible || !summary || !recap) return;

        setSavedPreset(false);

        fadeAnim.setValue(0);
        slideAnim.setValue(40);
        Object.values(statAnims).forEach((anim) => anim.setValue(0));

        const burstOrigins = [
            { x: SCREEN_WIDTH / 2, y: 150 },
            { x: SCREEN_WIDTH * 0.28, y: 210 },
            { x: SCREEN_WIDTH * 0.72, y: 210 },
        ];
        const particles: ConfettiParticle[] = Array.from({ length: 54 }, (_, index) => {
            const origin = burstOrigins[index % burstOrigins.length];
            return {
                id: Date.now() + index,
                originX: origin.x + (Math.random() - 0.5) * 36,
                originY: origin.y + (Math.random() - 0.5) * 24,
                angle: (360 / 18) * (index % 18) + Math.random() * 16,
                color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
            };
        });
        setConfettiParticles(particles);
        setFallingBits(makeFallingBits());
        const confettiClear = setTimeout(() => {
            setConfettiParticles([]);
            setFallingBits([]);
        }, 3200);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 450,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 550,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();

        Animated.stagger(70, [
            Animated.timing(statAnims.duration, {
                toValue: Number.isFinite(summary.elapsedSeconds) ? summary.elapsedSeconds : 0,
                duration: 900,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }),
            Animated.timing(statAnims.volume, {
                toValue: Number.isFinite(summary.volume) ? summary.volume : 0,
                duration: 850,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }),
            Animated.timing(statAnims.sets, {
                toValue: Number.isFinite(summary.sets) ? summary.sets : 0,
                duration: 700,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }),
            Animated.timing(statAnims.exercises, {
                toValue: Number.isFinite(summary.exerciseCount) ? summary.exerciseCount : 0,
                duration: 650,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }),
        ]).start();

        Animated.loop(
            Animated.timing(rotateTopRight, {
                toValue: 1,
                duration: 32000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        Animated.loop(
            Animated.timing(rotateBottomLeft, {
                toValue: 1,
                duration: 32000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        return () => clearTimeout(confettiClear);
    }, [visible, summary?.completedAt]);

    if (!visible || !summary || !recap) return null;

    const topRightRotation = rotateTopRight.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const bottomLeftRotation = rotateBottomLeft.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '-360deg'],
    });

    const handleSavePresetPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const defaultTitle = summary.workout.title || 'my workout';

        if (Platform.OS === 'ios' && typeof Alert.prompt === 'function') {
            Alert.prompt(
                'save as preset',
                'name this preset for next time',
                [
                    { text: 'cancel', style: 'cancel' },
                    {
                        text: 'save',
                        onPress: (text?: string) => {
                            onSavePreset((text ?? '').trim() || defaultTitle);
                            setSavedPreset(true);
                        },
                    },
                ],
                'plain-text',
                defaultTitle
            );
            return;
        }

        onSavePreset(defaultTitle);
        setSavedPreset(true);
    };

    return (
        <Modal visible transparent animationType="fade" statusBarTranslucent>
            <View style={styles.root}>
                <Animated.Image
                    source={require('../../../assets/images/aura_ball.png')}
                    style={[styles.auraBallTopRight, { transform: [{ rotate: topRightRotation }] }]}
                    resizeMode="contain"
                />
                <Animated.Image
                    source={require('../../../assets/images/aura_ball.png')}
                    style={[styles.auraBallBottomLeft, { transform: [{ rotate: bottomLeftRotation }] }]}
                    resizeMode="contain"
                />

                <View style={styles.confettiLayer} pointerEvents="none">
                    <Confetti particles={confettiParticles} />
                    {fallingBits.map((bit) => (
                        <FallingBit key={bit.id} bit={bit} />
                    ))}
                </View>

                <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                    <Animated.View
                        style={[
                            styles.content,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        <ScrollView
                            style={styles.topScroll}
                            contentContainerStyle={styles.topScrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={styles.kicker}>
                                {new Date(summary.completedAt).toLocaleDateString(undefined, {
                                    weekday: 'long',
                                    month: 'short',
                                    day: 'numeric',
                                })}
                            </Text>
                            <Text style={styles.title}>{recap.headline}</Text>
                            <Text style={styles.subtitle}>{summary.workout.title}</Text>

                            <RecapCard
                                seconds={summary.elapsedSeconds}
                                volume={summary.volume}
                                sets={summary.sets}
                                exercises={summary.exerciseCount}
                                durationAnim={statAnims.duration}
                                volumeAnim={statAnims.volume}
                                setsAnim={statAnims.sets}
                                exercisesAnim={statAnims.exercises}
                            />
                        </ScrollView>

                        {recap.standouts.length > 0 ? (
                            <>
                                <Text style={styles.sectionTitle}>standouts</Text>
                                <View style={styles.standoutList}>
                                    {recap.standouts.map((item) => (
                                        <View key={`${item.eyebrow}-${item.name}`} style={styles.standout}>
                                            <View style={styles.standoutAccent} />
                                            <View style={styles.standoutIcon}>
                                                <Ionicons
                                                    name={item.icon}
                                                    size={18}
                                                    color={WORKOUT_COLORS.accent}
                                                />
                                            </View>
                                            <View style={styles.standoutCopy}>
                                                <Text style={styles.standoutEyebrow}>{item.eyebrow}</Text>
                                                <Text style={styles.standoutName}>{item.name}</Text>
                                                <Text style={styles.standoutDetail}>{item.detail}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </>
                        ) : null}

                        <Text style={styles.sectionTitle}>your lifts</Text>

                        <View style={styles.exercisesWrap}>
                            <ScrollView
                                style={styles.exercisesScroll}
                                contentContainerStyle={styles.exercisesContent}
                                showsVerticalScrollIndicator={false}
                                nestedScrollEnabled
                            >
                                {summary.workout.exercises.map((exercise, index) => {
                                    const done = completedSetsOf(exercise);
                                    const topSet = [...done].sort(
                                        (a, b) => setVolume(b) - setVolume(a) || weightOf(b) - weightOf(a)
                                    )[0];
                                    const beat =
                                        topSet?.previous &&
                                        weightOf(topSet) > topSet.previous.weight
                                            ? Math.round(weightOf(topSet) - topSet.previous.weight)
                                            : 0;
                                    return (
                                        <View
                                            key={exercise.id}
                                            style={[
                                                styles.liftRow,
                                                index === summary.workout.exercises.length - 1 &&
                                                    styles.liftRowLast,
                                            ]}
                                        >
                                            <Text style={styles.liftIndex}>
                                                {String(index + 1).padStart(2, '0')}
                                            </Text>
                                            <View style={styles.liftCopy}>
                                                <Text style={styles.liftName} numberOfLines={1}>
                                                    {exercise.name}
                                                </Text>
                                                <Text style={styles.liftMeta}>
                                                    {done.length}/{exercise.sets.length} sets
                                                    {topSet
                                                        ? ` · ${weightOf(topSet) || 0} × ${repsOf(topSet) || 0}`
                                                        : ''}
                                                </Text>
                                            </View>
                                            {beat > 0 ? (
                                                <Text style={styles.liftDelta}>+{beat} kg</Text>
                                            ) : null}
                                        </View>
                                    );
                                })}
                            </ScrollView>
                            <LinearGradient
                                colors={['#ffffff', 'rgba(255,255,255,0)']}
                                style={styles.exercisesFadeTop}
                                pointerEvents="none"
                            />
                            <LinearGradient
                                colors={['rgba(255,255,255,0)', '#ffffff']}
                                style={styles.exercisesFadeBottom}
                                pointerEvents="none"
                            />
                        </View>

                        <View style={styles.footer}>
                            {!savedPreset ? (
                                <TouchableOpacity
                                    style={styles.presetLink}
                                    onPress={handleSavePresetPress}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="bookmark-outline" size={18} color={WORKOUT_COLORS.muted} />
                                    <Text style={styles.presetLinkText}>save as preset for next time</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.presetLink}>
                                    <Ionicons name="bookmark" size={18} color={WORKOUT_COLORS.accent} />
                                    <Text style={[styles.presetLinkText, styles.presetLinkTextSaved]}>
                                        saved as preset
                                    </Text>
                                </View>
                            )}

                            <Button
                                variant="primary"
                                title="done"
                                onPress={onDone}
                                containerStyle={styles.doneButton}
                            />
                        </View>
                    </Animated.View>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    auraBallTopRight: {
        position: 'absolute',
        top: -220,
        right: -220,
        width: 440,
        height: 440,
        zIndex: 0,
    },
    auraBallBottomLeft: {
        position: 'absolute',
        bottom: -220,
        left: -220,
        width: 440,
        height: 440,
        zIndex: 0,
    },
    confettiLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 2,
    },
    safeArea: {
        flex: 1,
        zIndex: 1,
    },
    content: {
        flex: 1,
        width: '100%',
        maxWidth: CONTENT_WIDTH,
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
    },
    topScroll: {
        flexGrow: 0,
        flexShrink: 1,
        width: '100%',
    },
    topScrollContent: {
        alignItems: 'center',
        paddingBottom: 12,
    },
    kicker: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
        marginBottom: 6,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 32,
        color: WORKOUT_COLORS.text,
        textAlign: 'center',
        textTransform: 'lowercase',
    },
    subtitle: {
        fontFamily: fonts.regular,
        fontSize: 16,
        color: WORKOUT_COLORS.placeholder,
        textAlign: 'center',
        marginTop: 4,
        marginBottom: 16,
        textTransform: 'lowercase',
    },
    recapCard: {
        width: '100%',
        backgroundColor: '#F5F7FF',
        borderWidth: 2.5,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: 18,
        overflow: 'hidden',
        marginTop: 4,
    },
    recapAccent: {
        height: 5,
        backgroundColor: WORKOUT_COLORS.accent,
    },
    recapTimeBlock: {
        alignItems: 'center',
        paddingTop: 16,
        paddingBottom: 14,
        paddingHorizontal: 16,
    },
    recapTimeLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 4,
    },
    recapTimeLabel: {
        fontFamily: fonts.bold,
        fontSize: 11,
        color: WORKOUT_COLORS.accent,
        textTransform: 'lowercase',
        letterSpacing: 1.1,
    },
    recapTime: {
        fontFamily: fonts.bold,
        fontSize: 52,
        color: WORKOUT_COLORS.text,
        letterSpacing: -1.8,
        lineHeight: 56,
        textAlign: 'center',
    },
    recapColon: {
        fontFamily: fonts.bold,
        fontSize: 52,
        color: WORKOUT_COLORS.accent,
        letterSpacing: -1.8,
        lineHeight: 56,
    },
    recapDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: WORKOUT_COLORS.completedBorder,
        marginHorizontal: 16,
    },
    recapStats: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 8,
    },
    recapStat: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    recapStatRule: {
        width: StyleSheet.hairlineWidth,
        height: 32,
        backgroundColor: WORKOUT_COLORS.completedBorder,
    },
    recapStatValue: {
        fontFamily: fonts.bold,
        fontSize: 22,
        color: WORKOUT_COLORS.text,
        letterSpacing: -0.4,
    },
    recapStatValueEmph: {
        color: WORKOUT_COLORS.accent,
    },
    recapStatLabel: {
        fontFamily: fonts.regular,
        fontSize: 11,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
        letterSpacing: 0.2,
    },
    recapStatLabelEmph: {
        color: WORKOUT_COLORS.accent,
    },
    sectionTitle: {
        width: '100%',
        fontFamily: fonts.bold,
        fontSize: 13,
        color: WORKOUT_COLORS.muted,
        marginTop: 16,
        marginBottom: 8,
        textTransform: 'lowercase',
        letterSpacing: 0.5,
    },
    standoutList: {
        width: '100%',
        gap: 8,
    },
    standout: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F7FF',
        borderRadius: 12,
        overflow: 'hidden',
        paddingVertical: 10,
        paddingRight: 12,
    },
    standoutAccent: {
        width: 4,
        alignSelf: 'stretch',
        backgroundColor: WORKOUT_COLORS.accent,
        marginRight: 10,
    },
    standoutIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#EAEEFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    standoutCopy: {
        flex: 1,
        minWidth: 0,
    },
    standoutEyebrow: {
        fontFamily: fonts.bold,
        fontSize: 11,
        color: WORKOUT_COLORS.accent,
        textTransform: 'lowercase',
        letterSpacing: 0.4,
    },
    standoutName: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    standoutDetail: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
        marginTop: 1,
    },
    exercisesWrap: {
        flexGrow: 1,
        flexShrink: 1,
        width: '100%',
        position: 'relative',
    },
    exercisesScroll: {
        flex: 1,
        width: '100%',
    },
    exercisesContent: {
        paddingTop: 2,
        paddingBottom: 48,
    },
    exercisesFadeTop: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 12,
    },
    exercisesFadeBottom: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 56,
    },
    liftRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: WORKOUT_COLORS.divider,
    },
    liftRowLast: {
        borderBottomWidth: 0,
    },
    liftIndex: {
        width: 28,
        fontFamily: fonts.bold,
        fontSize: 13,
        color: WORKOUT_COLORS.placeholder,
    },
    liftCopy: {
        flex: 1,
        minWidth: 0,
        marginRight: 8,
    },
    liftName: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    liftMeta: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
        marginTop: 1,
    },
    liftDelta: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: WORKOUT_COLORS.accent,
        textTransform: 'lowercase',
    },
    footer: {
        width: '100%',
        paddingTop: 8,
    },
    presetLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        marginBottom: 8,
    },
    presetLinkText: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
    },
    presetLinkTextSaved: {
        color: WORKOUT_COLORS.accent,
    },
    doneButton: {
        marginTop: 8,
        marginBottom: 16,
        width: '100%',
    },
});
