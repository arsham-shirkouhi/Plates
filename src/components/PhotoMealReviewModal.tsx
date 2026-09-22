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
import { Ionicons } from '@expo/vector-icons';
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
                            <Ionicons name="close" size={26} color="#252525" />
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
                            <Ionicons name="alert-circle-outline" size={34} color="#BE123C" />
                            <Text style={styles.stateTitle}>couldn’t analyze that photo</Text>
                            <Text style={styles.stateText}>{error}</Text>
                        </View>
                    ) : (
                        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            <Text style={styles.notice}>Photo values are estimates. Packaged foods are more accurate with barcode scanning.</Text>
                            {items.map((item, index) => (
                                <View key={`${item.id}-${index}`} style={styles.itemCard}>
                                    <View style={styles.itemTopLine}>
                                        <Text style={styles.itemName}>{item.name}</Text>
                                        <TouchableOpacity onPress={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} hitSlop={10}>
                                            <Ionicons name="trash-outline" size={20} color="#666" />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.amountRow}>
                                        <TextInput
                                            value={String(item.servingGrams || 100)}
                                            onChangeText={(value) => updateGrams(index, value)}
                                            keyboardType="decimal-pad"
                                            style={styles.gramsInput}
                                        />
                                        <Text style={styles.gramsLabel}>g estimated</Text>
                                        <Text style={styles.kcal}>{Math.round(item.calories)} kcal</Text>
                                    </View>
                                    <Text style={styles.macros}>P {Math.round(item.protein)}g  ·  C {Math.round(item.carbs)}g  ·  F {Math.round(item.fats)}g</Text>
                                </View>
                            ))}

                            <View style={styles.manualSection}>
                                <Text style={styles.manualTitle}>add a missing ingredient</Text>
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
                                        <Ionicons name="add-circle-outline" size={21} color="#252525" />
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
    itemName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#252525' },
    amountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    gramsInput: { width: 58, borderBottomWidth: 1, borderColor: '#999', paddingVertical: 2, textAlign: 'center', fontWeight: '700', color: '#252525' },
    gramsLabel: { color: '#666', marginLeft: 6, fontSize: 13 },
    kcal: { marginLeft: 'auto', color: '#252525', fontWeight: '700' },
    macros: { marginTop: 8, color: '#666', fontSize: 12 },
    manualSection: { marginTop: 6, marginBottom: 18 },
    manualTitle: { fontSize: 15, color: '#252525', fontWeight: '700', marginBottom: 8 },
    manualInput: { borderWidth: 1, borderColor: '#D6D3CD', borderRadius: 12, paddingHorizontal: 12, height: 44, color: '#252525' },
    searchSpinner: { marginTop: 10 },
    manualResult: { minHeight: 44, borderBottomWidth: 1, borderColor: '#EEEAE3', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    manualResultName: { flex: 1, color: '#252525', fontSize: 13 },
    logButton: { backgroundColor: '#252525', borderRadius: 14, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
    logButtonDisabled: { opacity: 0.45 },
    logButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
