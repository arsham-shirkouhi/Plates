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
import { EditFoodBottomSheet } from '../components/EditFoodBottomSheet';
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

    // Convert serialized dates back to Date objects and ensure FoodItem has id
    const [foods, setFoods] = useState<LoggedFoodEntry[]>(
        initialFoods.map(entry => ({
            ...entry,
            food: {
                id: entry.id, // Use entry.id as food.id
                name: entry.food.name,
                calories: entry.food.calories,
                protein: entry.food.protein,
                carbs: entry.food.carbs,
                fats: entry.food.fats,
            },
            loggedAt: new Date(entry.loggedAt),
        }))
    );
    const [showAddSheet, setShowAddSheet] = useState(false);
    const [showEditSheet, setShowEditSheet] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<LoggedFoodEntry | null>(null);
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

    const handleUpdateFood = async (entryId: string, updatedFood: FoodItem, servingSize: string, numberOfServings: string, meal: MealType) => {
        if (!user) return;

        const entry = foods.find(e => e.id === entryId);
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

        setFoods(prev => prev.map(e => e.id === entryId ? updatedEntry : e));
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
            const { addToDailyMacroLog } = await import('../services/userService');
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

    const handleEditFood = (entry: LoggedFoodEntry) => {
        setSelectedEntry(entry);
        setShowEditSheet(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                <View style={styles.contentInner}>
                    <View style={styles.headerContainer}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => navigation.goBack()}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="chevron-back" size={24} color="#526EFF" />
                            </TouchableOpacity>
                            <View style={styles.headerCenter}>
                                <Text style={styles.headerTitle}>{mealInfo.label}</Text>
                                <Text style={styles.headerStats}>
                                    {foods.length} {foods.length === 1 ? 'item' : 'items'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => setShowAddSheet(true)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="add" size={32} color="#526EFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Header divider - outside padded container for full width */}
                    <View style={styles.headerDivider} />

                    <View style={styles.contentInnerView}>
                        {/* Macros Section */}
                        <View style={styles.macrosSection}>
                            <View style={styles.macrosRow}>
                                <Text style={styles.macrosCalories}>{Math.round(mealTotal.calories)} kcal</Text>
                                <Text style={styles.macrosSeparator}>|</Text>
                                <View style={styles.macrosMacroItem}>
                                    <View style={[styles.macrosMacroDot, styles.proteinDot]} />
                                    <Text style={styles.macrosMacroText}>
                                        <Text style={styles.macrosMacroLetter}>P</Text> {Math.round(mealTotal.protein)}g
                                    </Text>
                                </View>
                                <Text style={styles.macrosSeparator}>|</Text>
                                <View style={styles.macrosMacroItem}>
                                    <View style={[styles.macrosMacroDot, styles.carbsDot]} />
                                    <Text style={styles.macrosMacroText}>
                                        <Text style={styles.macrosMacroLetter}>C</Text> {Math.round(mealTotal.carbs)}g
                                    </Text>
                                </View>
                                <Text style={styles.macrosSeparator}>|</Text>
                                <View style={styles.macrosMacroItem}>
                                    <View style={[styles.macrosMacroDot, styles.fatsDot]} />
                                    <Text style={styles.macrosMacroText}>
                                        <Text style={styles.macrosMacroLetter}>F</Text> {Math.round(mealTotal.fats)}g
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Macros divider - full width using negative margins */}
                        <View style={styles.macrosDivider} />

                        {/* Food Items List */}
                        <ScrollView
                            style={styles.scrollView}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {sortedFoods.length > 0 ? (
                                <View style={styles.foodsContainer}>
                                    {sortedFoods.map((entry, index) => (
                                        <FoodItemCard
                                            key={entry.id}
                                            entry={entry}
                                            timeAgo={getTimeAgo(entry.loggedAt)}
                                            onDelete={() => handleRemoveFood(entry.id)}
                                            onEdit={() => handleEditFood(entry)}
                                            index={index}
                                        />
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyStateText}>no foods logged yet</Text>
                                    <Text style={styles.emptyStateSubtext}>tap the + button to add food</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </View>


            {/* Add Food Sheet */}
            <AddFoodBottomSheet
                visible={showAddSheet}
                onClose={() => setShowAddSheet(false)}
                onAddFood={handleAddFood}
                quickAddItems={getQuickAddItems()}
                initialMeal={selectedMeal}
                onMealChange={(meal) => {
                    if (meal) {
                        setSelectedMeal(meal);
                    }
                }}
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

interface FoodItemCardProps {
    entry: LoggedFoodEntry;
    timeAgo: string;
    onDelete: () => void;
    onEdit: () => void;
    index: number;
}

const FoodItemCard: React.FC<FoodItemCardProps> = ({ entry, timeAgo, onDelete, onEdit, index }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const rowOpacity = useRef(new Animated.Value(1)).current;
    const cardScale = useRef(new Animated.Value(1)).current;
    const isSwiping = useRef(false);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                const { dx, dy } = gestureState;
                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
                    isSwiping.current = true;
                    return true;
                }
                return false;
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
                isSwiping.current = false;
            },
        })
    ).current;

    const handlePress = () => {
        if (!isSwiping.current) {
            onEdit();
        }
    };

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
            <TouchableOpacity
                style={styles.foodCardContent}
                onPress={handlePress}
                activeOpacity={0.7}
            >
                <View style={styles.foodCardLeft}>
                    <Text style={styles.foodCardName}>{entry.food.name}</Text>
                    {entry.portion && (
                        <Text style={styles.foodCardPortion}>{entry.portion}</Text>
                    )}
                    <View style={styles.foodCardMacros}>
                        <View style={styles.macroItem}>
                            <View style={[styles.macroDot, styles.proteinDot]} />
                            <Text style={styles.macroText}>
                                <Text style={styles.macroLetter}>P</Text> {entry.food.protein}g
                            </Text>
                        </View>
                        <View style={styles.macroItem}>
                            <View style={[styles.macroDot, styles.carbsDot]} />
                            <Text style={styles.macroText}>
                                <Text style={styles.macroLetter}>C</Text> {entry.food.carbs}g
                            </Text>
                        </View>
                        <View style={styles.macroItem}>
                            <View style={[styles.macroDot, styles.fatsDot]} />
                            <Text style={styles.macroText}>
                                <Text style={styles.macroLetter}>F</Text> {entry.food.fats}g
                            </Text>
                        </View>
                    </View>
                </View>
                <View style={styles.foodCardRight}>
                    <Text style={styles.foodCardCalories}>{entry.food.calories} kcal</Text>
                    <Text style={styles.foodCardTimeAgo}>{timeAgo}</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        backgroundColor: '#fff',
    },
    contentInner: {
        flex: 1,
    },
    contentInnerView: {
        flex: 1,
        paddingHorizontal: 25,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
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
    addButton: {
        padding: 8,
        marginRight: -8,
        minWidth: 44,
        minHeight: 44,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    headerDivider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        width: '100%',
        marginTop: 0,
    },
    macrosSection: {
        paddingTop: 16,
        paddingBottom: 16,
    },
    macrosDivider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        width: '100%',
        marginLeft: -25,
        marginRight: -25,
        marginTop: 0,
        marginBottom: 16,
    },
    macrosRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '98%',
    },
    macrosCalories: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
    },
    macrosSeparator: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: 'rgba(37, 37, 37, 0.5)',
        marginHorizontal: 4,
    },
    macrosMacroItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    macrosMacroDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    macrosMacroText: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
    },
    macrosMacroLetter: {
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
        fontFamily: fonts.regular,
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
    macroLetter: {
        textTransform: 'uppercase',
    },
    foodCardRight: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    foodCardCalories: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 8,
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
});

