import React, { useCallback, useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Easing,
    ScrollView,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';
import { getExercisesList, searchExercises, Exercise, getExerciseDetails, ExerciseDetails } from '../services/exerciseService';
import { useRegisterOverlay } from '../contexts/OverlayContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Icon } from './icons/Icon';
import { WORKOUT_COLORS } from '../workout/constants';
import { FlatPlus } from './activeWorkout/FlatMark';
import { getBodyPartStamp, PlatesIcon } from './icons/PlatesIcon';
import { HardSearchBar } from './ui/HardSearchBar';
import { HardStamp } from './ui/HardListCard';
import { BodyPartChip } from './ui/BodyPartChip';
import { AddTickToggle } from './ui/AddTickToggle';
import Reanimated, {
    Easing as ReanimatedEasing,
    interpolate,
    Keyframe,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_HEIGHT = Dimensions.get('window').height;

const recEnter = new Keyframe({
    0: {
        opacity: 0,
        transform: [{ translateY: 18 }, { scale: 0.97 }],
    },
    100: {
        opacity: 1,
        transform: [{ translateY: 0 }, { scale: 1 }],
        easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
    },
}).duration(320);

const REVEAL_START_MS = 220;
const REVEAL_STAGGER_MS = 150;

function createUniqueId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function exerciseRowKey(exercise: Exercise, index: number) {
    return `${exercise.id || ''}:${exercise.name || ''}:${index}`;
}

function exerciseMatchKeys(exercise: Pick<Exercise, 'id' | 'name'>): string[] {
    const keys: string[] = [];
    if (exercise.id) keys.push(exercise.id);
    const nameKey = exercise.name?.trim().toLowerCase();
    if (nameKey) keys.push(nameKey);
    return keys;
}

function quadBezier(t: number, a: number, b: number, c: number) {
    'worklet';
    const mt = 1 - t;
    return mt * mt * a + 2 * mt * t * b + t * t * c;
}

interface FlyParticle {
    id: number;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    size: number;
    color: string;
    duration?: number;
}

type Point = { x: number; y: number };

export type AddParticleHandle = {
    spawnFly: (start: Point, end: Point, color: string) => void;
    spawnBurst: (origin: Point, color: string) => void;
    clear: () => void;
};

const AddFlyParticle: React.FC<FlyParticle & { onDone: (id: number) => void }> = ({
    id,
    x0,
    y0,
    x1,
    y1,
    x2,
    y2,
    size,
    color,
    duration = 480,
    onDone,
}) => {
    const progress = useSharedValue(0);

    useEffect(() => {
        const finish = () => onDone(id);
        progress.value = 0;
        progress.value = withTiming(
            1,
            { duration, easing: ReanimatedEasing.bezier(0.2, 0.0, 0.18, 1) },
            (finished) => {
                if (finished) runOnJS(finish)();
            }
        );
    }, [duration, id, onDone, progress]);

    const style = useAnimatedStyle(() => {
        const x = quadBezier(progress.value, x0, x1, x2);
        const y = quadBezier(progress.value, y0, y1, y2);
        const scale = interpolate(progress.value, [0, 0.12, 1], [1.05, 1.22, 0.28]);
        const opacity = progress.value > 0.88 ? 1 - (progress.value - 0.88) / 0.12 : 1;
        return {
            opacity,
            transform: [
                { translateX: x - size / 2 },
                { translateY: y - size / 2 },
                { scale },
            ],
        };
    });

    return (
        <Reanimated.View
            pointerEvents="none"
            style={[
                {
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: color,
                },
                style,
            ]}
        />
    );
};

const AddParticleLayer = forwardRef<AddParticleHandle>(function AddParticleLayer(_, ref) {
    const [particles, setParticles] = useState<FlyParticle[]>([]);
    const dismiss = useCallback((id: number) => {
        setParticles((prev) => prev.filter((particle) => particle.id !== id));
    }, []);

    useImperativeHandle(ref, () => ({
        spawnFly(start, end, color) {
            if (!end.x && !end.y) return;
            const count = 2 + Math.floor(Math.random() * 2);
            const next: FlyParticle[] = Array.from({ length: count }, (_, i) => {
                const side = Math.random() < 0.5 ? -1 : 1;
                return {
                    id: Date.now() + i + Math.random(),
                    x0: start.x,
                    y0: start.y,
                    x1: (start.x + end.x) / 2 + side * (24 + Math.random() * 40),
                    y1: Math.min(start.y, end.y) - (14 + Math.random() * 36),
                    x2: end.x,
                    y2: end.y,
                    size: i === 0 ? 14 : 6 + Math.random() * 4,
                    color,
                    duration: 420 + Math.round(Math.random() * 80),
                };
            });
            setParticles((prev) => [...prev, ...next]);
        },
        spawnBurst(origin, color) {
            const count = 6;
            const next: FlyParticle[] = Array.from({ length: count }, (_, i) => {
                const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
                const dist = 28 + Math.random() * 28;
                return {
                    id: Date.now() + i + Math.random(),
                    x0: origin.x,
                    y0: origin.y,
                    x1: origin.x + Math.cos(angle) * dist * 0.5,
                    y1: origin.y + Math.sin(angle) * dist * 0.5,
                    x2: origin.x + Math.cos(angle) * dist,
                    y2: origin.y + Math.sin(angle) * dist,
                    size: 5 + Math.random() * 4,
                    color,
                    duration: 280,
                };
            });
            setParticles((prev) => [...prev, ...next]);
        },
        clear() {
            setParticles([]);
        },
    }));

    return (
        <View pointerEvents="none" style={styles.flyLayer}>
            {particles.map((particle) => (
                <AddFlyParticle key={particle.id} {...particle} onDone={dismiss} />
            ))}
        </View>
    );
});

interface AnimatedExerciseRowProps {
    exercise: Exercise;
    isAdded: boolean;
    onOpen: () => void;
    onAdd: (origin: { x: number; y: number }) => void;
    onRemove: () => void;
}

const AnimatedExerciseRow: React.FC<AnimatedExerciseRowProps> = ({
    exercise,
    isAdded,
    onOpen,
    onAdd,
    onRemove,
}) => {
    const addBtnRef = useRef<View>(null);

    const handleToggle = (event: { nativeEvent: { pageX: number; pageY: number } }) => {
        if (isAdded) {
            onRemove();
            return;
        }
        const tap = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
        addBtnRef.current?.measureInWindow((x, y, width, height) => {
            onAdd({
                x: width > 0 ? x + width / 2 : tap.x,
                y: height > 0 ? y + height / 2 : tap.y,
            });
        });
    };

    const meta = exercise.bodyPart?.trim().toLowerCase();
    const stamp = getBodyPartStamp(exercise.bodyPart);

    return (
        <View style={styles.exerciseItem}>
            <TouchableOpacity
                style={styles.exerciseItemContent}
                onPress={onOpen}
                activeOpacity={0.7}
            >
                <HardStamp icon={stamp.icon} fill={stamp.fill} size={40} style={styles.exerciseStamp} />
                <View style={styles.exerciseTitleContainer}>
                    <Text style={styles.exerciseName} numberOfLines={2}>
                        {exercise.name.toLowerCase()}
                    </Text>
                    {meta ? (
                        <Text style={styles.exerciseMeta} numberOfLines={1}>
                            {meta}
                        </Text>
                    ) : null}
                </View>
            </TouchableOpacity>
            <View ref={addBtnRef} collapsable={false}>
            <TouchableOpacity
                style={styles.addButton}
                onPress={handleToggle}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={isAdded ? `Remove ${exercise.name}` : `Add ${exercise.name}`}
            >
                <AddTickToggle added={isAdded} />
            </TouchableOpacity>
            </View>
        </View>
    );
};

interface AddExerciseOverlayProps {
    visible: boolean;
    onClose: () => void;
    onSelectExercise: (exercise: Exercise) => void;
    onSelectExerciseAndNavigate?: (exercise: Exercise, createdExercise: { id: string; name: string; sets: Array<{ id: string; reps: string; weight: string }> }, allExercises: Array<{ id: string; name: string; sets: Array<{ id: string; reps: string; weight: string }> }>, exerciseIndex: number) => void;
    onSelectionCommitted?: (count: number) => void;
    currentExerciseIds?: string[];
    currentExerciseNames?: string[];
    onRemoveExercise?: (exercise: Exercise) => void;
}

export const AddExerciseOverlay: React.FC<AddExerciseOverlayProps> = ({
    visible,
    onClose,
    onSelectExercise,
    onSelectExerciseAndNavigate,
    onSelectionCommitted,
    currentExerciseIds = [],
    currentExerciseNames = [],
    onRemoveExercise,
}) => {
    const navigation = useNavigation<NavigationProp>();
    const insets = useSafeAreaInsets();
    useRegisterOverlay('AddExerciseOverlay', visible);
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const [searchQuery, setSearchQuery] = useState('');
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const [showDetailView, setShowDetailView] = useState(false);
    const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null); // Store the original exercise for adding
    const [exerciseDetails, setExerciseDetails] = useState<ExerciseDetails | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [optimisticAddedKeys, setOptimisticAddedKeys] = useState<Set<string>>(new Set());
    const [optimisticRemovedKeys, setOptimisticRemovedKeys] = useState<Set<string>>(new Set());
    const [bodyPartFilter, setBodyPartFilter] = useState<string | null>(null);
    const particleRef = useRef<AddParticleHandle>(null);
    const addedTargetRef = useRef<View>(null);
    const addedTargetPos = useRef({ x: 0, y: 0 });
    const addedPulse = useRef(new Animated.Value(1)).current;
    const loadedForOpenRef = useRef(false);
    const wasVisibleRef = useRef(false);
    const [rowIntroDone, setRowIntroDone] = useState(false);
    const [revealedKeys, setRevealedKeys] = useState<Set<string>>(() => new Set());

    // Load exercises once when the overlay opens; reset local state when it closes.
    useEffect(() => {
        if (visible) {
            if (!loadedForOpenRef.current) {
                loadedForOpenRef.current = true;
                setExercises([]);
                setOffset(0);
                setHasMore(true);
                setRowIntroDone(false);
                setRevealedKeys(new Set());
                loadExercises(0, true);
            }
            wasVisibleRef.current = true;
            return;
        }

        if (wasVisibleRef.current) {
            setSearchQuery('');
            setExercises([]);
            setOffset(0);
            setHasMore(true);
            setShowDetailView(false);
            setSelectedExerciseId(null);
            setSelectedExercise(null);
            setExerciseDetails(null);
            setOptimisticAddedKeys(new Set());
            setOptimisticRemovedKeys(new Set());
            setBodyPartFilter(null);
            particleRef.current?.clear();
        }

        loadedForOpenRef.current = false;
        wasVisibleRef.current = false;
    }, [visible]);

    useEffect(() => {
        if (!visible) return;

        const idSet = new Set(currentExerciseIds);
        const nameSet = new Set(currentExerciseNames.map((name) => name.trim().toLowerCase()));

        setOptimisticAddedKeys((prev) => {
            const next = new Set(prev);
            let changed = false;
            next.forEach((key) => {
                if (idSet.has(key) || nameSet.has(key)) {
                    next.delete(key);
                    changed = true;
                }
            });
            return changed ? next : prev;
        });

        setOptimisticRemovedKeys((prev) => {
            const next = new Set(prev);
            let changed = false;
            next.forEach((key) => {
                if (!idSet.has(key) && !nameSet.has(key)) {
                    next.delete(key);
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [visible, currentExerciseIds, currentExerciseNames]);

    // Search exercises when search query changes (skip the initial empty query on open).
    useEffect(() => {
        if (!visible || searchQuery.trim().length === 0) return;

        const timeout = setTimeout(() => {
            setOffset(0);
            setHasMore(true);
            searchExercisesFromDB(searchQuery);
        }, 300);

        return () => {
            clearTimeout(timeout);
        };
    }, [searchQuery, visible]);

    const loadExercises = async (currentOffset: number = 0, isInitial: boolean = false) => {
        if (isInitial) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const exercisesList = await getExercisesList(20, currentOffset);

            if (isInitial) {
                setExercises(exercisesList);
            } else {
                setExercises(prev => [...prev, ...exercisesList]);
            }

            // Check if there are more exercises to load
            setHasMore(exercisesList.length === 20);
            setOffset(currentOffset + exercisesList.length);
        } catch (error) {
            console.error('Error loading exercises:', error);
            if (isInitial) {
                setExercises([]);
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const loadMoreExercises = () => {
        if (!loadingMore && hasMore && searchQuery.trim().length === 0) {
            loadExercises(offset, false);
        }
    };

    const handleScroll = (event: any) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const paddingToBottom = 20;
        const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

        if (isCloseToBottom && hasMore && !loadingMore) {
            loadMoreExercises();
        }
    };

    const searchExercisesFromDB = async (query: string) => {
        setLoading(true);
        try {
            const results = await searchExercises(query);
            setExercises(results);
            setHasMore(false); // Search results don't need pagination
        } catch (error) {
            console.error('Error searching exercises:', error);
            setExercises([]);
        } finally {
            setLoading(false);
        }
    };

    // Animate in/out
    useEffect(() => {
        if (visible) {
            // Reset and animate in
            slideAnim.setValue(SCREEN_HEIGHT);
            backdropOpacity.setValue(0);
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 250,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 140,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 120,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const handleBackdropPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 140,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 120,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const handleExerciseTitlePress = async (exercise: Exercise) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Switch to detail view
        setSelectedExerciseId(exercise.id);
        setSelectedExercise(exercise); // Store the exercise for adding later
        setShowDetailView(true);
        setLoadingDetails(true);

        try {
            const details = await getExerciseDetails(exercise.id);
            setExerciseDetails(details);
        } catch (error) {
            console.error('Error loading exercise details:', error);
            setExerciseDetails(null);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleAddExerciseFromDetail = () => {
        if (!selectedExercise) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Create the exercise object (same structure as WorkoutScreen uses)
        const exerciseId = createUniqueId();
        const setId = createUniqueId();
        const newExercise = {
            id: exerciseId,
            name: selectedExercise.name,
            sets: [
                {
                    id: setId,
                    reps: '10',
                    weight: '0',
                },
            ],
        };

        // If there's a navigation callback, use it; otherwise just add the exercise
        if (onSelectExerciseAndNavigate) {
            onSelectExerciseAndNavigate(selectedExercise, newExercise, [newExercise], 0);
        } else {
            const keys = exerciseMatchKeys(selectedExercise);
            setOptimisticAddedKeys((prev) => new Set([...prev, ...keys]));
            setOptimisticRemovedKeys((prev) => {
                const next = new Set(prev);
                keys.forEach((key) => next.delete(key));
                return next;
            });
            onSelectExercise(selectedExercise);
        }
        onSelectionCommitted?.(1);
        handleBackFromDetail();
    };

    const handleBackFromDetail = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Switch back to search view
        setShowDetailView(false);
        setSelectedExerciseId(null);
        setSelectedExercise(null);
        setExerciseDetails(null);
    };

    const handleAddExercise = (exercise: Exercise) => {
        const keys = exerciseMatchKeys(exercise);
        setOptimisticAddedKeys((prev) => new Set([...prev, ...keys]));
        setOptimisticRemovedKeys((prev) => {
            const next = new Set(prev);
            keys.forEach((key) => next.delete(key));
            return next;
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelectExercise(exercise);
        onSelectionCommitted?.(1);
    };

    const measureAddedTarget = (done?: (target: { x: number; y: number }) => void) => {
        if (!addedTargetRef.current) {
            done?.(addedTargetPos.current);
            return;
        }
        addedTargetRef.current.measureInWindow((ax, ay, aw, ah) => {
            if (aw > 0 || ah > 0) {
                addedTargetPos.current = { x: ax + aw / 2, y: ay + ah / 2 };
            }
            done?.(addedTargetPos.current);
        });
    };

    const pulseAddedCount = () => {
        addedPulse.setValue(1);
        Animated.sequence([
            Animated.timing(addedPulse, {
                toValue: 1.16,
                duration: 120,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.spring(addedPulse, {
                toValue: 1,
                friction: 6,
                tension: 180,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const launchAddParticles = (origin: { x: number; y: number }, exercise: Exercise) => {
        const stamp = getBodyPartStamp(exercise.bodyPart);
        const cached = addedTargetPos.current;
        if (cached.x || cached.y) {
            particleRef.current?.spawnFly(origin, cached, stamp.fill);
        } else {
            measureAddedTarget((target) => {
                particleRef.current?.spawnFly(origin, target, stamp.fill);
            });
        }
        measureAddedTarget();
        pulseAddedCount();
        handleAddExercise(exercise);
    };

    const launchChipBurst = (origin: { x: number; y: number }, color: string) => {
        particleRef.current?.spawnBurst(origin, color);
    };

    const handleRemoveAddedExercise = (exercise: Exercise) => {
        const keys = exerciseMatchKeys(exercise);
        setOptimisticRemovedKeys((prev) => new Set([...prev, ...keys]));
        setOptimisticAddedKeys((prev) => {
            const next = new Set(prev);
            keys.forEach((key) => next.delete(key));
            return next;
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onRemoveExercise?.(exercise);
    };

    const animateOutAndClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 300,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 250,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    // Use exercises directly from Supabase (already filtered server-side when searching)
    const displayedExercises = exercises;
    const currentExerciseIdSet = new Set(currentExerciseIds);
    const currentExerciseNameSet = new Set(
        currentExerciseNames.map((name) => name.trim().toLowerCase())
    );

    const isExerciseAdded = (exercise: Exercise) => {
        const keys = exerciseMatchKeys(exercise);
        if (keys.some((key) => optimisticRemovedKeys.has(key))) return false;
        if (keys.some((key) => optimisticAddedKeys.has(key))) return true;
        const nameKey = exercise.name?.trim().toLowerCase();
        return (
            (!!exercise.id && currentExerciseIdSet.has(exercise.id)) ||
            (!!nameKey && currentExerciseNameSet.has(nameKey))
        );
    };

    // Body-part filter chips derived from whatever is currently loaded.
    const availableBodyParts = Array.from(
        new Set(
            displayedExercises
                .map((exercise) => exercise.bodyPart?.trim().toLowerCase())
                .filter((value): value is string => !!value)
        )
    ).sort();
    const filteredExercises = bodyPartFilter
        ? displayedExercises.filter(
              (exercise) => exercise.bodyPart?.trim().toLowerCase() === bodyPartFilter
          )
        : displayedExercises;
    const addedInView = filteredExercises.filter(isExerciseAdded).length;
    const listedExercises = rowIntroDone
        ? filteredExercises
        : filteredExercises.filter((exercise, index) =>
              revealedKeys.has(exerciseRowKey(exercise, index))
          );

    useEffect(() => {
        if (!visible || loading || displayedExercises.length === 0 || rowIntroDone) return;
        if (searchQuery.trim().length > 0 || bodyPartFilter) {
            setRowIntroDone(true);
            return;
        }

        const keys = displayedExercises.map((exercise, index) =>
            exerciseRowKey(exercise, index)
        );
        const timers = keys.map((key, index) =>
            setTimeout(() => {
                setRevealedKeys((current) => {
                    if (current.has(key)) return current;
                    const next = new Set(current);
                    next.add(key);
                    return next;
                });
            }, REVEAL_START_MS + index * REVEAL_STAGGER_MS)
        );
        const introTimer = setTimeout(
            () => setRowIntroDone(true),
            REVEAL_START_MS + keys.length * REVEAL_STAGGER_MS + 320
        );
        return () => {
            timers.forEach(clearTimeout);
            clearTimeout(introTimer);
        };
    }, [
        visible,
        loading,
        displayedExercises.length,
        displayedExercises[0]?.id,
        rowIntroDone,
        searchQuery,
        bodyPartFilter,
    ]);

    const handleSelectBodyPartFilter = (
        value: string | null,
        origin?: { x: number; y: number },
        color?: string
    ) => {
        const becomingSelected = bodyPartFilter !== value;
        Haptics.selectionAsync();
        setBodyPartFilter((current) => (current === value ? null : value));
        if (becomingSelected && origin && color) {
            launchChipBurst(origin, color);
        }
    };

    return (
        <>
            <Modal
                visible={visible}
                transparent
                animationType="none"
                onRequestClose={onClose}
                statusBarTranslucent={true}
                presentationStyle="overFullScreen"
            >
                <View style={styles.container}>
                    {/* Backdrop */}
                    <Animated.View
                        style={[
                            styles.backdrop,
                            {
                                opacity: backdropOpacity,
                            },
                        ]}
                    >
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={handleBackdropPress}
                        />
                    </Animated.View>

                    {/* Content - Full screen overlay */}
                    <Animated.View
                        style={[
                            styles.content,
                            {
                                transform: [{ translateY: slideAnim }],
                                paddingTop: insets.top,
                                paddingBottom: insets.bottom,
                            },
                        ]}
                    >
                        <View style={styles.contentInner}>
                            {/* Header */}
                            <View style={styles.header}>
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={showDetailView ? handleBackFromDetail : handleClose}
                                    activeOpacity={0.7}
                                >
                                    <PlatesIcon name="chevronLeft" size={22} color={WORKOUT_COLORS.text} />
                                </TouchableOpacity>
                                <View style={styles.headerCenter}>
                                    <Text style={styles.headerTitle}>
                                        {showDetailView ? 'exercise info' : 'add exercise'}
                                    </Text>
                                </View>
                                <View style={styles.headerRight}>
                                    {showDetailView && selectedExercise && (
                                        <TouchableOpacity
                                            style={styles.headerAddButton}
                                            onPress={handleAddExerciseFromDetail}
                                            activeOpacity={0.7}
                                        >
                                            <FlatPlus size={18} color={WORKOUT_COLORS.accent} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            {showDetailView ? (
                                /* Detail View */
                                <View style={styles.detailViewContainer}>
                                    {loadingDetails ? (
                                        <View style={styles.loadingContainer}>
                                            <ActivityIndicator size="large" color="#526EFF" />
                                            <Text style={styles.loadingText}>loading...</Text>
                                        </View>
                                    ) : !exerciseDetails ? (
                                        <View style={styles.emptyContainer}>
                                            <Text style={styles.emptyText}>exercise not found</Text>
                                        </View>
                                    ) : (
                                        <ScrollView
                                            style={styles.scrollView}
                                            contentContainerStyle={styles.detailScrollContent}
                                            showsVerticalScrollIndicator={false}
                                        >
                                            {/* Title */}
                                            <View style={styles.section}>
                                                <Text style={styles.label}>title</Text>
                                                <Text style={styles.value}>{exerciseDetails.Title}</Text>
                                            </View>

                                            {/* Description */}
                                            {exerciseDetails.Desc && (
                                                <View style={styles.section}>
                                                    <Text style={styles.label}>description</Text>
                                                    <Text style={styles.value}>{exerciseDetails.Desc}</Text>
                                                </View>
                                            )}

                                            {/* Type */}
                                            {exerciseDetails.Type && (
                                                <View style={styles.section}>
                                                    <Text style={styles.label}>type</Text>
                                                    <Text style={styles.value}>{exerciseDetails.Type}</Text>
                                                </View>
                                            )}

                                            {/* Body Part */}
                                            {exerciseDetails.BodyPart && (
                                                <View style={styles.section}>
                                                    <Text style={styles.label}>body part</Text>
                                                    <Text style={styles.value}>{exerciseDetails.BodyPart}</Text>
                                                </View>
                                            )}

                                            {/* Equipment */}
                                            {exerciseDetails.Equipment && (
                                                <View style={styles.section}>
                                                    <Text style={styles.label}>equipment</Text>
                                                    <Text style={styles.value}>{exerciseDetails.Equipment}</Text>
                                                </View>
                                            )}

                                            {/* Level */}
                                            {exerciseDetails.Level && (
                                                <View style={styles.section}>
                                                    <Text style={styles.label}>level</Text>
                                                    <Text style={styles.value}>{exerciseDetails.Level}</Text>
                                                </View>
                                            )}
                                        </ScrollView>
                                    )}
                                </View>
                            ) : (
                                /* Search View */
                                <>
                                    <HardSearchBar
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholder="search exercises"
                                        containerStyle={styles.searchBar}
                                    />

                                    {!loading && availableBodyParts.length > 0 && (
                                        <View style={styles.filterRow}>
                                            <ScrollView
                                                horizontal
                                                showsHorizontalScrollIndicator={false}
                                                contentContainerStyle={styles.filterContent}
                                                keyboardShouldPersistTaps="handled"
                                            >
                                                <BodyPartChip
                                                    label="all"
                                                    icon="dumbbell"
                                                    fill="#526EFF"
                                                    wash="#EAEEFF"
                                                    isActive={bodyPartFilter === null}
                                                    onPress={(origin) =>
                                                        handleSelectBodyPartFilter(null, origin, '#526EFF')
                                                    }
                                                />
                                                {availableBodyParts.map((part) => {
                                                    const stamp = getBodyPartStamp(part);
                                                    return (
                                                        <BodyPartChip
                                                            key={part}
                                                            label={part}
                                                            icon={stamp.icon}
                                                            fill={stamp.fill}
                                                            wash={stamp.wash}
                                                            isActive={bodyPartFilter === part}
                                                            onPress={(origin) =>
                                                                handleSelectBodyPartFilter(part, origin, stamp.fill)
                                                            }
                                                        />
                                                    );
                                                })}
                                            </ScrollView>
                                        </View>
                                    )}
                                </>
                            )}

                            {!showDetailView && (
                                <View style={styles.exercisesContainer}>
                                    {/* Exercises List */}
                                    {loading ? (
                                        <View style={styles.loadingContainer}>
                                            <ActivityIndicator size="large" color="#526EFF" />
                                            <Text style={styles.loadingText}>loading exercises...</Text>
                                        </View>
                                    ) : (
                                        <>
                                            {filteredExercises.length > 0 && (
                                                <View style={styles.resultsRow}>
                                                    <Text style={styles.resultsCount}>
                                                        {filteredExercises.length}
                                                        {hasMore && !bodyPartFilter ? '+' : ''}{' '}
                                                        {filteredExercises.length === 1 ? 'exercise' : 'exercises'}
                                                    </Text>
                                                    <Animated.View
                                                        ref={addedTargetRef}
                                                        collapsable={false}
                                                        onLayout={() => {
                                                            addedTargetRef.current?.measureInWindow((ax, ay, aw, ah) => {
                                                                if (aw > 0 || ah > 0) {
                                                                    addedTargetPos.current = { x: ax + aw / 2, y: ay + ah / 2 };
                                                                }
                                                            });
                                                        }}
                                                        style={{ transform: [{ scale: addedPulse }] }}
                                                    >
                                                        <Text style={styles.resultsCount}>
                                                            {addedInView} added
                                                        </Text>
                                                    </Animated.View>
                                                </View>
                                            )}
                                            <ScrollView
                                                ref={scrollViewRef}
                                                style={styles.scrollView}
                                                contentContainerStyle={styles.scrollContent}
                                                showsVerticalScrollIndicator={false}
                                                onScroll={handleScroll}
                                                scrollEventThrottle={400}
                                            >
                                                {filteredExercises.length === 0 ? (
                                                    <View style={styles.emptyContainer}>
                                                        <Text style={styles.emptyText}>
                                                            {searchQuery.trim().length > 0
                                                                ? 'no exercises match your search'
                                                                : bodyPartFilter
                                                                    ? 'no exercises for this filter'
                                                                    : 'no exercises found'}
                                                        </Text>
                                                        {(searchQuery.trim().length > 0 || bodyPartFilter) && (
                                                            <Text style={styles.emptyHint}>try a different keyword or filter</Text>
                                                        )}
                                                    </View>
                                                ) : (
                                                    <>
                                                        {listedExercises.map((exercise, index) => (
                                                            <Reanimated.View
                                                                key={exerciseRowKey(exercise, index)}
                                                                entering={rowIntroDone ? undefined : recEnter}
                                                            >
                                                                <AnimatedExerciseRow
                                                                    exercise={exercise}
                                                                    isAdded={isExerciseAdded(exercise)}
                                                                    onOpen={() => handleExerciseTitlePress(exercise)}
                                                                    onAdd={(origin) => launchAddParticles(origin, exercise)}
                                                                    onRemove={() => handleRemoveAddedExercise(exercise)}
                                                                />
                                                            </Reanimated.View>
                                                        ))}
                                                        {loadingMore && (
                                                            <View style={styles.loadingMoreContainer}>
                                                                <ActivityIndicator size="small" color="#526EFF" />
                                                                <Text style={styles.loadingMoreText}>loading more...</Text>
                                                            </View>
                                                        )}
                                                    </>
                                                )}
                                            </ScrollView>
                                        </>
                                    )}
                                </View>
                            )}
                        </View>
                    </Animated.View>
                    <AddParticleLayer ref={particleRef} />
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backdrop: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    content: {
        flex: 1,
        backgroundColor: '#fff',
    },
    contentInner: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 6,
    },
    backButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerRight: {
        width: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerAddButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    exercisesContainer: {
        flex: 1,
    },
    detailViewContainer: {
        flex: 1,
    },
    searchBar: {
        marginTop: 16,
        marginBottom: 8,
        marginHorizontal: 20,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 0,
        paddingBottom: 28,
    },
    detailScrollContent: {
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    resultsRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 6,
        backgroundColor: '#fff',
        zIndex: 2,
    },
    resultsCount: {
        fontSize: 13,
        fontFamily: fonts.regular,
        color: WORKOUT_COLORS.placeholder,
        textTransform: 'lowercase',
    },
    flyLayer: {
        ...StyleSheet.absoluteFill,
        zIndex: 20,
    },
    exerciseStamp: {
        borderWidth: 0,
    },
    exerciseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        paddingBottom: 14,
        paddingHorizontal: 7,
        borderBottomWidth: 2,
        borderBottomColor: '#F0F0F0',
    },
    exerciseItemContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    exerciseTitleContainer: {
        flex: 1,
    },
    exerciseName: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    exerciseMeta: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#999',
        textTransform: 'lowercase',
        marginTop: 2,
    },
    addButton: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    filterRow: {
        marginTop: 2,
        marginBottom: 2,
    },
    filterContent: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        gap: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: '#616161',
        textTransform: 'lowercase',
    },
    emptyHint: {
        fontSize: 13,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginTop: 6,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginTop: 12,
    },
    loadingMoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        gap: 8,
    },
    loadingMoreText: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontFamily: fonts.bold,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginBottom: 8,
    },
    value: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
        lineHeight: 26,
    },
});

