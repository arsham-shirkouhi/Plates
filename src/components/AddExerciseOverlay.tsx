import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Easing,
    ScrollView,
    TextInput,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';
import { getExercisesList, searchExercises, Exercise, getExerciseDetails, ExerciseDetails } from '../services/exerciseService';
import { useRegisterOverlay } from '../contexts/OverlayContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import Reanimated, {
    interpolate,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_HEIGHT = Dimensions.get('window').height;

function createUniqueId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface BodyPartVisual {
    icon: IoniconName;
    tint: string;
    bg: string;
}

const BODY_PART_VISUALS: { keys: string[]; visual: BodyPartVisual }[] = [
    { keys: ['chest', 'pec'], visual: { icon: 'body-outline', tint: '#526EFF', bg: '#EAEEFF' } },
    { keys: ['back', 'lat', 'trap'], visual: { icon: 'body-outline', tint: '#00897B', bg: '#E0F2F1' } },
    { keys: ['shoulder', 'delt'], visual: { icon: 'barbell-outline', tint: '#F4511E', bg: '#FBE9E7' } },
    { keys: ['bicep', 'tricep', 'arm', 'forearm'], visual: { icon: 'barbell-outline', tint: '#8E24AA', bg: '#F3E5F5' } },
    { keys: ['leg', 'quad', 'hamstring', 'glute', 'calf', 'thigh'], visual: { icon: 'walk-outline', tint: '#3949AB', bg: '#E8EAF6' } },
    { keys: ['core', 'ab', 'waist', 'oblique'], visual: { icon: 'flame-outline', tint: '#FB8C00', bg: '#FFF3E0' } },
    { keys: ['cardio', 'heart'], visual: { icon: 'heart-outline', tint: '#E53935', bg: '#FFEBEE' } },
];

const DEFAULT_BODY_PART_VISUAL: BodyPartVisual = {
    icon: 'barbell-outline',
    tint: '#526EFF',
    bg: '#EAEEFF',
};

function getBodyPartVisual(bodyPart?: string): BodyPartVisual {
    if (!bodyPart) return DEFAULT_BODY_PART_VISUAL;
    const normalized = bodyPart.trim().toLowerCase();
    const match = BODY_PART_VISUALS.find((entry) =>
        entry.keys.some((key) => normalized.includes(key))
    );
    return match?.visual ?? DEFAULT_BODY_PART_VISUAL;
}

function exerciseMatchKeys(exercise: Pick<Exercise, 'id' | 'name'>): string[] {
    const keys: string[] = [];
    if (exercise.id) keys.push(exercise.id);
    const nameKey = exercise.name?.trim().toLowerCase();
    if (nameKey) keys.push(nameKey);
    return keys;
}

interface AnimatedExerciseRowProps {
    exercise: Exercise;
    isAdded: boolean;
    onOpen: () => void;
    onAdd: () => void;
    onRemove: () => void;
}

const AnimatedExerciseRow: React.FC<AnimatedExerciseRowProps> = ({
    exercise,
    isAdded,
    onOpen,
    onAdd,
    onRemove,
}) => {
    const visual = getBodyPartVisual(exercise.bodyPart);
    const added = useSharedValue(isAdded ? 1 : 0);
    const pressScale = useSharedValue(1);

    useEffect(() => {
        added.value = withSpring(isAdded ? 1 : 0, { damping: 14, stiffness: 220 });
    }, [added, isAdded]);

    const rowStyle = useAnimatedStyle(() => ({
        borderColor: interpolateColor(added.value, [0, 1], ['#EDEDED', '#526EFF']),
        backgroundColor: interpolateColor(added.value, [0, 1], ['#FFFFFF', '#F5F7FF']),
        transform: [{ scale: interpolate(added.value, [0, 0.4, 1], [1, 1.02, 1]) }],
    }));

    const addBtnStyle = useAnimatedStyle(() => ({
        opacity: interpolate(added.value, [0, 1], [1, 0]),
        transform: [{ scale: interpolate(added.value, [0, 1], [1, 0.55]) }],
    }));

    const removeBtnStyle = useAnimatedStyle(() => ({
        opacity: interpolate(added.value, [0, 1], [0, 1]),
        transform: [{ scale: interpolate(added.value, [0, 1], [0.55, 1]) }],
    }));

    const toggleWrapStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pressScale.value }],
    }));

    const handleToggle = () => {
        pressScale.value = withSequence(
            withTiming(0.84, { duration: 70 }),
            withSpring(1, { damping: 12, stiffness: 280 })
        );
        if (isAdded) onRemove();
        else onAdd();
    };

    return (
        <TouchableOpacity
            style={styles.exerciseItemHit}
            onPress={onOpen}
            activeOpacity={0.85}
        >
            <Reanimated.View style={[styles.exerciseItem, rowStyle]}>
                <View style={[styles.exerciseAvatar, { backgroundColor: visual.bg }]}>
                    <Ionicons name={visual.icon} size={22} color={visual.tint} />
                </View>
                <View style={styles.exerciseTitleContainer}>
                    <Text style={styles.exerciseName} numberOfLines={2}>
                        {exercise.name}
                    </Text>
                    {!!exercise.bodyPart && (
                        <View style={styles.bodyPartChip}>
                            <View
                                style={[
                                    styles.bodyPartDot,
                                    { backgroundColor: visual.tint },
                                ]}
                            />
                            <Text style={styles.exerciseBodyPart}>
                                {exercise.bodyPart.toLowerCase()}
                            </Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity
                    onPress={handleToggle}
                    activeOpacity={0.85}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={isAdded ? `Remove ${exercise.name}` : `Add ${exercise.name}`}
                >
                    <Reanimated.View style={[styles.toggleButtonSlot, toggleWrapStyle]}>
                        <Reanimated.View
                            pointerEvents="none"
                            style={[styles.toggleButton, styles.toggleButtonDefault, addBtnStyle]}
                        >
                            <Ionicons name="add" size={22} color="#526EFF" />
                        </Reanimated.View>
                        <Reanimated.View
                            pointerEvents="none"
                            style={[styles.toggleButton, styles.toggleButtonRemove, removeBtnStyle]}
                        >
                            <Ionicons name="trash-outline" size={20} color="#FF5252" />
                        </Reanimated.View>
                    </Reanimated.View>
                </TouchableOpacity>
            </Reanimated.View>
        </TouchableOpacity>
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
    const loadedForOpenRef = useRef(false);
    const wasVisibleRef = useRef(false);

    // Load exercises once when the overlay opens; reset local state when it closes.
    useEffect(() => {
        if (visible) {
            if (!loadedForOpenRef.current) {
                loadedForOpenRef.current = true;
                setExercises([]);
                setOffset(0);
                setHasMore(true);
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

    const handleSelectBodyPartFilter = (value: string | null) => {
        Haptics.selectionAsync();
        setBodyPartFilter((current) => (current === value ? null : value));
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
                                    <Ionicons name="chevron-back" size={24} color="#526EFF" />
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
                                            <Ionicons name="add" size={24} color="#526EFF" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                            <View style={styles.headerDivider} />

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
                                    {/* Search Bar */}
                                    <View style={styles.searchContainer}>
                                        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                                        <TextInput
                                            style={styles.searchInput}
                                            placeholder="search exercises"
                                            placeholderTextColor="#999"
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                        {searchQuery.length > 0 && (
                                            <TouchableOpacity
                                                onPress={() => setSearchQuery('')}
                                                style={styles.clearButton}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="close-circle" size={20} color="#666" />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {!loading && availableBodyParts.length > 0 && (
                                        <View style={styles.filterRow}>
                                            <ScrollView
                                                horizontal
                                                showsHorizontalScrollIndicator={false}
                                                contentContainerStyle={styles.filterContent}
                                                keyboardShouldPersistTaps="handled"
                                            >
                                                <TouchableOpacity
                                                    style={[
                                                        styles.filterChip,
                                                        bodyPartFilter === null && styles.filterChipActive,
                                                    ]}
                                                    onPress={() => handleSelectBodyPartFilter(null)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.filterChipText,
                                                            bodyPartFilter === null && styles.filterChipTextActive,
                                                        ]}
                                                    >
                                                        all
                                                    </Text>
                                                </TouchableOpacity>
                                                {availableBodyParts.map((part) => {
                                                    const isActive = bodyPartFilter === part;
                                                    const visual = getBodyPartVisual(part);
                                                    return (
                                                        <TouchableOpacity
                                                            key={part}
                                                            style={[
                                                                styles.filterChip,
                                                                isActive && styles.filterChipActive,
                                                            ]}
                                                            onPress={() => handleSelectBodyPartFilter(part)}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Ionicons
                                                                name={visual.icon}
                                                                size={14}
                                                                color={isActive ? '#FFFFFF' : visual.tint}
                                                                style={styles.filterChipIcon}
                                                            />
                                                            <Text
                                                                style={[
                                                                    styles.filterChipText,
                                                                    isActive && styles.filterChipTextActive,
                                                                ]}
                                                            >
                                                                {part}
                                                            </Text>
                                                        </TouchableOpacity>
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
                                                    <View style={styles.emptyIconCircle}>
                                                        <Ionicons name="barbell-outline" size={30} color="#B0B6C9" />
                                                    </View>
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
                                                    <Text style={styles.resultsCount}>
                                                        {filteredExercises.length}
                                                        {hasMore && !bodyPartFilter ? '+' : ''}{' '}
                                                        {filteredExercises.length === 1 ? 'exercise' : 'exercises'}
                                                    </Text>
                                                    {filteredExercises.map((exercise, index) => (
                                                        <AnimatedExerciseRow
                                                            key={`exercise-${index}-${exercise.id || exercise.name || 'item'}`}
                                                            exercise={exercise}
                                                            isAdded={isExerciseAdded(exercise)}
                                                            onOpen={() => handleExerciseTitlePress(exercise)}
                                                            onAdd={() => handleAddExercise(exercise)}
                                                            onRemove={() => handleRemoveAddedExercise(exercise)}
                                                        />
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
                                    )}
                                </View>
                            )}
                        </View>
                    </Animated.View>
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
    headerDivider: {
        height: 2,
        backgroundColor: '#E0E0E0',
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 6,
        marginHorizontal: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#CCCCCC',
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#252525',
        padding: 0,
    },
    clearButton: {
        marginLeft: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 8,
    },
    detailScrollContent: {
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    resultsCount: {
        fontSize: 13,
        fontFamily: fonts.bold,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginTop: 4,
        marginBottom: 12,
    },
    exerciseItemHit: {
        marginBottom: 10,
    },
    exerciseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#EDEDED',
    },
    exerciseItemSelected: {
        borderColor: '#526EFF',
        backgroundColor: '#F5F7FF',
    },
    exerciseItemAdded: {
        borderColor: '#526EFF',
        backgroundColor: '#F5F7FF',
    },
    exerciseAvatar: {
        width: 46,
        height: 46,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    exerciseTitleContainer: {
        flex: 1,
        paddingRight: 12,
    },
    exerciseName: {
        fontSize: 17,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    bodyPartChip: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
    },
    bodyPartDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        marginRight: 6,
    },
    exerciseBodyPart: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: '#757575',
        textTransform: 'lowercase',
    },
    toggleButtonSlot: {
        width: 40,
        height: 40,
    },
    toggleButton: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    toggleButtonDefault: {
        backgroundColor: '#EAEEFF',
        borderColor: '#EAEEFF',
    },
    toggleButtonSelected: {
        backgroundColor: '#526EFF',
        borderColor: '#526EFF',
    },
    toggleButtonRemove: {
        backgroundColor: '#FFEBEE',
        borderColor: '#FFEBEE',
    },
    filterRow: {
        marginTop: 4,
        marginBottom: 4,
    },
    filterContent: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: '#F2F2F2',
        borderWidth: 2,
        borderColor: '#F2F2F2',
    },
    filterChipActive: {
        backgroundColor: '#252525',
        borderColor: '#252525',
    },
    filterChipIcon: {
        marginRight: 5,
    },
    filterChipText: {
        fontSize: 13,
        fontFamily: fonts.bold,
        color: '#616161',
        textTransform: 'lowercase',
    },
    filterChipTextActive: {
        color: '#FFFFFF',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#F2F3F7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
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

