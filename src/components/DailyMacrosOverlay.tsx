import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Easing,
    ScrollView,
    Dimensions,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';
import { FoodItem } from '../services/foodService';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface LoggedFoodEntry {
    id: string;
    food: FoodItem;
    loggedAt: Date;
    meal: MealType;
    portion?: string;
}

interface DailyMacrosOverlayProps {
    visible: boolean;
    onClose: () => void;
    foods: LoggedFoodEntry[];
    totals: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    };
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export const DailyMacrosOverlay: React.FC<DailyMacrosOverlayProps> = ({
    visible,
    onClose,
    foods,
    totals,
}) => {
    const insets = useSafeAreaInsets();

    // Animation refs - slide up from bottom
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

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

    // Group foods by meal
    const meals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
    const mealLabels: Record<MealType, { label: string; icon: string; color: string }> = {
        breakfast: { label: 'breakfast', icon: 'sunny-outline', color: '#FFD700' },
        lunch: { label: 'lunch', icon: 'partly-sunny-outline', color: '#FF8C42' },
        dinner: { label: 'dinner', icon: 'moon-outline', color: '#4463F7' },
        snack: { label: 'snacks', icon: 'cafe-outline', color: '#26F170' },
    };

    const foodsByMeal = meals.reduce((acc, meal) => {
        acc[meal] = foods
            .filter(entry => entry.meal === meal)
            .sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime());
        return acc;
    }, {} as Record<MealType, LoggedFoodEntry[]>);

    // Calculate totals per meal
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

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
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
                                    <Text style={styles.headerTitle}>today's food log</Text>
                                    <Text style={styles.headerStats}>
                                        {Math.round(totals.calories)} kcal
                                    </Text>
                                </View>
                                <View style={styles.headerRight} />
                            </View>
                        </View>

                        {/* Header divider */}
                        <View style={styles.headerDivider} />

                        {/* Daily Totals */}
                        <View style={styles.dailyTotalsContainer}>
                            <View style={styles.dailyTotalsRow}>
                                <View style={styles.dailyTotalItem}>
                                    <View style={[styles.macroDot, styles.proteinDot]} />
                                    <Text style={styles.dailyTotalLabel}>
                                        <Text style={styles.dailyTotalLetter}>P</Text> {Math.round(totals.protein)}g
                                    </Text>
                                </View>
                                <Text style={styles.dailyTotalSeparator}>|</Text>
                                <View style={styles.dailyTotalItem}>
                                    <View style={[styles.macroDot, styles.carbsDot]} />
                                    <Text style={styles.dailyTotalLabel}>
                                        <Text style={styles.dailyTotalLetter}>C</Text> {Math.round(totals.carbs)}g
                                    </Text>
                                </View>
                                <Text style={styles.dailyTotalSeparator}>|</Text>
                                <View style={styles.dailyTotalItem}>
                                    <View style={[styles.macroDot, styles.fatsDot]} />
                                    <Text style={styles.dailyTotalLabel}>
                                        <Text style={styles.dailyTotalLetter}>F</Text> {Math.round(totals.fats)}g
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.contentInnerView}>
                            {/* Foods List by Meal */}
                            <ScrollView
                                style={styles.scrollView}
                                contentContainerStyle={styles.scrollContent}
                                showsVerticalScrollIndicator={false}
                            >
                                {foods.length === 0 ? (
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyText}>no foods logged yet</Text>
                                    </View>
                                ) : (
                                    meals.map((meal) => {
                                        const mealFoods = foodsByMeal[meal];
                                        const mealTotal = mealTotals[meal];
                                        const mealInfo = mealLabels[meal];

                                        if (mealFoods.length === 0) return null;

                                        return (
                                            <View key={meal} style={styles.mealSection}>
                                                <View style={styles.mealSectionHeader}>
                                                    <View style={styles.mealSectionHeaderLeft}>
                                                        <Ionicons name={mealInfo.icon as any} size={20} color={mealInfo.color} />
                                                        <Text style={styles.mealSectionTitle}>{mealInfo.label}</Text>
                                                    </View>
                                                    <Text style={styles.mealSectionTotal}>
                                                        {Math.round(mealTotal.calories)} kcal
                                                    </Text>
                                                </View>
                                                <View style={styles.mealFoodsList}>
                                                    {mealFoods.map((entry) => (
                                                        <View key={entry.id} style={styles.foodItem}>
                                                            <View style={styles.foodItemLeft}>
                                                                <Text style={styles.foodItemName}>{entry.food.name}</Text>
                                                                {entry.portion && (
                                                                    <Text style={styles.foodItemPortion}>{entry.portion}</Text>
                                                                )}
                                                                <View style={styles.foodItemMacros}>
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
                                                            <View style={styles.foodItemRight}>
                                                                <Text style={styles.foodItemCalories}>{entry.food.calories} kcal</Text>
                                                                <Text style={styles.foodItemTime}>{formatTime(entry.loggedAt)}</Text>
                                                                <Text style={styles.foodItemTimeAgo}>{getTimeAgo(entry.loggedAt)}</Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        );
                                    })
                                )}
                            </ScrollView>
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
        flex: 1,
        backgroundColor: '#fff',
    },
    contentInner: {
        flex: 1,
    },
    headerContainer: {
        paddingHorizontal: 25,
        paddingTop: 12,
        paddingBottom: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    headerTitle: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    headerStats: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginTop: 2,
    },
    headerRight: {
        width: 40,
    },
    headerDivider: {
        height: 2,
        backgroundColor: '#E0E0E0',
        marginTop: 8,
    },
    dailyTotalsContainer: {
        paddingHorizontal: 25,
        paddingVertical: 16,
        borderBottomWidth: 2,
        borderBottomColor: '#E0E0E0',
    },
    dailyTotalsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    dailyTotalItem: {
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
    dailyTotalLabel: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
    },
    dailyTotalLetter: {
        textTransform: 'uppercase',
    },
    dailyTotalSeparator: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: 'rgba(37, 37, 37, 0.5)',
    },
    contentInnerView: {
        flex: 1,
        paddingHorizontal: 25,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 16,
        paddingBottom: 100,
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
    mealSection: {
        marginBottom: 24,
    },
    mealSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    mealSectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    mealSectionTitle: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    mealSectionTotal: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
    },
    mealFoodsList: {
        gap: 12,
    },
    foodItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2.5,
        borderColor: '#252525',
    },
    foodItemLeft: {
        flex: 1,
        marginRight: 16,
    },
    foodItemName: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 4,
    },
    foodItemPortion: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginBottom: 8,
    },
    foodItemMacros: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
    },
    macroItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    macroText: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
    foodItemRight: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    foodItemCalories: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 4,
    },
    foodItemTime: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#252525',
        marginBottom: 2,
    },
    foodItemTimeAgo: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
});

