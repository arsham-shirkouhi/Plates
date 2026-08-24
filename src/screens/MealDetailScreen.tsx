import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';
import { Button } from '../components/Button';
import { AddFoodBottomSheet } from '../components/AddFoodBottomSheet';
import { EditFoodBottomSheet } from '../components/EditFoodBottomSheet';
import { ScrollingGridBackground } from '../components/ScrollingGridBackground';
import { FoodItem, getQuickAddItems } from '../services/foodService';
import { useFoodLog } from '../context/FoodLogContext';
import { LoggedFoodEntry, MealType } from '../food/types';
import { formatTimeAgo, groupFoodsByMeal, sumMacros } from '../food/foodLogSelectors';

type MealDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MealDetail'>;
type MealDetailScreenRouteProp = RouteProp<RootStackParamList, 'MealDetail'>;

const MEAL_META: Record<MealType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
    breakfast: { label: 'breakfast', icon: 'sunny-outline', color: '#FFD700' },
    lunch: { label: 'lunch', icon: 'partly-sunny-outline', color: '#FF8C42' },
    dinner: { label: 'dinner', icon: 'moon-outline', color: '#4463F7' },
    snack: { label: 'snacks', icon: 'cafe-outline', color: '#26F170' },
};

export const MealDetailScreen: React.FC = () => {
    const navigation = useNavigation<MealDetailScreenNavigationProp>();
    const route = useRoute<MealDetailScreenRouteProp>();
    const insets = useSafeAreaInsets();
    const { entries, addFood, updateFood, removeFood, now } = useFoodLog();

    const { meal } = route.params;
    const foods = groupFoodsByMeal(entries)[meal];
    const [showAddSheet, setShowAddSheet] = useState(false);
    const [showEditSheet, setShowEditSheet] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<LoggedFoodEntry | null>(null);
    const [selectedMeal, setSelectedMeal] = useState<MealType>(meal);

    const mealInfo = MEAL_META[meal];
    const mealTotal = sumMacros(foods);
    const sortedFoods = [...foods].sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime());

    const openAddSheet = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowAddSheet(true);
    };

    const handleAddFood = (food: FoodItem, assignedMeal?: MealType | null) => {
        addFood(food, { meal: assignedMeal || selectedMeal });
        setShowAddSheet(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleRemoveFood = (entryId: string) => {
        removeFood(entryId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const handleUpdateFood = (
        entryId: string,
        updatedFood: FoodItem,
        servingSize: string,
        numberOfServings: string,
        nextMeal: MealType
    ) => {
        updateFood(entryId, {
            food: updatedFood,
            meal: nextMeal,
            portion: `${numberOfServings} ${servingSize}`,
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleEditFood = (entry: LoggedFoodEntry) => {
        setSelectedEntry(entry);
        setShowEditSheet(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    return (
        <View style={styles.container}>
            <ScrollingGridBackground />

            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    accessibilityLabel="Back to food log"
                >
                    <Ionicons name="chevron-back" size={24} color="#252525" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{mealInfo.label}</Text>
                    <Text style={styles.headerMeta}>
                        {foods.length} {foods.length === 1 ? 'item' : 'items'}
                    </Text>
                </View>
                <View style={styles.backButton} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.hero}>
                    <Text style={styles.heroKcal}>{Math.round(mealTotal.calories)}</Text>
                    <Text style={styles.heroKcalLabel}>kcal</Text>
                    <MacroSplit
                        protein={mealTotal.protein}
                        carbs={mealTotal.carbs}
                        fats={mealTotal.fats}
                        height={8}
                    />
                    <View style={styles.heroMacros}>
                        <MacroLegend color="#26F170" label="P" value={mealTotal.protein} />
                        <MacroLegend color="#FFD700" label="C" value={mealTotal.carbs} />
                        <MacroLegend color="#FF5151" label="F" value={mealTotal.fats} />
                    </View>
                </View>

                <View style={styles.listCard}>
                    {sortedFoods.length > 0 ? (
                        sortedFoods.map((entry, index) => (
                            <FoodBlock
                                key={entry.id}
                                entry={entry}
                                timeAgo={formatTimeAgo(entry.loggedAt, now)}
                                isLast={index === sortedFoods.length - 1}
                                onPress={() => handleEditFood(entry)}
                            />
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name={mealInfo.icon} size={28} color={mealInfo.color} />
                            <Text style={styles.emptyTitle}>nothing logged</Text>
                            <Text style={styles.emptySub}>add food to start this meal</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
                <Button title="add food" onPress={openAddSheet} containerStyle={styles.addButton} />
            </View>

            <AddFoodBottomSheet
                visible={showAddSheet}
                onClose={() => setShowAddSheet(false)}
                onAddFood={handleAddFood}
                quickAddItems={getQuickAddItems()}
                initialMeal={selectedMeal}
                onMealChange={(nextMeal) => {
                    if (nextMeal) setSelectedMeal(nextMeal);
                }}
            />

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

const MacroSplit: React.FC<{ protein: number; carbs: number; fats: number; height: number }> = ({
    protein,
    carbs,
    fats,
    height,
}) => {
    const total = Math.max(protein + carbs + fats, 0);
    if (total <= 0) {
        return <View style={[styles.splitTrack, { height }]} />;
    }
    return (
        <View style={[styles.splitTrack, { height }]}>
            <View style={[styles.splitSeg, { flex: protein, backgroundColor: '#26F170' }]} />
            <View style={[styles.splitSeg, { flex: carbs, backgroundColor: '#FFD700' }]} />
            <View style={[styles.splitSeg, { flex: fats, backgroundColor: '#FF5151' }]} />
        </View>
    );
};

const MacroLegend: React.FC<{ color: string; label: string; value: number }> = ({ color, label, value }) => (
    <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: color }]} />
        <Text style={styles.legendText}>
            <Text style={styles.legendLetter}>{label}</Text> {Math.round(value)}g
        </Text>
    </View>
);

interface FoodBlockProps {
    entry: LoggedFoodEntry;
    timeAgo: string;
    isLast: boolean;
    onPress: () => void;
}

const FoodBlock: React.FC<FoodBlockProps> = ({ entry, timeAgo, isLast, onPress }) => {
    const meta = [entry.portion, timeAgo].filter(Boolean).join(' · ');

    return (
        <TouchableOpacity
            style={[styles.foodBlock, !isLast && styles.foodBlockBorder]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.foodTop}>
                <View style={styles.foodCopy}>
                    <Text style={styles.foodName} numberOfLines={1}>{entry.food.name}</Text>
                    {meta ? <Text style={styles.foodMeta} numberOfLines={1}>{meta}</Text> : null}
                </View>
                <Text style={styles.foodKcal}>{entry.food.calories}</Text>
            </View>
            <MacroSplit
                protein={entry.food.protein}
                carbs={entry.food.carbs}
                fats={entry.food.fats}
                height={5}
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    backButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: '#252525',
        textTransform: 'lowercase',
    },
    headerMeta: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: '#9E9E9E',
        marginTop: 1,
        textTransform: 'lowercase',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 24,
    },
    hero: {
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 8,
    },
    heroKcal: {
        fontFamily: fonts.bold,
        fontSize: 56,
        color: '#252525',
        lineHeight: 60,
    },
    heroKcalLabel: {
        fontFamily: fonts.regular,
        fontSize: 16,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginTop: -2,
        marginBottom: 14,
    },
    heroMacros: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        marginTop: 12,
    },
    splitTrack: {
        width: '100%',
        flexDirection: 'row',
        borderRadius: 999,
        overflow: 'hidden',
        backgroundColor: '#EFEFEF',
    },
    splitSeg: {
        height: '100%',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    legendText: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: '#252525',
        textTransform: 'lowercase',
    },
    legendLetter: {
        fontFamily: fonts.bold,
        textTransform: 'uppercase',
    },
    listCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 2.5,
        borderColor: '#252525',
        overflow: 'hidden',
    },
    foodBlock: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 10,
    },
    foodBlockBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#C8C8C8',
    },
    foodTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
    },
    foodCopy: {
        flex: 1,
    },
    foodName: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: '#252525',
        textTransform: 'lowercase',
    },
    foodMeta: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: '#9E9E9E',
        marginTop: 3,
        textTransform: 'lowercase',
    },
    foodKcal: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: '#526EFF',
    },
    emptyState: {
        paddingVertical: 48,
        paddingHorizontal: 24,
        alignItems: 'center',
        gap: 8,
    },
    emptyTitle: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: '#252525',
        textTransform: 'lowercase',
        marginTop: 8,
    },
    emptySub: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        textAlign: 'center',
    },
    bottomBar: {
        paddingHorizontal: 20,
        paddingTop: 12,
        backgroundColor: '#fff',
    },
    addButton: {
        width: '100%',
    },
});
