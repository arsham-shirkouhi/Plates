import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomNavBarProps {
    children: React.ReactNode;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ children }) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { bottom: 25 }]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 25, // Match container paddingLeft
        right: 25, // Match container paddingRight
        flexDirection: 'row',
        alignItems: 'flex-end', // Align buttons at bottom
        justifyContent: 'space-between',
        paddingTop: 16,
        zIndex: 50,
    },
});

