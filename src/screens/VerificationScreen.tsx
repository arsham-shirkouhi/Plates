import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Alert, Animated } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getAuthErrorMessage } from '../utils/errorHandler';
import { Button } from '../components/Button';
import { styles } from './VerificationScreen.styles';

type VerificationScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Verification'>;
type VerificationScreenRouteProp = RouteProp<RootStackParamList, 'Verification'>;

export const VerificationScreen: React.FC = () => {
    const { user, sendVerificationEmail, reloadUser, hasCompletedOnboarding } = useAuth();
    const navigation = useNavigation<VerificationScreenNavigationProp>();
    const route = useRoute<VerificationScreenRouteProp>();
    const emailFromRoute = route.params?.email;
    const [loading, setLoading] = useState(false);

    // Use email from route params (after signup) or from auth context (after login)
    const displayEmail = user?.email || emailFromRoute || 'your email address';
    const isSignedIn = !!user;

    // Rotation animations for aura balls
    const rotateTopRight = useRef(new Animated.Value(0)).current;
    const rotateBottomLeft = useRef(new Animated.Value(0)).current;

    // Load-in animations for individual elements
    const titleFade = useRef(new Animated.Value(0)).current;
    const titleSlide = useRef(new Animated.Value(20)).current;
    const subtitleFade = useRef(new Animated.Value(0)).current;
    const subtitleSlide = useRef(new Animated.Value(20)).current;
    const emailFade = useRef(new Animated.Value(0)).current;
    const emailSlide = useRef(new Animated.Value(20)).current;
    const instructionFade = useRef(new Animated.Value(0)).current;
    const instructionSlide = useRef(new Animated.Value(20)).current;
    const buttonFade = useRef(new Animated.Value(0)).current;
    const buttonSlide = useRef(new Animated.Value(20)).current;
    const linkFade = useRef(new Animated.Value(0)).current;
    const linkSlide = useRef(new Animated.Value(20)).current;

    // Function to start load-in animations
    const startLoadAnimations = () => {
        // Reset animation values
        titleFade.setValue(0);
        titleSlide.setValue(20);
        subtitleFade.setValue(0);
        subtitleSlide.setValue(20);
        emailFade.setValue(0);
        emailSlide.setValue(20);
        instructionFade.setValue(0);
        instructionSlide.setValue(20);
        buttonFade.setValue(0);
        buttonSlide.setValue(20);
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
        createAnimation(emailFade, emailSlide, 40).start();
        createAnimation(instructionFade, instructionSlide, 60).start();
        createAnimation(linkFade, linkSlide, 80).start();
        createAnimation(buttonFade, buttonSlide, 100).start();
    };

    useEffect(() => {
        // Start aura ball rotations
        const topRightRotation = Animated.loop(
            Animated.timing(rotateTopRight, {
                toValue: 1,
                duration: 20000,
                useNativeDriver: true,
            })
        );
        const bottomLeftRotation = Animated.loop(
            Animated.timing(rotateBottomLeft, {
                toValue: 1,
                duration: 25000,
                useNativeDriver: true,
            })
        );

        topRightRotation.start();
        bottomLeftRotation.start();

        // Start load-in animations
        startLoadAnimations();

        return () => {
            topRightRotation.stop();
            bottomLeftRotation.stop();
        };
    }, []);

    // Check if email is verified when screen is focused or user changes
    useFocusEffect(
        React.useCallback(() => {
            startLoadAnimations();

            const checkVerification = async () => {
                if (user) {
                    const updatedUser = await reloadUser();
                    if (updatedUser?.emailVerified) {
                        // Email is verified, check onboarding status
                        const onboardingCompleted = await hasCompletedOnboarding();
                        if (!onboardingCompleted) {
                            console.log('Email verified, navigating to Onboarding...');
                            setTimeout(() => {
                                navigation.replace('Onboarding');
                            }, 500);
                        } else {
                            console.log('Email verified, navigating to Home...');
                            setTimeout(() => {
                                navigation.replace('Home');
                            }, 500);
                        }
                    }
                }
            };

            // Check immediately
            checkVerification();

            // Set up interval to check every 3 seconds
            const interval = setInterval(checkVerification, 3000);

            return () => clearInterval(interval);
        }, [user, reloadUser, hasCompletedOnboarding, navigation])
    );

    const topRightRotation = rotateTopRight.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const bottomLeftRotation = rotateBottomLeft.interpolate({
        inputRange: [0, 1],
        outputRange: ['360deg', '0deg'], // Rotate opposite direction
    });

    const handleResendEmail = async () => {
        if (!isSignedIn) {
            Alert.alert(
                'Sign In Required',
                'Please log in first to resend the verification email. After logging in, you can resend the email from this screen.'
            );
            return;
        }

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
                    <Text style={styles.title}>verify your email</Text>
                </Animated.View>

                <Animated.View
                    style={{
                        opacity: subtitleFade,
                        transform: [{ translateY: subtitleSlide }],
                    }}
                >
                    <Text style={styles.subtitle}>we've sent a verification email to:</Text>
                </Animated.View>

                <Animated.View
                    style={{
                        opacity: emailFade,
                        transform: [{ translateY: emailSlide }],
                    }}
                >
                    <Text style={styles.email}>{displayEmail}</Text>
                </Animated.View>

                <Animated.View
                    style={{
                        opacity: instructionFade,
                        transform: [{ translateY: instructionSlide }],
                    }}
                >
                    <Text style={styles.instruction}>
                        please check your inbox and click the verification link to activate your account.
                        {'\n\n'}if you don't see the email, check your spam/junk folder. you can resend the email after a few minutes if needed.
                    </Text>
                </Animated.View>

                <Animated.View
                    style={{
                        opacity: buttonFade,
                        transform: [{ translateY: buttonSlide }],
                    }}
                >
                    <Button
                        variant="primary"
                        title="resend email"
                        onPress={handleResendEmail}
                        loading={loading}
                        disabled={loading}
                    />
                </Animated.View>

                <Animated.View
                    style={{
                        opacity: linkFade,
                        transform: [{ translateY: linkSlide }],
                    }}
                >
                    <Button
                        variant="link"
                        title="back to login"
                        onPress={() => {
                            console.log('Navigating to Login...');
                            navigation.navigate('Login');
                        }}
                        textStyle={styles.backToLoginText}
                    />
                </Animated.View>
            </View>
        </View>
    );
};

