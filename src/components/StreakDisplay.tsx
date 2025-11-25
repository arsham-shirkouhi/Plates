import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts } from '../constants/fonts';

interface StreakDisplayProps {
    streak: number;
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({ streak }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>
                keep your <Text style={styles.streakNumber}>{streak}</Text> day streak!
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
    },
    text: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#fff',
        textTransform: 'lowercase',
    },
    streakNumber: {
        fontFamily: fonts.bold,
        fontWeight: 'bold',
    },
});

