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
import { useOverlay } from '../contexts/OverlayContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface AddExerciseOverlayProps {
    visible: boolean;
    onClose: () => void;
    onSelectExercise: (exercise: Exercise) => void;
    onSelectExerciseAndNavigate?: (exercise: Exercise, createdExercise: { id: string; name: string; sets: Array<{ id: string; reps: string; weight: string }> }, allExercises: Array<{ id: string; name: string; sets: Array<{ id: string; reps: string; weight: string }> }>, exerciseIndex: number) => void;
}

export const AddExerciseOverlay: React.FC<AddExerciseOverlayProps> = ({
    visible,
    onClose,
    onSelectExercise,
    onSelectExerciseAndNavigate,
}) => {
    const navigation = useNavigation<NavigationProp>();
    const insets = useSafeAreaInsets();
    const { registerOverlay } = useOverlay();
    const OVERLAY_ID = 'AddExerciseOverlay';
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const [searchQuery, setSearchQuery] = useState('');
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const [showDetailView, setShowDetailView] = useState(false);
    const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null); // Store the original exercise for adding
    const [exerciseDetails, setExerciseDetails] = useState<ExerciseDetails | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [hasLoadedInitial, setHasLoadedInitial] = useState(false);

    // Load exercises from Supabase when overlay becomes visible
    // Only load when the overlay first opens, not when detail overlay opens/closes
    useEffect(() => {
        if (visible && !hasLoadedInitial) {
            // Only load on initial open
            setExercises([]);
            setOffset(0);
            setHasMore(true);
            loadExercises(0, true);
            setHasLoadedInitial(true);
        } else if (!visible) {
            // Reset everything when closing the entire overlay
            setSearchQuery('');
            setExercises([]);
            setOffset(0);
            setHasMore(true);
            setShowDetailView(false);
            setSelectedExerciseId(null);
            setSelectedExercise(null);
            setExerciseDetails(null);
            setHasLoadedInitial(false);
        }
    }, [visible, hasLoadedInitial]);

    // Search exercises when search query changes
    useEffect(() => {
        if (!visible) return;

        const timeout = setTimeout(() => {
            if (searchQuery.trim().length > 0) {
                // Reset pagination for search
                setOffset(0);
                setHasMore(true);
                searchExercisesFromDB(searchQuery);
            } else {
                // Reset pagination when clearing search
                setOffset(0);
                setHasMore(true);
                setExercises([]);
                loadExercises(0, true);
            }
        }, 300); // Debounce search by 300ms

        setSearchTimeout(timeout);

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

    const handleBackdropPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        const exerciseId = Date.now().toString();
        const setId = (Date.now() + 1).toString();
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
            onSelectExercise(selectedExercise);
        }

        // Animate out before closing
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

    const handleBackFromDetail = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Switch back to search view
        setShowDetailView(false);
        setSelectedExerciseId(null);
        setSelectedExercise(null);
        setExerciseDetails(null);
    };

    const handleAddExercise = (exercise: Exercise) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Create the exercise object (same structure as WorkoutScreen uses)
        const exerciseId = Date.now().toString();
        const setId = (Date.now() + 1).toString(); // Slightly different to ensure unique ID
        const newExercise = {
            id: exerciseId,
            name: exercise.name,
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
            // Pass the new exercise - WorkoutScreen will handle adding it and navigating with all exercises
            onSelectExerciseAndNavigate(exercise, newExercise, [newExercise], 0);
        } else {
            onSelectExercise(exercise);
        }

        // Animate out before closing
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
                <View style={styles.container} pointerEvents="auto">
                    {/* Backdrop - blocks all touches */}
                    <Animated.View
                        style={[
                            styles.backdrop,
                            {
                                opacity: backdropOpacity,
                            },
                        ]}
                        pointerEvents="auto"
                    >
                        <View style={StyleSheet.absoluteFill} pointerEvents="auto">
                            <TouchableOpacity
                                style={StyleSheet.absoluteFill}
                                activeOpacity={1}
                                onPress={handleBackdropPress}
                            />
                        </View>
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
                        pointerEvents="box-none"
                    >
                        <View style={styles.contentInner} pointerEvents="auto">
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

                            {showDetailView ? (
                                /* Detail View */
                                <View style={styles.contentInnerView}>
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
                                            contentContainerStyle={styles.scrollContent}
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

                                    <View style={styles.contentInnerView}>
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
                                                {displayedExercises.length === 0 ? (
                                                    <View style={styles.emptyContainer}>
                                                        <Text style={styles.emptyText}>no exercises found</Text>
                                                    </View>
                                                ) : (
                                                    <>
                                                        {displayedExercises.map((exercise, index) => (
                                                            <View
                                                                key={`exercise-${index}-${exercise.id || exercise.name || 'item'}`}
                                                                style={styles.exerciseItem}
                                                            >
                                                                <TouchableOpacity
                                                                    style={styles.exerciseTitleContainer}
                                                                    onPress={() => handleExerciseTitlePress(exercise)}
                                                                    activeOpacity={0.7}
                                                                >
                                                                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                                                                </TouchableOpacity>
                                                                <TouchableOpacity
                                                                    style={styles.addButton}
                                                                    onPress={() => handleAddExercise(exercise)}
                                                                    activeOpacity={0.7}
                                                                >
                                                                    <Ionicons name="add" size={24} color="#526EFF" />
                                                                </TouchableOpacity>
                                                            </View>
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
                                </>
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
        backgroundColor: 'transparent',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1,
    },
    content: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#fff',
        zIndex: 2,
    },
    contentInner: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 2,
        borderBottomColor: '#F0F0F0',
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerRight: {
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerAddButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    contentInnerView: {
        flex: 1,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginTop: 12,
        marginBottom: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#252525',
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
        paddingBottom: 10,
    },
    exerciseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 7,
        borderBottomWidth: 2,
        borderBottomColor: '#F0F0F0',
    },
    exerciseTitleContainer: {
        flex: 1,
        paddingRight: 12,
    },
    exerciseName: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
    },
    addButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
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

