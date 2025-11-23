import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Animated, ScrollView, TouchableOpacity, Alert, PanResponder, Easing, Image, StyleSheet, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { TextInput as RNTextInput } from 'react-native';
import { Slider } from '../components/Slider';
import { styles } from './OnboardingScreen.styles';
import { fonts } from '../constants/fonts';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { saveOnboardingData, OnboardingData as OnboardingDataType, hasCompletedOnboarding, checkUsernameExists } from '../services/userService';

type OnboardingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

interface OnboardingData {
    name: string;
    birthMonth: number;
    birthDay: number;
    birthYear: number;
    sex: 'male' | 'female' | 'other' | '';
    height: number;
    heightUnit: 'cm' | 'ft';
    weight: number;
    weightUnit: 'kg' | 'lbs';
    goal: 'lose' | 'maintain' | 'build' | '';
    activityLevel: 'sedentary' | 'lightly' | 'moderate' | 'very' | '';
    dietPreference: 'regular' | 'high-protein' | 'vegetarian' | 'vegan' | 'keto' | 'halal' | '';
    allergies: string[];
    goalIntensity: 'mild' | 'moderate' | 'aggressive' | '';
    unitPreference: { weight: 'kg' | 'lbs'; height: 'cm' | 'ft' };
    purpose: 'meals' | 'workouts' | 'both' | 'discipline' | '';
    macrosSetup: 'auto' | 'manual' | '';
    customMacros?: {
        protein: number;
        carbs: number;
        fats: number;
    };
}

const TOTAL_STEPS = 14;

export const OnboardingScreen: React.FC = () => {
    const navigation = useNavigation<OnboardingScreenNavigationProp>();
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [usernameError, setUsernameError] = useState<string>('');
    const [checkingUsername, setCheckingUsername] = useState(false);
    const usernameCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [data, setData] = useState<OnboardingData>({
        name: '',
        birthMonth: 0,
        birthDay: 0,
        birthYear: 0,
        sex: '',
        height: 170,
        heightUnit: 'cm',
        weight: 70,
        weightUnit: 'kg',
        goal: '',
        activityLevel: '',
        dietPreference: '',
        allergies: [],
        goalIntensity: '',
        unitPreference: { weight: 'kg', height: 'cm' },
        purpose: '',
        macrosSetup: '',
    });

    // Animation refs
    const contentFade = useRef(new Animated.Value(1)).current;
    const contentSlide = useRef(new Animated.Value(0)).current;
    const contentScale = useRef(new Animated.Value(1)).current;
    const unitToggleSlide = useRef(new Animated.Value(data.heightUnit === 'cm' ? 0 : 1)).current;
    const weightUnitToggleSlide = useRef(new Animated.Value(data.weightUnit === 'kg' ? 0 : 1)).current;

    // Welcome step animation refs
    const welcomeTextOpacity = useRef(new Animated.Value(0)).current;
    const welcomeTextScale = useRef(new Animated.Value(0.8)).current;
    const welcomeTextTranslateY = useRef(new Animated.Value(-20)).current;
    const welcomeLogoOpacity = useRef(new Animated.Value(0)).current;
    const welcomeLogoScale = useRef(new Animated.Value(0.5)).current;

    // Rotation animations for aura balls
    const rotateTopRight = useRef(new Animated.Value(0)).current;
    const rotateBottomLeft = useRef(new Animated.Value(0)).current;

    // Animation refs for weight plates fill animation
    const weightPlateAnimations = useRef(
        Array.from({ length: TOTAL_STEPS }, () => ({
            scale: new Animated.Value(0.8),
            opacity: new Animated.Value(0.3),
        }))
    ).current;
    const previousStep = useRef(1);

    // Animation refs for sex cards
    const maleCardTranslateY = useRef(new Animated.Value(0)).current;
    const femaleCardTranslateY = useRef(new Animated.Value(0)).current;
    const maleCardShadowHeight = useRef(new Animated.Value(4)).current;
    const femaleCardShadowHeight = useRef(new Animated.Value(4)).current;
    const [maleCardShadowHeightState, setMaleCardShadowHeightState] = useState(4);
    const [femaleCardShadowHeightState, setFemaleCardShadowHeightState] = useState(4);
    const maleCardColorOpacity = useRef(new Animated.Value(0)).current;
    const femaleCardColorOpacity = useRef(new Animated.Value(0)).current;
    const maleIconScale = useRef(new Animated.Value(1)).current;
    const femaleIconScale = useRef(new Animated.Value(1)).current;

    // Animation refs for goal cards
    const loseCardTranslateY = useRef(new Animated.Value(0)).current;
    const maintainCardTranslateY = useRef(new Animated.Value(0)).current;
    const buildCardTranslateY = useRef(new Animated.Value(0)).current;
    const loseCardShadowHeight = useRef(new Animated.Value(4)).current;
    const maintainCardShadowHeight = useRef(new Animated.Value(4)).current;
    const buildCardShadowHeight = useRef(new Animated.Value(4)).current;
    const [loseCardShadowHeightState, setLoseCardShadowHeightState] = useState(4);
    const [maintainCardShadowHeightState, setMaintainCardShadowHeightState] = useState(4);
    const [buildCardShadowHeightState, setBuildCardShadowHeightState] = useState(4);
    const loseCardColorOpacity = useRef(new Animated.Value(0)).current;
    const maintainCardColorOpacity = useRef(new Animated.Value(0)).current;
    const buildCardColorOpacity = useRef(new Animated.Value(0)).current;

    // Animation refs for activity level cards
    const sedentaryCardTranslateY = useRef(new Animated.Value(0)).current;
    const lightlyCardTranslateY = useRef(new Animated.Value(0)).current;
    const moderateCardTranslateY = useRef(new Animated.Value(0)).current;
    const veryCardTranslateY = useRef(new Animated.Value(0)).current;
    const sedentaryCardShadowHeight = useRef(new Animated.Value(4)).current;
    const lightlyCardShadowHeight = useRef(new Animated.Value(4)).current;
    const moderateCardShadowHeight = useRef(new Animated.Value(4)).current;
    const veryCardShadowHeight = useRef(new Animated.Value(4)).current;
    const [sedentaryCardShadowHeightState, setSedentaryCardShadowHeightState] = useState(4);
    const [lightlyCardShadowHeightState, setLightlyCardShadowHeightState] = useState(4);
    const [moderateCardShadowHeightState, setModerateCardShadowHeightState] = useState(4);
    const [veryCardShadowHeightState, setVeryCardShadowHeightState] = useState(4);
    const sedentaryCardColorOpacity = useRef(new Animated.Value(0)).current;
    const lightlyCardColorOpacity = useRef(new Animated.Value(0)).current;
    const moderateCardColorOpacity = useRef(new Animated.Value(0)).current;
    const veryCardColorOpacity = useRef(new Animated.Value(0)).current;

    // Animation refs for diet preference cards
    const regularCardTranslateY = useRef(new Animated.Value(0)).current;
    const highProteinCardTranslateY = useRef(new Animated.Value(0)).current;
    const vegetarianCardTranslateY = useRef(new Animated.Value(0)).current;
    const veganCardTranslateY = useRef(new Animated.Value(0)).current;
    const ketoCardTranslateY = useRef(new Animated.Value(0)).current;
    const halalCardTranslateY = useRef(new Animated.Value(0)).current;
    const regularCardShadowHeight = useRef(new Animated.Value(4)).current;
    const highProteinCardShadowHeight = useRef(new Animated.Value(4)).current;
    const vegetarianCardShadowHeight = useRef(new Animated.Value(4)).current;
    const veganCardShadowHeight = useRef(new Animated.Value(4)).current;
    const ketoCardShadowHeight = useRef(new Animated.Value(4)).current;
    const halalCardShadowHeight = useRef(new Animated.Value(4)).current;
    const [regularCardShadowHeightState, setRegularCardShadowHeightState] = useState(4);
    const [highProteinCardShadowHeightState, setHighProteinCardShadowHeightState] = useState(4);
    const [vegetarianCardShadowHeightState, setVegetarianCardShadowHeightState] = useState(4);
    const [veganCardShadowHeightState, setVeganCardShadowHeightState] = useState(4);
    const [ketoCardShadowHeightState, setKetoCardShadowHeightState] = useState(4);
    const [halalCardShadowHeightState, setHalalCardShadowHeightState] = useState(4);
    const regularCardColorOpacity = useRef(new Animated.Value(0)).current;
    const highProteinCardColorOpacity = useRef(new Animated.Value(0)).current;
    const vegetarianCardColorOpacity = useRef(new Animated.Value(0)).current;
    const veganCardColorOpacity = useRef(new Animated.Value(0)).current;
    const ketoCardColorOpacity = useRef(new Animated.Value(0)).current;
    const halalCardColorOpacity = useRef(new Animated.Value(0)).current;

    // Age picker refs
    // Date picker state
    const [monthModalVisible, setMonthModalVisible] = useState(false);
    const [dayModalVisible, setDayModalVisible] = useState(false);
    const [yearModalVisible, setYearModalVisible] = useState(false);

    // Animation refs for modals
    const monthSlideAnim = useRef(new Animated.Value(0)).current;
    const monthFadeAnim = useRef(new Animated.Value(0)).current;
    const daySlideAnim = useRef(new Animated.Value(0)).current;
    const dayFadeAnim = useRef(new Animated.Value(0)).current;
    const yearSlideAnim = useRef(new Animated.Value(0)).current;
    const yearFadeAnim = useRef(new Animated.Value(0)).current;

    const months = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
    ];
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => currentYear - i); // 100 years back from current year

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

        return () => {
            topRightRotation.stop();
            bottomLeftRotation.stop();
        };
    }, []);

    // Welcome step special animation
    useEffect(() => {
        if (currentStep === 1) {
            // Reset animation values
            welcomeTextOpacity.setValue(0);
            welcomeTextScale.setValue(0.8);
            welcomeTextTranslateY.setValue(-20);
            welcomeLogoOpacity.setValue(0);
            welcomeLogoScale.setValue(0.5);

            // Animate text first with bounce effect
            Animated.sequence([
                Animated.parallel([
                    Animated.spring(welcomeTextScale, {
                        toValue: 1.1,
                        tension: 50,
                        friction: 3,
                        useNativeDriver: true,
                    }),
                    Animated.timing(welcomeTextOpacity, {
                        toValue: 1,
                        duration: 400,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                    Animated.timing(welcomeTextTranslateY, {
                        toValue: 0,
                        duration: 500,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.spring(welcomeTextScale, {
                    toValue: 1,
                    tension: 100,
                    friction: 7,
                    useNativeDriver: true,
                }),
            ]).start();

            // Animate logo after a short delay with scale and fade
            setTimeout(() => {
                Animated.parallel([
                    Animated.spring(welcomeLogoScale, {
                        toValue: 1,
                        tension: 50,
                        friction: 5,
                        useNativeDriver: true,
                    }),
                    Animated.timing(welcomeLogoOpacity, {
                        toValue: 1,
                        duration: 600,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                ]).start();
            }, 300);
        } else {
            // Reset for other steps
            welcomeTextOpacity.setValue(1);
            welcomeTextScale.setValue(1);
            welcomeTextTranslateY.setValue(0);
            welcomeLogoOpacity.setValue(1);
            welcomeLogoScale.setValue(1);
        }
    }, [currentStep]);

    useEffect(() => {
        // Smooth and elegant step transition animations
        // Reset animation values
        contentFade.setValue(0);
        contentSlide.setValue(20);
        contentScale.setValue(0.95);

        // Smooth parallel animation with elegant easing
        Animated.parallel([
            Animated.timing(contentFade, {
                toValue: 1,
                duration: 350,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(contentSlide, {
                toValue: 0,
                duration: 400,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(contentScale, {
                toValue: 1,
                duration: 400,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();

        // Cleanup timeout on step change
        return () => {
            if (usernameCheckTimeoutRef.current) {
                clearTimeout(usernameCheckTimeoutRef.current);
                usernameCheckTimeoutRef.current = null;
            }
        };
    }, [currentStep]);

    // Animate modals when they open/close
    useEffect(() => {
        if (monthModalVisible) {
            Animated.parallel([
                Animated.timing(monthSlideAnim, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(monthFadeAnim, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(monthSlideAnim, {
                    toValue: 0,
                    duration: 250,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(monthFadeAnim, {
                    toValue: 0,
                    duration: 250,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [monthModalVisible]);

    useEffect(() => {
        if (dayModalVisible) {
            Animated.parallel([
                Animated.timing(daySlideAnim, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(dayFadeAnim, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(daySlideAnim, {
                    toValue: 0,
                    duration: 250,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(dayFadeAnim, {
                    toValue: 0,
                    duration: 250,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [dayModalVisible]);

    useEffect(() => {
        if (yearModalVisible) {
            Animated.parallel([
                Animated.timing(yearSlideAnim, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(yearFadeAnim, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(yearSlideAnim, {
                    toValue: 0,
                    duration: 250,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(yearFadeAnim, {
                    toValue: 0,
                    duration: 250,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [yearModalVisible]);


    // Track if this is the first time the screen is mounted
    const isFirstMount = useRef(true);

    // Reset to step 1 and clear data when screen mounts (for reset functionality)
    useEffect(() => {
        if (user) {
            // Always reset to step 1 and clear data when entering onboarding
            // This ensures fresh start whether coming from reset or first time
            setCurrentStep(1);
            setData({
                name: '',
                birthMonth: 0,
                birthDay: 0,
                birthYear: 0,
                sex: '',
                height: 170,
                heightUnit: 'cm',
                weight: 70,
                weightUnit: 'kg',
                goal: '',
                activityLevel: '',
                dietPreference: '',
                allergies: [],
                goalIntensity: '',
                unitPreference: { weight: 'kg', height: 'cm' },
                purpose: '',
                macrosSetup: '',
            });
            console.log('🔄 Onboarding screen mounted - reset to step 1 with fresh data');

            // Check if user already completed onboarding (only on first mount, with timeout handling)
            if (isFirstMount.current) {
                isFirstMount.current = false;
                const checkCompletion = async () => {
                    try {
                        // Use a shorter timeout for this check since we're already on the onboarding screen
                        const checkPromise = hasCompletedOnboarding(user);
                        const timeoutPromise = new Promise<boolean>((resolve) => {
                            setTimeout(() => {
                                console.log('⚠️ Onboarding check timed out - assuming not completed, continuing onboarding');
                                resolve(false);
                            }, 3000); // 3 second timeout for this check
                        });

                        const completed = await Promise.race([checkPromise, timeoutPromise]);

                        if (completed) {
                            console.log('User already completed onboarding, navigating to Home');
                            navigation.replace('Home');
                        } else {
                            console.log('Onboarding not completed or check timed out - continuing onboarding');
                        }
                    } catch (error) {
                        console.error('Error checking onboarding status:', error);
                        // If check fails, assume not completed and let user continue
                        console.log('Continuing onboarding despite check error');
                    }
                };
                // Don't await - let it run in background so it doesn't block the UI
                checkCompletion();
            }
        }
    }, [user, navigation]);

    const topRightRotation = rotateTopRight.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const bottomLeftRotation = rotateBottomLeft.interpolate({
        inputRange: [0, 1],
        outputRange: ['360deg', '0deg'],
    });

    const updateData = (key: keyof OnboardingData, value: any) => {
        setData(prev => ({ ...prev, [key]: value }));

        // Check username availability when name changes
        if (key === 'name' && user) {
            // Clear previous timeout
            if (usernameCheckTimeoutRef.current) {
                clearTimeout(usernameCheckTimeoutRef.current);
            }

            // Clear error immediately
            setUsernameError('');

            // Debounce username check (wait 500ms after user stops typing)
            usernameCheckTimeoutRef.current = setTimeout(async () => {
                const username = value.trim();

                // Don't check if empty
                if (!username) {
                    setCheckingUsername(false);
                    return;
                }

                // Validate minimum length
                if (username.length < 3) {
                    setUsernameError('username must be at least 3 characters');
                    setCheckingUsername(false);
                    return;
                }

                setCheckingUsername(true);
                try {
                    const exists = await checkUsernameExists(username, user.uid);
                    if (exists) {
                        setUsernameError('this username is already taken');
                    } else {
                        setUsernameError('');
                    }
                } catch (error) {
                    console.error('Error checking username:', error);
                    // Don't show error on network issues - allow user to proceed
                } finally {
                    setCheckingUsername(false);
                }
            }, 500);
        }
    };

    const validateCurrentStep = (): { valid: boolean; message?: string } => {
        switch (currentStep) {
            case 1: // Welcome - no validation needed
                return { valid: true };
            case 2: // Username - REQUIRED
                if (!data.name || data.name.trim() === '') {
                    return { valid: false, message: 'please enter your username' };
                }
                if (data.name.trim().length < 3) {
                    return { valid: false, message: 'username must be at least 3 characters' };
                }
                if (usernameError) {
                    return { valid: false, message: usernameError };
                }
                if (checkingUsername) {
                    return { valid: false, message: 'checking username availability...' };
                }
                break;
            case 3: // Birthdate - REQUIRED
                if (!data.birthMonth || !data.birthDay || !data.birthYear) {
                    return { valid: false, message: 'please select your birthdate' };
                }
                // Validate date is valid
                const daysInMonth = new Date(data.birthYear, data.birthMonth, 0).getDate();
                if (data.birthDay > daysInMonth) {
                    return { valid: false, message: 'invalid date' };
                }
                // Check if age is at least 13 (reasonable minimum)
                const today = new Date();
                const birthDate = new Date(data.birthYear, data.birthMonth - 1, data.birthDay);
                const age = today.getFullYear() - birthDate.getFullYear() -
                    (today.getMonth() < birthDate.getMonth() ||
                        (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);
                if (age < 13) {
                    return { valid: false, message: 'you must be at least 13 years old' };
                }
                if (age > 120) {
                    return { valid: false, message: 'please enter a valid birthdate' };
                }
                break;
            case 4: // Sex - REQUIRED
                if (data.sex === '') {
                    return { valid: false, message: 'please select your sex' };
                }
                break;
            case 5: // Height - REQUIRED
                if (!data.height || data.height <= 0) {
                    return { valid: false, message: 'please enter your height' };
                }
                break;
            case 6: // Weight - REQUIRED
                if (!data.weight || data.weight <= 0) {
                    return { valid: false, message: 'please enter your weight' };
                }
                break;
            case 7: // Goal - REQUIRED
                if (data.goal === '') {
                    return { valid: false, message: 'please select your goal' };
                }
                break;
            case 8: // Activity Level - REQUIRED
                if (data.activityLevel === '') {
                    return { valid: false, message: 'please select your activity level' };
                }
                break;
            case 9: // Diet Preference - REQUIRED
                if (data.dietPreference === '') {
                    return { valid: false, message: 'please select your diet preference' };
                }
                break;
            case 11: // Allergies - OPTIONAL, can skip
                // No validation needed - optional field
                break;
            case 12: // Goal Intensity - REQUIRED
                if (data.goalIntensity === '') {
                    return { valid: false, message: 'please select goal intensity' };
                }
                break;
            case 13: // Unit Preferences - REQUIRED (has defaults, but validate)
                if (!data.unitPreference || !data.unitPreference.weight || !data.unitPreference.height) {
                    return { valid: false, message: 'please select unit preferences' };
                }
                break;
            case 14: // Purpose - REQUIRED
                if (data.purpose === '') {
                    return { valid: false, message: 'please select what you\'re here for' };
                }
                break;
            case 15: // Macros Setup - REQUIRED
                if (data.macrosSetup === '') {
                    return { valid: false, message: 'please select macros setup' };
                }
                // If manual, validate custom macros
                if (data.macrosSetup === 'manual' && (!data.customMacros ||
                    !data.customMacros.protein || !data.customMacros.carbs || !data.customMacros.fats)) {
                    return { valid: false, message: 'please enter all macro values' };
                }
                break;
        }
        return { valid: true };
    };

    const nextStep = () => {
        // Validate current step before proceeding
        const validation = validateCurrentStep();
        if (!validation.valid) {
            Alert.alert('Required Field', validation.message || 'please complete this step');
            return;
        }

        if (currentStep < TOTAL_STEPS) {
            setCurrentStep(prev => prev + 1);
        }
        // Don't call handleComplete here - only the final button should do that
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleComplete = async () => {
        console.log('═══════════════════════════════════════════════════════');
        console.log('🎯 ONBOARDING COMPLETION - Step 15');
        console.log('═══════════════════════════════════════════════════════');

        if (!user) {
            Alert.alert('Error', 'You must be logged in to complete onboarding.');
            return;
        }

        // Validate required fields
        if (!data.name || !data.birthMonth || !data.birthDay || !data.birthYear || !data.sex || !data.goal || !data.activityLevel ||
            !data.dietPreference || !data.goalIntensity || !data.purpose || !data.macrosSetup) {
            console.log('❌ Validation failed - missing required fields');
            Alert.alert('Incomplete', 'Please complete all required fields.');
            return;
        }

        console.log('✅ All required fields validated');
        console.log('📝 Saving onboarding data and marking as complete...');

        setSaving(true);
        try {
            // Calculate age from birthdate
            const today = new Date();
            const birthDate = new Date(data.birthYear, data.birthMonth - 1, data.birthDay);
            const age = today.getFullYear() - birthDate.getFullYear() -
                (today.getMonth() < birthDate.getMonth() ||
                    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);

            // Convert data to the format expected by userService
            const onboardingData: OnboardingDataType = {
                name: data.name,
                age: age,
                sex: data.sex as 'male' | 'female' | 'other',
                height: data.height,
                heightUnit: data.heightUnit,
                weight: data.weight,
                weightUnit: data.weightUnit,
                goal: data.goal as 'lose' | 'maintain' | 'build',
                activityLevel: data.activityLevel as 'sedentary' | 'lightly' | 'moderate' | 'very',
                dietPreference: data.dietPreference as 'regular' | 'high-protein' | 'vegetarian' | 'vegan' | 'keto' | 'halal',
                allergies: data.allergies,
                goalIntensity: data.goalIntensity as 'mild' | 'moderate' | 'aggressive',
                unitPreference: data.unitPreference,
                purpose: data.purpose as 'meals' | 'workouts' | 'both' | 'discipline',
                macrosSetup: data.macrosSetup as 'auto' | 'manual',
                customMacros: data.customMacros,
            };

            await saveOnboardingData(user, onboardingData);
            console.log('✅ Onboarding data saved successfully');
            console.log('✅ User flagged as onboardingCompleted: true');
            console.log('🏠 Navigating to Home screen...');
            console.log('═══════════════════════════════════════════════════════');

            navigation.replace('Home');
        } catch (error: any) {
            console.error('❌ Error saving onboarding data:', error);
            Alert.alert('Error', 'Failed to save onboarding data. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // Initialize plates that should already be filled
    useEffect(() => {
        if (currentStep > 1) {
            // Set all plates up to currentStep - 1 as already filled
            for (let i = 0; i < currentStep - 1; i++) {
                const anim = weightPlateAnimations[i];
                anim.scale.setValue(1);
                anim.opacity.setValue(1);
            }
        }
    }, []);

    useEffect(() => {
        // Animate weight plate filling when moving forward
        if (currentStep > previousStep.current && currentStep > 1) {
            const plateIndex = currentStep - 2; // The step we just completed
            if (plateIndex >= 0 && plateIndex < TOTAL_STEPS) {
                const anim = weightPlateAnimations[plateIndex];

                // Cool fill animation with bounce and scale effect
                Animated.sequence([
                    Animated.parallel([
                        Animated.spring(anim.scale, {
                            toValue: 1.3,
                            tension: 100,
                            friction: 3,
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim.opacity, {
                            toValue: 1,
                            duration: 200,
                            easing: Easing.out(Easing.cubic),
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.spring(anim.scale, {
                        toValue: 1,
                        tension: 100,
                        friction: 7,
                        useNativeDriver: true,
                    }),
                ]).start();
            }
        } else if (currentStep < previousStep.current) {
            // Reset when going backward
            const plateIndex = currentStep - 1;
            if (plateIndex >= 0 && plateIndex < TOTAL_STEPS) {
                const anim = weightPlateAnimations[plateIndex];
                anim.scale.setValue(0.8);
                anim.opacity.setValue(0.3);
            }
        }
        previousStep.current = currentStep;
    }, [currentStep]);

    const renderWeightPlates = () => {
        return (
            <View style={styles.weightPlatesContainer}>
                <View style={styles.weightPlatesRow}>
                    {Array.from({ length: TOTAL_STEPS }).map((_, index) => {
                        const isFilled = index < currentStep - 1; // Fill completed steps
                        const anim = weightPlateAnimations[index];

                        return (
                            <Animated.View
                                key={index}
                                style={[
                                    styles.weightPlate,
                                    isFilled && styles.weightPlateFilled,
                                    {
                                        transform: [{ scale: anim.scale }],
                                        opacity: isFilled ? anim.opacity : 1,
                                    },
                                ]}
                            />
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderWelcomeStep = () => (
        <View style={styles.stepContent}>
            <Animated.Text
                style={[
                    styles.welcomeTitle,
                    {
                        opacity: welcomeTextOpacity,
                        transform: [
                            { scale: welcomeTextScale },
                            { translateY: welcomeTextTranslateY },
                        ],
                    },
                ]}
            >
                welcome to
            </Animated.Text>
            <Animated.Image
                source={require('../../assets/images/plates_logo.png')}
                style={[
                    styles.welcomeLogo,
                    {
                        opacity: welcomeLogoOpacity,
                        transform: [{ scale: welcomeLogoScale }],
                    },
                ]}
                resizeMode="contain"
            />
        </View>
    );

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return renderWelcomeStep();
            case 2:
                return renderNameStep();
            case 3:
                return renderAgeStep();
            case 4:
                return renderSexStep();
            case 5:
                return renderHeightStep();
            case 6:
                return renderWeightStep();
            case 7:
                return renderGoalStep();
            case 8:
                return renderActivityLevelStep();
            case 9:
                return renderDietPreferenceStep();
            case 10:
                return renderAllergiesStep();
            case 11:
                return renderGoalIntensityStep();
            case 12:
                return renderUnitPreferencesStep();
            case 14:
                return renderPurposeStep();
            case 15:
                return renderMacrosStep();
            default:
                return null;
        }
    };

    const renderNameStep = () => {
        const handleUsernameChange = (text: string) => {
            // Remove @ if user tries to add it, or if it's at the start
            let cleanedText = text.replace(/^@+/, '').replace(/@/g, '');
            updateData('name', cleanedText);
        };

        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>what's your name?</Text>
                <View style={styles.inputWrapper}>
                    <View style={styles.usernameInputContainer}>
                        <Text style={styles.usernamePrefix}>@</Text>
                        <RNTextInput
                            placeholder="enter a username"
                            placeholderTextColor="#999"
                            value={data.name}
                            onChangeText={handleUsernameChange}
                            autoCapitalize="none"
                            autoCorrect={false}
                            style={styles.usernameInput}
                        />
                    </View>
                    {checkingUsername && (
                        <Text style={styles.usernameStatusText}>checking availability...</Text>
                    )}
                    {usernameError && !checkingUsername && (
                        <Text style={styles.usernameErrorText}>{usernameError}</Text>
                    )}
                    {!usernameError && !checkingUsername && data.name.trim().length >= 3 && (
                        <Text style={styles.usernameSuccessText}>✓ username available</Text>
                    )}
                </View>
            </View>
        );
    };

    const renderAgeStep = () => {
        const getDaysInMonth = (month: number, year: number): number => {
            return new Date(year, month, 0).getDate();
        };

        const renderDropdown = (
            label: string,
            placeholder: string,
            value: string,
            onPress: () => void,
            style?: any
        ) => {
            const isPlaceholder = value === placeholder;
            return (
                <TouchableOpacity
                    style={[styles.dateDropdown, style]}
                    onPress={onPress}
                >
                    <Text style={[
                        styles.dateDropdownText,
                        isPlaceholder && styles.dateDropdownTextPlaceholder
                    ]}>
                        {isPlaceholder ? placeholder : value}
                    </Text>
                    <Ionicons
                        name="chevron-down"
                        size={20}
                        color={isPlaceholder ? "#999" : "#000"}
                        style={styles.dateDropdownIcon}
                    />
                </TouchableOpacity>
            );
        };

        const renderPickerModal = (
            visible: boolean,
            onClose: () => void,
            title: string,
            items: (string | number)[],
            selectedValue: number,
            onSelect: (value: number) => void,
            slideAnim: Animated.Value,
            fadeAnim: Animated.Value
        ) => {
            const translateY = slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [300, 0],
            });

            const handleClose = () => {
                // Animate out first, then close
                Animated.parallel([
                    Animated.timing(slideAnim, {
                        toValue: 0,
                        duration: 250,
                        easing: Easing.in(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(fadeAnim, {
                        toValue: 0,
                        duration: 250,
                        easing: Easing.in(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    onClose();
                });
            };

            return (
                <Modal
                    visible={visible}
                    transparent={true}
                    animationType="none"
                    onRequestClose={handleClose}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={handleClose}
                    >
                        <Animated.View
                            style={[
                                styles.modalOverlayAnimated,
                                {
                                    opacity: fadeAnim,
                                },
                            ]}
                        >
                            <Animated.View
                                style={[
                                    styles.modalContent,
                                    {
                                        transform: [{ translateY }],
                                    },
                                ]}
                            >
                                <Text style={styles.modalTitle}>{title}</Text>
                                <ScrollView style={styles.modalScrollView}>
                                    {items.map((item, index) => {
                                        const value = typeof item === 'number' ? item : index + 1;
                                        const isSelected = selectedValue === value;
                                        return (
                                            <TouchableOpacity
                                                key={index}
                                                style={[
                                                    styles.modalItem,
                                                    isSelected && styles.modalItemSelected
                                                ]}
                                                onPress={() => {
                                                    onSelect(value);
                                                    handleClose();
                                                }}
                                            >
                                                <Text style={[
                                                    styles.modalItemText,
                                                    isSelected && styles.modalItemTextSelected
                                                ]}>
                                                    {item}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </Animated.View>
                        </Animated.View>
                    </TouchableOpacity>
                </Modal>
            );
        };

        // Get available days based on selected month and year
        const availableDays = data.birthMonth && data.birthYear
            ? Array.from({ length: getDaysInMonth(data.birthMonth, data.birthYear) }, (_, i) => i + 1)
            : days;

        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>how old are you?</Text>
                <View style={styles.datePickerContainer}>
                    {renderDropdown(
                        'Month',
                        'month',
                        data.birthMonth ? months[data.birthMonth - 1] : 'month',
                        () => setMonthModalVisible(true),
                        { marginRight: 8 }
                    )}
                    {renderDropdown(
                        'Day',
                        'day',
                        data.birthDay ? data.birthDay.toString() : 'day',
                        () => setDayModalVisible(true),
                        { marginRight: 8 }
                    )}
                    {renderDropdown(
                        'Year',
                        'year',
                        data.birthYear ? data.birthYear.toString() : 'year',
                        () => setYearModalVisible(true)
                    )}
                </View>

                {renderPickerModal(
                    monthModalVisible,
                    () => setMonthModalVisible(false),
                    'select month',
                    months,
                    data.birthMonth,
                    (value) => {
                        updateData('birthMonth', value);
                        // Reset day if it's invalid for the new month
                        if (data.birthDay && data.birthYear) {
                            const maxDays = getDaysInMonth(value, data.birthYear);
                            if (data.birthDay > maxDays) {
                                updateData('birthDay', maxDays);
                            }
                        }
                    },
                    monthSlideAnim,
                    monthFadeAnim
                )}

                {renderPickerModal(
                    dayModalVisible,
                    () => setDayModalVisible(false),
                    'select day',
                    availableDays,
                    data.birthDay,
                    (value) => updateData('birthDay', value),
                    daySlideAnim,
                    dayFadeAnim
                )}

                {renderPickerModal(
                    yearModalVisible,
                    () => setYearModalVisible(false),
                    'select year',
                    years,
                    data.birthYear,
                    (value) => {
                        updateData('birthYear', value);
                        // Reset day if it's invalid for the new year
                        if (data.birthDay && data.birthMonth) {
                            const maxDays = getDaysInMonth(data.birthMonth, value);
                            if (data.birthDay > maxDays) {
                                updateData('birthDay', maxDays);
                            }
                        }
                    },
                    yearSlideAnim,
                    yearFadeAnim
                )}
            </View>
        );
    };

    // Sync animated shadow values with state
    useEffect(() => {
        const maleListenerId = maleCardShadowHeight.addListener(({ value }) => {
            setMaleCardShadowHeightState(value);
        });
        const femaleListenerId = femaleCardShadowHeight.addListener(({ value }) => {
            setFemaleCardShadowHeightState(value);
        });
        const loseListenerId = loseCardShadowHeight.addListener(({ value }) => {
            setLoseCardShadowHeightState(value);
        });
        const maintainListenerId = maintainCardShadowHeight.addListener(({ value }) => {
            setMaintainCardShadowHeightState(value);
        });
        const buildListenerId = buildCardShadowHeight.addListener(({ value }) => {
            setBuildCardShadowHeightState(value);
        });
        const sedentaryListenerId = sedentaryCardShadowHeight.addListener(({ value }) => {
            setSedentaryCardShadowHeightState(value);
        });
        const lightlyListenerId = lightlyCardShadowHeight.addListener(({ value }) => {
            setLightlyCardShadowHeightState(value);
        });
        const moderateListenerId = moderateCardShadowHeight.addListener(({ value }) => {
            setModerateCardShadowHeightState(value);
        });
        const veryListenerId = veryCardShadowHeight.addListener(({ value }) => {
            setVeryCardShadowHeightState(value);
        });
        const regularListenerId = regularCardShadowHeight.addListener(({ value }) => {
            setRegularCardShadowHeightState(value);
        });
        const highProteinListenerId = highProteinCardShadowHeight.addListener(({ value }) => {
            setHighProteinCardShadowHeightState(value);
        });
        const vegetarianListenerId = vegetarianCardShadowHeight.addListener(({ value }) => {
            setVegetarianCardShadowHeightState(value);
        });
        const veganListenerId = veganCardShadowHeight.addListener(({ value }) => {
            setVeganCardShadowHeightState(value);
        });
        const ketoListenerId = ketoCardShadowHeight.addListener(({ value }) => {
            setKetoCardShadowHeightState(value);
        });
        const halalListenerId = halalCardShadowHeight.addListener(({ value }) => {
            setHalalCardShadowHeightState(value);
        });
        return () => {
            maleCardShadowHeight.removeListener(maleListenerId);
            femaleCardShadowHeight.removeListener(femaleListenerId);
            loseCardShadowHeight.removeListener(loseListenerId);
            maintainCardShadowHeight.removeListener(maintainListenerId);
            buildCardShadowHeight.removeListener(buildListenerId);
            sedentaryCardShadowHeight.removeListener(sedentaryListenerId);
            lightlyCardShadowHeight.removeListener(lightlyListenerId);
            moderateCardShadowHeight.removeListener(moderateListenerId);
            veryCardShadowHeight.removeListener(veryListenerId);
            regularCardShadowHeight.removeListener(regularListenerId);
            highProteinCardShadowHeight.removeListener(highProteinListenerId);
            vegetarianCardShadowHeight.removeListener(vegetarianListenerId);
            veganCardShadowHeight.removeListener(veganListenerId);
            ketoCardShadowHeight.removeListener(ketoListenerId);
            halalCardShadowHeight.removeListener(halalListenerId);
        };
    }, []);

    // Animate sex cards when selection changes - pressed button state when selected
    useEffect(() => {
        if (currentStep === 4) { // Sex step is step 4
            const isMaleSelected = data.sex === 'male';
            const isFemaleSelected = data.sex === 'female';

            const animations: Animated.CompositeAnimation[] = [
                // Card press animations - move down and shadow disappears when selected
                Animated.parallel([
                    Animated.timing(maleCardTranslateY, {
                        toValue: isMaleSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(maleCardShadowHeight, {
                        toValue: isMaleSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    // Color transition - white to blue
                    Animated.timing(maleCardColorOpacity, {
                        toValue: isMaleSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(femaleCardTranslateY, {
                        toValue: isFemaleSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(femaleCardShadowHeight, {
                        toValue: isFemaleSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    // Color transition - white to blue
                    Animated.timing(femaleCardColorOpacity, {
                        toValue: isFemaleSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
            ];

            // Icon animations - subtle scale when selected
            animations.push(
                Animated.timing(maleIconScale, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                })
            );
            animations.push(
                Animated.timing(femaleIconScale, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                })
            );

            Animated.parallel(animations).start();
        }
    }, [data.sex, currentStep]);

    // Animate goal cards when selection changes - pressed button state when selected
    useEffect(() => {
        if (currentStep === 7) { // Goal step is step 7
            const isLoseSelected = data.goal === 'lose';
            const isMaintainSelected = data.goal === 'maintain';
            const isBuildSelected = data.goal === 'build';

            const animations: Animated.CompositeAnimation[] = [
                // Card press animations - move down and shadow disappears when selected
                Animated.parallel([
                    Animated.timing(loseCardTranslateY, {
                        toValue: isLoseSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(loseCardShadowHeight, {
                        toValue: isLoseSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    // Color transition - white to blue
                    Animated.timing(loseCardColorOpacity, {
                        toValue: isLoseSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(maintainCardTranslateY, {
                        toValue: isMaintainSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(maintainCardShadowHeight, {
                        toValue: isMaintainSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    // Color transition - white to blue
                    Animated.timing(maintainCardColorOpacity, {
                        toValue: isMaintainSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(buildCardTranslateY, {
                        toValue: isBuildSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(buildCardShadowHeight, {
                        toValue: isBuildSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    // Color transition - white to blue
                    Animated.timing(buildCardColorOpacity, {
                        toValue: isBuildSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
            ];

            Animated.parallel(animations).start();
        }
    }, [data.goal, currentStep]);

    // Animate activity level cards when selection changes - pressed button state when selected
    useEffect(() => {
        if (currentStep === 8) { // Activity level step is step 8
            const isSedentarySelected = data.activityLevel === 'sedentary';
            const isLightlySelected = data.activityLevel === 'lightly';
            const isModerateSelected = data.activityLevel === 'moderate';
            const isVerySelected = data.activityLevel === 'very';

            const animations: Animated.CompositeAnimation[] = [
                Animated.parallel([
                    Animated.timing(sedentaryCardTranslateY, {
                        toValue: isSedentarySelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(sedentaryCardShadowHeight, {
                        toValue: isSedentarySelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(sedentaryCardColorOpacity, {
                        toValue: isSedentarySelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(lightlyCardTranslateY, {
                        toValue: isLightlySelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(lightlyCardShadowHeight, {
                        toValue: isLightlySelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(lightlyCardColorOpacity, {
                        toValue: isLightlySelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(moderateCardTranslateY, {
                        toValue: isModerateSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(moderateCardShadowHeight, {
                        toValue: isModerateSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(moderateCardColorOpacity, {
                        toValue: isModerateSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(veryCardTranslateY, {
                        toValue: isVerySelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(veryCardShadowHeight, {
                        toValue: isVerySelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(veryCardColorOpacity, {
                        toValue: isVerySelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
            ];

            Animated.parallel(animations).start();
        }
    }, [data.activityLevel, currentStep]);

    // Animate diet preference cards when selection changes - pressed button state when selected
    useEffect(() => {
        if (currentStep === 9) { // Diet preference step is step 9
            const isRegularSelected = data.dietPreference === 'regular';
            const isHighProteinSelected = data.dietPreference === 'high-protein';
            const isVegetarianSelected = data.dietPreference === 'vegetarian';
            const isVeganSelected = data.dietPreference === 'vegan';
            const isKetoSelected = data.dietPreference === 'keto';
            const isHalalSelected = data.dietPreference === 'halal';

            const animations: Animated.CompositeAnimation[] = [
                Animated.parallel([
                    Animated.timing(regularCardTranslateY, {
                        toValue: isRegularSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(regularCardShadowHeight, {
                        toValue: isRegularSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(regularCardColorOpacity, {
                        toValue: isRegularSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(highProteinCardTranslateY, {
                        toValue: isHighProteinSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(highProteinCardShadowHeight, {
                        toValue: isHighProteinSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(highProteinCardColorOpacity, {
                        toValue: isHighProteinSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(vegetarianCardTranslateY, {
                        toValue: isVegetarianSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(vegetarianCardShadowHeight, {
                        toValue: isVegetarianSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(vegetarianCardColorOpacity, {
                        toValue: isVegetarianSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(veganCardTranslateY, {
                        toValue: isVeganSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(veganCardShadowHeight, {
                        toValue: isVeganSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(veganCardColorOpacity, {
                        toValue: isVeganSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(ketoCardTranslateY, {
                        toValue: isKetoSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(ketoCardShadowHeight, {
                        toValue: isKetoSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(ketoCardColorOpacity, {
                        toValue: isKetoSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(halalCardTranslateY, {
                        toValue: isHalalSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(halalCardShadowHeight, {
                        toValue: isHalalSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(halalCardColorOpacity, {
                        toValue: isHalalSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
            ];

            Animated.parallel(animations).start();
        }
    }, [data.dietPreference, currentStep]);

    const renderSexStep = () => {
        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>what's your sex?</Text>
                <View style={styles.sexCardContainer}>
                    {([
                        { key: 'male', label: 'male', symbol: '♂' },
                        { key: 'female', label: 'female', symbol: '♀' },
                    ] as const).map((option) => {
                        const cardTranslateY = option.key === 'male' ? maleCardTranslateY : femaleCardTranslateY;
                        const cardShadowHeight = option.key === 'male' ? maleCardShadowHeightState : femaleCardShadowHeightState;
                        const cardColorOpacity = option.key === 'male' ? maleCardColorOpacity : femaleCardColorOpacity;
                        const iconScale = option.key === 'male' ? maleIconScale : femaleIconScale;
                        const isSelected = data.sex === option.key;

                        return (
                            <TouchableOpacity
                                key={option.key}
                                onPress={() => updateData('sex', option.key)}
                                activeOpacity={1}
                            >
                                <Animated.View
                                    style={[
                                        styles.sexCard,
                                        {
                                            transform: [{ translateY: cardTranslateY }],
                                            shadowColor: '#000',
                                            shadowOffset: {
                                                width: 0,
                                                height: cardShadowHeight,
                                            },
                                            shadowOpacity: 1,
                                            shadowRadius: 0,
                                            elevation: cardShadowHeight,
                                        },
                                    ]}
                                >
                                    {/* Blue color overlay that fades in when selected */}
                                    <Animated.View
                                        style={[
                                            StyleSheet.absoluteFill,
                                            {
                                                backgroundColor: '#526EFF',
                                                borderRadius: 10,
                                                opacity: cardColorOpacity,
                                            },
                                        ]}
                                        pointerEvents="none"
                                    />
                                    <Animated.Text
                                        style={[
                                            styles.sexCardIcon,
                                            {
                                                transform: [{ scale: iconScale }],
                                                color: cardColorOpacity.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: ['#666', '#fff'],
                                                }),
                                            },
                                        ]}
                                    >
                                        {option.symbol}
                                    </Animated.Text>
                                    <Animated.Text
                                        style={[
                                            styles.sexCardText,
                                            {
                                                color: cardColorOpacity.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: ['#333', '#fff'],
                                                }),
                                            },
                                        ]}
                                    >
                                        {option.label}
                                    </Animated.Text>
                                </Animated.View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    // Animate unit toggle sliding background when unit changes (only on height step)
    useEffect(() => {
        if (currentStep === 5) {
            Animated.timing(unitToggleSlide, {
                toValue: data.heightUnit === 'cm' ? 0 : 1,
                duration: 300,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }).start();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.heightUnit, currentStep]);

    // Animate weight unit toggle sliding background when unit changes (only on weight step)
    useEffect(() => {
        if (currentStep === 6) {
            Animated.timing(weightUnitToggleSlide, {
                toValue: data.weightUnit === 'kg' ? 0 : 1,
                duration: 300,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }).start();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.weightUnit, currentStep]);

    const renderHeightStep = () => {
        // For ft, we store height in inches (e.g., 71 inches = 5'11")
        // Range: 4'0" (48 inches) to 7'11" (95 inches)
        const minHeight = data.heightUnit === 'cm' ? 100 : 48; // 48 inches = 4'0"
        const maxHeight = data.heightUnit === 'cm' ? 250 : 95; // 95 inches = 7'11"
        const step = data.heightUnit === 'cm' ? 1 : 1; // 1 inch steps for ft

        // Ensure height value is within valid range for current unit
        // Round to nearest step first, then clamp
        const steppedHeight = Math.round(data.height / step) * step;
        const clampedHeight = Math.max(minHeight, Math.min(maxHeight, steppedHeight));

        // Helper function to convert inches to feet and inches string (e.g., 71 -> "5'11\"")
        const inchesToFeetInches = (inches: number): string => {
            const clampedInches = Math.max(48, Math.min(95, Math.round(inches)));
            const feet = Math.floor(clampedInches / 12);
            const remainingInches = clampedInches % 12;
            return `${feet}'${remainingInches}"`;
        };

        // Convert height when switching units
        const handleUnitChange = (newUnit: 'cm' | 'ft') => {
            if (newUnit === 'ft' && data.heightUnit === 'cm') {
                // Convert cm to inches (1 cm = 0.393701 inches)
                const heightInInches = data.height * 0.393701;
                const roundedInches = Math.round(heightInInches);
                const clampedInches = Math.max(48, Math.min(95, roundedInches));
                // Update both values - unit first, then height
                updateData('heightUnit', 'ft');
                updateData('height', clampedInches);
            } else if (newUnit === 'cm' && data.heightUnit === 'ft') {
                // Convert inches to cm (1 inch = 2.54 cm)
                const heightInCm = data.height * 2.54;
                const roundedCm = Math.round(heightInCm);
                const clampedCm = Math.max(100, Math.min(250, roundedCm));
                // Update both values - unit first, then height
                updateData('heightUnit', 'cm');
                updateData('height', clampedCm);
            }
        };

        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>what's your height?</Text>
                <View style={styles.unitToggle}>
                    <Animated.View
                        style={[
                            styles.unitToggleBackground,
                            {
                                left: unitToggleSlide.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [4, 180], // 4px from left when cm, 180px when ft
                                }),
                                right: unitToggleSlide.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [180, 4], // 180px from right when cm, 4px from right when ft
                                }),
                            },
                        ]}
                    />
                    <TouchableOpacity
                        style={styles.unitButton}
                        onPress={() => handleUnitChange('cm')}
                    >
                        <Text style={[
                            styles.unitButtonText,
                            data.heightUnit === 'cm' && styles.unitButtonTextActive
                        ]}>
                            cm
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.unitButton}
                        onPress={() => handleUnitChange('ft')}
                    >
                        <Text style={[
                            styles.unitButtonText,
                            data.heightUnit === 'ft' && styles.unitButtonTextActive
                        ]}>
                            ft
                        </Text>
                    </TouchableOpacity>
                </View>
                <Slider
                    key={`height-slider-${data.heightUnit}`}
                    value={clampedHeight}
                    onValueChange={(value) => {
                        // Round to nearest step
                        const steppedValue = Math.round(value / step) * step;
                        const clampedValue = Math.max(minHeight, Math.min(maxHeight, steppedValue));
                        updateData('height', clampedValue);
                    }}
                    minimumValue={minHeight}
                    maximumValue={maxHeight}
                    step={step}
                    unit={data.heightUnit}
                    formatValue={(val) => {
                        if (data.heightUnit === 'cm') {
                            return `${Math.round(val)} cm`;
                        } else {
                            // val is in inches, convert to feet and inches format
                            return inchesToFeetInches(val);
                        }
                    }}
                    editableText={false}
                />
            </View>
        );
    };

    const renderWeightStep = () => {
        const minWeight = data.weightUnit === 'kg' ? 20 : 45; // 20 kg, 45 lbs
        const maxWeight = data.weightUnit === 'kg' ? 250 : 550; // 250 kg, 550 lbs
        const step = data.weightUnit === 'kg' ? 0.5 : 1; // 0.5 kg, 1 lb

        // Ensure weight is within valid range when unit changes
        // Round to nearest step first, then clamp
        const steppedWeight = data.weightUnit === 'kg'
            ? Math.round(data.weight / step) * step
            : Math.round(data.weight / step) * step;
        const clampedWeight = Math.max(minWeight, Math.min(maxWeight, steppedWeight));

        // Convert weight when switching units
        const handleUnitChange = (newUnit: 'kg' | 'lbs') => {
            if (newUnit === 'kg' && data.weightUnit === 'lbs') {
                // Convert lbs to kg (1 lb = 0.453592 kg)
                const weightInKg = data.weight * 0.453592;
                const roundedKg = Math.round(weightInKg * 2) / 2; // Round to nearest 0.5
                const clampedKg = Math.max(20, Math.min(250, roundedKg));
                updateData('weightUnit', 'kg');
                updateData('weight', clampedKg);
            } else if (newUnit === 'lbs' && data.weightUnit === 'kg') {
                // Convert kg to lbs (1 kg = 2.20462 lbs)
                const weightInLbs = data.weight * 2.20462;
                const roundedLbs = Math.round(weightInLbs);
                const clampedLbs = Math.max(45, Math.min(550, roundedLbs));
                updateData('weightUnit', 'lbs');
                updateData('weight', clampedLbs);
            }
        };

        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>what's your weight?</Text>
                <View style={styles.unitToggle}>
                    <Animated.View
                        style={[
                            styles.unitToggleBackground,
                            {
                                left: weightUnitToggleSlide.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [4, 180], // 4px from left when kg, 180px when lbs
                                }),
                                right: weightUnitToggleSlide.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [180, 4], // 180px from right when kg, 4px from right when lbs
                                }),
                            },
                        ]}
                    />
                    <TouchableOpacity
                        style={styles.unitButton}
                        onPress={() => handleUnitChange('kg')}
                    >
                        <Text style={[
                            styles.unitButtonText,
                            data.weightUnit === 'kg' && styles.unitButtonTextActive
                        ]}>
                            kg
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.unitButton}
                        onPress={() => handleUnitChange('lbs')}
                    >
                        <Text style={[
                            styles.unitButtonText,
                            data.weightUnit === 'lbs' && styles.unitButtonTextActive
                        ]}>
                            lbs
                        </Text>
                    </TouchableOpacity>
                </View>
                <Slider
                    key={`weight-slider-${data.weightUnit}`}
                    value={clampedWeight}
                    onValueChange={(value) => {
                        // Round to nearest step
                        const steppedValue = data.weightUnit === 'kg'
                            ? Math.round(value / step) * step
                            : Math.round(value / step) * step;
                        const clampedValue = Math.max(minWeight, Math.min(maxWeight, steppedValue));
                        updateData('weight', clampedValue);
                    }}
                    minimumValue={minWeight}
                    maximumValue={maxWeight}
                    step={step}
                    unit={data.weightUnit}
                    formatValue={(val) => data.weightUnit === 'kg' ? `${val.toFixed(1)} kg` : `${Math.round(val)} lbs`}
                    editableText={false}
                />
            </View>
        );
    };

    const renderGoalStep = () => {
        const goalOptions = [
            { key: 'lose', label: 'lose weight', icon: '📉', color: '#526EFF' },
            { key: 'maintain', label: 'maintain', icon: '⚖️', color: '#526EFF' },
            { key: 'build', label: 'build muscle', icon: '💪', color: '#526EFF' },
        ] as const;

        const firstRow = goalOptions.slice(0, 2);
        const secondRow = goalOptions.slice(2);

        const getCardAnimations = (key: string) => {
            switch (key) {
                case 'lose':
                    return {
                        translateY: loseCardTranslateY,
                        shadowHeight: loseCardShadowHeightState,
                        colorOpacity: loseCardColorOpacity,
                    };
                case 'maintain':
                    return {
                        translateY: maintainCardTranslateY,
                        shadowHeight: maintainCardShadowHeightState,
                        colorOpacity: maintainCardColorOpacity,
                    };
                case 'build':
                    return {
                        translateY: buildCardTranslateY,
                        shadowHeight: buildCardShadowHeightState,
                        colorOpacity: buildCardColorOpacity,
                    };
                default:
                    return {
                        translateY: loseCardTranslateY,
                        shadowHeight: loseCardShadowHeightState,
                        colorOpacity: loseCardColorOpacity,
                    };
            }
        };

        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>what's your goal?</Text>
                <View style={styles.goalContainer}>
                    <View style={styles.goalRow}>
                        {firstRow.map((option) => {
                            const animations = getCardAnimations(option.key);
                            const isSelected = data.goal === option.key;

                            return (
                                <TouchableOpacity
                                    key={option.key}
                                    onPress={() => updateData('goal', option.key)}
                                    activeOpacity={1}
                                >
                                    <Animated.View
                                        style={[
                                            styles.goalCard,
                                            {
                                                transform: [{ translateY: animations.translateY }],
                                                shadowColor: '#000',
                                                shadowOffset: {
                                                    width: 0,
                                                    height: animations.shadowHeight,
                                                },
                                                shadowOpacity: 1,
                                                shadowRadius: 0,
                                                elevation: animations.shadowHeight,
                                            },
                                        ]}
                                    >
                                        {/* Color overlay that fades in when selected */}
                                        <Animated.View
                                            style={[
                                                StyleSheet.absoluteFill,
                                                {
                                                    backgroundColor: option.color,
                                                    borderRadius: 12,
                                                    opacity: animations.colorOpacity,
                                                },
                                            ]}
                                            pointerEvents="none"
                                        />
                                        <Text style={styles.goalIcon}>{option.icon}</Text>
                                        <Text style={[
                                            styles.goalCardText,
                                            isSelected && styles.goalCardTextSelected
                                        ]}>
                                            {option.label}
                                        </Text>
                                    </Animated.View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <View style={styles.goalRowSingle}>
                        {secondRow.map((option) => {
                            const animations = getCardAnimations(option.key);
                            const isSelected = data.goal === option.key;

                            return (
                                <TouchableOpacity
                                    key={option.key}
                                    onPress={() => updateData('goal', option.key)}
                                    activeOpacity={1}
                                >
                                    <Animated.View
                                        style={[
                                            styles.goalCard,
                                            {
                                                transform: [{ translateY: animations.translateY }],
                                                shadowColor: '#000',
                                                shadowOffset: {
                                                    width: 0,
                                                    height: animations.shadowHeight,
                                                },
                                                shadowOpacity: 1,
                                                shadowRadius: 0,
                                                elevation: animations.shadowHeight,
                                            },
                                        ]}
                                    >
                                        {/* Color overlay that fades in when selected */}
                                        <Animated.View
                                            style={[
                                                StyleSheet.absoluteFill,
                                                {
                                                    backgroundColor: option.color,
                                                    borderRadius: 12,
                                                    opacity: animations.colorOpacity,
                                                },
                                            ]}
                                            pointerEvents="none"
                                        />
                                        <Text style={styles.goalIcon}>{option.icon}</Text>
                                        <Text style={[
                                            styles.goalCardText,
                                            isSelected && styles.goalCardTextSelected
                                        ]}>
                                            {option.label}
                                        </Text>
                                    </Animated.View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>
        );
    };

    const renderActivityLevelStep = () => {
        const activityOptions = [
            { key: 'sedentary', label: 'sedentary', desc: 'little to no exercise', color: '#526EFF' },
            { key: 'lightly', label: 'lightly active', desc: 'light exercise 1-3 days/week', color: '#526EFF' },
            { key: 'moderate', label: 'moderately active', desc: 'moderate exercise 3-5 days/week', color: '#526EFF' },
            { key: 'very', label: 'very active', desc: 'hard exercise 6-7 days/week', color: '#526EFF' },
        ] as const;

        const getCardAnimations = (key: string) => {
            switch (key) {
                case 'sedentary':
                    return {
                        translateY: sedentaryCardTranslateY,
                        shadowHeight: sedentaryCardShadowHeightState,
                        colorOpacity: sedentaryCardColorOpacity,
                    };
                case 'lightly':
                    return {
                        translateY: lightlyCardTranslateY,
                        shadowHeight: lightlyCardShadowHeightState,
                        colorOpacity: lightlyCardColorOpacity,
                    };
                case 'moderate':
                    return {
                        translateY: moderateCardTranslateY,
                        shadowHeight: moderateCardShadowHeightState,
                        colorOpacity: moderateCardColorOpacity,
                    };
                case 'very':
                    return {
                        translateY: veryCardTranslateY,
                        shadowHeight: veryCardShadowHeightState,
                        colorOpacity: veryCardColorOpacity,
                    };
                default:
                    return {
                        translateY: sedentaryCardTranslateY,
                        shadowHeight: sedentaryCardShadowHeightState,
                        colorOpacity: sedentaryCardColorOpacity,
                    };
            }
        };

        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>how active are you?</Text>
                <View style={styles.activityCardContainer}>
                    {activityOptions.map((option) => {
                        const animations = getCardAnimations(option.key);
                        const isSelected = data.activityLevel === option.key;

                        return (
                            <TouchableOpacity
                                key={option.key}
                                onPress={() => updateData('activityLevel', option.key)}
                                activeOpacity={1}
                            >
                                <Animated.View
                                    style={[
                                        styles.activityCard,
                                        {
                                            transform: [{ translateY: animations.translateY }],
                                            shadowColor: '#000',
                                            shadowOffset: {
                                                width: 0,
                                                height: animations.shadowHeight,
                                            },
                                            shadowOpacity: 1,
                                            shadowRadius: 0,
                                            elevation: animations.shadowHeight,
                                        },
                                    ]}
                                >
                                    {/* Color overlay that fades in when selected */}
                                    <Animated.View
                                        style={[
                                            StyleSheet.absoluteFill,
                                            {
                                                backgroundColor: option.color,
                                                borderRadius: 12,
                                                opacity: animations.colorOpacity,
                                            },
                                        ]}
                                        pointerEvents="none"
                                    />
                                    <Text style={[
                                        styles.activityCardTitle,
                                        isSelected && styles.activityCardTitleSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                    <Text style={[
                                        styles.activityCardDesc,
                                        isSelected && styles.activityCardDescSelected
                                    ]}>
                                        {option.desc}
                                    </Text>
                                </Animated.View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderDietPreferenceStep = () => {
        const dietOptions = [
            { key: 'regular', label: 'regular', icon: '🍽️', color: '#526EFF' },
            { key: 'high-protein', label: 'high protein', icon: '🥩', color: '#526EFF' },
            { key: 'vegetarian', label: 'vegetarian', icon: '🥗', color: '#526EFF' },
            { key: 'vegan', label: 'vegan', icon: '🌱', color: '#526EFF' },
            { key: 'keto', label: 'keto', icon: '🥑', color: '#526EFF' },
            { key: 'halal', label: 'halal / no pork', icon: '🕌', color: '#526EFF' },
        ] as const;

        const getCardAnimations = (key: string) => {
            switch (key) {
                case 'regular':
                    return {
                        translateY: regularCardTranslateY,
                        shadowHeight: regularCardShadowHeightState,
                        colorOpacity: regularCardColorOpacity,
                    };
                case 'high-protein':
                    return {
                        translateY: highProteinCardTranslateY,
                        shadowHeight: highProteinCardShadowHeightState,
                        colorOpacity: highProteinCardColorOpacity,
                    };
                case 'vegetarian':
                    return {
                        translateY: vegetarianCardTranslateY,
                        shadowHeight: vegetarianCardShadowHeightState,
                        colorOpacity: vegetarianCardColorOpacity,
                    };
                case 'vegan':
                    return {
                        translateY: veganCardTranslateY,
                        shadowHeight: veganCardShadowHeightState,
                        colorOpacity: veganCardColorOpacity,
                    };
                case 'keto':
                    return {
                        translateY: ketoCardTranslateY,
                        shadowHeight: ketoCardShadowHeightState,
                        colorOpacity: ketoCardColorOpacity,
                    };
                case 'halal':
                    return {
                        translateY: halalCardTranslateY,
                        shadowHeight: halalCardShadowHeightState,
                        colorOpacity: halalCardColorOpacity,
                    };
                default:
                    return {
                        translateY: regularCardTranslateY,
                        shadowHeight: regularCardShadowHeightState,
                        colorOpacity: regularCardColorOpacity,
                    };
            }
        };

        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>diet preference?</Text>
                <View style={styles.dietCardContainer}>
                    {dietOptions.map((option) => {
                        const animations = getCardAnimations(option.key);
                        const isSelected = data.dietPreference === option.key;

                        return (
                            <TouchableOpacity
                                key={option.key}
                                onPress={() => updateData('dietPreference', option.key)}
                                activeOpacity={1}
                            >
                                <Animated.View
                                    style={[
                                        styles.dietCard,
                                        {
                                            transform: [{ translateY: animations.translateY }],
                                            shadowColor: '#000',
                                            shadowOffset: {
                                                width: 0,
                                                height: animations.shadowHeight,
                                            },
                                            shadowOpacity: 1,
                                            shadowRadius: 0,
                                            elevation: animations.shadowHeight,
                                        },
                                    ]}
                                >
                                    {/* Color overlay that fades in when selected */}
                                    <Animated.View
                                        style={[
                                            StyleSheet.absoluteFill,
                                            {
                                                backgroundColor: option.color,
                                                borderRadius: 12,
                                                opacity: animations.colorOpacity,
                                            },
                                        ]}
                                        pointerEvents="none"
                                    />
                                    <Text style={styles.dietIcon}>{option.icon}</Text>
                                    <Text style={[
                                        styles.dietCardText,
                                        isSelected && styles.dietCardTextSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                </Animated.View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderAllergiesStep = () => {
        const allergies = ['nuts', 'lactose', 'gluten', 'shellfish', 'eggs', 'soy'];
        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>any allergies?</Text>
                <View style={styles.chipContainer}>
                    {allergies.map((allergy) => {
                        const isSelected = data.allergies.includes(allergy);
                        return (
                            <TouchableOpacity
                                key={allergy}
                                style={[
                                    styles.chip,
                                    isSelected && styles.chipSelected
                                ]}
                                onPress={() => {
                                    if (isSelected) {
                                        updateData('allergies', data.allergies.filter(a => a !== allergy));
                                    } else {
                                        updateData('allergies', [...data.allergies, allergy]);
                                    }
                                }}
                            >
                                <Text style={[
                                    styles.chipText,
                                    isSelected && styles.chipTextSelected
                                ]}>
                                    {allergy}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderGoalIntensityStep = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>goal intensity?</Text>
            <View style={styles.cardContainer}>
                {([
                    { key: 'mild', label: 'mild', desc: 'slow & steady' },
                    { key: 'moderate', label: 'moderate', desc: 'balanced approach' },
                    { key: 'aggressive', label: 'aggressive', desc: 'fast results' },
                ] as const).map((option) => (
                    <TouchableOpacity
                        key={option.key}
                        style={[
                            styles.intensityCard,
                            data.goalIntensity === option.key && styles.intensityCardSelected
                        ]}
                        onPress={() => updateData('goalIntensity', option.key)}
                    >
                        <Text style={[
                            styles.intensityCardTitle,
                            data.goalIntensity === option.key && styles.intensityCardTitleSelected
                        ]}>
                            {option.label}
                        </Text>
                        <Text style={[
                            styles.intensityCardDesc,
                            data.goalIntensity === option.key && styles.intensityCardDescSelected
                        ]}>
                            {option.desc}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderUnitPreferencesStep = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>unit preferences?</Text>
            <View style={styles.unitSection}>
                <Text style={styles.unitSectionTitle}>weight</Text>
                <View style={styles.unitToggle}>
                    <TouchableOpacity
                        style={[styles.unitButton, data.unitPreference.weight === 'kg' && styles.unitButtonActive]}
                        onPress={() => updateData('unitPreference', { ...data.unitPreference, weight: 'kg' })}
                    >
                        <Text style={[styles.unitButtonText, data.unitPreference.weight === 'kg' && styles.unitButtonTextActive]}>kg</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.unitButton, data.unitPreference.weight === 'lbs' && styles.unitButtonActive]}
                        onPress={() => updateData('unitPreference', { ...data.unitPreference, weight: 'lbs' })}
                    >
                        <Text style={[styles.unitButtonText, data.unitPreference.weight === 'lbs' && styles.unitButtonTextActive]}>lbs</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.unitSection}>
                <Text style={styles.unitSectionTitle}>height</Text>
                <View style={styles.unitToggle}>
                    <TouchableOpacity
                        style={[styles.unitButton, data.unitPreference.height === 'cm' && styles.unitButtonActive]}
                        onPress={() => updateData('unitPreference', { ...data.unitPreference, height: 'cm' })}
                    >
                        <Text style={[styles.unitButtonText, data.unitPreference.height === 'cm' && styles.unitButtonTextActive]}>cm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.unitButton, data.unitPreference.height === 'ft' && styles.unitButtonActive]}
                        onPress={() => updateData('unitPreference', { ...data.unitPreference, height: 'ft' })}
                    >
                        <Text style={[styles.unitButtonText, data.unitPreference.height === 'ft' && styles.unitButtonTextActive]}>ft</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderPurposeStep = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>what are you here for?</Text>
            <View style={styles.cardContainer}>
                {([
                    { key: 'meals', label: 'track my meals', icon: '🍎' },
                    { key: 'workouts', label: 'track my workouts', icon: '🏋️' },
                    { key: 'both', label: 'track both', icon: '🎯' },
                    { key: 'discipline', label: 'build discipline', icon: '🔥' },
                ] as const).map((option) => (
                    <TouchableOpacity
                        key={option.key}
                        style={[
                            styles.purposeCard,
                            data.purpose === option.key && styles.purposeCardSelected
                        ]}
                        onPress={() => updateData('purpose', option.key)}
                    >
                        <Text style={styles.purposeIcon}>{option.icon}</Text>
                        <Text style={[
                            styles.purposeCardText,
                            data.purpose === option.key && styles.purposeCardTextSelected
                        ]}>
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderMacrosStep = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>macros setup?</Text>
            <View style={styles.cardContainer}>
                <TouchableOpacity
                    style={[
                        styles.macroCard,
                        data.macrosSetup === 'auto' && styles.macroCardSelected
                    ]}
                    onPress={() => updateData('macrosSetup', 'auto')}
                >
                    <Ionicons name="calculator-outline" size={32} color={data.macrosSetup === 'auto' ? '#526EFF' : '#666'} />
                    <Text style={[
                        styles.macroCardTitle,
                        data.macrosSetup === 'auto' && styles.macroCardTitleSelected
                    ]}>
                        auto calculate
                    </Text>
                    <Text style={[
                        styles.macroCardDesc,
                        data.macrosSetup === 'auto' && styles.macroCardDescSelected
                    ]}>
                        we'll calculate based on your goals
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.macroCard,
                        data.macrosSetup === 'manual' && styles.macroCardSelected
                    ]}
                    onPress={() => updateData('macrosSetup', 'manual')}
                >
                    <Ionicons name="settings-outline" size={32} color={data.macrosSetup === 'manual' ? '#526EFF' : '#666'} />
                    <Text style={[
                        styles.macroCardTitle,
                        data.macrosSetup === 'manual' && styles.macroCardTitleSelected
                    ]}>
                        custom macros
                    </Text>
                    <Text style={[
                        styles.macroCardDesc,
                        data.macrosSetup === 'manual' && styles.macroCardDescSelected
                    ]}>
                        set your own protein, carbs, fats
                    </Text>
                </TouchableOpacity>
            </View>
            {data.macrosSetup === 'manual' && (
                <View style={styles.macroInputsContainer}>
                    <View style={styles.macroInputRow}>
                        <Text style={styles.macroLabel}>protein (g)</Text>
                        <View style={styles.macroInputWrapper}>
                            <TextInput
                                placeholder="0"
                                keyboardType="numeric"
                                value={data.customMacros?.protein?.toString() || ''}
                                onChangeText={(text) => {
                                    const protein = parseInt(text) || 0;
                                    updateData('customMacros', {
                                        protein,
                                        carbs: data.customMacros?.carbs || 0,
                                        fats: data.customMacros?.fats || 0,
                                    });
                                }}
                            />
                        </View>
                    </View>
                    <View style={styles.macroInputRow}>
                        <Text style={styles.macroLabel}>carbs (g)</Text>
                        <View style={styles.macroInputWrapper}>
                            <TextInput
                                placeholder="0"
                                keyboardType="numeric"
                                value={data.customMacros?.carbs?.toString() || ''}
                                onChangeText={(text) => {
                                    const carbs = parseInt(text) || 0;
                                    updateData('customMacros', {
                                        protein: data.customMacros?.protein || 0,
                                        carbs,
                                        fats: data.customMacros?.fats || 0,
                                    });
                                }}
                            />
                        </View>
                    </View>
                    <View style={styles.macroInputRow}>
                        <Text style={styles.macroLabel}>fats (g)</Text>
                        <View style={styles.macroInputWrapper}>
                            <TextInput
                                placeholder="0"
                                keyboardType="numeric"
                                value={data.customMacros?.fats?.toString() || ''}
                                onChangeText={(text) => {
                                    const fats = parseInt(text) || 0;
                                    updateData('customMacros', {
                                        protein: data.customMacros?.protein || 0,
                                        carbs: data.customMacros?.carbs || 0,
                                        fats,
                                    });
                                }}
                            />
                        </View>
                    </View>
                </View>
            )}
        </View>
    );

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
                {/* Back button in top left */}
                {currentStep > 1 && (
                    <TouchableOpacity
                        style={styles.topBackButton}
                        onPress={prevStep}
                    >
                        <Ionicons name="chevron-back" size={24} color="#526EFF" />
                        <Text style={styles.backButtonText}>back</Text>
                    </TouchableOpacity>
                )}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View
                        style={{
                            opacity: contentFade,
                            transform: [
                                { translateY: contentSlide },
                                { scale: contentScale },
                            ],
                        }}
                    >
                        {renderStepContent()}
                    </Animated.View>
                </ScrollView>
                <View style={styles.buttonContainer}>
                    {currentStep > 1 && renderWeightPlates()}
                    <Button
                        variant="primary"
                        title={currentStep === 1 ? "get started!" : currentStep === TOTAL_STEPS ? "let's go!" : `continue (${currentStep}/${TOTAL_STEPS})`}
                        onPress={() => {
                            if (currentStep === TOTAL_STEPS) {
                                console.log('🎯 Step 15 - "let\'s go!" button clicked');
                                handleComplete();
                            } else {
                                nextStep();
                            }
                        }}
                        containerStyle={styles.nextButton}
                        loading={saving && currentStep === TOTAL_STEPS}
                        disabled={saving || !validateCurrentStep().valid}
                    />
                </View>
            </View>
        </View>
    );
};

