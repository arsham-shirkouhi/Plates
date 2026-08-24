import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Animated,
    PanResponder,
    Dimensions,
    Easing,
    TextInput,
    Alert,
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';
import { AddFoodBottomSheet } from '../components/AddFoodBottomSheet';
import { EditFoodBottomSheet } from '../components/EditFoodBottomSheet';
import { MacroStatusCompact, MacroStatusCompactRef } from '../components/MacroStatusCompact';
import { FoodLogHeaderSection } from '../components/FoodLogHeaderSection';
import { FoodLogMealCard } from '../components/FoodLogMealCard';
import { UndoToast } from '../components/UndoToast';
import { FoodItem, getQuickAddItems } from '../services/foodService';
import { getUserProfile } from '../services/userService';
import { useAddFood } from '../context/AddFoodContext';
import { useFoodLog } from '../context/FoodLogContext';
import { useAuth } from '../context/AuthContext';
import { useRegisterOverlay } from '../contexts/OverlayContext';
import { LoggedFoodEntry, MealType } from '../food/types';
import { formatTimeAgo, groupFoodsByMeal, sumMacros } from '../food/foodLogSelectors';
import { ScrollingGridBackground } from '../components/ScrollingGridBackground';

type FoodLogScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'FoodLog'>;

const SCREEN_WIDTH = Dimensions.get('window').width;

export const FoodLogScreen: React.FC = () => {
    const navigation = useNavigation<FoodLogScreenNavigationProp>();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { registerHandler, unregisterHandler } = useAddFood();
    const { entries: loggedFoods, consumed, addFood, updateFood, removeFood, now } = useFoodLog();
    const [showAddSheet, setShowAddSheet] = useState(false);
    const [showEditSheet, setShowEditSheet] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<LoggedFoodEntry | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [swipingId, setSwipingId] = useState<string | null>(null);
    const [targetMacros, setTargetMacros] = useState<{ calories?: number; protein?: number; carbs?: number; fats?: number } | null>(null);
    const [expandedMeals, setExpandedMeals] = useState<Set<MealType>>(new Set());
    const [maximizedMeal, setMaximizedMeal] = useState<MealType | null>(null);
    const [showUndoToast, setShowUndoToast] = useState(false);
    const [lastAddedFood, setLastAddedFood] = useState<LoggedFoodEntry | null>(null);
    const swipeAnimations = useRef<Map<string, Animated.Value>>(new Map()).current;
    const scrollViewRef = useRef<ScrollView>(null);
    const macroStatusRef = useRef<MacroStatusCompactRef>(null);

    // Animation values for meal cards
    const mealCardAnimations = useRef<Map<MealType, Animated.Value>>(new Map()).current;
    const macroRowOpacities = useRef<Map<MealType, Animated.Value>>(new Map()).current;
    const emptyStateOpacity = useRef(new Animated.Value(0)).current;
    const emptyStateScale = useRef(new Animated.Value(0.9)).current;

    // Define meals constant
    const meals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

    // Group foods by meal type
    const foodsByMeal = groupFoodsByMeal(loggedFoods);

    // Initialize meal card animations
    useEffect(() => {
        meals.forEach((meal) => {
            if (!mealCardAnimations.has(meal)) {
                mealCardAnimations.set(meal, new Animated.Value(0));
            }
        });
    }, []);

    // Initialize macro row animations for each meal
    useEffect(() => {
        meals.forEach(meal => {
            if (!macroRowOpacities.has(meal)) {
                macroRowOpacities.set(meal, new Animated.Value(0));
            }
        });
    }, []);

    // Automatically expand meals that have at least one item
    useEffect(() => {
        const newExpandedMeals = new Set(expandedMeals);
        let hasChanges = false;

        meals.forEach(meal => {
            const mealFoods = foodsByMeal[meal];
            const hasItems = mealFoods.length > 0;
            const isCurrentlyExpanded = expandedMeals.has(meal);

            if (hasItems && !isCurrentlyExpanded) {
                // Meal has items but is not expanded - expand it
                newExpandedMeals.add(meal);
                hasChanges = true;

                // Animate macro row opacity to visible
                const opacityAnim = macroRowOpacities.get(meal)!;
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            } else if (!hasItems && isCurrentlyExpanded) {
                // Meal has no items but is expanded - collapse it
                newExpandedMeals.delete(meal);
                hasChanges = true;

                // Animate macro row opacity to hidden
                const opacityAnim = macroRowOpacities.get(meal)!;
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            }
        });

        if (hasChanges) {
            setExpandedMeals(newExpandedMeals);
        }
    }, [loggedFoods, expandedMeals, foodsByMeal]);

    // Toggle macro expansion for a meal
    const toggleMealMacros = (meal: MealType) => {
        const isExpanded = expandedMeals.has(meal);
        const newExpandedMeals = new Set(expandedMeals);

        if (isExpanded) {
            newExpandedMeals.delete(meal);
        } else {
            newExpandedMeals.add(meal);
        }

        setExpandedMeals(newExpandedMeals);

        // Animate macro row opacity (supports native driver)
        const opacityAnim = macroRowOpacities.get(meal)!;

        Animated.timing(opacityAnim, {
            toValue: isExpanded ? 0 : 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    // No longer animating the entire container - only individual items animate


    // Load target macros and daily log
    useEffect(() => {
        const loadTargetMacros = async () => {
            if (user) {
                try {
                    const profile = await getUserProfile(user);
                    if (profile?.target_macros) {
                        setTargetMacros({
                            calories: profile.target_macros.calories,
                            protein: profile.target_macros.protein,
                            carbs: profile.target_macros.carbs,
                            fats: profile.target_macros.fats,
                        });
                    }
                } catch (error) {
                    console.error('Error loading target macros:', error);
                }
            }
        };
        loadTargetMacros();
    }, [user]);

    const [selectedMeal, setSelectedMeal] = useState<MealType | null>(null);
    const [showMealSelector, setShowMealSelector] = useState(false);
    useRegisterOverlay('FoodLogMealSelector', showMealSelector);

    // Animation refs for meal selector
    const mealSelectorSlideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const mealSelectorBackdropOpacity = useRef(new Animated.Value(0)).current;

    // Track newly added food items for animation
    const [newlyAddedFoodIds, setNewlyAddedFoodIds] = useState<Set<string>>(new Set());

    // Double tap detection
    const lastTap = useRef<number>(0);
    const doubleTapDelay = 300;

    const celebrateLoggedFood = (newEntry: LoggedFoodEntry) => {
        setShowAddSheet(false);
        setSelectedMeal(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        setNewlyAddedFoodIds(prev => new Set([...prev, newEntry.id]));
        setTimeout(() => {
            setNewlyAddedFoodIds(prev => {
                const next = new Set(prev);
                next.delete(newEntry.id);
                return next;
            });
        }, 400);

        setLastAddedFood(newEntry);
        setShowUndoToast(true);
    };

    const handleAddFood = (food: FoodItem, meal?: MealType | null) => {
        const newEntry = addFood(food, {
            meal: meal || selectedMeal,
        });
        celebrateLoggedFood(newEntry);
    };

    const toggleMaximizeMeal = (meal: MealType) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMaximizedMeal((current) => (current === meal ? null : meal));
    };

    const handleAddFoodToMeal = (meal: MealType) => {
        setSelectedMeal(meal);
        // Animate out meal selector
        Animated.parallel([
            Animated.timing(mealSelectorSlideAnim, {
                toValue: Dimensions.get('window').height,
                duration: 250,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(mealSelectorBackdropOpacity, {
                toValue: 0,
                duration: 200,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start(() => {
            setShowMealSelector(false);
        });
        setShowAddSheet(true);
    };

    // Animate meal selector when it opens/closes
    useEffect(() => {
        if (showMealSelector) {
            // Reset animation values
            mealSelectorSlideAnim.setValue(Dimensions.get('window').height);
            mealSelectorBackdropOpacity.setValue(0);

            // Animate in
            Animated.parallel([
                Animated.timing(mealSelectorSlideAnim, {
                    toValue: 0,
                    duration: 300,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(mealSelectorBackdropOpacity, {
                    toValue: 1,
                    duration: 250,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [showMealSelector]);


    useEffect(() => {
        registerHandler(celebrateLoggedFood);
        return () => {
            unregisterHandler();
        };
    }, [registerHandler, unregisterHandler]);

    const handleRemoveFood = (entryId: string) => {
        removeFood(entryId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const handleUndo = () => {
        if (!lastAddedFood) return;
        removeFood(lastAddedFood.id);
        setShowUndoToast(false);
        setLastAddedFood(null);
    };

    const handleEditFood = (entry: LoggedFoodEntry) => {
        setSelectedEntry(entry);
        setShowEditSheet(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleUpdateFood = (entryId: string, updatedFood: FoodItem, servingSize: string, numberOfServings: string, meal: MealType) => {
        updateFood(entryId, {
            food: updatedFood,
            meal,
            portion: `${numberOfServings} ${servingSize}`,
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const formatTime = (date: Date): string => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'pm' : 'am';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    };

    const getTimeAgo = (date: Date): string => formatTimeAgo(date, now);

    // Calculate totals per meal (calories and macros)
    const mealTotals = meals.reduce((acc, meal) => {
        acc[meal] = sumMacros(foodsByMeal[meal]);
        return acc;
    }, {} as Record<MealType, { calories: number; protein: number; carbs: number; fats: number }>);

    const totals = consumed;


    return (
        <View style={styles.container}>
            <ScrollingGridBackground />
            <Image
                source={require('../../assets/images/gradient_ball_mainpage.png')}
                style={styles.auraBallTopLeft}
                resizeMode="cover"
                pointerEvents="none"
            />
            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                onScrollBeginDrag={() => {
                    // Collapse macro status on scroll
                    // macroStatusRef.current?.collapse();
                    setExpandedId(null);
                }}
                scrollEventThrottle={16}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews={false}
                scrollEnabled={true}
                bounces={false}
                overScrollMode="never"
                alwaysBounceVertical={false}
                decelerationRate="normal"
            >
                {/* Header Section with Macros - Scrolls with content, positioned over gradient */}
                <FoodLogHeaderSection
                    key={`${totals.protein}-${totals.carbs}-${totals.fats}-${totals.calories}`}
                    protein={totals.protein}
                    carbs={totals.carbs}
                    fats={totals.fats}
                    calories={totals.calories}
                    topInset={insets.top}
                    onClosePress={() => navigation.goBack()}
                />
                {meals.map((meal) => {
                    const mealLabels: Record<MealType, { label: string; icon: string; color: string }> = {
                        breakfast: { label: 'breakfast', icon: 'sunny-outline', color: '#FFD700' },
                        lunch: { label: 'lunch', icon: 'partly-sunny-outline', color: '#FF8C42' },
                        dinner: { label: 'dinner', icon: 'moon-outline', color: '#4463F7' },
                        snack: { label: 'snacks', icon: 'cafe-outline', color: '#26F170' },
                    };
                    return (
                        <FoodLogMealCard
                            key={meal}
                            label={mealLabels[meal].label}
                            foods={foodsByMeal[meal]}
                            mealTotal={mealTotals[meal]}
                            showMacros={expandedMeals.has(meal)}
                            macroOpacity={macroRowOpacities.get(meal)}
                            isMaximized={maximizedMeal === meal}
                            newlyAddedFoodIds={newlyAddedFoodIds}
                            getTimeAgo={getTimeAgo}
                            onToggleMaximize={() => toggleMaximizeMeal(meal)}
                            onAddFood={() => handleAddFoodToMeal(meal)}
                            onEditFood={handleEditFood}
                        />
                    );
                })}
            </ScrollView>


            {/* Meal Selector Modal */}
            {showMealSelector && (
                <View style={styles.mealSelectorOverlay}>
                    <Animated.View
                        style={[
                            styles.mealSelectorBackdrop,
                            { opacity: mealSelectorBackdropOpacity }
                        ]}
                    >
                        <TouchableOpacity
                            style={{ flex: 1 }}
                            activeOpacity={1}
                            onPress={() => {
                                Animated.parallel([
                                    Animated.timing(mealSelectorSlideAnim, {
                                        toValue: Dimensions.get('window').height,
                                        duration: 250,
                                        easing: Easing.in(Easing.ease),
                                        useNativeDriver: true,
                                    }),
                                    Animated.timing(mealSelectorBackdropOpacity, {
                                        toValue: 0,
                                        duration: 200,
                                        easing: Easing.out(Easing.ease),
                                        useNativeDriver: true,
                                    }),
                                ]).start(() => {
                                    setShowMealSelector(false);
                                });
                            }}
                        />
                    </Animated.View>
                    <Animated.View
                        style={[
                            styles.mealSelectorContainer,
                            {
                                transform: [{ translateY: mealSelectorSlideAnim }]
                            }
                        ]}
                    >
                        <Text style={styles.mealSelectorTitle}>select meal</Text>
                        {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((meal) => {
                            const mealName = meal.charAt(0).toUpperCase() + meal.slice(1);
                            return (
                                <TouchableOpacity
                                    key={meal}
                                    style={styles.mealSelectorOption}
                                    onPress={() => handleAddFoodToMeal(meal)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.mealSelectorOptionText}>{mealName}</Text>
                                </TouchableOpacity>
                            );
                        })}
                        <TouchableOpacity
                            style={styles.mealSelectorCancel}
                            onPress={() => {
                                Animated.parallel([
                                    Animated.timing(mealSelectorSlideAnim, {
                                        toValue: Dimensions.get('window').height,
                                        duration: 250,
                                        easing: Easing.in(Easing.ease),
                                        useNativeDriver: true,
                                    }),
                                    Animated.timing(mealSelectorBackdropOpacity, {
                                        toValue: 0,
                                        duration: 200,
                                        easing: Easing.out(Easing.ease),
                                        useNativeDriver: true,
                                    }),
                                ]).start(() => {
                                    setShowMealSelector(false);
                                });
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.mealSelectorCancelText}>cancel</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            )}

            {/* Add Food Sheet */}
            <AddFoodBottomSheet
                visible={showAddSheet}
                onClose={() => {
                    setShowAddSheet(false);
                    setSelectedMeal(null);
                }}
                onAddFood={(food, meal) => handleAddFood(food, meal || selectedMeal)}
                quickAddItems={getQuickAddItems()}
                initialMeal={selectedMeal}
                onMealChange={(meal) => setSelectedMeal(meal)}
            />

            {/* Undo Toast */}
            <UndoToast
                visible={showUndoToast && !!lastAddedFood}
                message={lastAddedFood ? `${lastAddedFood.food.name} added` : ''}
                onUndo={handleUndo}
                onDismiss={() => {
                    setShowUndoToast(false);
                    setLastAddedFood(null);
                }}
                duration={3000}
            />

            {/* Edit Food Sheet */}
            <EditFoodBottomSheet
                visible={showEditSheet}
                onClose={() => {
                    setShowEditSheet(false);
                    setSelectedEntry(null);
                }}
                entry={selectedEntry}
                onUpdateFood={handleUpdateFood}
                onDelete={selectedEntry ? () => {
                    handleRemoveFood(selectedEntry.id);
                    setShowEditSheet(false);
                    setSelectedEntry(null);
                } : undefined}
            />
        </View>
    );
};

interface FoodEntryCardProps {
    entry: LoggedFoodEntry;
    time: string;
    timeAgo: string;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onDelete: () => void;
    index: number;
}

const FoodEntryCard: React.FC<FoodEntryCardProps> = ({
    entry,
    time,
    timeAgo,
    isExpanded,
    onToggleExpand,
    onDelete,
    index,
}) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const rowOpacity = useRef(new Animated.Value(1)).current;
    const cardScale = useRef(new Animated.Value(1)).current;
    const expandOpacity = useRef(new Animated.Value(0)).current;
    const entryAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(entryAnim, {
            toValue: 1,
            delay: index * 50,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
        }).start();
    }, []);

    useEffect(() => {
        Animated.timing(expandOpacity, {
            toValue: isExpanded ? 1 : 0,
            duration: 250,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();
    }, [isExpanded]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only respond to horizontal swipes, not vertical scrolling
                // Require horizontal movement to be greater than vertical movement
                const { dx, dy } = gestureState;
                return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
            },
            onPanResponderTerminationRequest: () => true,
            onPanResponderMove: (_, gestureState) => {
                // Only handle horizontal swipes
                if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
                    if (gestureState.dx < 0) {
                        translateX.setValue(Math.max(gestureState.dx, -80));
                    } else {
                        translateX.setValue(Math.min(gestureState.dx, 0));
                    }
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                // Only handle if it was a horizontal swipe
                if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
                    if (gestureState.dx < -50) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Animated.parallel([
                            Animated.timing(translateX, {
                                toValue: -SCREEN_WIDTH,
                                duration: 300,
                                easing: Easing.out(Easing.cubic),
                                useNativeDriver: true,
                            }),
                            Animated.timing(rowOpacity, {
                                toValue: 0,
                                duration: 300,
                                useNativeDriver: true,
                            }),
                        ]).start(() => {
                            onDelete();
                        });
                    } else {
                        Animated.spring(translateX, {
                            toValue: 0,
                            useNativeDriver: true,
                        }).start();
                    }
                } else {
                    // If it was a vertical gesture, reset position
                    Animated.spring(translateX, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    return (
        <Animated.View
            style={[
                styles.foodEntryCard,
                {
                    opacity: rowOpacity,
                    transform: [
                        { translateX },
                        {
                            scale: entryAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.95, 1],
                            }),
                        },
                    ],
                },
            ]}
            {...panResponder.panHandlers}
        >
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={onToggleExpand}
                style={styles.foodEntryContent}
            >
                <View style={styles.foodEntryMain}>
                    <View style={styles.foodEntryLeft}>
                        <Text style={styles.foodEntryName}>{entry.food.name}</Text>
                        {entry.portion && (
                            <Text style={styles.foodEntryPortion}>{entry.portion}</Text>
                        )}
                    </View>
                    <Text style={styles.foodEntryCalories}>{entry.food.calories} kcal</Text>
                </View>

                {/* Expanded Macro Details */}
                {isExpanded && (
                    <Animated.View
                        style={[
                            styles.foodEntryExpanded,
                            {
                                opacity: expandOpacity,
                            },
                        ]}
                    >
                        <View style={styles.foodEntryMacros}>
                            <View style={styles.macroItem}>
                                <View style={[styles.macroDot, styles.proteinDot]} />
                                <Text style={styles.macroText}>P {entry.food.protein}g</Text>
                            </View>
                            <View style={styles.macroItem}>
                                <View style={[styles.macroDot, styles.carbsDot]} />
                                <Text style={styles.macroText}>C {entry.food.carbs}g</Text>
                            </View>
                            <View style={styles.macroItem}>
                                <View style={[styles.macroDot, styles.fatsDot]} />
                                <Text style={styles.macroText}>F {entry.food.fats}g</Text>
                            </View>
                        </View>
                    </Animated.View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};



const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#fff',
    },
    auraBallTopLeft: {
        position: 'absolute',
        top: -60,
        left: -160,
        width: SCREEN_WIDTH + 140,
        height: 360,
        zIndex: 0,
    },
    gradientContainer: {
        width: Dimensions.get('window').width,
        marginLeft: -25,
        marginRight: -25,
        marginTop: 0,
        overflow: 'hidden',
        alignSelf: 'stretch',
    },
    gradientImage: {
        width: Dimensions.get('window').width,
        height: '100%',
        alignSelf: 'stretch',
    },
    macroStatusWrapper: {
        position: 'relative',
        zIndex: 1,
        marginTop: 100,
    },
    scrollView: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
        zIndex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingLeft: 25,
        paddingRight: 25,
    },
    emptyStateTouchable: {
        flex: 1,
        minHeight: Dimensions.get('window').height * 0.6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    emptyStateText: {
        fontSize: 28,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptyStateSubtext: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        textAlign: 'center',
    },
    mealCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2.5,
        borderColor: '#252525',
        marginBottom: 16,
        overflow: 'hidden',
    },
    mealCardHeader: {
        paddingTop: 0,
        paddingBottom: 0,
        paddingHorizontal: 15,
    },
    mealCardHeaderTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        marginBottom: 0,
    },
    mealCardSummaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
        marginBottom: 8,
        width: '98%',
    },
    mealCardLabel: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 0,
    },
    mealCardMacros: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
        alignItems: 'center',
    },
    mealCardMacroItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    mealCardMacroDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    mealCardProteinDot: {
        backgroundColor: '#26F170',
    },
    mealCardCarbsDot: {
        backgroundColor: '#FFD700',
    },
    mealCardFatsDot: {
        backgroundColor: '#FF5151',
    },
    mealCardMacroText: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
    },
    mealCardMacroLetter: {
        textTransform: 'uppercase',
    },
    mealCardCalories: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
    },
    mealCardSeparator: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: 'rgba(37, 37, 37, 0.5)',
        marginHorizontal: 4,
    },
    mealCardDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#C8C8C8',
        marginHorizontal: -15,
        marginTop: 0,
        marginBottom: 0,
    },
    mealFoodsContainer: {
        paddingHorizontal: 15,
        paddingTop: 8,
        paddingBottom: 0,
        width: '100%',
        height: 130, // Fixed height for exactly 3 items + "+X more" text: (8px top padding + 8px item padding) + (item height ~24px) + 9px spacing + (8px item padding + item height ~24px) + 9px spacing + (8px item padding + item height ~24px) + 3px for "+X more" = ~123px
    },
    timeGroup: {
        marginBottom: 16,
    },
    timeGroupLabel: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#4463F7',
        marginBottom: 8,
    },
    foodEntryWrapper: {
        width: '100%',
    },
    firstFoodItemSpacing: {
        paddingTop: 5,
    },
    foodItemSpacing: {
        marginBottom: 9,
    },
    foodItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    foodItemRowContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flex: 1,
    },
    foodItemName: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
        flex: 1,
    },
    foodItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    foodItemCalories: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
    },
    foodItemFireIcon: {
        width: 18,
        height: 18,
    },
    foodItemVerticalSeparator: {
        width: 1,
        height: 16,
        backgroundColor: '#E0E0E0',
    },
    foodItemTime: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        minWidth: 30,
    },
    mealEmptyState: {
        padding: 28,
        paddingHorizontal: 15,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 100,
    },
    addFoodButton: {
        marginTop: 16,
        paddingVertical: 12,
    },
    addFoodButtonText: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: '#4463F7',
        textTransform: 'uppercase',
    },
    mealEmptyStateText: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        textAlign: 'center',
        marginBottom: 8,
    },
    mealEmptyStateSubtext: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        textAlign: 'center',
    },
    moreItemsText: {
        fontSize: 14,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        marginTop: 4,
        paddingTop: 4,
        marginBottom: 8,
    },
    foodEntryCard: {
        backgroundColor: 'transparent',
        overflow: 'hidden',
    },
    foodEntryContent: {
        paddingHorizontal: 0,
        paddingVertical: 0,
    },
    foodEntryMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    foodEntryLeft: {
        flex: 1,
        marginRight: 12,
    },
    foodEntryName: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 4,
    },
    foodEntryPortion: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
    },
    foodEntryRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    foodEntryCalories: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
    },
    foodEntryFireIcon: {
        width: 18,
        height: 18,
        marginRight: 8,
    },
    foodEntryVerticalSeparator: {
        width: 1,
        height: 16,
        backgroundColor: '#E0E0E0',
        marginRight: 8,
    },
    foodEntryTime: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        minWidth: 30,
        textAlign: 'right',
    },
    foodEntryExpanded: {
        overflow: 'hidden',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    foodEntryMacros: {
        flexDirection: 'row',
        gap: 12,
    },
    macroItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    macroDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    proteinDot: {
        backgroundColor: '#26F170',
    },
    carbsDot: {
        backgroundColor: '#FFD700',
    },
    fatsDot: {
        backgroundColor: '#FF5151',
    },
    macroText: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
    mealSelectorOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
    },
    mealSelectorBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    mealSelectorContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 20,
        paddingBottom: 40,
        paddingHorizontal: 25,
        borderTopWidth: 2.5,
        borderLeftWidth: 2.5,
        borderRightWidth: 2.5,
        borderColor: '#252525',
    },
    mealSelectorTitle: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 20,
        textAlign: 'center',
    },
    mealSelectorOption: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 12,
        backgroundColor: '#F5F5F5',
        borderRadius: 10,
        borderWidth: 2.5,
        borderColor: '#252525',
    },
    mealSelectorOptionText: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        textAlign: 'center',
    },
    mealSelectorCancel: {
        paddingVertical: 16,
        marginTop: 8,
    },
    mealSelectorCancelText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        textAlign: 'center',
    },
});

