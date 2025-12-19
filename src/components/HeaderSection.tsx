import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/fonts';

interface HeaderSectionProps {
    streak: number;
    topInset?: number;
    onProfilePress?: () => void;
}

export const HeaderSection: React.FC<HeaderSectionProps> = ({ streak, topInset = 0, onProfilePress }) => {
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

    return (
        <View style={[styles.container, { paddingTop: 12 }]}>
            {/* Streak and date row */}
            <View style={styles.topRow}>
                <View style={styles.streakSection}>
                    <Text style={styles.streakLabel}>
                        keep your <Text style={styles.streakNumber}>{streak}</Text> day streak!
                    </Text>
                    <View style={styles.dateRow}>
                        <Text style={styles.dateText}>today</Text>
                        <Ionicons name="chevron-down" size={20} color="#fff" style={styles.chevron} />
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
        position: 'relative',
        // paddingHorizontal: 25,
        paddingTop: 0,
        paddingBottom: 20,
        zIndex: 1,
        marginTop: -250,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    streakSection: {
        flex: 1,
    },
    streakLabel: {
        fontSize: 24,
        fontFamily: fonts.regular,
        color: '#fff',
        textTransform: 'lowercase',
        marginBottom: -4,
    },
    streakNumber: {
        fontFamily: fonts.bold,
        fontWeight: 'bold',
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 32,
        fontFamily: fonts.bold,
        color: '#fff',
        textTransform: 'lowercase',
    },
    chevron: {
        marginLeft: 8,
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
        borderWidth: 3,
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
        borderWidth: 3,
        borderColor: '#252525',
        position: 'absolute',
        zIndex: 2,
    },
    profileCircleBlue: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#4463F7',
        borderWidth: 3,
        borderColor: '#252525',
        position: 'absolute',
        left: 20,
        zIndex: 1,
    },
});

