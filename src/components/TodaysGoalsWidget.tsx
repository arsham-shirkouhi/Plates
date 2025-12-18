import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Easing, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/fonts';

interface Goal {
    text: string;
    completed: boolean;
}

interface TodaysGoalsWidgetProps {
    goals?: Goal[];
    moreCount?: number;
    onPress?: () => void;
}

const screenWidth = Dimensions.get('window').width;
const containerPadding = 25 * 2; // Left + right padding
const widgetSpacing = 16; // Spacing between widgets
const availableWidth = screenWidth - containerPadding - widgetSpacing;
const widgetSize = availableWidth / 2; // Two widgets side by side

export const TodaysGoalsWidget: React.FC<TodaysGoalsWidgetProps> = ({
    goals: initialGoals = [
        { text: 'hit protein goal', completed: false },
        { text: 'workout', completed: false },
        { text: 'reach water goal', completed: false },
        { text: 'Log meals', completed: false },
        { text: 'take vitamins', completed: false },
        { text: 'meditate', completed: false },
        { text: 'get 8 hours sleep', completed: false },
    ],
    moreCount,
    onPress
}) => {
    const [goals, setGoals] = useState(initialGoals);
    const [confettiParticles, setConfettiParticles] = useState<Array<{ id: number; originX: number; originY: number; angle: number }>>([]);
    const [removingIndex, setRemovingIndex] = useState<number | null>(null);
    const previousVisibleTextsRef = useRef<Set<string>>(new Set());
    const maxVisible = 4;
    const visibleGoals = goals.slice(0, maxVisible);
    const remainingCount = goals.length - maxVisible;
    const showMore = remainingCount > 0;

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
                            const newGoal = { text: text.trim().toLowerCase(), completed: false };
                            setGoals([...goals, newGoal]);
                        }
                    },
                },
            ],
            'plain-text'
        );
    };

    const handleGoalPress = (index: number, originX: number, originY: number) => {
        if (goals[index].completed) return; // Don't animate if already completed

        // Measure container position at click time to get accurate relative position
        containerRef.current?.measureInWindow((containerX, containerY) => {
            // Calculate relative position within the container
            const relativeX = originX - containerX;
            const relativeY = originY - containerY;

            // Update goal to completed (this triggers strikethrough animation)
            const updatedGoals = [...goals];
            updatedGoals[index].completed = true;
            setGoals(updatedGoals);

            // Create confetti particles shooting out from the click position
            const particles = Array.from({ length: 8 }, (_, i) => ({
                id: Date.now() + i,
                originX: relativeX,
                originY: relativeY,
                angle: (i / 8) * 360, // Distribute particles in a circle (0-360 degrees)
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

                // After fade out animation completes (400ms), remove from list
                setTimeout(() => {
                    const finalGoals = updatedGoals.filter((_, i) => i !== index);
                    setGoals(finalGoals);
                    setRemovingIndex(null);
                }, 400);
            }, 400); // Wait for strikethrough animation
        });
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
                onPress={onPress}
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
                <View style={styles.goalsContainer}>
                    {visibleGoals.map((goal, index) => {
                        const isNewlyAppearing = newlyAppearingTexts.has(goal.text);
                        return (
                            <GoalItem
                                key={goal.text}
                                goal={goal}
                                index={index}
                                isRemoving={removingIndex === index}
                                isNewlyAppearing={isNewlyAppearing}
                                onLongPress={(originX, originY) => handleGoalPress(index, originX, originY)}
                            />
                        );
                    })}
                </View>
            )}

            {/* More indicator */}
            {showMore && (
                <View style={styles.moreContainer}>
                    <Text style={styles.moreText}>+{remainingCount} more</Text>
                </View>
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
        </View>
    );
};

interface GoalItemProps {
    goal: Goal;
    index: number;
    isRemoving: boolean;
    isNewlyAppearing?: boolean;
    onLongPress: (originX: number, originY: number) => void;
}

const GoalItem: React.FC<GoalItemProps> = ({ goal, index, isRemoving, isNewlyAppearing = false, onLongPress }) => {
    const strikethroughWidth = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const itemOpacity = useRef(new Animated.Value(1)).current;
    const itemTranslateY = useRef(new Animated.Value(0)).current;
    const itemHeight = useRef(new Animated.Value(1)).current;
    const goalItemRef = useRef<TouchableOpacity>(null);
    const hasAnimatedIn = useRef(false);

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
        if (goal.completed) {
            // Animate strikethrough appearing
            Animated.parallel([
                Animated.timing(strikethroughWidth, {
                    toValue: 1,
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
    }, [goal.completed]);

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
        <Animated.View
            style={[
                styles.goalItemWrapper,
                {
                    opacity: itemOpacity,
                    transform: [{ translateY: itemTranslateY }],
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
                    <Text
                        style={[
                            styles.goalText,
                            goal.completed && styles.goalTextCompleted
                        ]}
                    >
                        {goal.text}
                    </Text>
                    {goal.completed && (
                        <Animated.View
                            style={[
                                styles.strikethrough,
                                {
                                    width: strikethroughWidth.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0%', '100%'],
                                    }),
                                    opacity,
                                },
                            ]}
                        />
                    )}
                </View>
            </TouchableOpacity>
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
    const opacity = useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        // Convert angle to radians
        const angleRad = (angle * Math.PI) / 180;

        // Distance and direction for particle to travel - smaller range for minimalistic feel
        const distance = 20 + Math.random() * 10; // 20-30px distance
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
        paddingBottom: 5,
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
    goalItemWrapper: {
        overflow: 'hidden',
    },
    goalItem: {
        marginBottom: 4,
    },
    goalTextContainer: {
        position: 'relative',
        alignSelf: 'flex-start',
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
