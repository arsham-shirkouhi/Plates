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
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';
import { AddFoodBottomSheet } from '../components/AddFoodBottomSheet';
import { MacroStatusCompact, MacroStatusCompactRef } from '../components/MacroStatusCompact';
import { FoodLogHeaderSection } from '../components/FoodLogHeaderSection';
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
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [swipingId, setSwipingId] = useState<string | null>(null);
    const [targetMacros, setTargetMacros] = useState<{ calories?: number; protein?: number; carbs?: number; fats?: number } | null>(null);
    const [dailyLog, setDailyLog] = useState<{ calories: number; protein: number; carbs: number; fats: number } | null>(null);
    const [loadingLog, setLoadingLog] = useState(true);
    const swipeAnimations = useRef<Map<string, Animated.Value>>(new Map()).current;
    const scrollViewRef = useRef<ScrollView>(null);
    const macroStatusRef = useRef<MacroStatusCompactRef>(null);
    
    // Animation values for meal cards
    const mealCardAnimations = useRef<Map<MealType, Animated.Value>>(new Map()).current;
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

    // Animate meal cards on mount and when foods change
    useEffect(() => {
        const animations = meals.map((meal, index) => {
            const anim = mealCardAnimations.get(meal)!;
            return Animated.timing(anim, {
                toValue: foodsByMeal[meal].length > 0 ? 1 : 0,
                duration: 400,
                delay: index * 100,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            });
        });
        
        if (animations.length > 0) {
            Animated.stagger(50, animations).start();
        }
    }, [loggedFoods.length, foodsByMeal]);

    // Animate empty state
    useEffect(() => {
        if (loggedFoods.length === 0) {
            Animated.parallel([
                Animated.timing(emptyStateOpacity, {
                    toValue: 1,
                    duration: 500,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.spring(emptyStateScale, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(emptyStateOpacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(emptyStateScale, {
                    toValue: 0.9,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [loggedFoods.length]);

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

    // Load today's daily log
    const loadDailyLog = useCallback(async () => {
        if (!user) {
            setLoadingLog(false);
            return;
        }

        try {
            setLoadingLog(true);
            const today = getTodayDateString();
            const log = await getDailyMacroLog(user, today);
            if (log) {
                setDailyLog({
                    calories: log.calories || 0,
                    protein: log.protein || 0,
                    carbs: log.carbs || 0,
                    fats: log.fats || 0,
                });
            } else {
                setDailyLog({ calories: 0, protein: 0, carbs: 0, fats: 0 });
            }
        } catch (error) {
            console.error('Error loading daily log:', error);
            setDailyLog({ calories: 0, protein: 0, carbs: 0, fats: 0 });
        } finally {
            setLoadingLog(false);
        }
    }, [user]);

    // Load daily log on mount and when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadDailyLog();
        }, [loadDailyLog])
    );

    const [selectedMeal, setSelectedMeal] = useState<MealType | null>(null);
    const [showMealSelector, setShowMealSelector] = useState(false);
    
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

        // Add entrance animation for new entry
        const animKey = newEntry.id;
        if (!swipeAnimations.has(animKey)) {
            swipeAnimations.set(animKey, new Animated.Value(0));
        }
        const anim = swipeAnimations.get(animKey)!;
        anim.setValue(-50);
        Animated.spring(anim, {
            toValue: 0,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
        }).start();

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
        setShowMealSelector(false);
        setShowAddSheet(true);
    };


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

        if (diffMins < 1) return 'just now';
        if (diffMins === 1) return '1 minute ago';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours === 1) return '1 hour ago';
        return `${diffHours} hours ago`;
    };


    // Calculate totals per meal
    const mealTotals = meals.reduce((acc, meal) => {
        acc[meal] = foodsByMeal[meal].reduce((sum, entry) => sum + entry.food.calories, 0);
        return acc;
    }, {} as Record<MealType, number>);

    // Use daily log values from database (same as dashboard's baseConsumed)
    // This matches the dashboard MacrosCard consumed values (without testValues)
    const totals = dailyLog || { calories: 0, protein: 0, carbs: 0, fats: 0 };


    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Top Gradient Background - Fixed Position */}
            <View style={styles.gradientContainer}>
                <Image
                    source={require('../../assets/images/top_gradient.png')}
                    style={[styles.gradientImage, { height: 300 + insets.top }]}
                    resizeMode="cover"
                />
            </View>

            {/* Header Section with Macros - At the top */}
            <FoodLogHeaderSection
                protein={totals.protein}
                carbs={totals.carbs}
                fats={totals.fats}
                calories={totals.calories}
                topInset={insets.top}
                onProfilePress={() => {
                    // TODO: Navigate to profile screen
                    Alert.alert('Profile', 'Profile screen coming soon');
                }}
            />

            {/* Macro Status Compact - Fixed at top */}
            {/* <View style={styles.macroStatusWrapper}>
                <MacroStatusCompact
                    ref={macroStatusRef}
                    calories={totals.calories}
                    protein={totals.protein}
                    carbs={totals.carbs}
                    fats={totals.fats}
                    targetCalories={targetMacros?.calories}
                    targetProtein={targetMacros?.protein}
                    targetCarbs={targetMacros?.carbs}
                    targetFats={targetMacros?.fats}
                />
            </View> */}

            {/* Content */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingTop: 120, paddingBottom: insets.bottom + 80 }]}
                showsVerticalScrollIndicator={false}
                onScrollBeginDrag={() => {
                    // Collapse macro status on scroll
                    // macroStatusRef.current?.collapse();
                    setExpandedId(null);
                }}
                scrollEventThrottle={16}
            >
                {loggedFoods.length === 0 ? (
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => {
                            const now = Date.now();
                            if (now - lastTap.current < doubleTapDelay) {
                                // Double tap detected
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                setShowMealSelector(true);
                            }
                            lastTap.current = now;
                        }}
                        style={styles.emptyStateTouchable}
                    >
                        <Animated.View
                            style={[
                                styles.emptyState,
                                {
                                    opacity: emptyStateOpacity,
                                    transform: [{ scale: emptyStateScale }],
                                },
                            ]}
                        >
                            <Text style={styles.emptyStateText}>you haven't logged anything today</Text>
                            <Text style={styles.emptyStateSubtext}>double tap the screen to log something</Text>
                        </Animated.View>
                    </TouchableOpacity>
                ) : (
                    <>
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
                            const cardAnim = mealCardAnimations.get(meal) || new Animated.Value(0);

                            return (
                                <Animated.View
                                    key={meal}
                                    style={[
                                        styles.mealCard,
                                        {
                                            opacity: mealFoods.length > 0 ? cardAnim : 1,
                                            transform: [
                                                {
                                                    translateY: mealFoods.length > 0
                                                        ? cardAnim.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [30, 0],
                                                        })
                                                        : 0,
                                                },
                                            ],
                                        },
                                    ]}
                                >
                                    {/* Meal Card Header */}
                                    <TouchableOpacity
                                        style={styles.mealCardHeader}
                                        onPress={() => handleAddFoodToMeal(meal)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.mealCardHeaderLeft}>
                                            <View style={[styles.mealIconContainer, { backgroundColor: `${mealInfo.color}20` }]}>
                                                <Ionicons name={mealInfo.icon as any} size={18} color={mealInfo.color} />
                                            </View>
                                            <Text style={styles.mealCardLabel}>{mealInfo.label}</Text>
                                            {mealTotal > 0 && (
                                                <Text style={styles.mealCardTotalInline}>{mealTotal} kcal</Text>
                                            )}
                                        </View>
                                        <View style={[styles.addMealButton, mealFoods.length === 0 && styles.addMealButtonEmpty]}>
                                            <Ionicons name="add" size={18} color={mealFoods.length === 0 ? "#252525" : "#fff"} />
                                        </View>
                                    </TouchableOpacity>

                                    {/* Food Items */}
                                    {mealFoods.length > 0 && (
                                        <View style={styles.mealFoodsContainer}>
                                            {mealFoods.map((entry, index) => {
                                                const isExpanded = expandedId === entry.id;
                                                const timeStr = formatTime(entry.loggedAt);

                                                return (
                                                    <FoodEntryCard
                                                        key={entry.id}
                                                        entry={entry}
                                                        time={timeStr}
                                                        timeAgo={getTimeAgo(entry.loggedAt)}
                                                        isExpanded={isExpanded}
                                                        onToggleExpand={() => setExpandedId(isExpanded ? null : entry.id)}
                                                        onDelete={() => handleRemoveFood(entry.id)}
                                                        index={index}
                                                    />
                                                );
                                            })}
                                        </View>
                                    )}
                                </Animated.View>
                            );
                        })}
                    </>
                )}
            </ScrollView>


            {/* Meal Selector Modal */}
            {showMealSelector && (
                <View style={styles.mealSelectorOverlay}>
                    <TouchableOpacity
                        style={styles.mealSelectorBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowMealSelector(false)}
                    />
                    <View style={styles.mealSelectorContainer}>
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
                            onPress={() => setShowMealSelector(false)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.mealSelectorCancelText}>cancel</Text>
                        </TouchableOpacity>
                    </View>
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
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 10;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dx < 0) {
                    translateX.setValue(Math.max(gestureState.dx, -80));
                } else {
                    translateX.setValue(Math.min(gestureState.dx, 0));
                }
            },
            onPanResponderRelease: (_, gestureState) => {
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
                        <View style={styles.foodEntryMeta}>
                            <Text style={styles.foodEntryTime}>{time}</Text>
                            <View style={styles.foodEntryDot} />
                            <Text style={styles.foodEntryTimeAgo}>{timeAgo}</Text>
                        </View>
                    </View>
                    <View style={styles.foodEntryRight}>
                        <View style={styles.foodEntryCalories}>
                            <Text style={styles.foodEntryCaloriesText}>{entry.food.calories}</Text>
                            <Text style={styles.foodEntryCaloriesLabel}>kcal</Text>
                        </View>
                        <Image
                            source={require('../../assets/images/icons/fire.png')}
                            style={styles.foodEntryFireIcon}
                            resizeMode="contain"
                        />
                    </View>
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
        backgroundColor: '#fff',
    },
    gradientContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 0,
        overflow: 'hidden',
    },
    gradientImage: {
        width: '100%',
        height: '100%',
    },
    macroStatusWrapper: {
        position: 'relative',
        zIndex: 1,
        marginTop: 100,
    },
    scrollView: {
        flex: 1,
        position: 'relative',
        zIndex: 1,
    },
    scrollContent: {
        paddingTop: 10,
        paddingHorizontal: 25,
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
        marginBottom: 12,
        overflow: 'hidden',
    },
    mealCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#F9F9F9',
    },
    mealCardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 10,
    },
    mealIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mealCardLabel: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    mealCardTotalInline: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginLeft: 8,
    },
    addMealButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#252525',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addMealButtonEmpty: {
        backgroundColor: '#E0E0E0',
    },
    mealFoodsContainer: {
        padding: 8,
        gap: 6,
    },
    foodEntryCard: {
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        overflow: 'hidden',
    },
    foodEntryContent: {
        padding: 10,
    },
    foodEntryMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    foodEntryLeft: {
        flex: 1,
        marginRight: 10,
    },
    foodEntryName: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 4,
    },
    foodEntryMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    foodEntryTime: {
        fontSize: 12,
        fontFamily: fonts.bold,
        color: '#252525',
    },
    foodEntryDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#9E9E9E',
    },
    foodEntryTimeAgo: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
    foodEntryRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    foodEntryCalories: {
        alignItems: 'flex-end',
    },
    foodEntryCaloriesText: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: '#252525',
    },
    foodEntryCaloriesLabel: {
        fontSize: 10,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
    foodEntryFireIcon: {
        width: 16,
        height: 16,
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
        flex: 1,
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

