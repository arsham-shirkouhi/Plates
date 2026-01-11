import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/fonts';

interface FoodLogHeaderSectionProps {
    protein: number;
    carbs: number;
    fats: number;
    calories: number;
    topInset?: number;
    onProfilePress?: () => void;
}

export const FoodLogHeaderSection: React.FC<FoodLogHeaderSectionProps> = ({
    protein,
    carbs,
    fats,
    calories,
    topInset = 0,
    onProfilePress,
}) => {
    // Animation values for circle positions
    const profileCircleLeft = useRef(new Animated.Value(0)).current;
    const greenCircleLeft = useRef(new Animated.Value(10)).current;

    const handlePressIn = () => {
        // Animate circles to stack on blue circle (at left: 20)
        Animated.parallel([
            Animated.timing(profileCircleLeft, {
                toValue: 20,
                duration: 150,
                useNativeDriver: false,
            }),
            Animated.timing(greenCircleLeft, {
                toValue: 20,
                duration: 150,
                useNativeDriver: false,
            }),
        ]).start();
    };

    const handlePressOut = () => {
        // Animate circles back to original inline positions
        Animated.parallel([
            Animated.timing(profileCircleLeft, {
                toValue: 0,
                duration: 150,
                useNativeDriver: false,
            }),
            Animated.timing(greenCircleLeft, {
                toValue: 10,
                duration: 150,
                useNativeDriver: false,
            }),
        ]).start();
    };

    // Format number without decimals
    const formatNumber = (num: number): string => {
        return Math.round(num).toString();
    };

    return (
        <View style={[styles.container, { paddingTop: topInset + 12 }]}>
            {/* Macros and calories row */}
            <View style={styles.topRow}>
                <View style={styles.macroSection}>
                    <View style={styles.macroRow}>
                        <View style={styles.macroItem}>
                            <View style={[styles.macroDot, styles.proteinDot]} />
                            <Text style={styles.macroLabel}><Text style={styles.macroLetter}>P</Text> {formatNumber(protein)}g</Text>
                        </View>
                        <Text style={styles.separator}>|</Text>
                        <View style={styles.macroItem}>
                            <View style={[styles.macroDot, styles.carbsDot]} />
                            <Text style={styles.macroLabel}><Text style={styles.macroLetter}>C</Text> {formatNumber(carbs)}g</Text>
                        </View>
                        <Text style={styles.separator}>|</Text>
                        <View style={styles.macroItem}>
                            <View style={[styles.macroDot, styles.fatsDot]} />
                            <Text style={styles.macroLabel}><Text style={styles.macroLetter}>F</Text> {formatNumber(fats)}g</Text>
                        </View>
                    </View>
                    <View style={styles.caloriesRow}>
                        <Text style={styles.caloriesText}>{formatNumber(calories)}kcal</Text>
                    </View>
                </View>

                {/* User icon */}
                <TouchableOpacity
                    onPress={onProfilePress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    style={styles.profileButton}
                >
                    <View style={styles.profileContainer}>
                        <Animated.View style={[styles.profileCircle, { left: profileCircleLeft }]}>
                            <Image
                                source={require('../../assets/images/temp_pfp.png')}
                                style={styles.profileImage}
                                resizeMode="cover"
                            />
                        </Animated.View>
                        <Animated.View style={[styles.profileCircleGreen, { left: greenCircleLeft }]} />
                        <View style={styles.profileCircleBlue} />
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 0,
        paddingBottom: 20,
        paddingHorizontal: 25,
        zIndex: 10,
        marginTop: 0,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    macroSection: {
        flex: 1,
    },
    macroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: -4,
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
        fontSize: 24,
        fontFamily: fonts.regular,
        color: '#fff',
        textTransform: 'lowercase',
        marginBottom: 0,
    },
    macroLetter: {
        textTransform: 'uppercase',
    },
    separator: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: 'rgba(255, 255, 255, 0.5)',
        marginHorizontal: 12,
    },
    caloriesRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    caloriesText: {
        fontSize: 32,
        fontFamily: fonts.bold,
        color: '#fff',
        textTransform: 'lowercase',
    },
    profileButton: {
        marginLeft: 16,
    },
    profileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        width: 80, // Main circle (60px) + blue circle extends to 80px
    },
    profileCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#252525',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        zIndex: 3,
        overflow: 'hidden',
    },
    profileImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    profileCircleGreen: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#26F170',
        borderWidth: 2,
        borderColor: '#252525',
        position: 'absolute',
        zIndex: 2,
    },
    profileCircleBlue: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#4463F7',
        borderWidth: 2,
        borderColor: '#252525',
        position: 'absolute',
        left: 20,
        zIndex: 1,
    },
});

