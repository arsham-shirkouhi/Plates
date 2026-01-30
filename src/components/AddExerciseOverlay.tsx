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
import { getExercisesList, searchExercises, Exercise } from '../services/exerciseService';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface AddExerciseOverlayProps {
    visible: boolean;
    onClose: () => void;
    onSelectExercise: (exercise: Exercise) => void;
}

export const AddExerciseOverlay: React.FC<AddExerciseOverlayProps> = ({
    visible,
    onClose,
    onSelectExercise,
}) => {
    const insets = useSafeAreaInsets();
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

    // Load exercises from Supabase when overlay becomes visible
    useEffect(() => {
        if (visible) {
            // Reset state when opening
            setExercises([]);
            setOffset(0);
            setHasMore(true);
            loadExercises(0, true);
        } else {
            // Reset search when closing
            setSearchQuery('');
            setExercises([]);
            setOffset(0);
            setHasMore(true);
        }
    }, [visible]);

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

    const handleExercisePress = (exercise: Exercise) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelectExercise(exercise);
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
                        <View style={styles.headerContainer}>
                            {/* Header */}
                            <View style={styles.header}>
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={handleClose}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="chevron-back" size={24} color="#526EFF" />
                                </TouchableOpacity>
                                <View style={styles.headerCenter}>
                                    <Text style={styles.headerTitle}>add exercise</Text>
                                </View>
                                <View style={styles.headerRight} />
                            </View>
                        </View>

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
                                                <TouchableOpacity
                                                    key={`exercise-${index}-${exercise.id || exercise.name || 'item'}`}
                                                    style={styles.exerciseItem}
                                                    onPress={() => handleExercisePress(exercise)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                                                </TouchableOpacity>
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
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    content: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
        paddingVertical: 14,
        paddingHorizontal: 7,
        borderBottomWidth: 2,
        borderBottomColor: '#F0F0F0',
    },
    exerciseName: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
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
});

