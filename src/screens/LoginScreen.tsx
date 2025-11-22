import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Image,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { auth } from '../services/firebase';
import { getAuthErrorMessage, validateEmail } from '../utils/errorHandler';
import { fonts } from '../constants/fonts';

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
                            style={styles.input}
                            placeholder=""
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                setError(null);
                            }}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            placeholderTextColor="#999"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
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
                                secureTextEntry={false}
                                placeholderTextColor="#999"
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeIcon}
                            >
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color="#000"
                                />
                            </TouchableOpacity>
                        </View>
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
                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>sign in!</Text>
                        )}
                    </TouchableOpacity>
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
                    <TouchableOpacity
                        style={styles.googleButton}
                        onPress={handleGoogleLogin}
                        disabled={googleLoading}
                        activeOpacity={0.7}
                    >
                        {googleLoading ? (
                            <ActivityIndicator color="#4285F4" />
                        ) : (
                            <>
                                <Image
                                    source={require('../../assets/images/google_logo.png')}
                                    style={styles.googleLogo}
                                    resizeMode="contain"
                                />
                                <Text style={styles.googleButtonText}>continue with google</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View
                    style={{
                        opacity: linkFade,
                        transform: [{ translateY: linkSlide }],
                    }}
                >
                    <View style={styles.registerContainer}>
                        <Text style={styles.registerText}>don't have an account? </Text>
                        <TouchableOpacity
                            onPress={() => {
                                console.log('Navigating to Signup...');
                                navigation.push('Signup');
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.registerLink}>register here</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
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
        position: 'relative',
        overflow: 'hidden',
    },
    auraBallTopRight: {
        position: 'absolute',
        top: -250,
        right: -250,
        width: 500,
        height: 500,
    },
    auraBallBottomLeft: {
        position: 'absolute',
        bottom: -250,
        left: -250,
        width: 500,
        height: 500,
    },
    contentBox: {
        width: '100%',
        maxWidth: 400,
        zIndex: 1,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    title: {
        fontSize: 42,
        fontFamily: fonts.bold,
        color: '#000',
        textAlign: 'center',
        marginBottom: 8,
        textTransform: 'lowercase',
    },
    subtitle: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#ADADAD',
        textAlign: 'center',
        marginBottom: 20,
        textTransform: 'lowercase',
    },
    inputContainer: {
        marginBottom: 12,
        width: 360,
        alignSelf: 'center',
    },
    label: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#333',
        marginBottom: 5,
        textTransform: 'lowercase',
    },
    input: {
        backgroundColor: '#F5F5F5',
        borderWidth: 2,
        borderColor: '#000',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 15,
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#000',
        width: 360,
        height: 50,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderWidth: 2,
        borderColor: '#000',
        borderRadius: 10,
        width: 360,
        height: 50,
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 15,
        paddingVertical: 15,
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#000',
    },
    eyeIcon: {
        paddingRight: 15,
        paddingLeft: 10,
    },
    button: {
        backgroundColor: '#526EFF',
        borderWidth: 2,
        borderColor: '#000',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 5,
        marginBottom: 12,
        width: 360,
        height: 50,
        alignSelf: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 20,
        fontFamily: fonts.bold,
        textTransform: 'lowercase',
    },
    errorContainer: {
        backgroundColor: '#FFEBEE',
        borderColor: '#F44336',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 15,
        marginBottom: 15,
        marginTop: 5,
        width: 360,
        height: 50,
        alignSelf: 'center',
        justifyContent: 'center',
    },
    errorText: {
        color: '#C62828',
        fontSize: 18,
        textAlign: 'left',
        fontFamily: fonts.regular,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 12,
        width: 360,
        alignSelf: 'center',
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#ddd',
    },
    dividerText: {
        marginHorizontal: 15,
        color: '#666',
        fontSize: 18,
        fontFamily: fonts.regular,
    },
    googleButton: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#000',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        width: 360,
        height: 50,
        alignSelf: 'center',
    },
    googleLogo: {
        width: 20,
        height: 20,
        marginRight: 10,
    },
    googleButtonText: {
        color: '#000',
        fontSize: 20,
        fontFamily: fonts.regular,
    },
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    registerText: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#333',
        textTransform: 'lowercase',
    },
    registerLink: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#4285F4',
        textTransform: 'lowercase',
    },
});

