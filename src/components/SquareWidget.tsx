import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { fonts } from '../constants/fonts';

interface SquareWidgetProps {
    title?: string;
    content?: string;
    onPress?: () => void;
}

const screenWidth = Dimensions.get('window').width;
const containerPadding = 25 * 2; // Left + right padding
const widgetSpacing = 16; // Spacing between widgets
const availableWidth = screenWidth - containerPadding - widgetSpacing;
const widgetSize = availableWidth / 2; // Two widgets side by side

export const SquareWidget: React.FC<SquareWidgetProps> = ({
    title = "widget",
    content = "content",
    onPress
}) => {
    return (
        <View style={[styles.container, { width: widgetSize, height: widgetSize }]}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.content}>{content}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 2.5,
        borderColor: '#252525',
        padding: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 8,
    },
    content: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
        textAlign: 'center',
    },
});

