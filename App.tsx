import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AddFoodProvider } from './src/context/AddFoodContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import 'react-native-gesture-handler';

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorTitle}>Something went wrong</Text>
                    <Text style={styles.errorText}>{this.state.error?.message}</Text>
                    <Text style={styles.errorHint}>Check the console for more details</Text>
                </View>
            );
        }

        return this.props.children;
    }
}

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
        <ErrorBoundary>
            <SafeAreaProvider>
                <AuthProvider>
                    <AddFoodProvider>
                        <AppContent />
                    </AddFoodProvider>
                </AuthProvider>
            </SafeAreaProvider>
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 20,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FF3B30',
        marginBottom: 10,
    },
    errorText: {
        fontSize: 16,
        color: '#000',
        textAlign: 'center',
        marginBottom: 10,
    },
    errorHint: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
});

