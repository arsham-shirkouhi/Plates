import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Animated,
    Dimensions,
    Keyboard,
    Modal,
    ScrollView,
    PanResponder,
    Easing,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/fonts';
import * as Haptics from 'expo-haptics';
import { FoodItem } from '../services/foodService';
import { FoodDetailView } from './FoodDetailView';
import { Button } from './Button';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;
const TOASTER_OFFSET = 50;

interface LoggedFoodEntry {
    id: string;
    food: FoodItem;
    loggedAt: Date;
    meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    portion?: string;
}

interface EditFoodBottomSheetProps {
    visible: boolean;
    onClose: () => void;
    entry: LoggedFoodEntry | null;
    onUpdateFood: (entryId: string, updatedFood: FoodItem, servingSize: string, numberOfServings: string, meal: 'breakfast' | 'lunch' | 'dinner' | 'snack') => void;
    onDelete?: () => void;
}

export const EditFoodBottomSheet: React.FC<EditFoodBottomSheetProps> = ({
    visible,
    onClose,
    entry,
    onUpdateFood,
    onDelete,
}) => {
    const [detailServingSize, setDetailServingSize] = useState('');
    const [detailNumberOfServings, setDetailNumberOfServings] = useState('');
    const [detailMeal, setDetailMeal] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack' | null>(null);
    const [showUnitSelector, setShowUnitSelector] = useState(false);

    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT + TOASTER_OFFSET)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const keyboardHeightAnim = useRef(new Animated.Value(0)).current;
    const sheetHeightAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

    // Animation refs for delete button press effect (matching Button component)
    const deleteTranslateY = useRef(new Animated.Value(0)).current;
    const deleteShadowHeight = useRef(new Animated.Value(4)).current;

    // Unit options
    const unitOptions = [
        '1 piece',
        '1 cup',
        '1 g',
        '1 oz',
        '1 lb',
        '1 fl oz',
        '1 mg',
        '1 tsp(s)',
        '1 tbsp(s)',
        '1 kg(s)',
        '1 ltr(s)',
    ];

    // Initialize values when entry changes
    useEffect(() => {
        if (entry && visible) {
            // Parse portion to extract serving size and number
            const portion = entry.portion || '1 serving';
            const parts = portion.split(' ');
            if (parts.length >= 2) {
                const number = parts[0];
                const unit = parts.slice(1).join(' ');
                setDetailNumberOfServings(number);
                setDetailServingSize(unit);
            } else {
                setDetailNumberOfServings('1');
                setDetailServingSize(portion);
            }
            setDetailMeal(entry.meal);
        }
    }, [entry, visible]);

    useEffect(() => {
        if (visible) {
            slideAnim.setValue(SCREEN_HEIGHT + TOASTER_OFFSET);
            backdropOpacity.setValue(0);
            sheetHeightAnim.setValue(SHEET_HEIGHT);

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
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: SCREEN_HEIGHT + TOASTER_OFFSET,
                    duration: 250,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 0,
                    duration: 200,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    // Handle keyboard
    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                Animated.timing(keyboardHeightAnim, {
                    toValue: -e.endCoordinates.height,
                    duration: 250,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }).start();
            }
        );
        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                Animated.timing(keyboardHeightAnim, {
                    toValue: 0,
                    duration: 250,
                    easing: Easing.out(Easing.ease),
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
        Keyboard.dismiss();
        onClose();
    };

    const handleUpdateFood = () => {
        if (!entry || !detailServingSize || !detailNumberOfServings || !detailMeal) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        // Calculate the base per-serving values from the current entry
        // Parse the current portion to get the current number of servings
        const currentPortion = entry.portion || '1 serving';
        const currentParts = currentPortion.split(' ');
        const currentServings = parseFloat(currentParts[0]) || 1;

        // Calculate base per-serving values
        const baseCalories = entry.food.calories / currentServings;
        const baseProtein = entry.food.protein / currentServings;
        const baseCarbs = entry.food.carbs / currentServings;
        const baseFats = entry.food.fats / currentServings;

        // Calculate new values based on new number of servings
        const newServings = parseFloat(detailNumberOfServings) || 1;
        const updatedFood: FoodItem = {
            ...entry.food,
            calories: Math.round(baseCalories * newServings),
            protein: Math.round(baseProtein * newServings * 10) / 10,
            carbs: Math.round(baseCarbs * newServings * 10) / 10,
            fats: Math.round(baseFats * newServings * 10) / 10,
        };

        onUpdateFood(entry.id, updatedFood, detailServingSize, detailNumberOfServings, detailMeal);
        handleClose();
    };

    const topSectionPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return gestureState.dy > 10;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    slideAnim.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100 || gestureState.vy > 0.5) {
                    handleClose();
                } else {
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

    if (!entry) return null;

    const isButtonDisabled = !detailServingSize || !detailNumberOfServings || !detailMeal;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <Animated.View
                    style={[
                        styles.backdrop,
                        {
                            opacity: backdropOpacity,
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={styles.backdropTouchable}
                        activeOpacity={1}
                        onPress={handleClose}
                    />
                </Animated.View>

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
                    pointerEvents="auto"
                >
                    <Animated.View
                        style={[
                            styles.sheetContent,
                            {
                                height: sheetHeightAnim,
                            },
                        ]}
                    >
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={styles.content} {...topSectionPanResponder.panHandlers}>
                                <FoodDetailView
                                    food={entry.food}
                                    onClose={handleClose}
                                    onAddFood={handleUpdateFood}
                                    initialMeal={entry.meal}
                                    unitOptions={unitOptions}
                                    onShowUnitSelector={() => setShowUnitSelector(true)}
                                    selectedServingSize={detailServingSize}
                                    onServingSizeChange={setDetailServingSize}
                                    numberOfServings={detailNumberOfServings}
                                    onNumberOfServingsChange={setDetailNumberOfServings}
                                    selectedMeal={detailMeal}
                                    onMealChange={setDetailMeal}
                                    hideButton={true}
                                    headerTitle="edit food"
                                />
                                <View style={styles.updateButtonWrapper}>
                                    {onDelete && (
                                        <View style={styles.deleteButtonWrapper}>
                                            {/* Shadow layer - positioned behind button for harsh drop shadow (matching Button component) */}
                                            <Animated.View
                                                style={[
                                                    styles.deleteButtonShadow,
                                                    {
                                                        transform: [
                                                            {
                                                                translateY: deleteShadowHeight.interpolate({
                                                                    inputRange: [0, 4],
                                                                    outputRange: [0, 0], // Shadow position stays constant
                                                                }),
                                                            },
                                                        ],
                                                        opacity: deleteShadowHeight.interpolate({
                                                            inputRange: [0, 4],
                                                            outputRange: [0, 1],
                                                        }),
                                                    },
                                                ]}
                                                pointerEvents="none"
                                            />
                                            <TouchableOpacity
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                    onDelete();
                                                }}
                                                onPressIn={() => {
                                                    Animated.parallel([
                                                        Animated.timing(deleteTranslateY, {
                                                            toValue: 4,
                                                            duration: 120,
                                                            easing: Easing.out(Easing.ease),
                                                            useNativeDriver: true,
                                                        }),
                                                        Animated.timing(deleteShadowHeight, {
                                                            toValue: 0,
                                                            duration: 120,
                                                            easing: Easing.out(Easing.ease),
                                                            useNativeDriver: false,
                                                        }),
                                                    ]).start();
                                                }}
                                                onPressOut={() => {
                                                    Animated.parallel([
                                                        Animated.timing(deleteTranslateY, {
                                                            toValue: 0,
                                                            duration: 120,
                                                            easing: Easing.out(Easing.ease),
                                                            useNativeDriver: true,
                                                        }),
                                                        Animated.timing(deleteShadowHeight, {
                                                            toValue: 4,
                                                            duration: 120,
                                                            easing: Easing.out(Easing.ease),
                                                            useNativeDriver: false,
                                                        }),
                                                    ]).start();
                                                }}
                                                activeOpacity={1}
                                                style={{ zIndex: 1, width: '100%', alignItems: 'center' }}
                                            >
                                                <Animated.View
                                                    style={[
                                                        styles.deleteButton,
                                                        {
                                                            transform: [{ translateY: deleteTranslateY }],
                                                            overflow: 'hidden',
                                                        },
                                                    ]}
                                                >
                                                    <Ionicons name="trash-outline" size={24} color="#252525" />
                                                </Animated.View>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    <Button
                                        variant="primary"
                                        title="update food!"
                                        onPress={handleUpdateFood}
                                        disabled={isButtonDisabled}
                                        containerStyle={styles.updateButtonContainer}
                                    />
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </Animated.View>
                </Animated.View>

                {/* Unit Selector Modal */}
                {showUnitSelector && (
                    <View style={styles.unitSelectorOverlay} pointerEvents="auto">
                        <View style={styles.unitSelectorContainer}>
                            <View style={styles.unitSelectorHeader}>
                                <Text style={styles.unitSelectorTitle}>Select Unit</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setShowUnitSelector(false);
                                    }}
                                    style={styles.unitSelectorCloseButton}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="close" size={24} color="#252525" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                style={styles.unitSelectorList}
                                showsVerticalScrollIndicator={true}
                            >
                                {unitOptions.map((unit) => (
                                    <TouchableOpacity
                                        key={unit}
                                        style={[
                                            styles.unitSelectorItem,
                                            detailServingSize === unit && styles.unitSelectorItemSelected,
                                        ]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setDetailServingSize(unit);
                                            setShowUnitSelector(false);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.unitSelectorItemText,
                                            detailServingSize === unit && styles.unitSelectorItemTextSelected,
                                        ]}>
                                            {unit}
                                        </Text>
                                        {detailServingSize === unit && (
                                            <Ionicons name="checkmark-circle" size={24} color="#4463F7" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                )}
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    backdropTouchable: {
        flex: 1,
    },
    sheet: {
        position: 'absolute',
        bottom: -Dimensions.get('window').height * 0.6,
        left: 0,
        right: 0,
        paddingBottom: Dimensions.get('window').height * 0.6,
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
    content: {
        flex: 1,
    },
    updateButtonWrapper: {
        flexDirection: 'row',
        paddingHorizontal: 0,
        paddingBottom: 20,
        alignItems: 'flex-start',
        gap: 12,
        width: 360, // Match the Button component's width exactly
        alignSelf: 'center',
    },
    updateButtonContainer: {
        width: 298, // 360 (original) - 50 (delete button) - 12 (gap) = 298
    },
    deleteButtonWrapper: {
        position: 'relative',
        width: 50,
        height: 50,
        alignItems: 'center',
        marginTop: 5,
    },
    deleteButtonShadow: {
        position: 'absolute',
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#252525',
        top: ((5) + 4), // marginTop (5) + shadow offset (4px) - exactly like Button component: ((typeof buttonStyle.marginTop === 'number' ? buttonStyle.marginTop : 0) + 4)
        alignSelf: 'center',
        zIndex: 0,
    },
    deleteButton: {
        width: 50,
        height: 50,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#252525',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    unitSelectorOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        zIndex: 300,
        justifyContent: 'flex-end',
    },
    unitSelectorContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderWidth: 2,
        borderColor: '#252525',
        borderBottomWidth: 0,
        maxHeight: SCREEN_HEIGHT * 0.6,
    },
    unitSelectorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 2,
        borderBottomColor: '#F0F0F0',
    },
    unitSelectorTitle: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    unitSelectorCloseButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unitSelectorList: {
        maxHeight: SCREEN_HEIGHT * 0.5,
    },
    unitSelectorItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#F0F0F0',
    },
    unitSelectorItemSelected: {
        backgroundColor: '#F5F5F5',
    },
    unitSelectorItemText: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
    },
    unitSelectorItemTextSelected: {
        fontFamily: fonts.bold,
        color: '#4463F7',
    },
});

