import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    Animated,
    Dimensions,
    Keyboard,
    Platform,
    ScrollView,
    PanResponder,
    KeyboardAvoidingView,
    Easing,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/fonts';
import * as Haptics from 'expo-haptics';
import { searchFoods } from '../services/foodService';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.58; // 58% of screen height
const SHEET_HEIGHT_EXPANDED = SCREEN_HEIGHT * 0.75; // 75% when searching
const TOASTER_OFFSET = 50; // Extra offset to start from below (like toast in toaster)
const TOP_SECTION_HEIGHT = 180; // Height of handle bar + search + buttons area

interface FoodItem {
    id: string;
    name: string;
    calories: number;
    protein: number; // grams
    carbs: number; // grams
    fats: number; // grams
}

interface AddFoodBottomSheetProps {
    visible: boolean;
    onClose: () => void;
    onAddFood: (food: FoodItem) => void;
    onRemoveFood?: (food: FoodItem) => void;
    quickAddItems?: FoodItem[];
    onMealChange?: (meal: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null) => void;
    initialMeal?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null;
}

export const AddFoodBottomSheet: React.FC<AddFoodBottomSheetProps> = ({
    visible,
    onClose,
    onAddFood,
    onRemoveFood,
    quickAddItems = [],
    onMealChange,
    initialMeal = null,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
    const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
    const [showUndoToast, setShowUndoToast] = useState(false);
    const [lastAddedFood, setLastAddedFood] = useState<FoodItem | null>(null);
    const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);
    // Function to determine meal based on time of day
    const getMealByTime = (): 'breakfast' | 'lunch' | 'dinner' | null => {
        const now = new Date();
        const hour = now.getHours();
        
        // Breakfast: 6 AM - 11 AM
        if (hour >= 6 && hour < 11) {
            return 'breakfast';
        }
        // Lunch: 11 AM - 3 PM
        else if (hour >= 11 && hour < 15) {
            return 'lunch';
        }
        // Dinner: 5 PM - 10 PM
        else if (hour >= 17 && hour < 22) {
            return 'dinner';
        }
        // Outside meal times, return null (no auto-select)
        return null;
    };

    const [selectedMeal, setSelectedMeal] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack' | null>(initialMeal || null);
    
    // Update selected meal when sheet opens or initialMeal prop changes
    useEffect(() => {
        if (visible) {
            // Use initialMeal if provided, otherwise auto-select based on time
            const mealToSelect = initialMeal !== undefined && initialMeal !== null 
                ? initialMeal 
                : getMealByTime();
            setSelectedMeal(mealToSelect);
            if (onMealChange && mealToSelect) {
                onMealChange(mealToSelect);
            }
        }
    }, [visible, initialMeal]);

    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT + TOASTER_OFFSET)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const searchInputRef = useRef<TextInput>(null);
    const keyboardHeightAnim = useRef(new Animated.Value(0)).current;
    const sheetHeightAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
    const aiSuggestionOpacity = useRef(new Animated.Value(0)).current;
    const aiSuggestionTranslateY = useRef(new Animated.Value(20)).current;
    const skeletonAnim = useRef(new Animated.Value(0)).current;
    const calIconRotate = useRef(new Animated.Value(0)).current;
    const calIconBounce = useRef(new Animated.Value(0)).current;

    // Button press animations
    const scanButtonTranslateY = useRef(new Animated.Value(0)).current;
    const scanButtonShadowHeight = useRef(new Animated.Value(4)).current;
    const photoButtonTranslateY = useRef(new Animated.Value(0)).current;
    const photoButtonShadowHeight = useRef(new Animated.Value(4)).current;
    

    // Pan responder for swipe down gesture - only on top section
    const topSectionPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return gestureState.dy > 10; // Only respond to downward swipes
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    slideAnim.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100 || gestureState.vy > 0.5) {
                    // Swipe down to dismiss
                    handleClose();
                } else {
                    // Snap back
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 100,
                        friction: 8,
                    }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (visible) {
            // Reset added items when opening so quick add items always show
            setAddedItems(new Set());

            // Reset height to default
            sheetHeightAnim.setValue(SHEET_HEIGHT);

            // Toast pop-up animation - matches closing animation
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

            // AI suggestion animation - appears after sheet opens
            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(aiSuggestionOpacity, {
                        toValue: 1,
                        duration: 400,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(aiSuggestionTranslateY, {
                        toValue: 0,
                        duration: 400,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]).start();

                // Start skeleton loading animation
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(skeletonAnim, {
                            toValue: 1,
                            duration: 1000,
                            easing: Easing.inOut(Easing.ease),
                            useNativeDriver: true,
                        }),
                        Animated.timing(skeletonAnim, {
                            toValue: 0,
                            duration: 1000,
                            easing: Easing.inOut(Easing.ease),
                            useNativeDriver: true,
                        }),
                    ])
                ).start();

                // Start cal icon subtle animation - gentle rotation and bounce
                Animated.loop(
                    Animated.parallel([
                        Animated.sequence([
                            Animated.timing(calIconRotate, {
                                toValue: 1,
                                duration: 2000,
                                easing: Easing.inOut(Easing.ease),
                                useNativeDriver: true,
                            }),
                            Animated.timing(calIconRotate, {
                                toValue: 0,
                                duration: 2000,
                                easing: Easing.inOut(Easing.ease),
                                useNativeDriver: true,
                            }),
                        ]),
                        Animated.sequence([
                            Animated.timing(calIconBounce, {
                                toValue: 1,
                                duration: 1200,
                                easing: Easing.inOut(Easing.ease),
                                useNativeDriver: true,
                            }),
                            Animated.timing(calIconBounce, {
                                toValue: 0,
                                duration: 1200,
                                easing: Easing.inOut(Easing.ease),
                                useNativeDriver: true,
                            }),
                        ]),
                    ])
                ).start();
            }, 300);
        } else {
            // Close animation - smooth slide out
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: SCREEN_HEIGHT + TOASTER_OFFSET,
                    duration: 300,
                    easing: Easing.out(Easing.cubic), // Smooth slide out
                    useNativeDriver: true,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 0,
                    duration: 250,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
            // Reset state
            setSearchQuery('');
            setSearchResults([]);
            setAddedItems(new Set()); // Reset added items when closing
            setSelectedMeal(null); // Reset selected meal
            sheetHeightAnim.setValue(SHEET_HEIGHT);
            keyboardHeightAnim.setValue(0);
            aiSuggestionOpacity.setValue(0);
            aiSuggestionTranslateY.setValue(20);
            skeletonAnim.setValue(0);
            calIconRotate.setValue(0);
            calIconBounce.setValue(0);
            Keyboard.dismiss();
        }
    }, [visible]);

    // Animate height when searching
    useEffect(() => {
        const hasSearchResults = searchQuery.trim() !== '' && searchResults.length > 0;
        const targetHeight = hasSearchResults ? SHEET_HEIGHT_EXPANDED : SHEET_HEIGHT;

        Animated.timing(sheetHeightAnim, {
            toValue: targetHeight,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false, // Height animation doesn't support native driver
        }).start();
    }, [searchQuery, searchResults.length]);

    // Handle keyboard show/hide - animate at same speed as keyboard
    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                // Use the keyboard's animation duration to match its speed
                const duration = Platform.OS === 'ios'
                    ? (e.duration || 250)
                    : 250; // Android doesn't provide duration, use default

                Animated.timing(keyboardHeightAnim, {
                    toValue: -e.endCoordinates.height, // Negative to move up (translateY)
                    duration: duration,
                    useNativeDriver: true, // Use native driver for translateY
                }).start();
            }
        );
        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            (e) => {
                // Use the keyboard's animation duration to match its speed
                const duration = Platform.OS === 'ios'
                    ? (e.duration || 250)
                    : 250;

                Animated.timing(keyboardHeightAnim, {
                    toValue: 0,
                    duration: duration,
                    useNativeDriver: true,
                }).start();
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Animate close before calling onClose
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT + TOASTER_OFFSET,
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
            Animated.timing(aiSuggestionOpacity, {
                toValue: 0,
                duration: 300,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(aiSuggestionTranslateY, {
                toValue: 20,
                duration: 300,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start(() => {
            // Reset state after animation completes
            setSearchQuery('');
            setSearchResults([]);
            setAddedItems(new Set());
            setSelectedMeal(null); // Reset selected meal
            sheetHeightAnim.setValue(SHEET_HEIGHT);
            keyboardHeightAnim.setValue(0);
            Keyboard.dismiss();
            // Call onClose after animation
            onClose();
        });
    };

    const handleAddFood = (food: FoodItem) => {
        // Track that this item was added (for visual feedback)
        setAddedItems(new Set([...addedItems, food.id]));

        // Reset the added state after 1 second so it can be added again
        setTimeout(() => {
            setAddedItems((prev) => {
                const newSet = new Set(prev);
                newSet.delete(food.id);
                return newSet;
            });
        }, 1000);

        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Call parent handler
        onAddFood(food);

        // Show undo toast
        setLastAddedFood(food);
        setShowUndoToast(true);

        // Auto-hide toast after 3 seconds
        const timeout = setTimeout(() => {
            setShowUndoToast(false);
            setLastAddedFood(null);
        }, 3000);
        setUndoTimeout(timeout);
    };
    
    // Meal button press handlers
    const handleMealPress = (meal: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newMeal = selectedMeal === meal ? null : meal;
        setSelectedMeal(newMeal);
        if (onMealChange) {
            onMealChange(newMeal);
        }
    };



    const handleUndo = () => {
        if (lastAddedFood) {
            // Remove from added items
            const newAddedItems = new Set(addedItems);
            newAddedItems.delete(lastAddedFood.id);
            setAddedItems(newAddedItems);

            // Remove from daily log
            if (onRemoveFood) {
                onRemoveFood(lastAddedFood);
            }

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowUndoToast(false);
            setLastAddedFood(null);
            if (undoTimeout) {
                clearTimeout(undoTimeout);
            }
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim() === '') {
            setSearchResults([]);
        } else {
            const results = searchFoods(query);
            setSearchResults(results);
        }
    };

    const handleScanBarcodePressIn = () => {
        Animated.parallel([
            Animated.timing(scanButtonTranslateY, {
                toValue: 4,
                duration: 120,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(scanButtonShadowHeight, {
                toValue: 0,
                duration: 120,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            }),
        ]).start();
    };

    const handleScanBarcodePressOut = () => {
        Animated.parallel([
            Animated.timing(scanButtonTranslateY, {
                toValue: 0,
                duration: 120,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(scanButtonShadowHeight, {
                toValue: 4,
                duration: 120,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            }),
        ]).start();
    };

    const handleScanBarcode = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // TODO: Implement barcode scanning
        console.log('Scan barcode');
    };

    const handleTakePhotoPressIn = () => {
        Animated.parallel([
            Animated.timing(photoButtonTranslateY, {
                toValue: 4,
                duration: 120,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(photoButtonShadowHeight, {
                toValue: 0,
                duration: 120,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            }),
        ]).start();
    };

    const handleTakePhotoPressOut = () => {
        Animated.parallel([
            Animated.timing(photoButtonTranslateY, {
                toValue: 0,
                duration: 120,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(photoButtonShadowHeight, {
                toValue: 4,
                duration: 120,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            }),
        ]).start();
    };

    const handleTakePhoto = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // TODO: Implement photo taking
        console.log('Take photo');
    };

    // Show all quick add items (users can add multiple)
    const availableQuickAdd = quickAddItems;

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
                        onPress={handleClose}
                    />
                </Animated.View>

                {/* AI Suggestion - Above the bottom sheet */}
                <Animated.View
                    style={[
                        styles.aiSuggestionContainer,
                        {
                            opacity: aiSuggestionOpacity,
                            transform: [{ translateY: aiSuggestionTranslateY }],
                        },
                    ]}
                >
                    <View style={styles.aiSuggestion}>
                        <View style={styles.aiSuggestionSkeleton}>
                            <Animated.View
                                style={[
                                    styles.skeletonLine,
                                    {
                                        opacity: skeletonAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.3, 0.6],
                                        }),
                                    },
                                ]}
                            />
                            <Animated.View
                                style={[
                                    styles.calIconContainer,
                                    {
                                        opacity: skeletonAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.8, 1],
                                        }),
                                        transform: [
                                            {
                                                rotate: calIconRotate.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: ['-10deg', '10deg'],
                                                }),
                                            },
                                            {
                                                translateY: calIconBounce.interpolate({
                                                    inputRange: [0, 0.5, 1],
                                                    outputRange: [0, -3, 0],
                                                }),
                                            },
                                            {
                                                scale: calIconBounce.interpolate({
                                                    inputRange: [0, 0.5, 1],
                                                    outputRange: [1, 1.05, 1],
                                                }),
                                            },
                                        ],
                                    },
                                ]}
                            >
                                <Image
                                    source={require('../../assets/images/icons/cal_icon.png')}
                                    style={styles.calIcon}
                                    resizeMode="contain"
                                />
                            </Animated.View>
                        </View>
                    </View>
                </Animated.View>

                {/* Bottom Sheet */}
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            transform: [
                                {
                                    translateY: Animated.add(slideAnim, keyboardHeightAnim)
                                },
                            ],
                        },
                    ]}
                >
                    {/* Inner animated container for height */}
                    <Animated.View
                        style={[
                            styles.sheetContent,
                            {
                                height: sheetHeightAnim,
                            },
                        ]}
                    >
                        {/* Top Section - Swipeable area */}
                        <View {...topSectionPanResponder.panHandlers} style={styles.topSection}>
                            {/* Handle bar */}
                            <View style={styles.handleBar} />

                            {/* Search Bar */}
                            <View style={styles.searchContainer}>
                                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                                <TextInput
                                    ref={searchInputRef}
                                    style={styles.searchInput}
                                    placeholder="What's on your plate?"
                                    placeholderTextColor="#999"
                                    value={searchQuery}
                                    onChangeText={handleSearch}
                                    returnKeyType="search"
                                    autoCorrect={false}
                                    autoComplete="off"
                                    spellCheck={false}
                                    keyboardAppearance="light"
                                />
                            </View>

                            {/* Secondary Buttons */}
                            <View style={styles.secondaryButtonsContainer}>
                                <View style={styles.secondaryButtonWrapper}>
                                    {/* Shadow layer */}
                                    <Animated.View
                                        style={[
                                            styles.secondaryButtonShadow,
                                            {
                                                opacity: scanButtonShadowHeight.interpolate({
                                                    inputRange: [0, 4],
                                                    outputRange: [0, 1],
                                                }),
                                            },
                                        ]}
                                    />
                                    <Animated.View
                                        style={[
                                            {
                                                transform: [{ translateY: scanButtonTranslateY }],
                                            },
                                        ]}
                                    >
                                        <TouchableOpacity
                                            style={styles.secondaryButton}
                                            onPress={handleScanBarcode}
                                            onPressIn={handleScanBarcodePressIn}
                                            onPressOut={handleScanBarcodePressOut}
                                            activeOpacity={1}
                                        >
                                            <Ionicons name="barcode-outline" size={20} color="#252525" style={{ marginRight: 8 }} />
                                            <Text style={styles.secondaryButtonText}>scan barcode</Text>
                                        </TouchableOpacity>
                                    </Animated.View>
                                </View>
                                <View style={styles.secondaryButtonWrapper}>
                                    {/* Shadow layer */}
                                    <Animated.View
                                        style={[
                                            styles.secondaryButtonShadow,
                                            {
                                                opacity: photoButtonShadowHeight.interpolate({
                                                    inputRange: [0, 4],
                                                    outputRange: [0, 1],
                                                }),
                                            },
                                        ]}
                                    />
                                    <Animated.View
                                        style={[
                                            {
                                                transform: [{ translateY: photoButtonTranslateY }],
                                            },
                                        ]}
                                    >
                                        <TouchableOpacity
                                            style={styles.secondaryButton}
                                            onPress={handleTakePhoto}
                                            onPressIn={handleTakePhotoPressIn}
                                            onPressOut={handleTakePhotoPressOut}
                                            activeOpacity={1}
                                        >
                                            <Ionicons name="camera-outline" size={20} color="#252525" style={{ marginRight: 8 }} />
                                            <Text style={styles.secondaryButtonText}>take photo</Text>
                                        </TouchableOpacity>
                                    </Animated.View>
                                </View>
                            </View>

                            {/* Meal Selection Pills */}
                            <View style={styles.mealButtonsContainer}>
                                {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((meal) => {
                                    const isSelected = selectedMeal === meal;
                                    const isBreakfast = meal === 'breakfast';

                                    return (
                                        <TouchableOpacity
                                            key={meal}
                                            style={[
                                                styles.mealButton,
                                                isBreakfast && styles.mealButtonBreakfast,
                                                isSelected && styles.mealButtonSelected,
                                            ]}
                                            onPress={() => handleMealPress(meal)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[
                                                styles.mealButtonText,
                                                isSelected && styles.mealButtonTextSelected,
                                            ]}>
                                                {meal}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Quick Add List */}
                        <ScrollView
                            style={styles.quickAddContainer}
                            contentContainerStyle={styles.quickAddContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {(searchQuery.trim() === ''
                                ? availableQuickAdd
                                : searchResults
                            )
                                .slice(0, 8) // Show up to 8 items
                                .map((item) => (
                                    <QuickAddItem
                                        key={item.id}
                                        item={item}
                                        onAdd={() => handleAddFood(item)}
                                        isAdded={addedItems.has(item.id)}
                                    />
                                ))}
                            {searchQuery.trim() !== '' &&
                                searchResults.length === 0 && (
                                    <View style={styles.noResultsContainer}>
                                        <Text style={styles.noResultsText}>no results found</Text>
                                    </View>
                                )}
                        </ScrollView>
                    </Animated.View>
                </Animated.View>

                {/* Undo Toast */}
                {showUndoToast && lastAddedFood && (
                    <View style={styles.undoToastContainer}>
                        <Animated.View style={styles.undoToast}>
                            <Text style={styles.undoToastText}>
                                {lastAddedFood.name} added
                            </Text>
                            <TouchableOpacity onPress={handleUndo} activeOpacity={0.7}>
                                <Text style={styles.undoButtonText}>undo</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                )}
            </View>
        </Modal>
    );
};

interface QuickAddItemProps {
    item: FoodItem;
    onAdd: () => void;
    isAdded: boolean;
}

const QuickAddItem: React.FC<QuickAddItemProps> = ({ item, onAdd, isAdded }) => {
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const iconColorAnim = useRef(new Animated.Value(0)).current; // 0 = not added, 1 = added

    const handleAdd = () => {
        // Animation
        Animated.parallel([
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 0.95,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true,
                }),
            ]),
            Animated.timing(fadeAnim, {
                toValue: 0.6,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(iconColorAnim, {
                toValue: 1,
                duration: 200,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false, // Color animation doesn't support native driver
            }),
        ]).start();

        onAdd();
    };

    // Reset icon color and fade when isAdded becomes false
    useEffect(() => {
        if (!isAdded) {
            Animated.parallel([
                Animated.timing(iconColorAnim, {
                    toValue: 0,
                    duration: 200,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: false,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isAdded]);

    return (
        <Animated.View
            style={[
                styles.quickAddItem,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <View style={styles.quickAddItemContent}>
                <Text style={styles.quickAddItemName}>{item.name}</Text>
                <View style={styles.caloriesContainer}>
                    <Text style={styles.quickAddItemCalories}>{item.calories} kcal</Text>
                    <Image
                        source={require('../../assets/images/icons/fire.png')}
                        style={styles.fireIcon}
                        resizeMode="contain"
                    />
                </View>
            </View>
            <TouchableOpacity
                style={styles.addButton}
                onPress={handleAdd}
                activeOpacity={0.7}
            >
                <Animated.View
                    style={{
                        opacity: iconColorAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0], // Fade out add icon
                        }),
                    }}
                >
                    <Ionicons
                        name="add"
                        size={28}
                        color="#ADADAD"
                    />
                </Animated.View>
                <Animated.View
                    style={{
                        position: 'absolute',
                        opacity: iconColorAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 1], // Fade in checkmark
                        }),
                    }}
                >
                    <Ionicons
                        name="checkmark"
                        size={28}
                        color="#252525"
                    />
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    sheet: {
        position: 'absolute',
        bottom: -Dimensions.get('window').height * 0.6, // Start from below to extend behind keyboard
        left: 0,
        right: 0,
        paddingBottom: Dimensions.get('window').height * 0.6, // Extra padding to extend behind keyboard
        overflow: 'hidden',
    },
    sheetContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderWidth: 2,
        borderColor: '#252525',
        borderBottomWidth: 0,
        paddingHorizontal: 20,
        overflow: 'hidden',
    },
    topSection: {
        paddingTop: 12,
        paddingBottom: 20,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#252525',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 12,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#252525',
        padding: 0,
    },
    secondaryButtonsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    secondaryButtonWrapper: {
        flex: 1,
        position: 'relative',
    },
    secondaryButtonShadow: {
        position: 'absolute',
        top: 4,
        left: 0,
        right: 0,
        height: 48,
        backgroundColor: '#252525',
        borderRadius: 10,
        zIndex: 0,
        pointerEvents: 'none',
    },
    secondaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#252525',
        paddingVertical: 12,
        paddingHorizontal: 12,
        zIndex: 10,
        minHeight: 48,
        elevation: 5, // Android shadow
    },
    secondaryButtonText: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    mealButtonsContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
        paddingTop: 12,
    },
    mealButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#252525',
        paddingVertical: 6,
        paddingHorizontal: 12,
        minHeight: 28,
    },
    mealButtonBreakfast: {
        flex: 1.2,
    },
    mealButtonSelected: {
        backgroundColor: '#4463F7',
    },
    mealButtonText: {
        fontSize: 14,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    mealButtonTextSelected: {
        color: '#fff',
    },
    aiSuggestionContainer: {
        position: 'absolute',
        bottom: SHEET_HEIGHT + 20,
        left: 20,
        right: 20,
        zIndex: 5,
    },
    aiSuggestion: {
        backgroundColor: '#4050F5',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#252525',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    aiSuggestionSkeleton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    skeletonLine: {
        height: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        flex: 1,
        marginRight: 12,
    },
    calIconContainer: {
        width: 24,
        height: 24,
    },
    calIcon: {
        width: 24,
        height: 24,
    },
    quickAddContainer: {
        flex: 1,
        marginTop: 0,
    },
    quickAddContent: {
        paddingBottom: 10,
    },
    quickAddItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 7,
        borderBottomWidth: 2,
        borderBottomColor: '#F0F0F0',
    },
    quickAddItemContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    quickAddItemName: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
        flex: 1,
    },
    caloriesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 4,
    },
    quickAddItemCalories: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
    },
    fireIcon: {
        width: 18,
        height: 18,
        marginLeft: 4,
    },
    addButton: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    noResultsContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    noResultsText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#999',
        textTransform: 'lowercase',
    },
    undoToastContainer: {
        position: 'absolute',
        bottom: -100, // Extend below screen
        left: 0,
        right: 0,
        height: SHEET_HEIGHT + 150, // Taller to extend off screen
        backgroundColor: '#fff',
        paddingTop: SHEET_HEIGHT + 20,
    },
    undoToast: {
        marginHorizontal: 20,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#252525',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#252525',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    undoToastText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#fff',
        textTransform: 'lowercase',
        flex: 1,
    },
    undoButtonText: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: '#526EFF',
        textTransform: 'lowercase',
    },
});
