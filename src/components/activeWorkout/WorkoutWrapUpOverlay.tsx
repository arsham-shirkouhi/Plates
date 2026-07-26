import React, { useEffect, useRef, useState } from 'react';
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
    Image,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import { WorkoutWrapUpSummary } from '../../workout/workoutHistoryTypes';
import {
    formatWorkoutClock,
    formatWorkoutDurationShort,
} from '../../workout/workoutSelectors';
import { Button } from '../Button';
import { Confetti, ConfettiParticle } from '../Confetti';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CONTENT_WIDTH = 360;
const CONFETTI_COLORS = ['#526EFF', '#252525', '#34A853', '#FFD600', '#E53935'];

const AnimatedNumber: React.FC<{
    value: Animated.Value;
    target: number;
    style: object;
    suffix?: string;
}> = ({ value, target, style, suffix = '' }) => {
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

    return (
        <Text style={style}>
            {displayValue}
            {suffix}
        </Text>
    );
};

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
    const [savedPreset, setSavedPreset] = useState(false);
    const [confettiParticles, setConfettiParticles] = useState<ConfettiParticle[]>([]);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const heroScale = useRef(new Animated.Value(0.85)).current;
    const rotateTopRight = useRef(new Animated.Value(0)).current;
    const rotateBottomLeft = useRef(new Animated.Value(0)).current;
    const statAnims = useRef({
        sets: new Animated.Value(0),
        volume: new Animated.Value(0),
        exercises: new Animated.Value(0),
    }).current;

    useEffect(() => {
        if (!visible || !summary) return;

        setSavedPreset(false);

        fadeAnim.setValue(0);
        slideAnim.setValue(40);
        heroScale.setValue(0.85);
        Object.values(statAnims).forEach((anim) => anim.setValue(0));

        const particles: ConfettiParticle[] = Array.from({ length: 28 }, (_, index) => ({
            id: Date.now() + index,
            originX: SCREEN_WIDTH / 2,
            originY: 180,
            angle: (360 / 28) * index + Math.random() * 12,
            color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        }));
        setConfettiParticles(particles);
        setTimeout(() => setConfettiParticles([]), 700);

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
            Animated.spring(heroScale, {
                toValue: 1,
                tension: 90,
                friction: 10,
                useNativeDriver: true,
            }),
        ]).start();

        Animated.stagger(120, [
            Animated.timing(statAnims.sets, {
                toValue: Number.isFinite(summary.sets) ? summary.sets : 0,
                duration: 800,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }),
            Animated.timing(statAnims.volume, {
                toValue: Number.isFinite(summary.volume) ? summary.volume : 0,
                duration: 850,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }),
            Animated.timing(statAnims.exercises, {
                toValue: Number.isFinite(summary.exerciseCount) ? summary.exerciseCount : 0,
                duration: 750,
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
    }, [visible, summary?.completedAt]);

    if (!visible || !summary) return null;

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

        // iOS has a native single-field prompt; core RN has no equivalent on
        // Android, so there we save with the session title.
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
                            <View style={styles.heroBadge}>
                                <Ionicons name="trophy" size={18} color={WORKOUT_COLORS.accent} />
                                <Text style={styles.heroBadgeText}>session complete</Text>
                            </View>

                            <Text style={styles.title}>you crushed it!</Text>
                            <Text style={styles.subtitle}>{summary.workout.title}</Text>
                            <Text style={styles.dateText}>
                                {new Date(summary.completedAt).toLocaleDateString(undefined, {
                                    weekday: 'long',
                                    month: 'short',
                                    day: 'numeric',
                                })}
                            </Text>

                            <Animated.View style={[styles.heroCard, { transform: [{ scale: heroScale }] }]}>
                                <Text style={styles.heroLabel}>time under tension</Text>
                                <Text style={styles.heroValue}>{formatWorkoutClock(summary.elapsedSeconds)}</Text>
                                <Text style={styles.heroHint}>
                                    {formatWorkoutDurationShort(summary.elapsedSeconds)} of work logged
                                </Text>
                            </Animated.View>

                            <View style={styles.statsGrid}>
                                <View style={styles.statTile}>
                                    <Text style={styles.statLabel}>sets</Text>
                                    <AnimatedNumber
                                        value={statAnims.sets}
                                        target={summary.sets}
                                        style={styles.statValue}
                                    />
                                </View>
                                <View style={styles.statTile}>
                                    <Text style={styles.statLabel}>volume</Text>
                                    <AnimatedNumber
                                        value={statAnims.volume}
                                        target={Math.round(summary.volume)}
                                        style={styles.statValue}
                                    />
                                </View>
                                <View style={styles.statTile}>
                                    <Text style={styles.statLabel}>exercises</Text>
                                    <AnimatedNumber
                                        value={statAnims.exercises}
                                        target={summary.exerciseCount}
                                        style={styles.statValue}
                                    />
                                </View>
                            </View>
                        </ScrollView>

                        <Text style={styles.sectionTitle}>highlights</Text>

                        <View style={styles.exercisesWrap}>
                        <ScrollView
                            style={styles.exercisesScroll}
                            contentContainerStyle={styles.exercisesContent}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled
                        >
                            {summary.workout.exercises.map((exercise, index) => {
                                const completedSets = exercise.sets.filter((set) => set.completed);
                                const topSet = completedSets[completedSets.length - 1];
                                return (
                                    <View key={exercise.id} style={styles.exerciseCard}>
                                        <View style={styles.exerciseCardHeader}>
                                            <View style={styles.exerciseIndex}>
                                                <Text style={styles.exerciseIndexText}>{index + 1}</Text>
                                            </View>
                                            <View style={styles.exerciseCopy}>
                                                <Text style={styles.exerciseName}>{exercise.name}</Text>
                                                <Text style={styles.exerciseMeta}>
                                                    {completedSets.length}/{exercise.sets.length} sets completed
                                                </Text>
                                            </View>
                                            <Ionicons
                                                name="checkmark-circle"
                                                size={22}
                                                color={completedSets.length > 0 ? '#34A853' : WORKOUT_COLORS.placeholder}
                                            />
                                        </View>
                                        {topSet ? (
                                            <Text style={styles.exerciseDetail}>
                                                top set · {topSet.weight || '0'} kg × {topSet.reps || '0'} reps
                                            </Text>
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
        paddingTop: 16,
        paddingBottom: 8,
    },
    topScroll: {
        flexGrow: 0,
        flexShrink: 1,
        width: '100%',
    },
    topScrollContent: {
        alignItems: 'center',
        paddingBottom: 20,
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
        paddingTop: 6,
        paddingBottom: 48,
    },
    exercisesFadeTop: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 16,
    },
    exercisesFadeBottom: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 56,
    },
    footer: {
        width: '100%',
        paddingTop: 16,
    },
    heroBadge: {
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(82, 110, 255, 0.1)',
        marginBottom: 14,
    },
    heroBadgeText: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: WORKOUT_COLORS.accent,
        textTransform: 'lowercase',
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 34,
        color: WORKOUT_COLORS.text,
        textAlign: 'center',
        textTransform: 'lowercase',
    },
    subtitle: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: WORKOUT_COLORS.text,
        textAlign: 'center',
        marginTop: 6,
        textTransform: 'lowercase',
    },
    dateText: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: WORKOUT_COLORS.muted,
        textAlign: 'center',
        marginTop: 4,
        marginBottom: 22,
        textTransform: 'lowercase',
    },
    heroCard: {
        width: '100%',
        borderWidth: 2.5,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: 16,
        paddingVertical: 22,
        paddingHorizontal: 18,
        alignItems: 'center',
        backgroundColor: '#FAFAFF',
        marginBottom: 18,
    },
    heroLabel: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
        marginBottom: 6,
    },
    heroValue: {
        fontFamily: fonts.bold,
        fontSize: 52,
        color: WORKOUT_COLORS.accent,
        letterSpacing: -1,
    },
    heroHint: {
        marginTop: 6,
        fontFamily: fonts.regular,
        fontSize: 13,
        color: WORKOUT_COLORS.placeholder,
        textTransform: 'lowercase',
    },
    statsGrid: {
        width: '100%',
        flexDirection: 'row',
        gap: 10,
        marginBottom: 0,
    },
    statTile: {
        flex: 1,
        borderWidth: 2.5,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 8,
        alignItems: 'center',
        backgroundColor: '#FAFAFF',
    },
    statLabel: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
        marginBottom: 4,
    },
    statValue: {
        fontFamily: fonts.bold,
        fontSize: 24,
        color: WORKOUT_COLORS.text,
    },
    sectionTitle: {
        width: '100%',
        fontFamily: fonts.bold,
        fontSize: 16,
        color: WORKOUT_COLORS.text,
        marginBottom: 12,
        textTransform: 'lowercase',
    },
    exerciseCard: {
        width: '100%',
        borderWidth: 2.5,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        backgroundColor: '#FAFAFF',
    },
    exerciseCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    exerciseIndex: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(82, 110, 255, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    exerciseIndexText: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: WORKOUT_COLORS.accent,
    },
    exerciseCopy: {
        flex: 1,
    },
    exerciseName: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    exerciseMeta: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: WORKOUT_COLORS.muted,
        marginTop: 2,
    },
    exerciseDetail: {
        marginTop: 8,
        marginLeft: 38,
        fontFamily: fonts.regular,
        fontSize: 13,
        color: WORKOUT_COLORS.placeholder,
        textTransform: 'lowercase',
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
