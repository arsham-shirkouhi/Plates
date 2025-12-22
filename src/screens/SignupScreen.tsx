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
import { getAuthErrorMessage, validateEmail, validatePassword } from '../utils/errorHandler';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { styles } from './SignupScreen.styles';

type SignupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

export const SignupScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { signup, loginWithGoogle, reloadUser } = useAuth();
    const navigation = useNavigation<SignupScreenNavigationProp>();

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
        createAnimation(linkFade, linkSlide, 120).start();
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

    const handleSignup = async () => {
        setError(null);

        if (!email || !password || !confirmPassword) {
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

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            const errorMsg = passwordValidation.message || 'Invalid password';
            setError(errorMsg);
            Alert.alert('Invalid Password', errorMsg);
            return;
        }

        if (password !== confirmPassword) {
            const errorMsg = 'Passwords do not match. Please try again.';
            setError(errorMsg);
            Alert.alert('Error', errorMsg);
            return;
        }

        setLoading(true);
        try {
            await signup(email, password);
            navigation.navigate('Verification', { email });
        } catch (error: any) {
            console.error('Signup error:', error);
            const errorMessage = getAuthErrorMessage(error);
            setError(errorMessage);
            Alert.alert('Signup Failed', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setError(null);
        setGoogleLoading(true);
        try {
            await loginWithGoogle();
            const updatedUser = await reloadUser();
            console.log('Google signup successful, user verified:', updatedUser?.email_confirmed_at ? 'Yes' : 'No');
            if (updatedUser) {
                setTimeout(() => {
                    navigation.replace('Home');
                }, 100);
            }
        } catch (error: any) {
            console.error('Google signup error:', error);
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
                    <Text style={styles.title}>sign up!</Text>
                </Animated.View>
                <Animated.View
                    style={{
                        opacity: subtitleFade,
                        transform: [{ translateY: subtitleSlide }],
                    }}
                >
                    <Text style={styles.subtitle}>create your account</Text>
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

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>confirm password</Text>
                        <TextInput
                            variant="password"
                            placeholder=""
                            value={showConfirmPassword ? confirmPassword : '*'.repeat(confirmPassword.length)}
                            onChangeText={(text) => {
                                if (showConfirmPassword) {
                                    setConfirmPassword(text);
                                } else {
                                    // When masked, handle input changes
                                    const currentLength = confirmPassword.length;
                                    if (text.length > currentLength) {
                                        // User is adding a character - append the last character typed
                                        const newChar = text.slice(-1);
                                        setConfirmPassword(confirmPassword + newChar);
                                    } else if (text.length < currentLength) {
                                        // User is deleting - remove last character
                                        setConfirmPassword(confirmPassword.slice(0, text.length));
                                    }
                                }
                                setError(null);
                            }}
                            showPasswordToggle={true}
                            isPasswordVisible={showConfirmPassword}
                            onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                        />
                    </View>

                    {error && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}
                </Animated.View>

                <Animated.View
                    style={{
                        opacity: buttonFade,
                        transform: [{ translateY: buttonSlide }],
                    }}
                >
                    <Button
                        variant="primary"
                        title="sign up!"
                        onPress={handleSignup}
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
                        onPress={handleGoogleSignup}
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
                        <Text style={styles.registerText}>already have an account? </Text>
                        <Button
                            variant="link"
                            title="login"
                            onPress={() => {
                                console.log('Navigating to Login...');
                                navigation.goBack();
                            }}
                            textStyle={styles.registerLink}
                        />
                    </View>
                </Animated.View>
            </View>
        </View>
    );
};


