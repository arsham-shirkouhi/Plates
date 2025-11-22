import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Alert, Animated } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getAuthErrorMessage, validateEmail } from '../utils/errorHandler';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { styles } from './ForgotPasswordScreen.styles';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC = () => {
    const { resetPassword } = useAuth();
    const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    // Rotation animations for aura balls
    const rotateTopRight = useRef(new Animated.Value(0)).current;
    const rotateBottomLeft = useRef(new Animated.Value(0)).current;

    // Load-in animations for individual elements
    const titleFade = useRef(new Animated.Value(0)).current;
    const titleSlide = useRef(new Animated.Value(20)).current;
    const subtitleFade = useRef(new Animated.Value(0)).current;
    const subtitleSlide = useRef(new Animated.Value(20)).current;
    const inputFade = useRef(new Animated.Value(0)).current;
    const inputSlide = useRef(new Animated.Value(20)).current;
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
        inputFade.setValue(0);
        inputSlide.setValue(20);
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
        createAnimation(inputFade, inputSlide, 40).start();
        createAnimation(buttonFade, buttonSlide, 60).start();
        createAnimation(linkFade, linkSlide, 80).start();
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
        outputRange: ['360deg', '0deg'], // Rotate opposite direction
    });

    const handleResetPassword = async () => {
        if (!email) {
            Alert.alert('Error', 'Please enter your email address');
            return;
        }

        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            Alert.alert('Invalid Email', emailValidation.message || 'Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            await resetPassword(email);
            setEmailSent(true);
            Alert.alert(
                'Email Sent',
                'Password reset instructions have been sent to your email. Please check your inbox and spam folder.'
            );
        } catch (error: any) {
            console.error('Reset password error:', error);
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
                    <Text style={styles.title}>forgot password?</Text>
                </Animated.View>

                <Animated.View
                    style={{
                        opacity: subtitleFade,
                        transform: [{ translateY: subtitleSlide }],
                    }}
                >
                    <Text style={styles.subtitle}>
                        {emailSent
                            ? 'check your email for reset instructions'
                            : "enter your email and we'll send you reset instructions"}
                    </Text>
                </Animated.View>

                {!emailSent && (
                    <Animated.View
                        style={{
                            opacity: inputFade,
                            transform: [{ translateY: inputSlide }],
                        }}
                    >
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>email</Text>
                            <TextInput
                                placeholder=""
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </Animated.View>
                )}

                {!emailSent && (
                    <Animated.View
                        style={{
                            opacity: buttonFade,
                            transform: [{ translateY: buttonSlide }],
                        }}
                    >
                        <Button
                            variant="primary"
                            title="send reset link"
                            onPress={handleResetPassword}
                            loading={loading}
                            disabled={loading}
                        />
                    </Animated.View>
                )}

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
                            navigation.goBack();
                        }}
                        textStyle={styles.backToLoginText}
                    />
                </Animated.View>
            </View>
        </View>
    );
};

