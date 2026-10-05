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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import { Workout, WorkoutExercise, WorkoutSet } from '../../workout/types';
import { WorkoutWrapUpSummary } from '../../workout/workoutHistoryTypes';
import { formatWorkoutDurationShort } from '../../workout/workoutSelectors';
import { Button } from '../Button';
import { Icon } from '../icons/Icon';
import { Confetti, ConfettiParticle } from '../Confetti';
import { useRegisterOverlay } from '../../contexts/OverlayContext';
import { useAuth } from '../../context/AuthContext';
import { getCompletedWorkouts } from '../../services/workoutHistoryService';
import { ScrollingGridBackground } from '../ScrollingGridBackground';

const LABEL_WIDTH = 360;
const INK = '#000';
const BLUE = '#526EFF';
const BLUE_WASH = '#F5F7FF';
const GREEN = '#34A853';
const BTN_SIZE = 50;
const BTN_SHADOW = 4;

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

function formatVolume(value: number): string {
    const safe = Math.max(0, Math.round(value));
    if (safe >= 1000) {
        return `${(safe / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    return safe.toLocaleString();
}

function countPersonalRecords(workout: Workout): number {
    let count = 0;
    workout.exercises.forEach((exercise) => {
        completedSetsOf(exercise).forEach((set) => {
            if (!set.previous) return;
            const weight = weightOf(set);
            const reps = repsOf(set);
            const beatWeight = weight > 0 && weight > set.previous.weight;
            const beatReps =
                weight === (set.previous.weight || 0) && reps > (set.previous.reps || 0);
            if (beatWeight || beatReps) count += 1;
        });
    });
    return count;
}

function dayKey(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function computeStreak(completedAtList: string[], nowIso: string): number {
    const keys = new Set(completedAtList.map(dayKey).filter(Boolean));
    const today = dayKey(nowIso);
    if (today) keys.add(today);

    let streak = 0;
    const cursor = new Date(nowIso);
    if (Number.isNaN(cursor.getTime())) return 1;
    cursor.setHours(12, 0, 0, 0);

    while (true) {
        const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
        if (!keys.has(key)) break;
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
        if (streak > 365) break;
    }
    return Math.max(1, streak);
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
        const timer = setTimeout(() => setDisplayValue(safeTarget), 1100);
        return () => clearTimeout(timer);
    }, [safeTarget]);

    return <Text style={style}>{format ? format(displayValue) : `${displayValue}`}</Text>;
};

const AnimatedDuration: React.FC<{
    value: Animated.Value;
    target: number;
    style: object;
}> = ({ value, target, style }) => {
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

    return (
        <Text style={style} numberOfLines={1} adjustsFontSizeToFit>
            {formatWorkoutDurationShort(displayValue)}
        </Text>
    );
};

function FactRow({
    label,
    bold,
    indent,
    last,
    children,
}: {
    label: string;
    bold?: boolean;
    indent?: boolean;
    last?: boolean;
    children: React.ReactNode;
}) {
    return (
        <View style={[styles.factRow, indent && styles.factRowIndent, last && styles.factRowLast]}>
            <Text style={[styles.factLabel, bold && styles.factLabelBold]}>{label}</Text>
            {children}
        </View>
    );
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
    const { user } = useAuth();
    const [savedPreset, setSavedPreset] = useState(false);
    const [streak, setStreak] = useState(1);
    const [saveBurst, setSaveBurst] = useState<ConfettiParticle[]>([]);
    const rootRef = useRef<View>(null);
    const saveRef = useRef<View>(null);

    const labelOpacity = useRef(new Animated.Value(0)).current;
    const labelScale = useRef(new Animated.Value(0.74)).current;
    const labelRotate = useRef(new Animated.Value(-3.6)).current;
    const labelY = useRef(new Animated.Value(46)).current;
    const footerOpacity = useRef(new Animated.Value(0)).current;
    const footerY = useRef(new Animated.Value(18)).current;
    const saveScale = useRef(new Animated.Value(1)).current;
    const saveRotate = useRef(new Animated.Value(0)).current;
    const saveFlash = useRef(new Animated.Value(0)).current;
    const statAnims = useRef({
        duration: new Animated.Value(0),
        volume: new Animated.Value(0),
        exercises: new Animated.Value(0),
        sets: new Animated.Value(0),
        prs: new Animated.Value(0),
        streak: new Animated.Value(0),
    }).current;

    const recap = useMemo(() => {
        if (!summary) return null;
        const prs = countPersonalRecords(summary.workout);
        return {
            headline: sessionHeadline(summary.elapsedSeconds, summary.sets),
            prs,
        };
    }, [summary]);

    useEffect(() => {
        if (!visible || !summary) return;
        let cancelled = false;
        (async () => {
            const completed = await getCompletedWorkouts(user?.id);
            if (cancelled) return;
            setStreak(computeStreak(completed.map((item) => item.completedAt), summary.completedAt));
        })();
        return () => {
            cancelled = true;
        };
    }, [visible, summary?.completedAt, user?.id]);

    useEffect(() => {
        if (!visible || !summary || !recap) return;

        setSavedPreset(false);
        setSaveBurst([]);
        labelOpacity.setValue(0);
        labelScale.setValue(0.74);
        labelRotate.setValue(-3.6);
        labelY.setValue(46);
        footerOpacity.setValue(0);
        footerY.setValue(18);
        saveScale.setValue(1);
        saveRotate.setValue(0);
        saveFlash.setValue(0);
        Object.values(statAnims).forEach((anim) => anim.setValue(0));

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        Animated.parallel([
            Animated.spring(labelScale, {
                toValue: 1,
                tension: 58,
                friction: 6.4,
                useNativeDriver: true,
            }),
            Animated.spring(labelRotate, {
                toValue: 0,
                tension: 72,
                friction: 7.5,
                useNativeDriver: true,
            }),
            Animated.spring(labelY, {
                toValue: 0,
                tension: 64,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.timing(labelOpacity, {
                toValue: 1,
                duration: 200,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();

        Animated.sequence([
            Animated.delay(260),
            Animated.parallel([
                Animated.timing(footerOpacity, {
                    toValue: 1,
                    duration: 280,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.spring(footerY, {
                    toValue: 0,
                    tension: 90,
                    friction: 10,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();

        Animated.stagger(70, [
            Animated.timing(statAnims.exercises, {
                toValue: Number.isFinite(summary.exerciseCount) ? summary.exerciseCount : 0,
                duration: 700,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }),
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
            Animated.timing(statAnims.prs, {
                toValue: recap.prs,
                duration: 650,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }),
            Animated.timing(statAnims.streak, {
                toValue: streak,
                duration: 650,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }),
        ]).start();
    }, [visible, summary?.completedAt]);

    useEffect(() => {
        if (!visible) return;
        Animated.timing(statAnims.streak, {
            toValue: streak,
            duration: 480,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [streak, visible]);

    if (!visible || !summary || !recap) return null;

    const playSavedAnimation = () => {
        setSavedPreset(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        saveScale.setValue(1);
        saveRotate.setValue(0);
        saveFlash.setValue(0);

        Animated.parallel([
            Animated.sequence([
                Animated.timing(saveScale, {
                    toValue: 1.24,
                    duration: 120,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.spring(saveScale, {
                    toValue: 1,
                    tension: 160,
                    friction: 5.5,
                    useNativeDriver: true,
                }),
            ]),
            Animated.sequence([
                Animated.timing(saveRotate, {
                    toValue: -14,
                    duration: 80,
                    useNativeDriver: true,
                }),
                Animated.timing(saveRotate, {
                    toValue: 11,
                    duration: 90,
                    useNativeDriver: true,
                }),
                Animated.spring(saveRotate, {
                    toValue: 0,
                    tension: 170,
                    friction: 7,
                    useNativeDriver: true,
                }),
            ]),
            Animated.sequence([
                Animated.timing(saveFlash, {
                    toValue: 0.35,
                    duration: 110,
                    useNativeDriver: true,
                }),
                Animated.timing(saveFlash, {
                    toValue: 0,
                    duration: 420,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();

        saveRef.current?.measureInWindow((x, y, w, h) => {
            rootRef.current?.measureInWindow((rx, ry) => {
                const originX = x - rx + w / 2;
                const originY = y - ry + h / 2;
                const colors = [BLUE, GREEN, '#E2A800', BLUE];
                const particles = Array.from({ length: 8 }, (_, i) => ({
                    id: Date.now() + i,
                    originX,
                    originY,
                    angle: (i / 8) * 360,
                    color: colors[i % colors.length],
                    sizeScale: 0.85 + (i % 3) * 0.35,
                    travel: 32 + (i % 4) * 10,
                }));
                setSaveBurst(particles);
                setTimeout(() => setSaveBurst([]), 480);
            });
        });
    };

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
                            playSavedAnimation();
                        },
                    },
                ],
                'plain-text',
                defaultTitle
            );
            return;
        }

        onSavePreset(defaultTitle);
        playSavedAnimation();
    };

    const dateLine = new Date(summary.completedAt).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
    });
    const sessionLine = summary.workout.title?.trim()
        ? `1 session ${summary.workout.title.trim()}`
        : '1 session';

    return (
        <Modal visible transparent animationType="fade" statusBarTranslucent>
            <View ref={rootRef} style={styles.root} collapsable={false}>
                <ScrollingGridBackground />
                <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                    <View style={styles.content}>
                        <Animated.View
                            style={[
                                styles.labelOuter,
                                {
                                    opacity: labelOpacity,
                                    transform: [
                                        { translateY: labelY },
                                        { scale: labelScale },
                                        {
                                            rotate: labelRotate.interpolate({
                                                inputRange: [-8, 8],
                                                outputRange: ['-8deg', '8deg'],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        >
                            <View style={styles.labelInner}>
                                <Text style={styles.factsTitle} numberOfLines={1} adjustsFontSizeToFit>
                                    Workout Facts
                                </Text>
                                <Text style={styles.productLine}>{recap.headline}</Text>
                                <View style={styles.hairline} />
                                <Text style={styles.sessionLine} numberOfLines={1}>
                                    {sessionLine}
                                </Text>
                                <Text style={styles.dateLine}>{dateLine}</Text>

                                <View style={styles.barThick} />
                                <Text style={styles.amountLabel}>Amount per session</Text>
                                <View style={styles.caloriesRow}>
                                    <Text style={styles.caloriesLabel}>Volume</Text>
                                    <AnimatedNumber
                                        value={statAnims.volume}
                                        target={Math.round(summary.volume)}
                                        style={styles.caloriesValue}
                                        format={(value) => `${formatVolume(value)}kg`}
                                    />
                                </View>
                                <View style={styles.barMedium} />

                                <FactRow label="Duration" bold>
                                    <AnimatedDuration
                                        value={statAnims.duration}
                                        target={summary.elapsedSeconds}
                                        style={styles.factValue}
                                    />
                                </FactRow>
                                <FactRow label="Exercises" bold>
                                    <AnimatedNumber
                                        value={statAnims.exercises}
                                        target={summary.exerciseCount}
                                        style={styles.factValue}
                                    />
                                </FactRow>
                                <FactRow label="Sets" indent>
                                    <AnimatedNumber
                                        value={statAnims.sets}
                                        target={summary.sets}
                                        style={styles.factValue}
                                    />
                                </FactRow>
                                <FactRow label="PRs" bold>
                                    <AnimatedNumber
                                        value={statAnims.prs}
                                        target={recap.prs}
                                        style={styles.factValue}
                                        format={(value) => (value > 0 ? `+${value}` : `${value}`)}
                                    />
                                </FactRow>
                                <FactRow label="Streak" bold last>
                                    <AnimatedNumber
                                        value={statAnims.streak}
                                        target={streak}
                                        style={styles.factValue}
                                        format={(value) => `${value}d`}
                                    />
                                </FactRow>

                                <View style={styles.barMedium} />
                                <View style={styles.liftsHeader}>
                                    <Text style={styles.liftsTitle}>Your lifts</Text>
                                    <Text style={styles.liftsCount}>
                                        {summary.workout.exercises.length}
                                    </Text>
                                </View>

                                <ScrollView
                                    style={styles.liftsScroll}
                                    contentContainerStyle={styles.liftsContent}
                                    showsVerticalScrollIndicator={false}
                                    nestedScrollEnabled
                                >
                                    {summary.workout.exercises.map((exercise, index) => {
                                        const done = completedSetsOf(exercise);
                                        const topSet = [...done].sort(
                                            (a, b) =>
                                                setVolume(b) - setVolume(a) ||
                                                weightOf(b) - weightOf(a)
                                        )[0];
                                        const beat =
                                            topSet?.previous &&
                                            weightOf(topSet) > topSet.previous.weight
                                                ? Math.round(weightOf(topSet) - topSet.previous.weight)
                                                : 0;
                                        const last = index === summary.workout.exercises.length - 1;
                                        return (
                                            <View
                                                key={exercise.id}
                                                style={[styles.liftBlock, last && styles.liftBlockLast]}
                                            >
                                                <View style={styles.factRow}>
                                                    <Text style={styles.liftName} numberOfLines={1}>
                                                        {exercise.name}
                                                    </Text>
                                                    <Text style={styles.factValue}>
                                                        {done.length}/{exercise.sets.length}
                                                    </Text>
                                                </View>
                                                <View style={[styles.factRow, styles.factRowIndent, styles.factRowLast]}>
                                                    <Text style={styles.liftMeta}>
                                                        {topSet
                                                            ? `${weightOf(topSet) || 0} × ${repsOf(topSet) || 0}`
                                                            : 'no sets'}
                                                    </Text>
                                                    {beat > 0 ? (
                                                        <Text style={styles.factValueGreen}>+{beat}kg</Text>
                                                    ) : null}
                                                </View>
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        </Animated.View>

                        <Animated.View
                            style={[
                                styles.footer,
                                {
                                    opacity: footerOpacity,
                                    transform: [{ translateY: footerY }],
                                },
                            ]}
                        >
                            <Animated.View
                                style={{
                                    transform: [
                                        { scale: saveScale },
                                        {
                                            rotate: saveRotate.interpolate({
                                                inputRange: [-20, 20],
                                                outputRange: ['-20deg', '20deg'],
                                            }),
                                        },
                                    ],
                                }}
                            >
                                <View ref={saveRef} collapsable={false}>
                                    <TouchableOpacity
                                        style={styles.saveHit}
                                        onPress={handleSavePresetPress}
                                        disabled={savedPreset}
                                        activeOpacity={0.85}
                                        accessibilityRole="button"
                                        accessibilityLabel={savedPreset ? 'saved as preset' : 'save as preset'}
                                    >
                                        <View style={styles.saveShadow} />
                                        <View style={styles.saveFace}>
                                            <Animated.View
                                                pointerEvents="none"
                                                style={[
                                                    styles.saveFlash,
                                                    { opacity: saveFlash },
                                                ]}
                                            />
                                            <Icon
                                                name={savedPreset ? 'bookmark' : 'bookmark-outline'}
                                                size={22}
                                                color={savedPreset ? WORKOUT_COLORS.accent : INK}
                                            />
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>
                            <Button
                                variant="primary"
                                title="done!"
                                onPress={onDone}
                                containerStyle={styles.doneButton}
                                buttonBodyStyle={styles.doneBody}
                            />
                        </Animated.View>
                    </View>
                </SafeAreaView>
                <Confetti particles={saveBurst} />
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
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
        width: '100%',
        maxWidth: LABEL_WIDTH,
        alignSelf: 'center',
        paddingTop: 10,
        paddingBottom: 0,
        zIndex: 1,
    },
    labelOuter: {
        flex: 1,
        backgroundColor: BLUE_WASH,
        borderWidth: 2,
        borderColor: INK,
        padding: 3,
        minHeight: 0,
    },
    labelInner: {
        flex: 1,
        backgroundColor: BLUE_WASH,
        borderWidth: 8,
        borderColor: INK,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 14,
        minHeight: 0,
    },
    factsTitle: {
        fontFamily: fonts.bold,
        fontSize: 34,
        color: BLUE,
        letterSpacing: -1.2,
        lineHeight: 38,
    },
    productLine: {
        fontFamily: fonts.regular,
        fontSize: 15,
        color: INK,
        marginTop: 2,
        marginBottom: 4,
        textTransform: 'lowercase',
    },
    hairline: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: INK,
    },
    sessionLine: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: INK,
        textTransform: 'lowercase',
        paddingTop: 6,
        paddingBottom: 2,
    },
    dateLine: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
        paddingBottom: 6,
    },
    barThick: {
        height: 14,
        backgroundColor: INK,
    },
    barMedium: {
        height: 8,
        backgroundColor: INK,
    },
    amountLabel: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: INK,
        paddingTop: 4,
    },
    caloriesRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingBottom: 4,
        gap: 8,
    },
    caloriesLabel: {
        fontFamily: fonts.bold,
        fontSize: 30,
        color: INK,
        letterSpacing: -0.6,
        lineHeight: 34,
    },
    caloriesValue: {
        fontFamily: fonts.bold,
        fontSize: 36,
        color: BLUE,
        letterSpacing: -0.8,
        lineHeight: 40,
    },
    factRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        paddingVertical: 6,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: INK,
    },
    factRowIndent: {
        paddingLeft: 16,
    },
    factRowLast: {
        borderBottomWidth: 0,
    },
    factLabel: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 16,
        color: INK,
    },
    factLabelBold: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: INK,
    },
    factValue: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: BLUE,
    },
    factValueGreen: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: GREEN,
    },
    liftsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 6,
        paddingBottom: 2,
    },
    liftsTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: BLUE,
    },
    liftsCount: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: BLUE,
    },
    liftsScroll: {
        flex: 1,
        minHeight: 0,
        marginTop: 2,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: INK,
    },
    liftsContent: {
        paddingBottom: 8,
    },
    liftBlock: {
        paddingTop: 4,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: INK,
    },
    liftBlockLast: {
        borderBottomWidth: 0,
    },
    liftName: {
        flex: 1,
        fontFamily: fonts.bold,
        fontSize: 16,
        color: INK,
        textTransform: 'lowercase',
    },
    liftMeta: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 14,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
    },
    footer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        paddingTop: 14,
        paddingBottom: 0,
        zIndex: 5,
    },
    saveHit: {
        width: BTN_SIZE,
        height: BTN_SIZE + BTN_SHADOW,
    },
    saveShadow: {
        position: 'absolute',
        top: BTN_SHADOW,
        left: 0,
        width: BTN_SIZE,
        height: BTN_SIZE,
        borderRadius: 12,
        backgroundColor: '#252525',
    },
    saveFace: {
        width: BTN_SIZE,
        height: BTN_SIZE,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#252525',
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    saveFlash: {
        ...StyleSheet.absoluteFill,
        backgroundColor: BLUE,
        opacity: 0,
    },
    doneButton: {
        flex: 1,
        width: '100%',
        marginTop: 0,
        marginBottom: 0,
    },
    doneBody: {
        width: '100%',
        marginTop: 0,
        marginBottom: 0,
        alignSelf: 'stretch',
    },
});
