import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Alert,
    Animated,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { auth } from '../services/firebase';
import { getAuthErrorMessage, validateEmail } from '../utils/errorHandler';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { styles } from './LoginScreen.styles';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { login, loginWithGoogle, reloadUser } = useAuth();
    const navigation = useNavigation<LoginScreenNavigationProp>();

    // Rotation animations for aura balls
    const rotateTopRight = useRef(new Animated.Value(0)).current;
    const rotateBottomLeft = useRef(new Animated.Value(0)).current;

    // Load-in animations for individual elements
    const titleFade = useRef(new Animated.Value(0)).current;
    const titleSlide = useRef(new Animated.Value(20)).current;
    const subtitleFade = useRef(new Animated.Value(0)).current;
    const subtitleSlide = useRef(new Animated.Value(20)).current;
    const inputsFade = useRef(new Animated.Value(0)).current;
    const inputsSlide = useRef(new Animated.Value(20)).current;
    const buttonFade = useRef(new Animated.Value(0)).current;
    const buttonSlide = useRef(new Animated.Value(20)).current;
    const dividerFade = useRef(new Animated.Value(0)).current;
    const dividerSlide = useRef(new Animated.Value(20)).current;
    const googleFade = useRef(new Animated.Value(0)).current;
    const googleSlide = useRef(new Animated.Value(20)).current;
    const forgotPasswordFade = useRef(new Animated.Value(0)).current;
    const forgotPasswordSlide = useRef(new Animated.Value(20)).current;
    const linkFade = useRef(new Animated.Value(0)).current;
    const linkSlide = useRef(new Animated.Value(20)).current;

    // Function to start load-in animations
    const startLoadAnimations = () => {
        // Reset animation values
        titleFade.setValue(0);
        titleSlide.setValue(20);
        subtitleFade.setValue(0);
        subtitleSlide.setValue(20);
        inputsFade.setValue(0);
        inputsSlide.setValue(20);
        buttonFade.setValue(0);
        buttonSlide.setValue(20);
        dividerFade.setValue(0);
        dividerSlide.setValue(20);
        googleFade.setValue(0);
        googleSlide.setValue(20);
        forgotPasswordFade.setValue(0);
        forgotPasswordSlide.setValue(20);
        linkFade.setValue(0);
        linkSlide.setValue(20);

        // Staggered load-in animations with subtle delays
        const createAnimation = (fade: Animated.Value, slide: Animated.Value, delay: number) => {
            return Animated.parallel([
                Animated.timing(fade, {
                    toValue: 1,
                    duration: 400,
                    delay: delay,
                    useNativeDriver: true,
                }),
                Animated.timing(slide, {
                    toValue: 0,
                    duration: 400,
                    delay: delay,
                    useNativeDriver: true,
                }),
            ]);
        };

        // Start all animations in parallel with very small delays
        createAnimation(titleFade, titleSlide, 0).start();
        createAnimation(subtitleFade, subtitleSlide, 20).start();
        createAnimation(inputsFade, inputsSlide, 40).start();
        createAnimation(buttonFade, buttonSlide, 60).start();
        createAnimation(dividerFade, dividerSlide, 80).start();
        createAnimation(googleFade, googleSlide, 100).start();
        createAnimation(forgotPasswordFade, forgotPasswordSlide, 120).start();
        createAnimation(linkFade, linkSlide, 140).start();
    };

    useEffect(() => {
        // Top right rotation - slow continuous rotation
        Animated.loop(
            Animated.timing(rotateTopRight, {
                toValue: 1,
                duration: 30000, // 30 seconds for full rotation (very slow)
                useNativeDriver: true,
            })
        ).start();

        // Bottom left rotation - slow continuous rotation (opposite direction)
        Animated.loop(
            Animated.timing(rotateBottomLeft, {
                toValue: 1,
                duration: 30000, // 30 seconds for full rotation (very slow)
                useNativeDriver: true,
            })
        ).start();
    }, []);

    // Trigger animations when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            startLoadAnimations();
        }, [])
    );

    const topRightRotation = rotateTopRight.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const bottomLeftRotation = rotateBottomLeft.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '-360deg'], // Rotate opposite direction
    });

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
                        navigation.replace('Verification', {});
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
            <Animated.Image
                source={require('../../assets/images/aura_ball.png')}
                style={[
                    styles.auraBallTopRight,
                    { transform: [{ rotate: topRightRotation }] }
                ]}
                resizeMode="contain"
            />
            <Animated.Image
                source={require('../../assets/images/aura_ball.png')}
                style={[
                    styles.auraBallBottomLeft,
                    { transform: [{ rotate: bottomLeftRotation }] }
                ]}
                resizeMode="contain"
            />
            <View style={styles.contentBox}>
                <Animated.View
                    style={{
                        opacity: titleFade,
                        transform: [{ translateY: titleSlide }],
                    }}
                >
                    <Text style={styles.title}>sign in!</Text>
                </Animated.View>
                <Animated.View
                    style={{
                        opacity: subtitleFade,
                        transform: [{ translateY: subtitleSlide }],
                    }}
                >
                    <Text style={styles.subtitle}>enter your account details</Text>
                </Animated.View>

                <Animated.View
                    style={{
                        opacity: inputsFade,
                        transform: [{ translateY: inputsSlide }],
                    }}
                >
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>email</Text>
                        <TextInput
                            placeholder=""
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                setError(null);
                            }}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>password</Text>
                        <TextInput
                            variant="password"
                            placeholder=""
                            value={showPassword ? password : '*'.repeat(password.length)}
                            onChangeText={(text) => {
                                if (showPassword) {
                                    setPassword(text);
                                } else {
                                    // When masked, handle input changes
                                    const currentLength = password.length;
                                    if (text.length > currentLength) {
                                        // User is adding a character - append the last character typed
                                        const newChar = text.slice(-1);
                                        setPassword(password + newChar);
                                    } else if (text.length < currentLength) {
                                        // User is deleting - remove last character
                                        setPassword(password.slice(0, text.length));
                                    }
                                }
                                setError(null);
                            }}
                            showPasswordToggle={true}
                            isPasswordVisible={showPassword}
                            onTogglePassword={() => setShowPassword(!showPassword)}
                        />
                    </View>
                </Animated.View>

                <Animated.View
                    style={{
                        opacity: forgotPasswordFade,
                        transform: [{ translateY: forgotPasswordSlide }],
                    }}
                >
                    <View style={styles.errorForgotContainer}>
                        <View style={styles.errorContainer}>
                            {error && (
                                <Text style={styles.errorText}>{error}</Text>
                            )}
                        </View>
                        <Button
                            variant="link"
                            title="forgot password?"
                            onPress={() => {
                                console.log('Navigating to ForgotPassword...');
                                navigation.navigate('ForgotPassword');
                            }}
                            textStyle={styles.forgotPasswordLink}
                            containerStyle={styles.forgotPasswordContainer}
                        />
                    </View>
                </Animated.View>

                <Animated.View
                    style={{
                        opacity: buttonFade,
                        transform: [{ translateY: buttonSlide }],
                    }}
                >
                    <Button
                        variant="primary"
                        title="sign in!"
                        onPress={handleLogin}
                        loading={loading}
                        disabled={loading}
                    />
                </Animated.View>

                <Animated.View
                    style={{
                        opacity: dividerFade,
                        transform: [{ translateY: dividerSlide }],
                    }}
                >
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                    </View>
                </Animated.View>

                <Animated.View
                    style={{
                        opacity: googleFade,
                        transform: [{ translateY: googleSlide }],
                    }}
                >
                    <Button
                        variant="google"
                        title="continue with google"
                        onPress={handleGoogleLogin}
                        loading={googleLoading}
                        disabled={googleLoading}
                        icon={require('../../assets/images/google_logo.png')}
                    />
                </Animated.View>

                <Animated.View
                    style={{
                        opacity: linkFade,
                        transform: [{ translateY: linkSlide }],
                    }}
                >
                    <View style={styles.registerContainer}>
                        <Text style={styles.registerText}>don't have an account? </Text>
                        <Button
                            variant="link"
                            title="register here"
                            onPress={() => {
                                console.log('Navigating to Signup...');
                                navigation.push('Signup');
                            }}
                            textStyle={styles.registerLink}
                        />
                    </View>
                </Animated.View>
            </View>
        </View>
    );
};


