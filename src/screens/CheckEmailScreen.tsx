import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type CheckEmailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CheckEmail'>;
type CheckEmailScreenRouteProp = RouteProp<RootStackParamList, 'CheckEmail'>;

export const CheckEmailScreen: React.FC = () => {
    const navigation = useNavigation<CheckEmailScreenNavigationProp>();
    const route = useRoute<CheckEmailScreenRouteProp>();
    const email = route.params?.email;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
                We've sent a verification email to:
            </Text>
            <Text style={styles.email}>{email || 'your email address'}</Text>
            <Text style={styles.instruction}>
                Please check your inbox and click the verification link to activate your account.
                {'\n\n'}After verifying your email, you can log in to the app.
            </Text>
            <Text style={styles.note}>
                Don't see the email? Check your spam folder.
            </Text>
            <TouchableOpacity
                style={styles.button}
                onPress={() => {
                    console.log('Navigating to Login...');
                    navigation.navigate('Login');
                }}
                activeOpacity={0.7}
            >
                <Text style={styles.buttonText}>Go to Login</Text>
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
        marginBottom: 15,
        textAlign: 'center',
        lineHeight: 20,
    },
    note: {
        fontSize: 12,
        color: '#999',
        marginBottom: 30,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

