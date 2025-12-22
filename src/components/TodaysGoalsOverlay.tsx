import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Easing,
    ScrollView,
    Alert,
    Dimensions,
    Platform,
    PanResponder,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';

interface Goal {
    text: string;
    completed: boolean;
    createdAt?: string; // ISO timestamp
    isRepeating?: boolean; // Daily repeating goal
    order?: number; // For dashboard ordering
}

interface TodaysGoalsOverlayProps {
    visible: boolean;
    onClose: () => void;
    goals: Goal[];
    onGoalsChange: (goals: Goal[]) => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export const TodaysGoalsOverlay: React.FC<TodaysGoalsOverlayProps> = ({
    visible,
    onClose,
    goals,
    onGoalsChange,
}) => {
    const insets = useSafeAreaInsets();
    const [confettiParticles, setConfettiParticles] = useState<Array<{ id: number; originX: number; originY: number; angle: number }>>([]);
    const [removingIndex, setRemovingIndex] = useState<number | null>(null);
    const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());
    const [newlyCompletedIds, setNewlyCompletedIds] = useState<Set<string>>(new Set());

    const containerRef = useRef<View>(null);
    const contentContainerRef = useRef<View>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const dailyPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isScrollingRef = useRef(false);
    const pressStartTimeRef = useRef<number | null>(null);
    const goalsRef = useRef(goals);

    // Keep ref in sync with goals prop
    useEffect(() => {
        goalsRef.current = goals;
    }, [goals]);


    // Animation refs - slide up from bottom like AddFoodBottomSheet
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    // Pan responder for long press to add
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                // If user moves more than 10px, consider it scrolling and cancel long press
                if (Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10) {
                    isScrollingRef.current = true;
                    if (longPressTimerRef.current) {
                        clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = null;
                    }
                    return false;
                }
                return false;
            },
            onMoveShouldSetPanResponderCapture: () => false,
            onPanResponderGrant: () => {
                isScrollingRef.current = false;
                pressStartTimeRef.current = Date.now();

                // Start timer for showing choice dialog (500ms)
                longPressTimerRef.current = setTimeout(() => {
                    if (!isScrollingRef.current && pressStartTimeRef.current) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        handleShowAddChoice();
                        pressStartTimeRef.current = null;
                    }
                }, 500);
            },
            onPanResponderMove: (evt, gestureState) => {
                // If user moves more than 10px, cancel long press
                if (Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10) {
                    isScrollingRef.current = true;
                    if (longPressTimerRef.current) {
                        clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = null;
                    }
                    if (dailyPressTimerRef.current) {
                        clearTimeout(dailyPressTimerRef.current);
                        dailyPressTimerRef.current = null;
                    }
                }
            },
            onPanResponderRelease: () => {
                // Cancel timer if released early
                if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                }

                pressStartTimeRef.current = null;
                isScrollingRef.current = false;
            },
            onPanResponderTerminate: () => {
                if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                }
                if (dailyPressTimerRef.current) {
                    clearTimeout(dailyPressTimerRef.current);
                    dailyPressTimerRef.current = null;
                }
                pressStartTimeRef.current = null;
                isScrollingRef.current = false;
            },
            onPanResponderTerminationRequest: () => true,
        })
    ).current;

    useEffect(() => {
        if (visible) {
            // Reset animations
            slideAnim.setValue(SCREEN_HEIGHT);
            backdropOpacity.setValue(0);

            // Animate in - slide up from bottom
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
        // Note: Closing animation is handled in handleClose/handleBackdropPress
    }, [visible]);

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Animate out first, then call onClose
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
        // Animate out first, then call onClose
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

    const handleShowAddChoice = () => {
        Alert.alert(
            'Add Todo',
            'Choose the type of todo:',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Today',
                    onPress: () => handleAddTodo(false),
                },
                {
                    text: 'Daily',
                    onPress: () => handleAddTodo(true),
                },
            ]
        );
    };

    const handleAddTodo = (isDaily: boolean = false) => {
        const title = isDaily ? 'Add Daily Todo' : 'Add Todo';
        const message = isDaily ? 'Enter a new daily repeating todo item' : 'Enter a new todo item';

        Alert.prompt(
            title,
            message,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Add',
                    onPress: (text) => {
                        if (text && text.trim()) {
                            // Use ref to get the latest goals value (avoids stale closure)
                            const currentGoals = goalsRef.current;
                            const newGoal: Goal = {
                                text: text.trim().toLowerCase(),
                                completed: false,
                                createdAt: new Date().toISOString(),
                                isRepeating: isDaily,
                                order: currentGoals.length,
                            };
                            // Always append to the list, never replace
                            const updatedGoals = [...currentGoals, newGoal];

                            // Mark as newly added for animation
                            const goalId = `${newGoal.text}-${newGoal.createdAt}`;
                            setNewlyAddedIds(prev => new Set([...prev, goalId]));

                            // Remove from newly added after animation completes
                            setTimeout(() => {
                                setNewlyAddedIds(prev => {
                                    const next = new Set(prev);
                                    next.delete(goalId);
                                    return next;
                                });
                            }, 400);

                            onGoalsChange(updatedGoals);
                        }
                    },
                },
            ],
            'plain-text'
        );
    };

    const handleGoalPress = (index: number, originX: number, originY: number) => {
        const goal = goals[index];
        if (goal.completed) {
            // Toggle back to incomplete
            const updatedGoals = [...goals];
            updatedGoals[index].completed = false;
            onGoalsChange(updatedGoals);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Measure the content container (where confetti is positioned relative to)
        contentContainerRef.current?.measureInWindow((containerX, containerY) => {
            const relativeX = originX - containerX;
            const relativeY = originY - containerY;

            // Mark as completed immediately (no exit animation)
            const updatedGoals = [...goals];
            updatedGoals[index].completed = true;
            onGoalsChange(updatedGoals);

            // Add confetti
            const particles = Array.from({ length: 16 }, (_, i) => ({
                id: Date.now() + i,
                originX: relativeX,
                originY: relativeY,
                angle: (i / 16) * 360,
            }));
            setConfettiParticles(particles);

            setTimeout(() => {
                setConfettiParticles([]);
            }, 500);
        });
    };

    const completedCount = goals.filter(g => g.completed).length;
    const totalCount = goals.length;
    const completionPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    // Sort all goals: daily tasks first, then by order (completed items stay in place)
    const sortedGoals = [...goals].sort((a, b) => {
        // Daily tasks always come first
        if (a.isRepeating && !b.isRepeating) return -1;
        if (!a.isRepeating && b.isRepeating) return 1;

        // Within same type, sort by order
        const orderA = a.order ?? Infinity;
        const orderB = b.order ?? Infinity;
        return orderA - orderB;
    });

    // Format time helper - show actual time
    const formatTime = (isoString?: string) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'pm' : 'am';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
        return `${displayHours}:${displayMinutes} ${ampm}`;
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <View ref={contentContainerRef} style={styles.container}>
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
                    {...panResponder.panHandlers}
                >
                    <View
                        ref={containerRef}
                        style={styles.contentInner}
                    >
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
                                    <Text style={styles.headerTitle}>today's goals</Text>
                                    {totalCount > 0 && (
                                        <Text style={styles.headerStats}>
                                            {completedCount} of {totalCount} completed
                                        </Text>
                                    )}
                                </View>
                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={handleShowAddChoice}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="add" size={32} color="#526EFF" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Header divider - outside padded container for full width */}
                        <View style={styles.headerDivider} />

                        <View style={styles.contentInnerView}>
                            {/* Goals List */}
                            <ScrollView
                                style={styles.scrollView}
                                contentContainerStyle={styles.scrollContent}
                                showsVerticalScrollIndicator={false}
                                onScrollBeginDrag={() => {
                                    isScrollingRef.current = true;
                                    if (longPressTimerRef.current) {
                                        clearTimeout(longPressTimerRef.current);
                                        longPressTimerRef.current = null;
                                    }
                                }}
                                onScrollEndDrag={() => {
                                    isScrollingRef.current = false;
                                }}
                            >
                                {goals.length === 0 ? (
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyText}>hold the screen to add a todo</Text>
                                    </View>
                                ) : (
                                    <View style={styles.goalsContainer}>
                                        {sortedGoals.length > 0 ? (
                                            sortedGoals.map((goal, displayIndex) => {
                                                const originalIndex = goals.findIndex(g => g === goal);
                                                const goalId = `${goal.text}-${goal.createdAt}`;
                                                const isNewlyAdded = newlyAddedIds.has(goalId);
                                                const isNewlyCompleted = newlyCompletedIds.has(goalId);
                                                return (
                                                    <GoalItem
                                                        key={`${goal.text}-${originalIndex}`}
                                                        goal={goal}
                                                        index={originalIndex}
                                                        displayIndex={displayIndex}
                                                        isRemoving={false}
                                                        isNewlyAdded={isNewlyAdded || isNewlyCompleted}
                                                        sectionExpanded={true}
                                                        totalItems={sortedGoals.length}
                                                        onLongPress={(originX, originY) => handleGoalPress(originalIndex, originX, originY)}
                                                        formatTime={formatTime}
                                                    />
                                                );
                                            })
                                        ) : (
                                            <View style={styles.emptyIncompleteContainer}>
                                                <Text style={styles.emptyIncompleteText}>hold the screen to add a todo</Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </ScrollView>

                            {/* Bottom hint text */}
                            <View style={[styles.bottomHint, { bottom: insets.bottom + 10 }]}>
                                <Text style={styles.bottomHintText}>hold the screen to add an item</Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/* Confetti particles */}
                {confettiParticles.map((particle) => (
                    <ConfettiParticle
                        key={particle.id}
                        originX={particle.originX}
                        originY={particle.originY}
                        angle={particle.angle}
                    />
                ))}

            </View>
        </Modal>
    );
};

interface GoalItemProps {
    goal: Goal;
    index: number;
    displayIndex: number;
    isRemoving: boolean;
    isDragging?: boolean;
    isNewlyAdded?: boolean;
    sectionExpanded?: boolean;
    totalItems?: number;
    onLongPress: (originX: number, originY: number) => void;
    formatTime: (isoString?: string) => string;
}

const GoalItem: React.FC<GoalItemProps> = ({ goal, index, displayIndex, isRemoving, isDragging, isNewlyAdded = false, sectionExpanded = true, totalItems = 1, onLongPress, formatTime }) => {
    const strikethroughWidth = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    // Start visible if section is already expanded, otherwise start hidden for staggered animation
    const itemOpacity = useRef(new Animated.Value(isNewlyAdded ? 0 : 1)).current;
    const itemTranslateY = useRef(new Animated.Value(isNewlyAdded ? 20 : 0)).current;
    const itemHeight = useRef(new Animated.Value(1)).current;
    const goalItemRef = useRef<TouchableOpacity>(null);
    const textRef = useRef<Text>(null);
    const [textWidth, setTextWidth] = React.useState(0);

    React.useEffect(() => {
        if (goal.completed && textWidth > 0) {
            Animated.parallel([
                Animated.timing(strikethroughWidth, {
                    toValue: textWidth,
                    duration: 400,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: false,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: false,
                }),
            ]).start();
        } else {
            strikethroughWidth.setValue(0);
            opacity.setValue(0);
        }
    }, [goal.completed, textWidth]);

    // Entrance animation for newly added items
    React.useEffect(() => {
        if (isNewlyAdded) {
            Animated.parallel([
                Animated.timing(itemOpacity, {
                    toValue: 1,
                    duration: 400,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: false,
                }),
                Animated.timing(itemTranslateY, {
                    toValue: 0,
                    duration: 400,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: false,
                }),
            ]).start();
        }
    }, [isNewlyAdded]);


    const handleLongPress = (event: any) => {
        if (goal.completed) return;
        const { pageX, pageY } = event.nativeEvent;
        goalItemRef.current?.measureInWindow((x, y) => {
            onLongPress(pageX, pageY);
        });
    };

    return (
        <Animated.View
            style={[
                styles.goalItemWrapper,
                {
                    opacity: itemOpacity,
                    transform: [{ translateY: itemTranslateY }],
                    maxHeight: itemHeight.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 40],
                    }),
                    marginBottom: 20,
                },
            ]}
        >
            <View style={styles.goalItemRow}>
                <TouchableOpacity
                    ref={goalItemRef}
                    style={[styles.goalItem, isDragging && styles.goalItemDragging]}
                    onLongPress={handleLongPress}
                    activeOpacity={0.7}
                    disabled={false}
                    delayLongPress={300}
                >
                    <View style={styles.goalItemContent}>
                        <View style={styles.goalTextContainer}>
                            <View
                                onLayout={(e) => {
                                    const { width } = e.nativeEvent.layout;
                                    if (width > 0 && width !== textWidth) {
                                        setTextWidth(width);
                                    }
                                }}
                                style={styles.goalTextWrapper}
                            >
                                <Text
                                    ref={textRef}
                                    style={[
                                        styles.goalText,
                                        goal.completed && styles.goalTextCompleted
                                    ]}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {goal.text}
                                </Text>
                            </View>
                            {goal.completed && textWidth > 0 && (
                                <Animated.View
                                    style={[
                                        styles.strikethrough,
                                        {
                                            width: strikethroughWidth,
                                            opacity,
                                        },
                                    ]}
                                />
                            )}
                        </View>
                        <View style={styles.goalRight}>
                            {goal.isRepeating && (
                                <Text style={styles.repeatIndicator}>daily</Text>
                            )}
                            {!goal.isRepeating && goal.createdAt && (
                                <Text style={styles.goalTime}>
                                    {formatTime(goal.createdAt)}
                                </Text>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

interface ConfettiParticleProps {
    originX: number;
    originY: number;
    angle: number;
}

const ConfettiParticle: React.FC<ConfettiParticleProps> = ({ originX, originY, angle }) => {
    const scale = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const particleOpacity = useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        const angleRad = (angle * Math.PI) / 180;
        const distance = 50 + Math.random() * 30;
        const deltaX = Math.cos(angleRad) * distance;
        const deltaY = Math.sin(angleRad) * distance;
        const duration = 450;

        Animated.parallel([
            Animated.spring(scale, {
                toValue: 1,
                tension: 120,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.parallel([
                Animated.timing(translateX, {
                    toValue: deltaX,
                    duration,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: deltaY,
                    duration,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(particleOpacity, {
                    toValue: 0,
                    duration,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, []);

    const staticRotation = `${angle + 90}deg`;

    return (
        <Animated.View
            style={[
                styles.confettiParticle,
                {
                    left: originX - 1.5,
                    top: originY - 4,
                    transform: [
                        { scale },
                        { translateX },
                        { translateY },
                        { rotate: staticRotation },
                    ],
                    opacity: particleOpacity,
                },
            ]}
        >
            <View style={styles.confettiDot} />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    content: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#252525',
    },
    contentInner: {
        flex: 1,
    },
    contentInnerView: {
        flex: 1,
        paddingHorizontal: 25,
    },
    headerContainer: {
        paddingHorizontal: 25,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        paddingBottom: 8,
        minHeight: 48,
        paddingLeft: 0,
        paddingRight: 0,
    },
    backButton: {
        padding: 12,
        marginLeft: -12,
        minWidth: 44,
        minHeight: 44,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerCenter: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        textAlign: 'center',
    },
    headerStats: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: '#666',
        textTransform: 'lowercase',
        textAlign: 'center',
        marginTop: 1,
    },
    headerDivider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        width: '100%',
        marginTop: 0,
    },
    addButton: {
        padding: 8,
        marginRight: -8,
        minWidth: 44,
        minHeight: 44,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    separator: {
        height: 2,
        backgroundColor: '#E0E0E0',
        marginHorizontal: -25,
        marginBottom: 12,
    },
    scrollView: {
        flex: 1,
        width: '100%',
    },
    scrollContent: {
        paddingBottom: 60,
        paddingTop: 18,
    },
    bottomHint: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomHintText: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#CCCCCC',
        textTransform: 'lowercase',
        textAlign: 'center',
    },
    goalsContainer: {
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
    emptyIncompleteContainer: {
        paddingVertical: 30,
        alignItems: 'center',
    },
    emptyIncompleteText: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#CCCCCC',
        textTransform: 'lowercase',
    },
    goalItemWrapper: {
        overflow: 'hidden',
        marginBottom: 24,
    },
    goalItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 0,
    },
    goalItem: {
        flex: 1,
    },
    goalItemDragging: {
        opacity: 0.5,
    },
    goalItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 24,
    },
    goalTextContainer: {
        flex: 1,
        position: 'relative',
        alignSelf: 'flex-start',
    },
    goalRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 12,
    },
    goalTextWrapper: {
        alignSelf: 'flex-start',
    },
    goalText: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
        lineHeight: 24,
        textAlign: 'left',
    },
    goalTextCompleted: {
        color: '#526EFF',
    },
    strikethrough: {
        position: 'absolute',
        left: 0,
        top: 12,
        height: 2,
        backgroundColor: '#526EFF',
    },
    goalTime: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#999',
        textTransform: 'lowercase',
        textAlign: 'right',
    },
    repeatIndicator: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#ADADAD',
        textTransform: 'lowercase',
    },
    confettiParticle: {
        position: 'absolute',
        width: 3,
        height: 8,
        zIndex: 1000,
    },
    confettiDot: {
        width: 3,
        height: 8,
        borderRadius: 1.5,
        backgroundColor: '#526EFF',
    },
});


