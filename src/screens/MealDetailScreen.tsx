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
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';
import { AddFoodBottomSheet } from '../components/AddFoodBottomSheet';
import { FoodItem, getQuickAddItems } from '../services/foodService';
import { useAuth } from '../context/AuthContext';
import { subtractFromDailyMacroLog, getTodayDateString, getDailyMacroLog, DailyMacroLog } from '../services/userService';

type MealDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MealDetail'>;
type MealDetailScreenRouteProp = RouteProp<RootStackParamList, 'MealDetail'>;

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface LoggedFoodEntry {
    id: string;
    food: FoodItem;
    loggedAt: Date;
    meal: MealType;
    portion?: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export const MealDetailScreen: React.FC = () => {
    const navigation = useNavigation<MealDetailScreenNavigationProp>();
    const route = useRoute<MealDetailScreenRouteProp>();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    const { meal, foods: initialFoods, mealTotal: initialMealTotal } = route.params;

    // Convert serialized dates back to Date objects
    const [foods, setFoods] = useState<LoggedFoodEntry[]>(
        initialFoods.map(entry => ({
            ...entry,
            loggedAt: new Date(entry.loggedAt),
        }))
    );
    const [showAddSheet, setShowAddSheet] = useState(false);
    const [selectedMeal, setSelectedMeal] = useState<MealType>(meal);
    const [dailyLog, setDailyLog] = useState<DailyMacroLog | null>(null);

    const mealLabels: Record<MealType, { label: string; icon: string; color: string }> = {
        breakfast: { label: 'breakfast', icon: 'sunny-outline', color: '#FFD700' },
        lunch: { label: 'lunch', icon: 'partly-sunny-outline', color: '#FF8C42' },
        dinner: { label: 'dinner', icon: 'moon-outline', color: '#4463F7' },
        snack: { label: 'snacks', icon: 'cafe-outline', color: '#26F170' },
    };

    const mealInfo = mealLabels[meal];

    // Calculate current meal totals
    const mealTotal = foods.reduce(
        (acc, entry) => ({
            calories: acc.calories + entry.food.calories,
            protein: acc.protein + entry.food.protein,
            carbs: acc.carbs + entry.food.carbs,
            fats: acc.fats + entry.food.fats,
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    // Load daily log
    const loadDailyLog = async () => {
        if (!user) return;

        try {
            const today = getTodayDateString();
            const log = await getDailyMacroLog(user, today);
            setDailyLog(log);
        } catch (error) {
            console.error('Error loading daily log:', error);
        }
    };

    useEffect(() => {
        loadDailyLog();
    }, []);

    const handleAddFood = async (food: FoodItem) => {
        if (!user) return;

        const newEntry: LoggedFoodEntry = {
            id: Date.now().toString(),
            food,
            loggedAt: new Date(),
            meal: selectedMeal,
            portion: '1 serving',
        };

        setFoods(prev => [newEntry, ...prev]);
        setShowAddSheet(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Add to daily log in database
        try {
            const { addToDailyMacroLog } = await import('../services/userService');
            await addToDailyMacroLog(user, {
                calories: food.calories,
                protein: food.protein,
                carbs: food.carbs,
                fats: food.fats,
            });
            await loadDailyLog();
        } catch (error) {
            console.error('Error adding food to daily log:', error);
        }
    };

    const handleRemoveFood = async (entryId: string) => {
        if (!user) return;

        const entry = foods.find(e => e.id === entryId);
        if (entry) {
            setFoods(prev => prev.filter(e => e.id !== entryId));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Subtract from daily log in database
            try {
                await subtractFromDailyMacroLog(user, {
                    calories: entry.food.calories,
                    protein: entry.food.protein,
                    carbs: entry.food.carbs,
                    fats: entry.food.fats,
                });
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
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    };

    // Sort foods by time (most recent first)
    const sortedFoods = [...foods].sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime());

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={24} color="#252525" />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <View style={styles.headerTop}>
                            <Ionicons name={mealInfo.icon as any} size={28} color={mealInfo.color} />
                            <Text style={styles.headerTitle}>{mealInfo.label}</Text>
                        </View>
                        <View style={styles.headerMacros}>
                            <Text style={styles.headerCalories}>{Math.round(mealTotal.calories)} kcal</Text>
                            <Text style={styles.headerSeparator}>|</Text>
                            <View style={styles.headerMacroItem}>
                                <View style={[styles.headerMacroDot, styles.proteinDot]} />
                                <Text style={styles.headerMacroText}>
                                    <Text style={styles.headerMacroLetter}>P</Text> {Math.round(mealTotal.protein)}g
                                </Text>
                            </View>
                            <Text style={styles.headerSeparator}>|</Text>
                            <View style={styles.headerMacroItem}>
                                <View style={[styles.headerMacroDot, styles.carbsDot]} />
                                <Text style={styles.headerMacroText}>
                                    <Text style={styles.headerMacroLetter}>C</Text> {Math.round(mealTotal.carbs)}g
                                </Text>
                            </View>
                            <Text style={styles.headerSeparator}>|</Text>
                            <View style={styles.headerMacroItem}>
                                <View style={[styles.headerMacroDot, styles.fatsDot]} />
                                <Text style={styles.headerMacroText}>
                                    <Text style={styles.headerMacroLetter}>F</Text> {Math.round(mealTotal.fats)}g
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Food Items List */}
                <View style={styles.foodsContainer}>
                    {sortedFoods.length > 0 ? (
                        sortedFoods.map((entry, index) => (
                            <FoodItemCard
                                key={entry.id}
                                entry={entry}
                                time={formatTime(entry.loggedAt)}
                                timeAgo={getTimeAgo(entry.loggedAt)}
                                onDelete={() => handleRemoveFood(entry.id)}
                                index={index}
                            />
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>no foods logged yet</Text>
                            <Text style={styles.emptyStateSubtext}>tap the button below to add food</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Add Food Button */}
            <TouchableOpacity
                style={[styles.addButton, { bottom: insets.bottom + 20 }]}
                onPress={() => setShowAddSheet(true)}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={24} color="#fff" />
                <Text style={styles.addButtonText}>add food</Text>
            </TouchableOpacity>

            {/* Add Food Sheet */}
            <AddFoodBottomSheet
                visible={showAddSheet}
                onClose={() => setShowAddSheet(false)}
                onAddFood={handleAddFood}
                quickAddItems={getQuickAddItems()}
                initialMeal={selectedMeal}
                onMealChange={(meal) => setSelectedMeal(meal)}
            />
        </View>
    );
};

interface FoodItemCardProps {
    entry: LoggedFoodEntry;
    time: string;
    timeAgo: string;
    onDelete: () => void;
    index: number;
}

const FoodItemCard: React.FC<FoodItemCardProps> = ({ entry, time, timeAgo, onDelete, index }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const rowOpacity = useRef(new Animated.Value(1)).current;
    const cardScale = useRef(new Animated.Value(1)).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                const { dx, dy } = gestureState;
                return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
            },
            onPanResponderTerminationRequest: () => true,
            onPanResponderMove: (_, gestureState) => {
                if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
                    if (gestureState.dx < 0) {
                        translateX.setValue(Math.max(gestureState.dx, -80));
                    } else {
                        translateX.setValue(Math.min(gestureState.dx, 0));
                    }
                }
            },
            onPanResponderRelease: (_, gestureState) => {
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
                styles.foodCard,
                {
                    opacity: rowOpacity,
                    transform: [{ translateX }],
                },
            ]}
            {...panResponder.panHandlers}
        >
            <View style={styles.foodCardContent}>
                <View style={styles.foodCardLeft}>
                    <Text style={styles.foodCardName}>{entry.food.name}</Text>
                    {entry.portion && (
                        <Text style={styles.foodCardPortion}>{entry.portion}</Text>
                    )}
                    <View style={styles.foodCardMacros}>
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
                </View>
                <View style={styles.foodCardRight}>
                    <Text style={styles.foodCardCalories}>{entry.food.calories} kcal</Text>
                    <View style={styles.foodCardTimeContainer}>
                        <Text style={styles.foodCardTime}>{time}</Text>
                        <Text style={styles.foodCardTimeAgo}>{timeAgo}</Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 25,
    },
    header: {
        paddingBottom: 24,
        borderBottomWidth: 2,
        borderBottomColor: '#E0E0E0',
        marginBottom: 24,
    },
    backButton: {
        marginBottom: 16,
    },
    headerContent: {
        gap: 12,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    headerMacros: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    headerCalories: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    headerSeparator: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: 'rgba(37, 37, 37, 0.5)',
    },
    headerMacroItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    headerMacroDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    headerMacroText: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
    },
    headerMacroLetter: {
        textTransform: 'uppercase',
    },
    foodsContainer: {
        gap: 12,
    },
    foodCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2.5,
        borderColor: '#252525',
        overflow: 'hidden',
    },
    foodCardContent: {
        flexDirection: 'row',
        padding: 16,
        justifyContent: 'space-between',
    },
    foodCardLeft: {
        flex: 1,
        marginRight: 16,
    },
    foodCardName: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 4,
    },
    foodCardPortion: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginBottom: 8,
    },
    foodCardMacros: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
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
    foodCardRight: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    foodCardCalories: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 8,
    },
    foodCardTimeContainer: {
        alignItems: 'flex-end',
        gap: 2,
    },
    foodCardTime: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#252525',
    },
    foodCardTimeAgo: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
    emptyState: {
        paddingVertical: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyStateText: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
    addButton: {
        position: 'absolute',
        left: 25,
        right: 25,
        height: 56,
        backgroundColor: '#252525',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 2.5,
        borderColor: '#252525',
    },
    addButtonText: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#fff',
        textTransform: 'lowercase',
    },
});

