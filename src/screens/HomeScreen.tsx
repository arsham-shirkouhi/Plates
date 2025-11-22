import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Button } from '../components/Button';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
    const { user, logout } = useAuth();
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            console.log('Logging out...');
            await logout();
            console.log('Logout successful, navigating to Login...');
            setTimeout(() => {
                navigation.replace('Login');
            }, 100);
        } catch (error: any) {
            console.error('Logout error:', error);
            Alert.alert('Logout Error', 'Failed to logout. Please try again.');
        } finally {
            setLoggingOut(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Home</Text>
            <Text style={styles.subtitle}>Welcome, {user?.email}</Text>
            <Button
                variant="primary"
                title="Logout"
                onPress={handleLogout}
                loading={loggingOut}
                disabled={loggingOut}
                containerStyle={styles.button}
                textStyle={styles.buttonText}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 30,
    },
    button: {
        backgroundColor: '#FF3B30',
        padding: 15,
        borderRadius: 8,
        minWidth: 120,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

