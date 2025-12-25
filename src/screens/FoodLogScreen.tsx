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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';
import { AddFoodBottomSheet } from '../components/AddFoodBottomSheet';
import { MacroStatusCompact, MacroStatusCompactRef } from '../components/MacroStatusCompact';
import { FoodItem, getQuickAddItems, searchFoods } from '../services/foodService';
import { getDailyMacroLog, addToDailyMacroLog, subtractFromDailyMacroLog, getTodayDateString, getUserProfile } from '../services/userService';
import { useAddFood } from '../context/AddFoodContext';
import { useAuth } from '../context/AuthContext';

type FoodLogScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'FoodLog'>;

interface LoggedFoodEntry {
    id: string;
    food: FoodItem;
    loggedAt: Date;
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
    const swipeAnimations = useRef<Map<string, Animated.Value>>(new Map()).current;
    const scrollViewRef = useRef<ScrollView>(null);
    const macroStatusRef = useRef<MacroStatusCompactRef>(null);

    // Load today's logged foods (in a real app, this would come from storage/API)
    useEffect(() => {
        // For now, we'll start with an empty list
        // In production, load from AsyncStorage or API
    }, []);

    // Load target macros
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

    const handleAddFood = (food: FoodItem) => {
        const newEntry: LoggedFoodEntry = {
            id: Date.now().toString(),
            food,
            loggedAt: new Date(),
            portion: '1 serving',
        };
        setLoggedFoods(prev => [newEntry, ...prev].sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime()));
        setShowAddSheet(false);
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

    const handleRemoveFood = (entryId: string) => {
        setLoggedFoods(prev => prev.filter(e => e.id !== entryId));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const formatTime = (date: Date): string => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
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

    const getDominantMacro = (food: FoodItem): 'protein' | 'carbs' | 'fats' => {
        const proteinCal = food.protein * 4;
        const carbsCal = food.carbs * 4;
        const fatsCal = food.fats * 9;

        if (proteinCal >= carbsCal && proteinCal >= fatsCal) return 'protein';
        if (carbsCal >= fatsCal) return 'carbs';
        return 'fats';
    };

    const getMacroColor = (macro: 'protein' | 'carbs' | 'fats'): string => {
        switch (macro) {
            case 'protein': return '#FF6B6B';
            case 'carbs': return '#4ECDC4';
            case 'fats': return '#FFE66D';
            default: return '#E0E0E0';
        }
    };

    // Calculate totals
    const totals = loggedFoods.reduce((acc, entry) => ({
        calories: acc.calories + entry.food.calories,
        protein: acc.protein + entry.food.protein,
        carbs: acc.carbs + entry.food.carbs,
        fats: acc.fats + entry.food.fats,
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

    // Generate insights
    const getInsights = (): string[] => {
        const insights: string[] = [];
        if (totals.protein < 50 && loggedFoods.length > 2) {
            insights.push('protein low so far today');
        }
        if (totals.calories > 0 && loggedFoods.length > 0) {
            const eveningEntries = loggedFoods.filter(e => e.loggedAt.getHours() >= 18).length;
            if (eveningEntries > loggedFoods.length / 2) {
                insights.push('most calories logged after 6pm');
            }
        }
        return insights;
    };

    const insights = getInsights();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Macro Status Compact - Fixed at top */}
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

            {/* Content */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                onScrollBeginDrag={() => {
                    // Collapse macro status on scroll
                    macroStatusRef.current?.collapse();
                    setExpandedId(null);
                }}
                scrollEventThrottle={16}
            >
                {loggedFoods.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>what did you have today?</Text>
                        <View style={styles.quickAddContainer}>
                            {getQuickAddItems().slice(0, 6).map((food) => (
                                <TouchableOpacity
                                    key={food.id}
                                    style={styles.quickAddChip}
                                    onPress={() => handleAddFood(food)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.quickAddText}>{food.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ) : (
                    <>
                        {/* Now indicator */}
                        <View style={styles.nowIndicator}>
                            <View style={styles.nowDot} />
                            <Text style={styles.nowText}>now</Text>
                        </View>

                        {/* Timeline */}
                        {loggedFoods.map((entry, index) => {
                            const dominantMacro = getDominantMacro(entry.food);
                            const macroColor = getMacroColor(dominantMacro);
                            const isExpanded = expandedId === entry.id;

                            return (
                                <React.Fragment key={entry.id}>
                                    {/* Insight chip before entry if applicable */}
                                    {index > 0 && insights.length > 0 && index % 3 === 0 && (
                                        <View style={styles.insightChip}>
                                            <Text style={styles.insightText}>{insights[0]}</Text>
                                        </View>
                                    )}

                                    {/* Food Card */}
                                    <FoodCard
                                        entry={entry}
                                        formatTime={formatTime}
                                        getTimeAgo={getTimeAgo}
                                        dominantMacro={dominantMacro}
                                        macroColor={macroColor}
                                        isExpanded={isExpanded}
                                        onToggleExpand={() => setExpandedId(isExpanded ? null : entry.id)}
                                        onDelete={() => handleRemoveFood(entry.id)}
                                    />
                                </React.Fragment>
                            );
                        })}
                    </>
                )}
            </ScrollView>

            {/* Floating Action Button */}
            <FloatingActionButton
                onPress={() => setShowAddSheet(true)}
                style={{ bottom: insets.bottom + 20 }}
            />

            {/* Add Food Sheet */}
            <AddFoodBottomSheet
                visible={showAddSheet}
                onClose={() => setShowAddSheet(false)}
                onAddFood={handleAddFood}
                quickAddItems={getQuickAddItems()}
            />
        </View>
    );
};

interface FoodCardProps {
    entry: LoggedFoodEntry;
    formatTime: (date: Date) => string;
    getTimeAgo: (date: Date) => string;
    dominantMacro: 'protein' | 'carbs' | 'fats';
    macroColor: string;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onDelete: () => void;
}

const FoodCard: React.FC<FoodCardProps> = ({
    entry,
    formatTime,
    getTimeAgo,
    dominantMacro,
    macroColor,
    isExpanded,
    onToggleExpand,
    onDelete,
}) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const cardOpacity = useRef(new Animated.Value(1)).current;
    const expandHeight = useRef(new Animated.Value(0)).current;
    const entranceAnim = useRef(new Animated.Value(0)).current;
    const hasAnimated = useRef(false);

    // Entrance animation - only once when card first appears
    useEffect(() => {
        if (!hasAnimated.current) {
            hasAnimated.current = true;
            entranceAnim.setValue(-20);
            Animated.spring(entranceAnim, {
                toValue: 0,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }).start();
        }
    }, []);
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 10;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dx > 0) {
                    // Swipe right - edit
                    translateX.setValue(Math.min(gestureState.dx, 80));
                } else {
                    // Swipe left - delete
                    translateX.setValue(Math.max(gestureState.dx, -80));
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dx > 50) {
                    // Swipe right - edit
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Alert.alert('Edit', 'Edit functionality coming soon');
                    Animated.spring(translateX, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                } else if (gestureState.dx < -50) {
                    // Swipe left - delete
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Animated.parallel([
                        Animated.timing(translateX, {
                            toValue: -SCREEN_WIDTH,
                            duration: 300,
                            easing: Easing.out(Easing.cubic),
                            useNativeDriver: true,
                        }),
                        Animated.timing(cardOpacity, {
                            toValue: 0,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                    ]).start(() => {
                        onDelete();
                    });
                } else {
                    // Snap back
                    Animated.spring(translateX, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        Animated.timing(expandHeight, {
            toValue: isExpanded ? 1 : 0,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [isExpanded]);

    return (
        <Animated.View
            style={[
                styles.foodCardContainer,
                {
                    opacity: cardOpacity,
                    transform: [
                        { translateX },
                        { translateY: entranceAnim },
                    ],
                },
            ]}
        >
            <Animated.View
                style={[styles.foodCard, { borderLeftColor: macroColor }]}
                {...panResponder.panHandlers}
            >
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={onToggleExpand}
                    style={styles.cardContent}
                >
                    {/* Time */}
                    <View style={styles.timeContainer}>
                        <Text style={styles.timeText}>{formatTime(entry.loggedAt)}</Text>
                        <Text style={styles.timeAgoText}>{getTimeAgo(entry.loggedAt)}</Text>
                    </View>

                    {/* Main Content */}
                    <View style={styles.cardMain}>
                        <View style={styles.foodInfo}>
                            <Text style={styles.foodName}>{entry.food.name}</Text>
                            {entry.portion && (
                                <Text style={styles.portionText}>{entry.portion}</Text>
                            )}
                        </View>

                        <View style={styles.macroInfo}>
                            <Text style={styles.caloriesText}>{entry.food.calories} kcal</Text>
                            <View style={styles.macroPills}>
                                <View style={[styles.macroPill, dominantMacro === 'protein' && styles.macroPillActive]}>
                                    <Text style={styles.macroPillText}>P {entry.food.protein}g</Text>
                                </View>
                                <View style={[styles.macroPill, dominantMacro === 'carbs' && styles.macroPillActive]}>
                                    <Text style={styles.macroPillText}>C {entry.food.carbs}g</Text>
                                </View>
                                <View style={[styles.macroPill, dominantMacro === 'fats' && styles.macroPillActive]}>
                                    <Text style={styles.macroPillText}>F {entry.food.fats}g</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Expanded Details */}
                <Animated.View
                    style={[
                        styles.expandedContent,
                        {
                            maxHeight: expandHeight.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 200],
                            }),
                            opacity: expandHeight,
                        },
                    ]}
                >
                    <View style={styles.expandedDetails}>
                        <Text style={styles.expandedTitle}>nutrition details</Text>
                        <View style={styles.expandedMacros}>
                            <View style={styles.expandedMacroRow}>
                                <Text style={styles.expandedMacroLabel}>protein</Text>
                                <Text style={styles.expandedMacroValue}>{entry.food.protein}g</Text>
                            </View>
                            <View style={styles.expandedMacroRow}>
                                <Text style={styles.expandedMacroLabel}>carbs</Text>
                                <Text style={styles.expandedMacroValue}>{entry.food.carbs}g</Text>
                            </View>
                            <View style={styles.expandedMacroRow}>
                                <Text style={styles.expandedMacroLabel}>fats</Text>
                                <Text style={styles.expandedMacroValue}>{entry.food.fats}g</Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>
            </Animated.View>
        </Animated.View>
    );
};

interface FloatingActionButtonProps {
    onPress: () => void;
    style?: any;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onPress, style }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.9,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    return (
        <TouchableOpacity
            activeOpacity={1}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[styles.fab, style]}
        >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Ionicons name="add" size={32} color="#fff" />
            </Animated.View>
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
        justifyContent: 'space-between',
        paddingHorizontal: 25,
        paddingVertical: 12,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    headerSubtext: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 25,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 16,
        paddingHorizontal: 25,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginBottom: 24,
    },
    quickAddContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
    },
    quickAddChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#F5F5F5',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    quickAddText: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
    },
    nowIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        marginLeft: 4,
    },
    nowDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#526EFF',
        marginRight: 8,
    },
    nowText: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: '#526EFF',
        textTransform: 'lowercase',
    },
    insightChip: {
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        marginBottom: 12,
        marginLeft: 4,
        alignSelf: 'flex-start',
    },
    insightText: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: '#666',
        textTransform: 'lowercase',
    },
    foodCardContainer: {
        marginBottom: 16,
    },
    foodCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#252525',
        borderLeftWidth: 4,
        overflow: 'hidden',
    },
    cardContent: {
        padding: 16,
    },
    timeContainer: {
        marginBottom: 12,
    },
    timeText: {
        fontSize: 14,
        fontFamily: fonts.bold,
        color: '#252525',
    },
    timeAgoText: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginTop: 2,
    },
    cardMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    foodInfo: {
        flex: 1,
        marginRight: 12,
    },
    foodName: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 4,
    },
    portionText: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
    macroInfo: {
        alignItems: 'flex-end',

    },
    caloriesText: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        marginBottom: 8,
    },
    macroPills: {
        flexDirection: 'row',
        gap: 6,
    },
    macroPill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    macroPillActive: {
        backgroundColor: '#E8F4F8',
        borderColor: '#526EFF',
    },
    macroPillText: {
        fontSize: 11,
        fontFamily: fonts.regular,
        color: '#252525',
    },
    expandedContent: {
        overflow: 'hidden',
    },
    expandedDetails: {
        padding: 16,
        paddingTop: 0,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    expandedTitle: {
        fontSize: 14,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 12,
    },
    expandedMacros: {
        gap: 8,
    },
    expandedMacroRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    expandedMacroLabel: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
    expandedMacroValue: {
        fontSize: 14,
        fontFamily: fonts.bold,
        color: '#252525',
    },
    fab: {
        position: 'absolute',
        right: 25,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#526EFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
});

