import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';
import { fonts } from '../constants/fonts';

interface TestControlsProps {
    consumed: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    };
    onUpdate: (type: 'calories' | 'protein' | 'carbs' | 'fats', amount: number) => void;
    onReset: () => void;
}

export const TestControls: React.FC<TestControlsProps> = ({ consumed, onUpdate, onReset }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Test Controls</Text>

            <View style={styles.grid}>
                {/* Calories */}
                <View style={styles.item}>
                    <Text style={styles.label}>Calories</Text>
                    <Text style={styles.value}>{consumed.calories}</Text>
                    <View style={styles.buttonRow}>
                        <Button
                            variant="secondary"
                            title="-100"
                            onPress={() => onUpdate('calories', -100)}
                            containerStyle={styles.smallButton}
                            textStyle={styles.buttonText}
                        />
                        <Button
                            variant="secondary"
                            title="+100"
                            onPress={() => onUpdate('calories', 100)}
                            containerStyle={styles.smallButton}
                            textStyle={styles.buttonText}
                        />
                    </View>
                </View>

                {/* Protein */}
                <View style={styles.item}>
                    <Text style={styles.label}>Protein</Text>
                    <Text style={styles.value}>{consumed.protein}g</Text>
                    <View style={styles.buttonRow}>
                        <Button
                            variant="secondary"
                            title="-10"
                            onPress={() => onUpdate('protein', -10)}
                            containerStyle={styles.smallButton}
                            textStyle={styles.buttonText}
                        />
                        <Button
                            variant="secondary"
                            title="+10"
                            onPress={() => onUpdate('protein', 10)}
                            containerStyle={styles.smallButton}
                            textStyle={styles.buttonText}
                        />
                    </View>
                </View>

                {/* Carbs */}
                <View style={styles.item}>
                    <Text style={styles.label}>Carbs</Text>
                    <Text style={styles.value}>{consumed.carbs}g</Text>
                    <View style={styles.buttonRow}>
                        <Button
                            variant="secondary"
                            title="-10"
                            onPress={() => onUpdate('carbs', -10)}
                            containerStyle={styles.smallButton}
                            textStyle={styles.buttonText}
                        />
                        <Button
                            variant="secondary"
                            title="+10"
                            onPress={() => onUpdate('carbs', 10)}
                            containerStyle={styles.smallButton}
                            textStyle={styles.buttonText}
                        />
                    </View>
                </View>

                {/* Fats */}
                <View style={styles.item}>
                    <Text style={styles.label}>Fats</Text>
                    <Text style={styles.value}>{consumed.fats}g</Text>
                    <View style={styles.buttonRow}>
                        <Button
                            variant="secondary"
                            title="-10"
                            onPress={() => onUpdate('fats', -10)}
                            containerStyle={styles.smallButton}
                            textStyle={styles.buttonText}
                        />
                        <Button
                            variant="secondary"
                            title="+10"
                            onPress={() => onUpdate('fats', 10)}
                            containerStyle={styles.smallButton}
                            textStyle={styles.buttonText}
                        />
                    </View>
                </View>
            </View>

            <Button
                variant="secondary"
                title="Reset"
                onPress={onReset}
                containerStyle={styles.resetButton}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
        padding: 12,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    title: {
        fontSize: 16,
        fontFamily: fonts.bold,
        marginBottom: 10,
        textTransform: 'lowercase',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    item: {
        width: '48%',
        marginBottom: 10,
    },
    label: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: '#666',
        marginBottom: 4,
        textTransform: 'lowercase',
    },
    value: {
        fontSize: 14,
        fontFamily: fonts.bold,
        marginBottom: 6,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 6,
    },
    smallButton: {
        flex: 1,
        paddingHorizontal: 8,
        paddingVertical: 6,
        minHeight: 32,
    },
    buttonText: {
        fontSize: 12,
    },
    resetButton: {
        marginTop: 4,
        paddingVertical: 8,
    },
});

