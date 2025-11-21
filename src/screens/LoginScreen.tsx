import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { auth } from '../services/firebase';
import { getAuthErrorMessage, validateEmail } from '../utils/errorHandler';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { login, loginWithGoogle, reloadUser } = useAuth();
    const navigation = useNavigation<LoginScreenNavigationProp>();

    const handleLogin = async () => {
        setError(null);

        if (!email || !password) {
            const errorMsg = 'Please fill in all fields';
            setError(errorMsg);
            Alert.alert('Error', errorMsg);
            return;
        }

        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            const errorMsg = emailValidation.message || 'Invalid email';
            setError(errorMsg);
            Alert.alert('Invalid Email', errorMsg);
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
            const updatedUser = await reloadUser();
            console.log('Login successful, user verified:', updatedUser?.emailVerified);
            if (updatedUser) {
                if (updatedUser.emailVerified) {
                    console.log('Navigating to Home...');
                    setTimeout(() => {
                        navigation.replace('Home');
                    }, 100);
                } else {
                    console.log('Navigating to Verification...');
                    setTimeout(() => {
                        navigation.replace('Verification');
                    }, 100);
                }
            }
        } catch (error: any) {
            console.error('Login error:', error);
            const errorMessage = getAuthErrorMessage(error);
            setError(errorMessage);
            Alert.alert('Login Failed', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError(null);
        setGoogleLoading(true);
        try {
            await loginWithGoogle();
            const updatedUser = await reloadUser();
            console.log('Google login successful, user verified:', updatedUser?.emailVerified);
            if (updatedUser) {
                setTimeout(() => {
                    navigation.replace('Home');
                }, 100);
            }
        } catch (error: any) {
            console.error('Google login error:', error);
            const errorMessage = error?.message || 'Google sign-in failed. Please try again.';
            setError(errorMessage);
            Alert.alert('Google Sign-In Failed', errorMessage);
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>
            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={(text) => {
                    setEmail(text);
                    setError(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={(text) => {
                    setPassword(text);
                    setError(null);
                }}
                secureTextEntry
            />
            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}
            <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.7}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Login</Text>
                )}
            </TouchableOpacity>
            <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
            </View>
            <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleLogin}
                disabled={googleLoading}
                activeOpacity={0.7}
            >
                {googleLoading ? (
                    <ActivityIndicator color="#4285F4" />
                ) : (
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                )}
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.linkButton}
                onPress={() => {
                    console.log('Navigating to Signup...');
                    navigation.navigate('Signup');
                }}
                activeOpacity={0.7}
            >
                <Text style={styles.linkText}>Don't have an account? Sign up</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 15,
        marginBottom: 15,
        borderRadius: 8,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    linkButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    linkText: {
        color: '#007AFF',
        fontSize: 14,
    },
    errorContainer: {
        backgroundColor: '#FFEBEE',
        borderColor: '#F44336',
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        marginTop: 5,
    },
    errorText: {
        color: '#C62828',
        fontSize: 14,
        textAlign: 'center',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#ddd',
    },
    dividerText: {
        marginHorizontal: 15,
        color: '#666',
        fontSize: 14,
    },
    googleButton: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
    },
    googleButtonText: {
        color: '#4285F4',
        fontSize: 16,
        fontWeight: '600',
    },
});

