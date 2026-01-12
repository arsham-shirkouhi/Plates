import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/fonts';
import * as Haptics from 'expo-haptics';
import { Button } from './Button';

interface FoodItem {
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

interface FoodDetailViewProps {
    food: FoodItem;
    onClose: () => void;
    onAddFood: (food: FoodItem) => void;
    initialMeal?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null;
    unitOptions: string[];
    onShowUnitSelector: () => void;
    selectedServingSize: string;
    onServingSizeChange: (size: string) => void;
    numberOfServings: string;
    onNumberOfServingsChange: (servings: string) => void;
    selectedMeal: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null;
    onMealChange: (meal: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null) => void;
}

export const FoodDetailView: React.FC<FoodDetailViewProps> = ({
    food,
    onClose,
    onAddFood,
    initialMeal = null,
    unitOptions,
    onShowUnitSelector,
    selectedServingSize,
    onServingSizeChange,
    numberOfServings,
    onNumberOfServingsChange,
    selectedMeal,
    onMealChange,
}) => {
    const isButtonDisabled = !selectedServingSize || !numberOfServings || !selectedMeal;

    const handleAddFood = () => {
        // Validate required fields
        if (!selectedServingSize || !numberOfServings || !selectedMeal) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        onAddFood(food);
    };

    const handleMealPress = (meal: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newMeal = selectedMeal === meal ? null : meal;
        onMealChange(newMeal);
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                {/* Handle bar */}
                <View style={styles.handleBar} />

                {/* Content wrapper with same padding as food items */}
                <View style={styles.contentWrapper}>
                    {/* Header - Back button and title */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.backButton}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-back" size={24} color="#252525" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>add food</Text>
                        <View style={styles.backButton} />
                    </View>

                    {/* Food name - left aligned */}
                    <Text style={styles.foodName}>{food.name}</Text>

                    {/* Macros Section - Like food log top bar */}
                    <View style={styles.macroSection}>
                        {/* Top divider line */}
                        <View style={styles.macroDivider} />
                        <View style={styles.macroRowTop}>
                            <View style={styles.macroItem}>
                                <View style={[styles.macroDot, styles.proteinDot]} />
                                <Text style={styles.macroLabel}>
                                    <Text style={styles.macroLetter}>P</Text> {food.protein}g
                                </Text>
                            </View>
                            <Text style={styles.macroSeparator}>|</Text>
                            <View style={styles.macroItem}>
                                <View style={[styles.macroDot, styles.carbsDot]} />
                                <Text style={styles.macroLabel}>
                                    <Text style={styles.macroLetter}>C</Text> {food.carbs}g
                                </Text>
                            </View>
                            <Text style={styles.macroSeparator}>|</Text>
                            <View style={styles.macroItem}>
                                <View style={[styles.macroDot, styles.fatsDot]} />
                                <Text style={styles.macroLabel}>
                                    <Text style={styles.macroLetter}>F</Text> {food.fats}g
                                </Text>
                            </View>
                        </View>
                        <View style={styles.caloriesRow}>
                            <Text style={styles.caloriesText}>{food.calories}kcal</Text>
                        </View>
                        {/* Bottom divider line */}
                        <View style={styles.macroDivider} />
                    </View>

                    {/* Input Fields */}
                    <View style={styles.inputsContainer}>
                        {/* Serving Size */}
                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>serving size</Text>
                            <TouchableOpacity
                                style={styles.inputButton}
                                activeOpacity={0.7}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    onShowUnitSelector();
                                }}
                            >
                                <Text style={[
                                    styles.inputButtonText,
                                    !selectedServingSize && styles.inputButtonPlaceholder
                                ]}>
                                    {selectedServingSize || 'Select unit'}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {/* Number of Servings */}
                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>number of servings</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.textInput}
                                    value={numberOfServings}
                                    onChangeText={onNumberOfServingsChange}
                                    keyboardType="decimal-pad"
                                    placeholder="1"
                                    placeholderTextColor="#999"
                                />
                            </View>
                        </View>

                        {/* Meal Selection */}
                        <View style={styles.inputSection}>
                            <Text style={styles.mealLabel}>meal</Text>
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
                    </View>
                </View>

                {/* Add Button using Button component - Fixed at bottom */}
                <View style={styles.addButtonWrapper}>
                    <Button
                        variant="primary"
                        title="log food!"
                        onPress={handleAddFood}
                        disabled={isButtonDisabled}
                        containerStyle={styles.addButtonContainer}
                    />
                </View>
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 0,
        paddingTop: 12,
        paddingBottom: 0,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    contentWrapper: {
        flex: 1,
        paddingHorizontal: 7,
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        marginTop: -4,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        textAlign: 'center',
    },
    foodName: {
        fontSize: 20,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
        textAlign: 'left',
        alignSelf: 'flex-start',
        marginBottom: 5,
        width: '100%',
    },
    macroSection: {
        marginBottom: 10,
        width: '100%',
    },
    macroDivider: {
        height: 2,
        backgroundColor: '#E0E0E0',
        width: '100%',
        marginVertical: 12,
    },

    macroRowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: -4,
        paddingLeft: 10,
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
    macroLabel: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 0,
    },
    macroLetter: {
        textTransform: 'uppercase',
    },
    macroSeparator: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: 'rgba(37, 37, 37, 0.5)',
        marginHorizontal: 12,
    },
    caloriesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,

        paddingLeft: 10,
    },
    caloriesText: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    inputsContainer: {
        paddingBottom: 10,
    },
    inputSection: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#666',
        textTransform: 'lowercase',
        marginBottom: 8,
    },
    mealLabel: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#666',
        textTransform: 'lowercase',
        marginBottom: 4,
    },
    inputButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F5F5F5',
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#252525',
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 50,
    },
    inputButtonText: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
    },
    inputButtonPlaceholder: {
        color: '#999',
    },
    inputWrapper: {
        backgroundColor: '#F5F5F5',
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#252525',
        overflow: 'hidden',
    },
    textInput: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#252525',
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 50,
    },
    mealButtonsContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 0,
        paddingTop: 0,
    },
    mealButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#252525',
        paddingVertical: 10,
        paddingHorizontal: 12,
        minHeight: 38,
    },
    mealButtonBreakfast: {
        flex: 1.28,
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
    addButtonWrapper: {
        paddingHorizontal: 7,
        paddingBottom: 20,
        alignItems: 'center',
    },
    addButtonContainer: {
        width: '100%',
    },
});

