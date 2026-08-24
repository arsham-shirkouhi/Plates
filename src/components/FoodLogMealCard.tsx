import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Reanimated, {
    Easing as ReanimatedEasing,
    Extrapolation,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { fonts } from '../constants/fonts';
import { LoggedFoodEntry, MacroTotals } from '../food/types';

const EXPAND_MS = 180;
const SIZE_MS = 140;
const DOUBLE_TAP_DELAY = 300;
const COMPACT_FOODS_HEIGHT = 130;
const COMPACT_EMPTY_HEIGHT = 100;
const expandEasing = ReanimatedEasing.out(ReanimatedEasing.cubic);

interface FoodLogMealCardProps {
    label: string;
    foods: LoggedFoodEntry[];
    mealTotal: MacroTotals;
    showMacros: boolean;
    macroOpacity?: Animated.Value;
    isMaximized: boolean;
    newlyAddedFoodIds: Set<string>;
    getTimeAgo: (date: Date) => string;
    onToggleMaximize: () => void;
    onAddFood: () => void;
    onEditFood: (entry: LoggedFoodEntry) => void;
}

export const FoodLogMealCard: React.FC<FoodLogMealCardProps> = ({
    label,
    foods,
    mealTotal,
    showMacros,
    macroOpacity,
    isMaximized,
    newlyAddedFoodIds,
    getTimeAgo,
    onToggleMaximize,
    onAddFood,
    onEditFood,
}) => {
    const lastTapRef = useRef(0);
    const expandProgress = useSharedValue(isMaximized ? 1 : 0);
    const compactHeight = useSharedValue(foods.length > 0 ? COMPACT_FOODS_HEIGHT : COMPACT_EMPTY_HEIGHT);
    const expandedHeight = useSharedValue(foods.length > 0 ? COMPACT_FOODS_HEIGHT : COMPACT_EMPTY_HEIGHT);

    useEffect(() => {
        expandProgress.value = withTiming(isMaximized ? 1 : 0, {
            duration: EXPAND_MS,
            easing: expandEasing,
        });
    }, [expandProgress, isMaximized]);

    const bodyStyle = useAnimatedStyle(() => ({
        height: interpolate(
            expandProgress.value,
            [0, 1],
            [compactHeight.value, Math.max(expandedHeight.value, compactHeight.value)]
        ),
        overflow: 'hidden',
        width: '100%',
    }));

    const compactLayerStyle = useAnimatedStyle(() => ({
        opacity: interpolate(expandProgress.value, [0, 0.55], [1, 0], Extrapolation.CLAMP),
    }));

    const expandedLayerStyle = useAnimatedStyle(() => ({
        opacity: interpolate(expandProgress.value, [0.35, 1], [0, 1], Extrapolation.CLAMP),
    }));

    const chevronStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${interpolate(expandProgress.value, [0, 1], [0, 90])}deg` }],
    }));

    const handleHeaderPress = () => {
        onToggleMaximize();
    };

    const handleDoubleTapAdd = () => {
        const now = Date.now();
        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            onAddFood();
            lastTapRef.current = 0;
            return;
        }
        lastTapRef.current = now;
    };

    const recentFoods = foods.slice(0, 3);
    const remainingCount = foods.length - 3;

    return (
        <View style={styles.mealCard}>
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleHeaderPress}
                style={styles.mealCardHeader}
                accessibilityRole="button"
                accessibilityLabel={isMaximized ? `Collapse ${label}` : `Expand ${label}`}
            >
                <View style={styles.mealCardHeaderTop}>
                    <Text style={styles.mealCardLabel}>{label}</Text>
                    <Reanimated.View style={chevronStyle}>
                        <Ionicons name="chevron-forward" size={20} color="#252525" />
                    </Reanimated.View>
                </View>
                {showMacros && (
                    <Animated.View style={{ opacity: macroOpacity ?? 1 }}>
                        <View style={styles.mealCardDivider} />
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

            <View style={styles.mealCardDivider} />

            <Reanimated.View style={bodyStyle}>
                <Reanimated.View
                    pointerEvents={isMaximized ? 'none' : 'auto'}
                    style={[styles.layer, compactLayerStyle]}
                    onLayout={(event) => {
                        const measured = event.nativeEvent.layout.height;
                        if (measured <= 0) return;
                        compactHeight.value = measured;
                    }}
                >
                    {foods.length > 0 ? (
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={handleDoubleTapAdd}
                            style={styles.mealFoodsContainer}
                        >
                            {recentFoods.map((entry, index) => (
                                <FoodItemRow
                                    key={entry.id}
                                    entry={entry}
                                    timeAgo={getTimeAgo(entry.loggedAt)}
                                    index={index}
                                    isNewlyAdded={newlyAddedFoodIds.has(entry.id)}
                                    isLast={index === recentFoods.length - 1}
                                    onEdit={() => onEditFood(entry)}
                                />
                            ))}
                            {remainingCount > 0 && (
                                <TouchableOpacity activeOpacity={0.7} onPress={onToggleMaximize}>
                                    <Text style={styles.moreItemsText}>+{remainingCount} more</Text>
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={handleDoubleTapAdd}
                            style={styles.mealEmptyState}
                        >
                            <Text style={styles.mealEmptyStateSubtext}>double tap to log meal</Text>
                        </TouchableOpacity>
                    )}
                </Reanimated.View>

                <Reanimated.View
                    pointerEvents={isMaximized ? 'auto' : 'none'}
                    style={[styles.expandedLayer, expandedLayerStyle]}
                    onLayout={(event) => {
                        const measured = event.nativeEvent.layout.height;
                        if (measured <= 0) return;
                        if (isMaximized && Math.abs(expandedHeight.value - measured) > 1) {
                            expandedHeight.value = withTiming(measured, {
                                duration: SIZE_MS,
                                easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
                            });
                            return;
                        }
                        if (!isMaximized) {
                            expandedHeight.value = measured;
                        }
                    }}
                >
                    {foods.length > 0 ? (
                        <View style={styles.expandedFoods}>
                            {foods.map((entry, index) => (
                                <FoodItemRow
                                    key={entry.id}
                                    entry={entry}
                                    timeAgo={getTimeAgo(entry.loggedAt)}
                                    index={index}
                                    isNewlyAdded={newlyAddedFoodIds.has(entry.id)}
                                    isLast={index === foods.length - 1}
                                    onEdit={() => onEditFood(entry)}
                                />
                            ))}
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={onAddFood}
                                style={styles.addFoodRow}
                            >
                                <Ionicons name="add" size={18} color="#252525" />
                                <Text style={styles.addFoodRowText}>add food</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.expandedEmpty}>
                            <Text style={styles.mealEmptyStateSubtext}>nothing logged yet</Text>
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={onAddFood}
                                style={styles.addFoodRow}
                            >
                                <Ionicons name="add" size={18} color="#252525" />
                                <Text style={styles.addFoodRowText}>add food</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </Reanimated.View>
            </Reanimated.View>
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
    }, [isNewlyAdded, itemOpacity, itemTranslateY]);

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

const styles = StyleSheet.create({
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
    layer: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        width: '100%',
    },
    expandedLayer: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
    },
    mealFoodsContainer: {
        paddingHorizontal: 15,
        paddingTop: 8,
        paddingBottom: 0,
        width: '100%',
        height: COMPACT_FOODS_HEIGHT,
    },
    expandedFoods: {
        paddingHorizontal: 15,
        paddingTop: 8,
        paddingBottom: 8,
        width: '100%',
    },
    expandedEmpty: {
        paddingHorizontal: 15,
        paddingTop: 28,
        paddingBottom: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: COMPACT_EMPTY_HEIGHT,
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
        minHeight: COMPACT_EMPTY_HEIGHT,
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
    addFoodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 12,
        marginTop: 4,
    },
    addFoodRowText: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
});
