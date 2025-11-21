import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { auth } from '../services/firebase';
import { getAuthErrorMessage } from '../utils/errorHandler';

type VerificationScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Verification'>;

export const VerificationScreen: React.FC = () => {
    const { user, sendVerificationEmail, reloadUser } = useAuth();
    const navigation = useNavigation<VerificationScreenNavigationProp>();
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);

    const handleResendEmail = async () => {
        setLoading(true);
        try {
            await sendVerificationEmail();
            Alert.alert('Success', 'Verification email sent! Please check your inbox and spam folder.');
        } catch (error: any) {
            console.error('Send verification email error:', error);
            const errorMessage = getAuthErrorMessage(error);
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckVerification = async () => {
        setChecking(true);
        try {
            console.log('Checking verification status...');
            const updatedUser = await reloadUser();
            console.log('Updated user:', updatedUser?.emailVerified);
            if (updatedUser?.emailVerified) {
                console.log('Email verified, navigating to Home...');
                setTimeout(() => {
                    navigation.replace('Home');
                }, 100);
            } else {
                Alert.alert('Not Verified', 'Your email is not yet verified. Please check your inbox and click the verification link.');
            }
        } catch (error: any) {
            console.error('Check verification error:', error);
            Alert.alert('Error', 'Failed to check verification status');
        } finally {
            setChecking(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
                We've sent a verification email to:
            </Text>
            <Text style={styles.email}>{user?.email}</Text>
            <Text style={styles.instruction}>
                Please check your inbox and click the verification link to activate your account.
                {'\n\n'}If you don't see the email, check your spam folder. You can resend the email after a few minutes if needed.
            </Text>
            <TouchableOpacity
                style={styles.button}
                onPress={handleResendEmail}
                disabled={loading}
                activeOpacity={0.7}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Resend Verification Email</Text>
                )}
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleCheckVerification}
                disabled={checking}
                activeOpacity={0.7}
            >
                {checking ? (
                    <ActivityIndicator color="#007AFF" />
                ) : (
                    <Text style={styles.secondaryButtonText}>I've Verified My Email</Text>
                )}
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.linkButton}
                onPress={() => {
                    console.log('Navigating to Login...');
                    navigation.navigate('Login');
                }}
                activeOpacity={0.7}
            >
                <Text style={styles.linkText}>Back to Login</Text>
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
        marginBottom: 20,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 10,
        textAlign: 'center',
    },
    email: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
        marginBottom: 30,
        textAlign: 'center',
    },
    instruction: {
        fontSize: 14,
        color: '#666',
        marginBottom: 30,
        textAlign: 'center',
        lineHeight: 20,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 15,
    },
    secondaryButton: {
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
    },
    linkButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    linkText: {
        color: '#FF3B30',
        fontSize: 14,
    },
});

