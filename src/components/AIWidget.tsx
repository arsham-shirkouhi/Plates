import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/fonts';

interface AIWidgetProps {
    title?: string;
    message?: string;
    onPress?: () => void;
}

export const AIWidget: React.FC<AIWidgetProps> = ({
    title = "hey it's cal!",
    message = "you're 22g low on protein today.\nwould you like to add a snack to\nreach your goal?",
    onPress
}) => {
    return (
        <LinearGradient
            colors={['#526EFF', '#3B58F2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.container}
        >
            {/* Top right icon - cal icon */}
            <View style={styles.topRightIcon}>
                <Image
                    source={require('../../assets/images/icons/cal_icon.png')}
                    style={styles.calIcon}
                    resizeMode="contain"
                />
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.title}>
                    hey it's cal!
                </Text>
                <Text style={styles.message}>{message}</Text>
            </View>

            {/* Bottom right AI icon */}
            <View style={styles.bottomRightIcon}>
                <Image
                    source={require('../../assets/images/icons/ai_icon.png')}
                    style={styles.aiIcon}
                    resizeMode="contain"
                />
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 10,
        borderWidth: 2.5,
        borderColor: '#252525',
        paddingHorizontal: 15,
        paddingTop: 10,
        paddingBottom: 10,
        marginTop: 16,
        position: 'relative',
    },
    topRightIcon: {
        position: 'absolute',
        top: 10,
        right: 15,
        zIndex: 1,
    },
    calIcon: {
        width: 24,
        height: 24,
    },
    content: {
        paddingRight: 40,
    },
    title: {
        fontSize: 18,
        fontFamily: fonts.bold,
        fontWeight: 'bold',
        color: '#fff',
        textTransform: 'lowercase',
        marginBottom: 5,
    },
    message: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#fff',
        textTransform: 'lowercase',
        lineHeight: 22,
    },
    bottomRightIcon: {
        position: 'absolute',
        bottom: 10,
        right: 15,
        zIndex: 1,
    },
    aiIcon: {
        width: 24,
        height: 24,
    },
});

