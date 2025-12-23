import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AddFoodProvider } from './src/context/AddFoodContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import 'react-native-gesture-handler';

const AppContent: React.FC = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return <AppNavigator user={user} />;
};

export default function App() {
    const [fontsLoaded, setFontsLoaded] = useState(false);

    const [loaded] = useFonts({
        'JUST_Sans_Regular': require('./assets/fonts/JUST_Sans_Regular.otf'),
        'JUST_Sans_ExBold': require('./assets/fonts/JUST_Sans_ExBold.otf'),
    });

    useEffect(() => {
        if (loaded) {
            setFontsLoaded(true);
        }
    }, [loaded]);

    if (!fontsLoaded) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <AuthProvider>
                <AddFoodProvider>
                    <AppContent />
                </AddFoodProvider>
            </AuthProvider>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
});

