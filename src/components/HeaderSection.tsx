import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/fonts';

interface HeaderSectionProps {
    streak: number;
    topInset?: number;
    onProfilePress?: () => void;
}

export const HeaderSection: React.FC<HeaderSectionProps> = ({ streak, topInset = 0, onProfilePress }) => {
    return (
        <View style={[styles.container, { paddingTop: topInset + 20 }]}>
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
                <TouchableOpacity onPress={onProfilePress} style={styles.profileButton}>
                    <View style={styles.profileCircle}>
                        <View style={styles.profileInnerCircle}>
                            <Ionicons name="person" size={20} color="#526EFF" />
                        </View>
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
        paddingTop: 20,
        paddingBottom: 20,
        zIndex: 1,
        marginTop: -250,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    streakSection: {
        flex: 1,
    },
    streakLabel: {
        fontSize: 24,
        fontFamily: fonts.regular,
        color: '#fff',
        textTransform: 'lowercase',
        marginBottom: 5,
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
    profileCircle: {
        width: 61,
        height: 61,
        borderRadius: 30.5,
        backgroundColor: '#fff',
        borderWidth: 3,
        borderColor: '#26F170',
        justifyContent: 'center',
        alignItems: 'center',
        // Outer blue ring
        shadowColor: '#526EFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 4,
    },
    profileInnerCircle: {
        width: 51,
        height: 51,
        borderRadius: 25.5,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

