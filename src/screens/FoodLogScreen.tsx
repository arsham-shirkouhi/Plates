import React, { useState, useRef, useEffect, useCallback } from 'react';
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
    // Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';
import { AddFoodBottomSheet } from '../components/AddFoodBottomSheet';
import { EditFoodBottomSheet } from '../components/EditFoodBottomSheet';
import { MacroStatusCompact, MacroStatusCompactRef } from '../components/MacroStatusCompact';
import { FoodLogHeaderSection } from '../components/FoodLogHeaderSection';
import { UndoToast } from '../components/UndoToast';
import { DailyMacrosOverlay } from '../components/DailyMacrosOverlay';
import { FoodItem, getQuickAddItems, searchFoods } from '../services/foodService';
import { getDailyMacroLog, addToDailyMacroLog, subtractFromDailyMacroLog, getTodayDateString, getUserProfile, DailyMacroLog } from '../services/userService';
import { useAddFood } from '../context/AddFoodContext';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

type FoodLogScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'FoodLog'>;

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface LoggedFoodEntry {
    id: string;
    food: FoodItem;
    loggedAt: Date;
    meal: MealType;
    portion?: string; // e.g., "1 cup", "200g"
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export const FoodLogScreen: React.FC = () => {
    const navigation = useNavigation<FoodLogScreenNavigationProp>();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { registerHandler, unregisterHandler, registerSheetState, unregisterSheetState } = useAddFood();
    const [loggedFoods, setLoggedFoods] = useState<LoggedFoodEntry[]>([]);
    const [showAddSheet, setShowAddSheet] = useState(false);
    const [showEditSheet, setShowEditSheet] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<LoggedFoodEntry | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [swipingId, setSwipingId] = useState<string | null>(null);
    const [targetMacros, setTargetMacros] = useState<{ calories?: number; protein?: number; carbs?: number; fats?: number } | null>(null);
    const [dailyLog, setDailyLog] = useState<DailyMacroLog | null>(null);
    const [loadingLog, setLoadingLog] = useState(true);
    const [expandedMeals, setExpandedMeals] = useState<Set<MealType>>(new Set());
    const [showUndoToast, setShowUndoToast] = useState(false);
    const [lastAddedFood, setLastAddedFood] = useState<LoggedFoodEntry | null>(null);
    const [showDailyMacrosOverlay, setShowDailyMacrosOverlay] = useState(false);
    const lastTapRef = useRef<{ time: number; meal: MealType | null }>({ time: 0, meal: null });
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
    const foodsByMeal = meals.reduce((acc, meal) => {
        acc[meal] = loggedFoods
            .filter(entry => entry.meal === meal)
            .sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime());
        return acc;
    }, {} as Record<MealType, LoggedFoodEntry[]>);

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

    // Load today's daily log - uses same logic as HomeScreen
    const loadDailyLog = useCallback(async () => {
        if (!user) {
            setLoadingLog(false);
            return;
        }

        try {
            setLoadingLog(true);
            const today = getTodayDateString();
            const log = await getDailyMacroLog(user, today);
            // Set dailyLog exactly as HomeScreen does (can be null)
            setDailyLog(log);
        } catch (error) {
            console.error('Error loading daily log:', error);
            setDailyLog(null);
        } finally {
            setLoadingLog(false);
        }
    }, [user]);

    // Load daily log on mount and when screen comes into focus
    // This ensures we always read the latest values from the database (same as dashboard)
    useFocusEffect(
        useCallback(() => {
            loadDailyLog();
        }, [loadDailyLog])
    );

    // Also load on initial mount
    useEffect(() => {
        loadDailyLog();
    }, []);

    const [selectedMeal, setSelectedMeal] = useState<MealType | null>(null);
    const [showMealSelector, setShowMealSelector] = useState(false);

    // Animation refs for meal selector
    const mealSelectorSlideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const mealSelectorBackdropOpacity = useRef(new Animated.Value(0)).current;

    // Track newly added food items for animation
    const [newlyAddedFoodIds, setNewlyAddedFoodIds] = useState<Set<string>>(new Set());

    // Double tap detection
    const lastTap = useRef<number>(0);
    const doubleTapDelay = 300;

    const handleAddFood = async (food: FoodItem, meal?: MealType) => {
        if (!user) return;

        const mealToUse = meal || selectedMeal || 'breakfast'; // Default to breakfast if no meal specified
        const newEntry: LoggedFoodEntry = {
            id: Date.now().toString(),
            food,
            loggedAt: new Date(),
            meal: mealToUse,
            portion: '1 serving',
        };
        setLoggedFoods(prev => [newEntry, ...prev]);
        setShowAddSheet(false);
        setSelectedMeal(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Mark as newly added for animation
        setNewlyAddedFoodIds(prev => new Set([...prev, newEntry.id]));

        // Remove from newly added after animation completes
        setTimeout(() => {
            setNewlyAddedFoodIds(prev => {
                const next = new Set(prev);
                next.delete(newEntry.id);
                return next;
            });
        }, 400);

        // Show undo toast
        setLastAddedFood(newEntry);
        setShowUndoToast(true);

        // Add to daily log in database
        try {
            await addToDailyMacroLog(user, {
                calories: food.calories,
                protein: food.protein,
                carbs: food.carbs,
                fats: food.fats,
            });
            // Reload daily log to update UI
            await loadDailyLog();
        } catch (error) {
            console.error('Error adding food to daily log:', error);
        }
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


    // Register add food handler with context
    useEffect(() => {
        registerHandler(handleAddFood);
        registerSheetState(setShowAddSheet);
        return () => {
            unregisterHandler();
            unregisterSheetState();
        };
    }, [handleAddFood, registerHandler, unregisterHandler, registerSheetState, unregisterSheetState]);

    const handleRemoveFood = async (entryId: string) => {
        if (!user) return;

        const entry = loggedFoods.find(e => e.id === entryId);
        if (entry) {
            setLoggedFoods(prev => prev.filter(e => e.id !== entryId));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Subtract from daily log in database
            try {
                await subtractFromDailyMacroLog(user, {
                    calories: entry.food.calories,
                    protein: entry.food.protein,
                    carbs: entry.food.carbs,
                    fats: entry.food.fats,
                });
                // Reload daily log to update UI
                await loadDailyLog();
            } catch (error) {
                console.error('Error removing food from daily log:', error);
            }
        }
    };

    const handleUndo = async () => {
        if (!user || !lastAddedFood) return;

        // Remove from logged foods
        setLoggedFoods(prev => prev.filter(e => e.id !== lastAddedFood.id));

        // Subtract from daily log in database
        try {
            await subtractFromDailyMacroLog(user, {
                calories: lastAddedFood.food.calories,
                protein: lastAddedFood.food.protein,
                carbs: lastAddedFood.food.carbs,
                fats: lastAddedFood.food.fats,
            });
            // Reload daily log to update UI
            await loadDailyLog();
        } catch (error) {
            console.error('Error undoing food addition:', error);
        }

        setShowUndoToast(false);
        setLastAddedFood(null);
    };

    const handleEditFood = (entry: LoggedFoodEntry) => {
        setSelectedEntry(entry);
        setShowEditSheet(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleUpdateFood = async (entryId: string, updatedFood: FoodItem, servingSize: string, numberOfServings: string, meal: MealType) => {
        if (!user) return;

        const entry = loggedFoods.find(e => e.id === entryId);
        if (!entry) return;

        // Calculate the difference to update daily log
        const oldCalories = entry.food.calories;
        const oldProtein = entry.food.protein;
        const oldCarbs = entry.food.carbs;
        const oldFats = entry.food.fats;

        const newCalories = updatedFood.calories;
        const newProtein = updatedFood.protein;
        const newCarbs = updatedFood.carbs;
        const newFats = updatedFood.fats;

        // Update the entry
        const updatedEntry: LoggedFoodEntry = {
            ...entry,
            food: updatedFood,
            meal,
            portion: `${numberOfServings} ${servingSize}`,
        };

        setLoggedFoods(prev => prev.map(e => e.id === entryId ? updatedEntry : e));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Update daily log: subtract old values, add new values
        try {
            // Subtract old values
            await subtractFromDailyMacroLog(user, {
                calories: oldCalories,
                protein: oldProtein,
                carbs: oldCarbs,
                fats: oldFats,
            });

            // Add new values
            await addToDailyMacroLog(user, {
                calories: newCalories,
                protein: newProtein,
                carbs: newCarbs,
                fats: newFats,
            });

            await loadDailyLog();
        } catch (error) {
            console.error('Error updating food in daily log:', error);
        }
    };

    const formatTime = (date: Date): string => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'pm' : 'am';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    };

    const getTimeAgo = (date: Date): string => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return '0m';
        if (diffMins < 60) return `${diffMins}m`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d`;
    };


    // Calculate totals per meal (calories and macros)
    const mealTotals = meals.reduce((acc, meal) => {
        const mealFoods = foodsByMeal[meal];
        acc[meal] = {
            calories: mealFoods.reduce((sum, entry) => sum + entry.food.calories, 0),
            protein: mealFoods.reduce((sum, entry) => sum + entry.food.protein, 0),
            carbs: mealFoods.reduce((sum, entry) => sum + entry.food.carbs, 0),
            fats: mealFoods.reduce((sum, entry) => sum + entry.food.fats, 0),
        };
        return acc;
    }, {} as Record<MealType, { calories: number; protein: number; carbs: number; fats: number }>);

    // Use daily log values from database (same as dashboard's baseConsumed)
    // This matches the dashboard MacrosCard consumed values (without testValues)
    // Use exact same logic as HomeScreen: baseConsumed = dailyLog || { calories: 0, protein: 0, carbs: 0, fats: 0 }
    const baseConsumed = dailyLog || { calories: 0, protein: 0, carbs: 0, fats: 0 };

    // TEST VALUES - Remove this for production
    const totals = {
        protein: 156,
        carbs: 234,
        fats: 87,
        calories: 2434,
    };
    // const totals = baseConsumed; // Uncomment this for production


    return (
        <View style={styles.container}>
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
                    onMacrosPress={() => {
                        setShowDailyMacrosOverlay(true);
                    }}
                    onClosePress={() => navigation.goBack()}
                />
                {meals.map((meal, mealIndex) => {
                    const mealFoods = foodsByMeal[meal];
                    const mealTotal = mealTotals[meal];
                    const mealLabels: Record<MealType, { label: string; icon: string; color: string }> = {
                        breakfast: { label: 'breakfast', icon: 'sunny-outline', color: '#FFD700' },
                        lunch: { label: 'lunch', icon: 'partly-sunny-outline', color: '#FF8C42' },
                        dinner: { label: 'dinner', icon: 'moon-outline', color: '#4463F7' },
                        snack: { label: 'snacks', icon: 'cafe-outline', color: '#26F170' },
                    };
                    const mealInfo = mealLabels[meal];
                    return (
                        <View
                            key={meal}
                            style={styles.mealCard}
                        >
                            {/* Meal Card Header */}
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => {
                                    navigation.navigate('MealDetail', {
                                        meal,
                                        foods: mealFoods.map(entry => ({
                                            id: entry.id,
                                            food: entry.food,
                                            loggedAt: entry.loggedAt.toISOString(),
                                            meal: entry.meal,
                                            portion: entry.portion,
                                        })),
                                        mealTotal,
                                    });
                                }}
                                style={styles.mealCardHeader}
                            >
                                <View style={styles.mealCardHeaderTop}>
                                    <Text style={styles.mealCardLabel}>{mealInfo.label}</Text>
                                    <Ionicons name="chevron-forward" size={20} color="#252525" />
                                </View>
                                {expandedMeals.has(meal) && (
                                    <Animated.View
                                        style={{
                                            opacity: macroRowOpacities.get(meal) || 0,
                                        }}
                                    >
                                        <View style={styles.mealCardSummaryRow}>
                                            <Text style={styles.mealCardCalories}>{Math.round(mealTotal.calories)} kcal</Text>
                                            <Text style={styles.mealCardSeparator}>|</Text>
                                            <View style={styles.mealCardMacroItem}>
                                                <View style={[styles.mealCardMacroDot, styles.mealCardProteinDot]} />
                                                <Text style={styles.mealCardMacroText}>
                                                    <Text style={styles.mealCardMacroLetter}>P</Text> {Math.round(mealTotal.protein)}g
                                                </Text>
                                            </View>
                                            <Text style={styles.mealCardSeparator}>|</Text>
                                            <View style={styles.mealCardMacroItem}>
                                                <View style={[styles.mealCardMacroDot, styles.mealCardCarbsDot]} />
                                                <Text style={styles.mealCardMacroText}>
                                                    <Text style={styles.mealCardMacroLetter}>C</Text> {Math.round(mealTotal.carbs)}g
                                                </Text>
                                            </View>
                                            <Text style={styles.mealCardSeparator}>|</Text>
                                            <View style={styles.mealCardMacroItem}>
                                                <View style={[styles.mealCardMacroDot, styles.mealCardFatsDot]} />
                                                <Text style={styles.mealCardMacroText}>
                                                    <Text style={styles.mealCardMacroLetter}>F</Text> {Math.round(mealTotal.fats)}g
                                                </Text>
                                            </View>
                                        </View>
                                    </Animated.View>
                                )}
                            </TouchableOpacity>

                            {/* Separator line under summary - always show */}
                            <View style={styles.mealCardDivider} />

                            {/* Food Items or Empty State */}
                            {mealFoods.length > 0 ? (
                                <TouchableOpacity
                                    activeOpacity={1}
                                    onPress={() => {
                                        const now = Date.now();
                                        const DOUBLE_TAP_DELAY = 300;

                                        if (
                                            lastTapRef.current.meal === meal &&
                                            now - lastTapRef.current.time < DOUBLE_TAP_DELAY
                                        ) {
                                            // Double tap detected - add food
                                            handleAddFoodToMeal(meal);
                                            lastTapRef.current = { time: 0, meal: null };
                                        } else {
                                            // First tap - just record it
                                            lastTapRef.current = { time: now, meal };
                                        }
                                    }}
                                    style={styles.mealFoodsContainer}
                                >
                                    {(() => {
                                        // Get 3 most recent items (already sorted by time desc)
                                        const recentFoods = mealFoods.slice(0, 3);
                                        const remainingCount = mealFoods.length - 3;

                                        return (
                                            <>
                                                {recentFoods.map((entry, index) => {
                                                    const timeAgo = getTimeAgo(entry.loggedAt);
                                                    const isNewlyAdded = newlyAddedFoodIds.has(entry.id);

                                                    return (
                                                        <FoodItemRow
                                                            key={entry.id}
                                                            entry={entry}
                                                            timeAgo={timeAgo}
                                                            index={index}
                                                            isNewlyAdded={isNewlyAdded}
                                                            isLast={index === recentFoods.length - 1}
                                                            onEdit={() => handleEditFood(entry)}
                                                        />
                                                    );
                                                })}
                                                {remainingCount > 0 && (
                                                    <TouchableOpacity
                                                        activeOpacity={0.7}
                                                        onPress={() => {
                                                            navigation.navigate('MealDetail', {
                                                                meal,
                                                                foods: mealFoods.map(entry => ({
                                                                    id: entry.id,
                                                                    food: entry.food,
                                                                    loggedAt: entry.loggedAt.toISOString(),
                                                                    meal: entry.meal,
                                                                    portion: entry.portion,
                                                                })),
                                                                mealTotal,
                                                            });
                                                        }}
                                                    >
                                                        <Text style={styles.moreItemsText}>
                                                            +{remainingCount} more
                                                        </Text>
                                                    </TouchableOpacity>
                                                )}
                                            </>
                                        );
                                    })()}
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    activeOpacity={1}
                                    onPress={() => {
                                        const now = Date.now();
                                        const DOUBLE_TAP_DELAY = 300;

                                        if (
                                            lastTapRef.current.meal === meal &&
                                            now - lastTapRef.current.time < DOUBLE_TAP_DELAY
                                        ) {
                                            // Double tap detected
                                            handleAddFoodToMeal(meal);
                                            lastTapRef.current = { time: 0, meal: null };
                                        } else {
                                            // First tap
                                            lastTapRef.current = { time: now, meal };
                                        }
                                    }}
                                    style={styles.mealEmptyState}
                                >
                                    <Text style={styles.mealEmptyStateSubtext}>double tap to log meal</Text>
                                </TouchableOpacity>
                            )}
                        </View>
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
                onAddFood={(food) => handleAddFood(food, selectedMeal || undefined)}
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

            {/* Daily Macros Overlay */}
            <DailyMacrosOverlay
                visible={showDailyMacrosOverlay}
                onClose={() => setShowDailyMacrosOverlay(false)}
                foods={loggedFoods}
                totals={totals}
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

            {/* White to transparent gradient behind buttons */}
            <LinearGradient
                colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[
                    {
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 150,
                        zIndex: 99, // Behind buttons but above content
                    },
                    { paddingBottom: insets.bottom }
                ]}
                pointerEvents="none"
            />
        </View>
    );
};

interface FoodItemRowProps {
    entry: LoggedFoodEntry;
    timeAgo: string;
    index: number;
    isNewlyAdded: boolean;
    isLast: boolean;
    onEdit: () => void;
}

const FoodItemRow: React.FC<FoodItemRowProps> = ({ entry, timeAgo, index, isNewlyAdded, isLast, onEdit }) => {
    const itemOpacity = useRef(new Animated.Value(isNewlyAdded ? 0 : 1)).current;
    const itemTranslateY = useRef(new Animated.Value(isNewlyAdded ? 20 : 0)).current;

    // Entrance animation for newly added items
    useEffect(() => {
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

    return (
        <Animated.View
            style={[
                styles.foodItemRow,
                index === 0 && styles.firstFoodItemSpacing,
                !isLast && styles.foodItemSpacing,
                {
                    opacity: itemOpacity,
                    transform: [{ translateY: itemTranslateY }],
                },
            ]}
        >
            <TouchableOpacity
                style={styles.foodItemRowContent}
                onPress={onEdit}
                activeOpacity={0.7}
            >
                <Text style={styles.foodItemName}>{entry.food.name}</Text>
                <View style={styles.foodItemRight}>
                    <Text style={styles.foodItemCalories}>{entry.food.calories}kcal</Text>
                    <View style={styles.foodItemVerticalSeparator} />
                    <Text style={styles.foodItemTime}>{timeAgo}</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
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
        paddingTop: 8,
        paddingBottom: 6,
        paddingHorizontal: 15,
    },
    mealCardHeaderTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 0,
    },
    mealCardSummaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6,
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
        height: 2,
        backgroundColor: '#E0E0E0',
        marginHorizontal: -15,
        marginTop: 4,
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

