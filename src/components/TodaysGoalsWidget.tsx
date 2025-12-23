import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Easing, TextInput, Alert, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';
import { TodaysGoalsOverlay } from './TodaysGoalsOverlay';

interface Goal {
    text: string;
    completed: boolean;
    createdAt?: string;
    isRepeating?: boolean;
    order?: number;
    id?: string; // Task ID from database
}

interface TodaysGoalsWidgetProps {
    goals: Goal[]; // Required - must come from database
    moreCount?: number;
    onPress?: () => void;
    onGoalsChange?: (goals: Goal[]) => void;
    onOverlayChange?: (visible: boolean) => void;
}

const screenWidth = Dimensions.get('window').width;
const containerPadding = 25 * 2; // Left + right padding
const widgetSpacing = 16; // Spacing between widgets
const availableWidth = screenWidth - containerPadding - widgetSpacing;
const widgetSize = availableWidth / 2; // Two widgets side by side

export const TodaysGoalsWidget: React.FC<TodaysGoalsWidgetProps> = ({
    goals: initialGoals,
    moreCount,
    onPress,
    onGoalsChange,
    onOverlayChange,
}) => {
    const [goals, setGoals] = useState<Goal[]>(initialGoals || []);
    const [showOverlay, setShowOverlay] = useState(false);

    // Notify parent when overlay state changes
    React.useEffect(() => {
        if (onOverlayChange) {
            onOverlayChange(showOverlay);
        }
    }, [showOverlay, onOverlayChange]);

    // Sync with external goals from database - always use database data, never placeholders
    React.useEffect(() => {
        // Always sync with database data (initialGoals from HomeScreen)
        // If initialGoals is undefined or null, use empty array
        const databaseGoals = initialGoals || [];
        setGoals(databaseGoals);
    }, [initialGoals]);

    const handleGoalsChange = (newGoals: Goal[]) => {
        setGoals(newGoals);
        if (onGoalsChange) {
            onGoalsChange(newGoals);
        }
    };

    const handleWidgetPress = () => {
        if (onPress) {
            onPress();
        } else {
            setShowOverlay(true);
        }
    };
    const [confettiParticles, setConfettiParticles] = useState<Array<{ id: number; originX: number; originY: number; angle: number }>>([]);
    const [removingIndex, setRemovingIndex] = useState<number | null>(null);
    const previousVisibleTextsRef = useRef<Set<string>>(new Set());
    const maxVisible = 4;
    // Sort goals: incomplete first, then completed, both sorted by order
    const incompleteGoals = goals.filter(g => !g.completed);
    const completedGoals = goals.filter(g => g.completed);
    const sortedIncomplete = [...incompleteGoals].sort((a, b) => {
        const orderA = a.order ?? Infinity;
        const orderB = b.order ?? Infinity;
        return orderA - orderB;
    });
    const sortedCompleted = [...completedGoals].sort((a, b) => {
        const orderA = a.order ?? Infinity;
        const orderB = b.order ?? Infinity;
        return orderA - orderB;
    });
    const sortedGoals = [...sortedIncomplete, ...sortedCompleted];
    const visibleGoals = sortedGoals.slice(0, maxVisible);
    const remainingCount = sortedGoals.length - maxVisible;
    const showMore = remainingCount > 0;
    const moreTextOpacity = useRef(new Animated.Value(showMore ? 1 : 0)).current;
    const moreTextTranslateY = useRef(new Animated.Value(0)).current;

    // Calculate which items are newly appearing
    const currentVisibleTexts = new Set(visibleGoals.map(g => g.text));
    const newlyAppearingTexts = new Set(
        visibleGoals
            .filter(g => !previousVisibleTextsRef.current.has(g.text))
            .map(g => g.text)
    );

    // Update the ref after render
    React.useEffect(() => {
        previousVisibleTextsRef.current = currentVisibleTexts;
    });

    // Animate "+X more" text when it appears or count changes
    React.useEffect(() => {
        if (showMore) {
            // Fade in animation similar to todo items
            moreTextOpacity.setValue(0);
            moreTextTranslateY.setValue(10);
            
            Animated.parallel([
                Animated.timing(moreTextOpacity, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(moreTextTranslateY, {
                    toValue: 0,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            moreTextOpacity.setValue(0);
            moreTextTranslateY.setValue(10);
        }
    }, [remainingCount, showMore]);

    const containerRef = useRef<View>(null);
    const [containerPosition, setContainerPosition] = useState({ x: 0, y: 0 });

    const handleAddTodo = () => {
        Alert.prompt(
            'Add Todo',
            'Enter a new todo item',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Add',
                    onPress: (text) => {
                        if (text && text.trim()) {
                            const newGoal: Goal = { 
                                text: text.trim().toLowerCase(), 
                                completed: false,
                                createdAt: new Date().toISOString(),
                                isRepeating: false,
                                order: goals.length,
                            };
                            handleGoalsChange([...goals, newGoal]);
                        }
                    },
                },
            ],
            'plain-text'
        );
    };

    const handleGoalPress = (index: number, originX: number, originY: number) => {
        if (goals[index].completed) return; // Don't animate if already completed

        // Haptic feedback when task is completed
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Measure container position at click time to get accurate relative position
        containerRef.current?.measureInWindow((containerX, containerY) => {
            // Calculate relative position within the container
            const relativeX = originX - containerX;
            const relativeY = originY - containerY;

            // Update goal to completed (this triggers strikethrough animation)
            const updatedGoals = [...goals];
            updatedGoals[index].completed = true;
            handleGoalsChange(updatedGoals);

            // Create confetti particles shooting out from the click position
            const particles = Array.from({ length: 16 }, (_, i) => ({
                id: Date.now() + i,
                originX: relativeX,
                originY: relativeY,
                angle: (i / 16) * 360, // Distribute particles in a circle (0-360 degrees)
            }));
            setConfettiParticles(particles);

            // Remove confetti after animation (shorter timeout for minimalistic feel)
            setTimeout(() => {
                setConfettiParticles([]);
            }, 500);

            // Wait for strikethrough animation to complete (400ms), then remove item
            setTimeout(() => {
                // Mark as removing for fade out animation
                setRemovingIndex(index);

                // After fade out animation completes (400ms), item is filtered out from display
                // (but stays in goals array for overlay)
                setTimeout(() => {
                    setRemovingIndex(null);
                }, 400);
            }, 400); // Wait for strikethrough animation
        });
    };

    const handleDeleteGoal = (index: number) => {
        const updatedGoals = goals.filter((_, i) => i !== index);
        handleGoalsChange(updatedGoals);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    return (
        <View
            ref={containerRef}
            style={[styles.container, { width: widgetSize, height: widgetSize }]}
            onLayout={() => {
                containerRef.current?.measureInWindow((x, y) => {
                    setContainerPosition({ x, y });
                });
            }}
        >
            {/* Header */}
            <TouchableOpacity
                style={styles.header}
                onPress={handleWidgetPress}
                activeOpacity={0.7}
            >
                <Text style={styles.headerText}>today's goals</Text>
                <Ionicons name="chevron-forward" size={20} color="#252525" />
            </TouchableOpacity>

            {/* Separator line */}
            <View style={styles.separator} />

            {/* Goals list */}
            {goals.length === 0 ? (
                <TouchableOpacity
                    style={styles.emptyContainer}
                    onLongPress={handleAddTodo}
                    activeOpacity={0.7}
                >
                    <Text style={styles.emptyText}>hold to add a todo</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={styles.goalsContainer}
                    onLongPress={handleAddTodo}
                    activeOpacity={1}
                >
                    {visibleGoals.map((goal, displayIndex) => {
                        // Find original index in full goals array
                        const originalIndex = goals.findIndex(g => g === goal);
                        const isNewlyAppearing = newlyAppearingTexts.has(goal.text);
                        return (
                            <GoalItem
                                key={`${goal.text}-${originalIndex}`}
                                goal={goal}
                                index={originalIndex >= 0 ? originalIndex : displayIndex}
                                isRemoving={removingIndex === originalIndex}
                                isNewlyAppearing={isNewlyAppearing}
                                onLongPress={(originX, originY) => {
                                    const idx = goals.findIndex(g => g === goal);
                                    if (idx >= 0) {
                                        handleGoalPress(idx, originX, originY);
                                    }
                                }}
                                onDelete={() => {
                                    const idx = goals.findIndex(g => g === goal);
                                    if (idx >= 0) {
                                        handleDeleteGoal(idx);
                                    }
                                }}
                            />
                        );
                    })}
                </TouchableOpacity>
            )}

            {/* More indicator */}
            {showMore && (
                <Animated.View style={[styles.moreContainer, {
                    opacity: moreTextOpacity,
                    transform: [{ translateY: moreTextTranslateY }]
                }]}>
                    <Text style={styles.moreText}>+{remainingCount} more</Text>
                </Animated.View>
            )}

            {/* Confetti particles */}
            {confettiParticles.map((particle) => (
                <ConfettiParticle
                    key={particle.id}
                    originX={particle.originX}
                    originY={particle.originY}
                    angle={particle.angle}
                />
            ))}

            {/* Overlay */}
            <TodaysGoalsOverlay
                visible={showOverlay}
                onClose={() => setShowOverlay(false)}
                goals={goals}
                onGoalsChange={handleGoalsChange}
            />
        </View>
    );
};

interface GoalItemProps {
    goal: Goal;
    index: number;
    isRemoving: boolean;
    isNewlyAppearing?: boolean;
    onLongPress: (originX: number, originY: number) => void;
    onDelete: () => void;
}

const GoalItem: React.FC<GoalItemProps> = ({ goal, index, isRemoving, isNewlyAppearing = false, onLongPress, onDelete }) => {
    const strikethroughWidth = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const itemOpacity = useRef(new Animated.Value(1)).current;
    const itemTranslateY = useRef(new Animated.Value(0)).current;
    const itemHeight = useRef(new Animated.Value(1)).current;
    const swipeTranslateX = useRef(new Animated.Value(0)).current;
    const deleteButtonOpacity = useRef(new Animated.Value(0)).current;
    const goalItemRef = useRef<TouchableOpacity>(null);
    const textRef = useRef<Text>(null);
    const hasAnimatedIn = useRef(false);
    const [textWidth, setTextWidth] = React.useState(0);
    const [isSwipeOpen, setIsSwipeOpen] = React.useState(false);
    const DELETE_BUTTON_WIDTH = 80;

    React.useEffect(() => {
        // Only set initial values once, don't animate in
        if (!hasAnimatedIn.current) {
            hasAnimatedIn.current = true;
            // Items start visible and in position (no entrance animation)
            itemOpacity.setValue(1);
            itemTranslateY.setValue(0);
        }
    }, []);

    // Animate in when item is newly appearing (coming from "more" section)
    React.useEffect(() => {
        if (isNewlyAppearing) {
            itemOpacity.setValue(0);
            Animated.timing(itemOpacity, {
                toValue: 1,
                duration: 300,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false, // Use false to avoid conflicts with maxHeight
            }).start();
        }
    }, [isNewlyAppearing]);

    React.useEffect(() => {
        if (goal.completed && textWidth > 0) {
            // Animate strikethrough appearing - use text width in pixels
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
            // Reset if goal becomes uncompleted
            strikethroughWidth.setValue(0);
            opacity.setValue(0);
        }
    }, [goal.completed, textWidth]);

    React.useEffect(() => {
        if (isRemoving) {
            // Animate item disappearing - ramp up from slow to fast
            // Use useNativeDriver: false for all since we need maxHeight (layout property)
            Animated.parallel([
                Animated.timing(itemOpacity, {
                    toValue: 0,
                    duration: 400,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: false,
                }),
                Animated.timing(itemTranslateY, {
                    toValue: -20,
                    duration: 400,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: false,
                }),
                Animated.timing(itemHeight, {
                    toValue: 0,
                    duration: 400,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: false,
                }),
            ]).start();
        }
    }, [isRemoving]);

    // PanResponder for swipe-to-delete (only for incomplete tasks)
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !goal.completed && !isRemoving,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                if (goal.completed || isRemoving) return false;
                // Only respond to horizontal swipes - lower threshold for easier swiping
                return Math.abs(gestureState.dx) > 5 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 0.8;
            },
            onPanResponderGrant: () => {
                if (goal.completed || isRemoving) return;
                // Store the starting position
                swipeTranslateX.setOffset(swipeTranslateX._value);
                swipeTranslateX.setValue(0);
            },
            onPanResponderMove: (_, gestureState) => {
                if (goal.completed || isRemoving) return;
                // Calculate new value from the starting offset position
                const startValue = swipeTranslateX._offset;
                const newValue = startValue + gestureState.dx;
                // Clamp to prevent swiping too far right (beyond 0) or too far left
                const clampedValue = Math.max(-DELETE_BUTTON_WIDTH, Math.min(0, newValue));
                swipeTranslateX.setValue(clampedValue);
                
                // Show delete button when swiped left enough - lower threshold for easier swiping
                const shouldShowDelete = Math.abs(clampedValue) > DELETE_BUTTON_WIDTH / 3;
                if (shouldShowDelete !== isSwipeOpen) {
                    setIsSwipeOpen(shouldShowDelete);
                    Animated.timing(deleteButtonOpacity, {
                        toValue: shouldShowDelete ? 1 : 0,
                        duration: 200,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }).start();
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (goal.completed || isRemoving) return;
                swipeTranslateX.flattenOffset();
                const currentValue = swipeTranslateX._value;
                
                // If swiping right (positive dx) or already at 0, close it
                if (gestureState.dx > 0 || currentValue >= 0) {
                    Animated.spring(swipeTranslateX, {
                        toValue: 0,
                        useNativeDriver: false,
                        tension: 100,
                        friction: 8,
                    }).start();
                    setIsSwipeOpen(false);
                    Animated.timing(deleteButtonOpacity, {
                        toValue: 0,
                        duration: 200,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }).start();
                } else if (Math.abs(currentValue) > DELETE_BUTTON_WIDTH / 3) {
                    // Swiped left enough, keep it open
                    Animated.spring(swipeTranslateX, {
                        toValue: -DELETE_BUTTON_WIDTH,
                        useNativeDriver: false,
                        tension: 100,
                        friction: 8,
                    }).start();
                } else {
                    // Didn't swipe enough, snap back
                    Animated.spring(swipeTranslateX, {
                        toValue: 0,
                        useNativeDriver: false,
                        tension: 100,
                        friction: 8,
                    }).start();
                    setIsSwipeOpen(false);
                    Animated.timing(deleteButtonOpacity, {
                        toValue: 0,
                        duration: 200,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                if (goal.completed || isRemoving) return;
                swipeTranslateX.flattenOffset();
                const currentValue = swipeTranslateX._value;
                // If swiped open, keep it open; otherwise close
                if (Math.abs(currentValue) > DELETE_BUTTON_WIDTH / 3) {
                    Animated.spring(swipeTranslateX, {
                        toValue: -DELETE_BUTTON_WIDTH,
                        useNativeDriver: false,
                        tension: 100,
                        friction: 8,
                    }).start();
                } else {
                    Animated.spring(swipeTranslateX, {
                        toValue: 0,
                        useNativeDriver: false,
                        tension: 100,
                        friction: 8,
                    }).start();
                    setIsSwipeOpen(false);
                    Animated.timing(deleteButtonOpacity, {
                        toValue: 0,
                        duration: 200,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }).start();
                }
            },
        })
    ).current;

    const handleLongPress = (event: any) => {
        if (goal.completed) return;

        // Get the touch coordinates from the press event
        const { pageX, pageY } = event.nativeEvent;

        // Measure the goal item position to calculate relative coordinates
        goalItemRef.current?.measureInWindow((x, y) => {
            // Use the exact touch coordinates
            onLongPress(pageX, pageY);
        });
    };

    return (
        <View style={styles.goalItemContainer} {...panResponder.panHandlers}>
            {/* Delete button behind */}
            {!goal.completed && (
                <Animated.View
                    style={[
                        styles.deleteButtonContainer,
                        {
                            opacity: deleteButtonOpacity,
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => {
                            // Delete instantly
                            onDelete();
                            // Reset animation immediately
                            swipeTranslateX.setValue(0);
                            setIsSwipeOpen(false);
                            deleteButtonOpacity.setValue(0);
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                </Animated.View>
            )}
            
            {/* Swipeable background that moves */}
            <Animated.View
                style={[
                    styles.swipeableBackground,
                    {
                        transform: [{ translateX: swipeTranslateX }],
                    },
                ]}
            />
            
            {/* Goal item - text stays fixed */}
            <Animated.View
                style={[
                    styles.goalItemWrapper,
                    {
                        opacity: itemOpacity,
                        transform: [
                            { translateY: itemTranslateY },
                        ],
                        maxHeight: itemHeight.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 24], // Approximate height of item with margin
                        }),
                    },
                ]}
            >
                <TouchableOpacity
                    ref={goalItemRef}
                    style={styles.goalItem}
                    onLongPress={handleLongPress}
                    activeOpacity={0.7}
                    disabled={goal.completed || isRemoving}
                    delayLongPress={300} // 300ms hold to trigger
                >
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
                </TouchableOpacity>
            </Animated.View>
        </View>
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
    const opacity = useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        // Convert angle to radians
        const angleRad = (angle * Math.PI) / 180;

        // Distance and direction for particle to travel - smaller range for minimalistic feel
        const distance = 50 + Math.random() * 30; // 50-80px distance
        const deltaX = Math.cos(angleRad) * distance;
        const deltaY = Math.sin(angleRad) * distance;

        // Short, snappy animation
        const duration = 450; // Shorter duration for quick, satisfying feel

        Animated.parallel([
            // Quick scale up with bounce
            Animated.spring(scale, {
                toValue: 1,
                tension: 120,
                friction: 8,
                useNativeDriver: true,
            }),
            // Shoot out quickly with satisfying easing
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
                Animated.timing(opacity, {
                    toValue: 0,
                    duration,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, []);

    // Static rotation to face the direction of travel (no animation)
    // Add 90 degrees because the tube starts vertical (pointing up) and we want it to point in the travel direction
    const staticRotation = `${angle + 90}deg`;

    return (
        <Animated.View
            style={[
                styles.confettiParticle,
                {
                    left: originX - 1.5, // Center the 3px wide particle (3/2 = 1.5)
                    top: originY - 4, // Center the 8px tall particle (8/2 = 4)
                    transform: [
                        { scale },
                        { translateX },
                        { translateY },
                        { rotate: staticRotation },
                    ],
                    opacity,
                },
            ]}
        >
            <View style={styles.confettiDot} />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 2.5,
        borderColor: '#252525',
        paddingHorizontal: 15,
        paddingTop: 5,
        paddingBottom: 15,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 1,
        paddingBottom: 6,
    },
    headerText: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    separator: {
        height: 2,
        backgroundColor: '#E0E0E0',
        marginHorizontal: -15,
        marginBottom: 9,
    },
    goalsContainer: {
        flex: 1,
        justifyContent: 'flex-start',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },
    emptyText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
    goalItemContainer: {
        position: 'relative',
        overflow: 'visible',
    },
    swipeableBackground: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 4,
        backgroundColor: '#fff',
        zIndex: 1,
    },
    goalItemWrapper: {
        overflow: 'hidden',
        position: 'relative',
        zIndex: 2,
        backgroundColor: 'transparent',
    },
    goalItem: {
        marginBottom: 4,
    },
    deleteButtonContainer: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 4,
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        zIndex: 3,
    },
    deleteButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 50,
        minHeight: 50,
    },
    goalTextContainer: {
        position: 'relative',
        alignSelf: 'flex-start',
        width: 'auto',
    },
    goalTextWrapper: {
        alignSelf: 'flex-start',
        maxWidth: widgetSize - 30, // Account for padding
    },
    goalText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
        lineHeight: 20,
    },
    goalTextCompleted: {
        color: '#526EFF',
    },
    strikethrough: {
        position: 'absolute',
        left: 0,
        top: 10, // Center of line height (20/2 = 10)
        height: 2,
        backgroundColor: '#526EFF',
    },
    moreContainer: {
        marginTop: 'auto',
        paddingTop: 4,
    },
    moreText: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: '#252525',
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
