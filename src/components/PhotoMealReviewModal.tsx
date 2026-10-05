import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Icon } from './icons/Icon';
import { FoodItem } from '../services/foodService';
import { searchUsdaFoods } from '../services/usdaFoodService';

interface PhotoMealReviewModalProps {
    visible: boolean;
    foods: FoodItem[];
    isAnalyzing: boolean;
    error: string | null;
    onClose: () => void;
    onConfirm: (foods: FoodItem[]) => void;
}

function withGrams(food: FoodItem, gramsText: string): FoodItem {
    const grams = Number.parseFloat(gramsText);
    const baseGrams = food.servingGrams || 100;
    if (!Number.isFinite(grams) || grams <= 0) return food;
    const multiplier = grams / baseGrams;
    return {
        ...food,
        calories: Math.round(food.calories * multiplier),
        protein: Math.round(food.protein * multiplier),
        carbs: Math.round(food.carbs * multiplier),
        fats: Math.round(food.fats * multiplier),
        servingGrams: grams,
        servingLabel: `${grams}g estimate`,
    };
}

function withNumber(food: FoodItem, field: 'calories' | 'protein' | 'carbs' | 'fats', value: string): FoodItem {
    const number = Number.parseFloat(value);
    if (!Number.isFinite(number) || number < 0) return food;
    return { ...food, [field]: Math.round(number) };
}

export const PhotoMealReviewModal: React.FC<PhotoMealReviewModalProps> = ({
    visible,
    foods,
    isAnalyzing,
    error,
    onClose,
    onConfirm,
}) => {
    const [items, setItems] = useState<FoodItem[]>([]);
    const [manualQuery, setManualQuery] = useState('');
    const [manualResults, setManualResults] = useState<FoodItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (visible) {
            setItems(foods);
            setManualQuery('');
            setManualResults([]);
        }
    }, [foods, visible]);

    const updateGrams = (index: number, value: string) => {
        setItems((current) => current.map((item, itemIndex) => itemIndex === index ? withGrams(item, value) : item));
    };

    const updateItem = (index: number, updates: Partial<FoodItem>) => {
        setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...updates } : item));
    };

    const updateNutrient = (index: number, field: 'calories' | 'protein' | 'carbs' | 'fats', value: string) => {
        setItems((current) => current.map((item, itemIndex) => itemIndex === index ? withNumber(item, field, value) : item));
    };

    const searchManualFood = async (query: string) => {
        setManualQuery(query);
        if (!query.trim()) {
            setManualResults([]);
            return;
        }
        setIsSearching(true);
        try {
            setManualResults(await searchUsdaFoods(query));
        } catch {
            setManualResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const addManualFood = (food: FoodItem) => {
        const grams = food.servingGrams || 100;
        setItems((current) => [...current, {
            ...food,
            servingGrams: grams,
            servingLabel: `${grams}g estimate`,
        }]);
        setManualQuery('');
        setManualResults([]);
    };

    const addCustomFood = () => {
        setItems((current) => [...current, {
            id: `custom-${Date.now()}`,
            name: 'custom food',
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
            servingGrams: 100,
            servingLabel: '100g custom',
            photoQuestion: 'Enter the nutrition-label values or your best estimate.',
        }]);
    };

    const total = items.reduce((sum, item) => sum + item.calories, 0);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>review meal estimate</Text>
                            <Text style={styles.subtitle}>Edit amounts or add anything the photo missed.</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={12}>
                            <Icon name="close" size={26} color="#252525" />
                        </TouchableOpacity>
                    </View>

                    {isAnalyzing ? (
                        <View style={styles.centerState}>
                            <ActivityIndicator size="large" color="#252525" />
                            <Text style={styles.stateTitle}>checking your plate…</Text>
                            <Text style={styles.stateText}>We’ll match visible foods to USDA nutrition next.</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.centerState}>
                            <Icon name="alert-circle-outline" size={34} color="#BE123C" />
                            <Text style={styles.stateTitle}>couldn’t analyze that photo</Text>
                            <Text style={styles.stateText}>{error}</Text>
                        </View>
                    ) : (
                        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            <Text style={styles.notice}>Photo values are drafts. For packaged food, scan the barcode or enter its nutrition label—Gemini cannot verify a product’s flavor or formulation from a photo alone.</Text>
                            {items.map((item, index) => (
                                <View key={`${item.id}-${index}`} style={styles.itemCard}>
                                    <View style={styles.itemTopLine}>
                                        <TextInput
                                            value={item.name}
                                            onChangeText={(value) => updateItem(index, { name: value })}
                                            placeholder="food name"
                                            placeholderTextColor="#8A8A8A"
                                            style={styles.itemNameInput}
                                        />
                                        <TouchableOpacity onPress={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} hitSlop={10}>
                                            <Icon name="trash-outline" size={20} color="#666" />
                                        </TouchableOpacity>
                                    </View>
                                    {item.photoQuestion && <Text style={styles.question}>{item.photoQuestion}</Text>}
                                    <View style={styles.amountRow}>
                                        <TextInput
                                            value={String(item.servingGrams || 100)}
                                            onChangeText={(value) => updateGrams(index, value)}
                                            keyboardType="decimal-pad"
                                            style={styles.gramsInput}
                                        />
                                        <Text style={styles.gramsLabel}>g estimated</Text>
                                    </View>
                                    <View style={styles.nutritionRow}>
                                        {([
                                            ['calories', 'kcal'],
                                            ['protein', 'protein'],
                                            ['carbs', 'carbs'],
                                            ['fats', 'fat'],
                                        ] as const).map(([field, label]) => (
                                            <View key={field} style={styles.nutritionField}>
                                                <TextInput
                                                    value={String(Math.round(item[field]))}
                                                    onChangeText={(value) => updateNutrient(index, field, value)}
                                                    keyboardType="decimal-pad"
                                                    style={styles.nutritionInput}
                                                />
                                                <Text style={styles.nutritionLabel}>{label}{field === 'calories' ? '' : ' g'}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            ))}

                            <View style={styles.manualSection}>
                                <Text style={styles.manualTitle}>add a missing ingredient</Text>
                                <TouchableOpacity style={styles.customButton} onPress={addCustomFood}>
                                    <Icon name="create-outline" size={18} color="#252525" />
                                    <Text style={styles.customButtonText}>enter a custom food or nutrition label</Text>
                                </TouchableOpacity>
                                <TextInput
                                    value={manualQuery}
                                    onChangeText={searchManualFood}
                                    placeholder="e.g. avocado, olive oil"
                                    placeholderTextColor="#8A8A8A"
                                    style={styles.manualInput}
                                />
                                {isSearching && <ActivityIndicator size="small" color="#252525" style={styles.searchSpinner} />}
                                {manualResults.slice(0, 4).map((food) => (
                                    <TouchableOpacity key={food.id} style={styles.manualResult} onPress={() => addManualFood(food)}>
                                        <Text style={styles.manualResultName}>{food.name}</Text>
                                        <Icon name="add-circle-outline" size={21} color="#252525" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    )}

                    {!isAnalyzing && !error && (
                        <TouchableOpacity
                            style={[styles.logButton, items.length === 0 && styles.logButtonDisabled]}
                            disabled={items.length === 0}
                            onPress={() => onConfirm(items)}
                        >
                            <Text style={styles.logButtonText}>log {items.length} item{items.length === 1 ? '' : 's'} · {Math.round(total)} kcal</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
    sheet: { maxHeight: '88%', backgroundColor: '#FFFDF8', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 34 },
    header: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
    title: { fontSize: 22, fontWeight: '700', color: '#252525' },
    subtitle: { marginTop: 4, color: '#666', fontSize: 13 },
    notice: { backgroundColor: '#F7EBC7', borderRadius: 12, padding: 11, color: '#574919', fontSize: 12, marginBottom: 12 },
    centerState: { alignItems: 'center', paddingVertical: 56, gap: 10 },
    stateTitle: { color: '#252525', fontSize: 17, fontWeight: '700' },
    stateText: { color: '#666', textAlign: 'center', lineHeight: 19 },
    itemCard: { borderWidth: 1, borderColor: '#E5E2DC', borderRadius: 14, padding: 13, marginBottom: 10, backgroundColor: '#FFF' },
    itemTopLine: { flexDirection: 'row', gap: 8, justifyContent: 'space-between', alignItems: 'center' },
    itemNameInput: { flex: 1, fontSize: 15, fontWeight: '600', color: '#252525', paddingVertical: 1 },
    question: { color: '#8A4B0F', backgroundColor: '#FFF4D8', borderRadius: 9, padding: 8, marginTop: 9, fontSize: 12, lineHeight: 17 },
    amountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    gramsInput: { width: 58, borderBottomWidth: 1, borderColor: '#999', paddingVertical: 2, textAlign: 'center', fontWeight: '700', color: '#252525' },
    gramsLabel: { color: '#666', marginLeft: 6, fontSize: 13 },
    nutritionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    nutritionField: { flex: 1 },
    nutritionInput: { borderWidth: 1, borderColor: '#D6D3CD', borderRadius: 8, height: 36, paddingHorizontal: 6, textAlign: 'center', color: '#252525', fontWeight: '700' },
    nutritionLabel: { color: '#666', fontSize: 10, textAlign: 'center', marginTop: 4 },
    manualSection: { marginTop: 6, marginBottom: 18 },
    manualTitle: { fontSize: 15, color: '#252525', fontWeight: '700', marginBottom: 8 },
    customButton: { flexDirection: 'row', gap: 7, alignItems: 'center', borderWidth: 1, borderColor: '#252525', borderRadius: 11, minHeight: 42, paddingHorizontal: 12, marginBottom: 10 },
    customButtonText: { color: '#252525', fontWeight: '600', fontSize: 13 },
    manualInput: { borderWidth: 1, borderColor: '#D6D3CD', borderRadius: 12, paddingHorizontal: 12, height: 44, color: '#252525' },
    searchSpinner: { marginTop: 10 },
    manualResult: { minHeight: 44, borderBottomWidth: 1, borderColor: '#EEEAE3', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    manualResultName: { flex: 1, color: '#252525', fontSize: 13 },
    logButton: { backgroundColor: '#252525', borderRadius: 14, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
    logButtonDisabled: { opacity: 0.45 },
    logButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
