import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/fonts';

interface FoodItem {
    name: string;
    calories: number;
    time: string; // e.g., "5m", "15m", "41m"
}

interface FoodLogProps {
    items?: FoodItem[];
    onPress?: () => void;
}

export const FoodLog: React.FC<FoodLogProps> = ({
    items = [
        { name: 'teh tarik', calories: 130, time: '5m' },
        { name: 'roti canai', calories: 542, time: '15m' },
        { name: 'kaya toast', calories: 230, time: '41m' },
    ],
    onPress
}) => {
    return (
        <View style={styles.container}>
            {/* Header */}
            <TouchableOpacity
                style={styles.header}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <Text style={styles.headerText}>food log</Text>
                <Ionicons name="chevron-forward" size={20} color="#252525" />
            </TouchableOpacity>

            {/* Separator line */}
            <View style={styles.separator} />

            {/* Food items list */}
            <View style={styles.itemsContainer}>
                {items.map((item, index) => (
                    <View
                        key={index}
                        style={[
                            styles.itemRow,
                            index === 0 && styles.firstItemSpacing,
                            index < items.length - 1 && styles.itemSpacing
                        ]}
                    >
                        <Text style={styles.itemName}>{item.name}</Text>
                        <View style={styles.itemRight}>
                            <Text style={styles.itemCalories}>{item.calories} kcal</Text>
                            <Image
                                source={require('../../assets/images/icons/fire.png')}
                                style={styles.flameIcon}
                                resizeMode="contain"
                            />
                            <View style={styles.verticalSeparator} />
                            <Text style={styles.itemTime}>{item.time}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 2.5,
        borderColor: '#252525',
        paddingTop: 5,
        paddingBottom: 10,
        paddingHorizontal: 15,
        marginTop: 16,
        height: 140,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 1,
        paddingBottom: 6,
    },
    headerText: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    separator: {
        height: 2,
        backgroundColor: '#E0E0E0',
        marginHorizontal: -15,
        marginBottom: 4,
    },
    itemsContainer: {
        width: '100%',
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    firstItemSpacing: {
        paddingTop: 5,
    },
    itemSpacing: {
        marginBottom: 9,
    },
    itemName: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
        flex: 1,
    },
    itemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemCalories: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
        marginRight: 8,
    },
    flameIcon: {
        width: 18,
        height: 18,
        marginRight: 8,
    },
    verticalSeparator: {
        width: 1,
        height: 16,
        backgroundColor: '#E0E0E0',
        marginRight: 8,
    },
    itemTime: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        minWidth: 30,
        textAlign: 'right',
    },
});

