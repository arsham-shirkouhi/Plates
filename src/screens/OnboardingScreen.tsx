import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Animated, ScrollView, TouchableOpacity, Alert, PanResponder, Easing, Image, StyleSheet, Modal, Dimensions } from 'react-native';
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
import { OnboardingData } from './onboarding/types';
import { TOTAL_STEPS } from './onboarding/constants';
import { generateDailyMacrosFromAge, generateManualMacros } from '../utils/macroCalculator';
import { Confetti, ConfettiParticle } from '../components/Confetti';

type OnboardingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

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
        height: 168,
        heightUnit: 'cm',
        weight: 65,
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

    // Confetti state
    const [confettiParticles, setConfettiParticles] = useState<ConfettiParticle[]>([]);
    const containerRef = useRef<View>(null);

    // Helper function to trigger confetti from a press event
    const triggerConfetti = useCallback((event: any, color?: string) => {
        // Handle both direct events and events from Button component
        const nativeEvent = event?.nativeEvent || event;
        const pageX = nativeEvent?.pageX || (nativeEvent?.locationX ? nativeEvent.locationX : 0);
        const pageY = nativeEvent?.pageY || (nativeEvent?.locationY ? nativeEvent.locationY : 0);

        // If we don't have coordinates, use center of screen as fallback
        if (!pageX && !pageY) {
            const { width, height } = Dimensions.get('window');
            const fallbackX = width / 2;
            const fallbackY = height / 2;

            containerRef.current?.measureInWindow((containerX, containerY) => {
                const relativeX = fallbackX - containerX;
                const relativeY = fallbackY - containerY;
                const particles = Array.from({ length: 8 }, (_, i) => ({
                    id: Date.now() + i,
                    originX: relativeX,
                    originY: relativeY,
                    angle: (i / 8) * 360,
                    color: color,
                }));
                setConfettiParticles(particles);
                setTimeout(() => setConfettiParticles([]), 500);
            });
            return;
        }

        // Measure container position to get accurate relative position
        containerRef.current?.measureInWindow((containerX, containerY) => {
            // Calculate relative position within the container
            const relativeX = pageX - containerX;
            const relativeY = pageY - containerY;

            // Create confetti particles shooting out from the click position
            const particles = Array.from({ length: 8 }, (_, i) => ({
                id: Date.now() + i,
                originX: relativeX,
                originY: relativeY,
                angle: (i / 8) * 360, // Distribute particles in a circle (0-360 degrees)
            }));
            setConfettiParticles(particles);

            // Remove confetti after animation
            setTimeout(() => {
                setConfettiParticles([]);
            }, 500);
        });
    }, []);

    // Animation refs
    const contentFade = useRef(new Animated.Value(1)).current;
    const contentSlide = useRef(new Animated.Value(0)).current;
    const contentScale = useRef(new Animated.Value(1)).current;
    const unitToggleSlide = useRef(new Animated.Value(data.heightUnit === 'cm' ? 0 : 1)).current;
    const weightUnitToggleSlide = useRef(new Animated.Value(data.weightUnit === 'kg' ? 0 : 1)).current;
    const unitPreferenceToggleSlide = useRef(new Animated.Value(
        (data.unitPreference.weight === 'kg' && data.unitPreference.height === 'cm') ? 0 : 1
    )).current;

    // Measurement step animation refs
    const heightValueDisplayAnim = useRef(new Animated.Value(1)).current;
    const heightIncrementButtonScale = useRef(new Animated.Value(1)).current;
    const heightDecrementButtonScale = useRef(new Animated.Value(1)).current;
    const weightValueDisplayAnim = useRef(new Animated.Value(1)).current;
    const weightIncrementButtonScale = useRef(new Animated.Value(1)).current;
    const weightDecrementButtonScale = useRef(new Animated.Value(1)).current;

    // Refs for scrolling to selected items in dropdowns
    const heightScrollViewRef = useRef<ScrollView>(null);
    const weightScrollViewRef = useRef<ScrollView>(null);
    const heightScrollViewHeight = useRef<number>(400); // Default to maxHeight
    const weightScrollViewHeight = useRef<number>(400); // Default to maxHeight

    // Long press interval refs for measurement steps
    const heightLongPressIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const weightLongPressIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

    // Animation refs for goal intensity cards
    const mildIntensityCardTranslateY = useRef(new Animated.Value(0)).current;
    const moderateIntensityCardTranslateY = useRef(new Animated.Value(0)).current;
    const aggressiveIntensityCardTranslateY = useRef(new Animated.Value(0)).current;
    const mildIntensityCardShadowHeight = useRef(new Animated.Value(4)).current;
    const moderateIntensityCardShadowHeight = useRef(new Animated.Value(4)).current;
    const aggressiveIntensityCardShadowHeight = useRef(new Animated.Value(4)).current;
    const [mildIntensityCardShadowHeightState, setMildIntensityCardShadowHeightState] = useState(4);
    const [moderateIntensityCardShadowHeightState, setModerateIntensityCardShadowHeightState] = useState(4);
    const [aggressiveIntensityCardShadowHeightState, setAggressiveIntensityCardShadowHeightState] = useState(4);
    const mildIntensityCardColorOpacity = useRef(new Animated.Value(0)).current;
    const moderateIntensityCardColorOpacity = useRef(new Animated.Value(0)).current;
    const aggressiveIntensityCardColorOpacity = useRef(new Animated.Value(0)).current;

    // Animation refs for purpose cards
    const mealsPurposeCardTranslateY = useRef(new Animated.Value(0)).current;
    const workoutsPurposeCardTranslateY = useRef(new Animated.Value(0)).current;
    const bothPurposeCardTranslateY = useRef(new Animated.Value(0)).current;
    const disciplinePurposeCardTranslateY = useRef(new Animated.Value(0)).current;
    const mealsPurposeCardShadowHeight = useRef(new Animated.Value(4)).current;
    const workoutsPurposeCardShadowHeight = useRef(new Animated.Value(4)).current;
    const bothPurposeCardShadowHeight = useRef(new Animated.Value(4)).current;
    const disciplinePurposeCardShadowHeight = useRef(new Animated.Value(4)).current;
    const [mealsPurposeCardShadowHeightState, setMealsPurposeCardShadowHeightState] = useState(4);
    const [workoutsPurposeCardShadowHeightState, setWorkoutsPurposeCardShadowHeightState] = useState(4);
    const [bothPurposeCardShadowHeightState, setBothPurposeCardShadowHeightState] = useState(4);
    const [disciplinePurposeCardShadowHeightState, setDisciplinePurposeCardShadowHeightState] = useState(4);
    const mealsPurposeCardColorOpacity = useRef(new Animated.Value(0)).current;
    const workoutsPurposeCardColorOpacity = useRef(new Animated.Value(0)).current;
    const bothPurposeCardColorOpacity = useRef(new Animated.Value(0)).current;
    const disciplinePurposeCardColorOpacity = useRef(new Animated.Value(0)).current;

    // Animation refs for macro cards
    const autoMacroCardTranslateY = useRef(new Animated.Value(0)).current;
    const manualMacroCardTranslateY = useRef(new Animated.Value(0)).current;
    const autoMacroCardShadowHeight = useRef(new Animated.Value(4)).current;
    const manualMacroCardShadowHeight = useRef(new Animated.Value(4)).current;
    const [autoMacroCardShadowHeightState, setAutoMacroCardShadowHeightState] = useState(4);
    const [manualMacroCardShadowHeightState, setManualMacroCardShadowHeightState] = useState(4);
    const autoMacroCardColorOpacity = useRef(new Animated.Value(0)).current;
    const manualMacroCardColorOpacity = useRef(new Animated.Value(0)).current;
    const macroInputsOpacity = useRef(new Animated.Value(0)).current;
    const macroInputsTranslateY = useRef(new Animated.Value(-20)).current;
    const macrosStepContentTranslateY = useRef(new Animated.Value(60)).current;

    // Animation refs for allergy chips
    const nutsChipTranslateY = useRef(new Animated.Value(0)).current;
    const lactoseChipTranslateY = useRef(new Animated.Value(0)).current;
    const glutenChipTranslateY = useRef(new Animated.Value(0)).current;
    const shellfishChipTranslateY = useRef(new Animated.Value(0)).current;
    const eggsChipTranslateY = useRef(new Animated.Value(0)).current;
    const soyChipTranslateY = useRef(new Animated.Value(0)).current;
    const fishChipTranslateY = useRef(new Animated.Value(0)).current;
    const nutsChipShadowHeight = useRef(new Animated.Value(4)).current;
    const lactoseChipShadowHeight = useRef(new Animated.Value(4)).current;
    const glutenChipShadowHeight = useRef(new Animated.Value(4)).current;
    const shellfishChipShadowHeight = useRef(new Animated.Value(4)).current;
    const eggsChipShadowHeight = useRef(new Animated.Value(4)).current;
    const soyChipShadowHeight = useRef(new Animated.Value(4)).current;
    const fishChipShadowHeight = useRef(new Animated.Value(4)).current;
    const [nutsChipShadowHeightState, setNutsChipShadowHeightState] = useState(4);
    const [lactoseChipShadowHeightState, setLactoseChipShadowHeightState] = useState(4);
    const [glutenChipShadowHeightState, setGlutenChipShadowHeightState] = useState(4);
    const [shellfishChipShadowHeightState, setShellfishChipShadowHeightState] = useState(4);
    const [eggsChipShadowHeightState, setEggsChipShadowHeightState] = useState(4);
    const [soyChipShadowHeightState, setSoyChipShadowHeightState] = useState(4);
    const [fishChipShadowHeightState, setFishChipShadowHeightState] = useState(4);
    const nutsChipColorOpacity = useRef(new Animated.Value(0)).current;
    const lactoseChipColorOpacity = useRef(new Animated.Value(0)).current;
    const glutenChipColorOpacity = useRef(new Animated.Value(0)).current;
    const shellfishChipColorOpacity = useRef(new Animated.Value(0)).current;
    const eggsChipColorOpacity = useRef(new Animated.Value(0)).current;
    const soyChipColorOpacity = useRef(new Animated.Value(0)).current;
    const fishChipColorOpacity = useRef(new Animated.Value(0)).current;

    // Age picker refs
    // Date picker state
    const [monthModalVisible, setMonthModalVisible] = useState(false);
    const [dayModalVisible, setDayModalVisible] = useState(false);
    const [yearModalVisible, setYearModalVisible] = useState(false);

    // Height and weight picker state
    const [heightModalVisible, setHeightModalVisible] = useState(false);
    const [weightModalVisible, setWeightModalVisible] = useState(false);

    // Animation refs for modals
    const monthSlideAnim = useRef(new Animated.Value(0)).current;
    const monthFadeAnim = useRef(new Animated.Value(0)).current;
    const daySlideAnim = useRef(new Animated.Value(0)).current;
    const dayFadeAnim = useRef(new Animated.Value(0)).current;
    const yearSlideAnim = useRef(new Animated.Value(0)).current;
    const yearFadeAnim = useRef(new Animated.Value(0)).current;
    const heightSlideAnim = useRef(new Animated.Value(0)).current;
    const heightFadeAnim = useRef(new Animated.Value(0)).current;
    const weightSlideAnim = useRef(new Animated.Value(0)).current;
    const weightFadeAnim = useRef(new Animated.Value(0)).current;
    const heightRulerRef = useRef<ScrollView>(null);
    const isScrollingProgrammatically = useRef(false);
    const [displayedHeight, setDisplayedHeight] = useState(170); // Track displayed height during scroll
    const weightRulerRef = useRef<ScrollView>(null);
    const isScrollingProgrammaticallyWeight = useRef(false);
    const [displayedWeight, setDisplayedWeight] = useState(70); // Track displayed weight during scroll

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

    // Animate height modal when it opens/closes
    useEffect(() => {
        if (heightModalVisible) {
            Animated.parallel([
                Animated.timing(heightSlideAnim, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(heightFadeAnim, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(heightSlideAnim, {
                    toValue: 0,
                    duration: 250,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(heightFadeAnim, {
                    toValue: 0,
                    duration: 250,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [heightModalVisible]);

    // Animate weight modal when it opens/closes
    useEffect(() => {
        if (weightModalVisible) {
            Animated.parallel([
                Animated.timing(weightSlideAnim, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(weightFadeAnim, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(weightSlideAnim, {
                    toValue: 0,
                    duration: 250,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(weightFadeAnim, {
                    toValue: 0,
                    duration: 250,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [weightModalVisible]);

    // Scroll height ruler to selected value only when entering height step or unit changes
    useEffect(() => {
        if (currentStep === 6) { // Height step
            const currentUnit = data.unitPreference.height;
            const TICK_HEIGHT = 14; // Must match renderHeightStep
            const unitIsMetric = currentUnit === 'cm';
            const MIN_VALUE = unitIsMetric ? 122 : 48;
            const MAX_VALUE = unitIsMetric ? 213 : 84;
            const TOTAL_TICKS = MAX_VALUE - MIN_VALUE + 1;
            const BUFFER_TICKS = 10; // Must match renderHeightStep

            // Clamp value
            const clampedValue = Math.max(MIN_VALUE, Math.min(MAX_VALUE, Math.round(data.height)));

            const selectedIndex = clampedValue - MIN_VALUE;
            const reversedIndex = TOTAL_TICKS - 1 - selectedIndex;
            // Calculate exact scroll position (account for top buffer ticks)
            const initialScrollY = (reversedIndex + BUFFER_TICKS) * TICK_HEIGHT;

            isScrollingProgrammatically.current = true;
            setTimeout(() => {
                heightRulerRef.current?.scrollTo({
                    y: initialScrollY,
                    animated: false,
                });
                setTimeout(() => {
                    isScrollingProgrammatically.current = false;
                }, 200);
            }, 100);
        }
        // Only trigger on step change or unit preference change, NOT on height value change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStep, data.unitPreference.height]);

    // Initialize displayed height when entering height step or when height value changes
    useEffect(() => {
        if (currentStep === 6) {
            const isMetric = data.unitPreference.height === 'cm';
            const MIN_VALUE = isMetric ? 122 : 48;
            const MAX_VALUE = isMetric ? 213 : 84;
            const clampedValue = Math.max(MIN_VALUE, Math.min(MAX_VALUE, Math.round(data.height || (isMetric ? 168 : 66))));
            setDisplayedHeight(clampedValue);
        }
    }, [currentStep, data.height, data.unitPreference.height]);

    // Initialize displayed weight when entering weight step or when weight value changes
    useEffect(() => {
        if (currentStep === 7) {
            const isMetric = data.unitPreference.weight === 'kg';
            const minValue = isMetric ? 20 : 45;
            const maxValue = isMetric ? 250 : 550;
            const steppedValue = Math.round(data.weight || (isMetric ? 65 : 143));
            const clampedValue = Math.max(minValue, Math.min(maxValue, steppedValue));
            setDisplayedWeight(clampedValue);
        }
    }, [currentStep, data.weight, data.unitPreference.weight]);

    // Scroll weight ruler to selected value only when entering weight step or unit changes
    useEffect(() => {
        if (currentStep === 7) { // Weight step
            const currentUnit = data.unitPreference.weight;
            const TICK_WIDTH = 14; // Must match renderWeightStep
            const unitIsMetric = currentUnit === 'kg';
            const MIN_VALUE = unitIsMetric ? 20 : 45;
            const MAX_VALUE = unitIsMetric ? 250 : 550;
            const STEP = 1; // Integers only
            const TOTAL_TICKS = MAX_VALUE - MIN_VALUE + 1;
            const BUFFER_TICKS = 10; // Must match renderWeightStep

            // Clamp value (integers only)
            const steppedValue = Math.round(data.weight || (unitIsMetric ? 65 : 143));
            const clampedValue = Math.max(MIN_VALUE, Math.min(MAX_VALUE, steppedValue));

            const selectedIndex = clampedValue - MIN_VALUE;
            // Calculate exact scroll position (account for left buffer ticks)
            const initialScrollX = (selectedIndex + BUFFER_TICKS) * TICK_WIDTH;

            isScrollingProgrammaticallyWeight.current = true;
            setTimeout(() => {
                weightRulerRef.current?.scrollTo({
                    x: initialScrollX,
                    animated: false,
                });
                setTimeout(() => {
                    isScrollingProgrammaticallyWeight.current = false;
                }, 200);
            }, 100);
        }
        // Only trigger on step change or unit preference change, NOT on weight value change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStep, data.unitPreference.weight]);

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
                height: 168,
                heightUnit: 'cm',
                weight: 65,
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
                        setUsernameError('this username is not available!');
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
                    return { valid: false, message: "you're not old enough" };
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
            case 5: // Unit Preferences - REQUIRED (has defaults, but validate)
                if (!data.unitPreference || !data.unitPreference.weight || !data.unitPreference.height) {
                    return { valid: false, message: 'please select unit preferences' };
                }
                break;
            case 6: // Height - REQUIRED
                if (!data.height || data.height <= 0) {
                    return { valid: false, message: 'please enter your height' };
                }
                break;
            case 7: // Weight - REQUIRED
                if (!data.weight || data.weight <= 0) {
                    return { valid: false, message: 'please enter your weight' };
                }
                break;
            case 8: // Goal - REQUIRED
                if (data.goal === '') {
                    return { valid: false, message: 'please select your goal' };
                }
                break;
            case 9: // Activity Level - REQUIRED
                if (data.activityLevel === '') {
                    return { valid: false, message: 'please select your activity level' };
                }
                break;
            case 10: // Diet Preference - REQUIRED
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
            case 13: // Purpose - REQUIRED
                if (data.purpose === '') {
                    return { valid: false, message: 'please select what you\'re here for' };
                }
                break;
            case 14: // Macros Setup - This step still exists as step 14
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
        console.log(`🎯 ONBOARDING COMPLETION - Step ${TOTAL_STEPS}`);
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

            // Calculate macros before saving to show in results modal
            let macros = null;
            if (onboardingData.macrosSetup === 'auto') {
                macros = generateDailyMacrosFromAge(
                    onboardingData.age,
                    onboardingData.sex,
                    onboardingData.height,
                    onboardingData.heightUnit,
                    onboardingData.weight,
                    onboardingData.weightUnit,
                    onboardingData.activityLevel,
                    onboardingData.goal,
                    onboardingData.goalIntensity
                );
            } else if (onboardingData.macrosSetup === 'manual' && onboardingData.customMacros) {
                macros = generateManualMacros(onboardingData.customMacros);
            }

            await saveOnboardingData(user, onboardingData);
            console.log('✅ Onboarding data saved successfully');
            console.log('✅ User flagged as onboardingCompleted: true');

            // Navigate to results screen if macros were calculated
            if (macros && onboardingData.goal && onboardingData.goalIntensity) {
                console.log('📊 Navigating to Macro Results screen...');
                navigation.replace('MacroResults', {
                    macros,
                    goal: onboardingData.goal as 'lose' | 'maintain' | 'build',
                    goalIntensity: onboardingData.goalIntensity as 'mild' | 'moderate' | 'aggressive',
                });
            } else {
                // If no macros, navigate directly to Home
                console.log('🏠 Navigating to Home screen...');
                navigation.replace('Home');
            }
            console.log('═══════════════════════════════════════════════════════');
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
                return renderUnitPreferencesStep();
            case 6:
                return renderHeightStep();
            case 7:
                return renderWeightStep();
            case 8:
                return renderGoalStep();
            case 9:
                return renderActivityLevelStep();
            case 10:
                return renderDietPreferenceStep();
            case 11:
                return renderAllergiesStep();
            case 12:
                return renderGoalIntensityStep();
            case 13:
                return renderPurposeStep();
            case 14:
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
                        <Text style={styles.usernameSuccessText}>this username is available!</Text>
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
            style?: any,
            baseStyle?: any
        ) => {
            const isPlaceholder = value === placeholder;
            return (
                <TouchableOpacity
                    style={[baseStyle || styles.dateDropdown, style]}
                    onPress={onPress}
                >
                    <Text
                        style={[
                            styles.dateDropdownText,
                            isPlaceholder && styles.dateDropdownTextPlaceholder
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {isPlaceholder ? placeholder : value}
                    </Text>
                    <Ionicons
                        name="chevron-down"
                        size={20}
                        color={isPlaceholder ? "#999" : "#252525"}
                        style={styles.dateDropdownIcon}
                    />
                </TouchableOpacity>
            );
        };


        // Get available days based on selected month and year
        const availableDays = data.birthMonth && data.birthYear
            ? Array.from({ length: getDaysInMonth(data.birthMonth, data.birthYear) }, (_, i) => i + 1)
            : days;

        // Calculate age and check if under 13
        let isUnderAge = false;
        if (data.birthMonth && data.birthDay && data.birthYear) {
            const today = new Date();
            const birthDate = new Date(data.birthYear, data.birthMonth - 1, data.birthDay);
            const age = today.getFullYear() - birthDate.getFullYear() -
                (today.getMonth() < birthDate.getMonth() ||
                    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);
            isUnderAge = age < 13;
        }

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
                        { marginRight: 8 },
                        styles.dateDropdownDay
                    )}
                    {renderDropdown(
                        'Year',
                        'year',
                        data.birthYear ? data.birthYear.toString() : 'year',
                        () => setYearModalVisible(true),
                        undefined,
                        styles.dateDropdownYear
                    )}
                </View>
                {isUnderAge && (
                    <Text style={styles.ageErrorText}>you're not old enough</Text>
                )}

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
        const nutsChipListenerId = nutsChipShadowHeight.addListener(({ value }) => {
            setNutsChipShadowHeightState(value);
        });
        const lactoseChipListenerId = lactoseChipShadowHeight.addListener(({ value }) => {
            setLactoseChipShadowHeightState(value);
        });
        const glutenChipListenerId = glutenChipShadowHeight.addListener(({ value }) => {
            setGlutenChipShadowHeightState(value);
        });
        const shellfishChipListenerId = shellfishChipShadowHeight.addListener(({ value }) => {
            setShellfishChipShadowHeightState(value);
        });
        const eggsChipListenerId = eggsChipShadowHeight.addListener(({ value }) => {
            setEggsChipShadowHeightState(value);
        });
        const soyChipListenerId = soyChipShadowHeight.addListener(({ value }) => {
            setSoyChipShadowHeightState(value);
        });
        const fishChipListenerId = fishChipShadowHeight.addListener(({ value }) => {
            setFishChipShadowHeightState(value);
        });
        const mildIntensityListenerId = mildIntensityCardShadowHeight.addListener(({ value }) => {
            setMildIntensityCardShadowHeightState(value);
        });
        const moderateIntensityListenerId = moderateIntensityCardShadowHeight.addListener(({ value }) => {
            setModerateIntensityCardShadowHeightState(value);
        });
        const aggressiveIntensityListenerId = aggressiveIntensityCardShadowHeight.addListener(({ value }) => {
            setAggressiveIntensityCardShadowHeightState(value);
        });
        const mealsPurposeListenerId = mealsPurposeCardShadowHeight.addListener(({ value }) => {
            setMealsPurposeCardShadowHeightState(value);
        });
        const workoutsPurposeListenerId = workoutsPurposeCardShadowHeight.addListener(({ value }) => {
            setWorkoutsPurposeCardShadowHeightState(value);
        });
        const bothPurposeListenerId = bothPurposeCardShadowHeight.addListener(({ value }) => {
            setBothPurposeCardShadowHeightState(value);
        });
        const disciplinePurposeListenerId = disciplinePurposeCardShadowHeight.addListener(({ value }) => {
            setDisciplinePurposeCardShadowHeightState(value);
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
            nutsChipShadowHeight.removeListener(nutsChipListenerId);
            lactoseChipShadowHeight.removeListener(lactoseChipListenerId);
            glutenChipShadowHeight.removeListener(glutenChipListenerId);
            shellfishChipShadowHeight.removeListener(shellfishChipListenerId);
            eggsChipShadowHeight.removeListener(eggsChipListenerId);
            soyChipShadowHeight.removeListener(soyChipListenerId);
            fishChipShadowHeight.removeListener(fishChipListenerId);
            mildIntensityCardShadowHeight.removeListener(mildIntensityListenerId);
            moderateIntensityCardShadowHeight.removeListener(moderateIntensityListenerId);
            aggressiveIntensityCardShadowHeight.removeListener(aggressiveIntensityListenerId);
            mealsPurposeCardShadowHeight.removeListener(mealsPurposeListenerId);
            workoutsPurposeCardShadowHeight.removeListener(workoutsPurposeListenerId);
            bothPurposeCardShadowHeight.removeListener(bothPurposeListenerId);
            disciplinePurposeCardShadowHeight.removeListener(disciplinePurposeListenerId);
        };
        const autoMacroListenerId = autoMacroCardShadowHeight.addListener(({ value }) => {
            setAutoMacroCardShadowHeightState(value);
        });
        const manualMacroListenerId = manualMacroCardShadowHeight.addListener(({ value }) => {
            setManualMacroCardShadowHeightState(value);
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
            nutsChipShadowHeight.removeListener(nutsChipListenerId);
            lactoseChipShadowHeight.removeListener(lactoseChipListenerId);
            glutenChipShadowHeight.removeListener(glutenChipListenerId);
            shellfishChipShadowHeight.removeListener(shellfishChipListenerId);
            eggsChipShadowHeight.removeListener(eggsChipListenerId);
            soyChipShadowHeight.removeListener(soyChipListenerId);
            fishChipShadowHeight.removeListener(fishChipListenerId);
            mildIntensityCardShadowHeight.removeListener(mildIntensityListenerId);
            moderateIntensityCardShadowHeight.removeListener(moderateIntensityListenerId);
            aggressiveIntensityCardShadowHeight.removeListener(aggressiveIntensityListenerId);
            mealsPurposeCardShadowHeight.removeListener(mealsPurposeListenerId);
            workoutsPurposeCardShadowHeight.removeListener(workoutsPurposeListenerId);
            bothPurposeCardShadowHeight.removeListener(bothPurposeListenerId);
            disciplinePurposeCardShadowHeight.removeListener(disciplinePurposeListenerId);
            autoMacroCardShadowHeight.removeListener(autoMacroListenerId);
            manualMacroCardShadowHeight.removeListener(manualMacroListenerId);
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
        if (currentStep === 8) { // Goal step is step 8
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
        if (currentStep === 9) { // Activity level step is step 9
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
        if (currentStep === 10) { // Diet preference step is step 10
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

    // Animate allergy chips when selection changes - pressed button state when selected
    useEffect(() => {
        // Always run animations when on step 10, or when allergies change
        if (currentStep === 11) { // Allergies step is step 11
            const isNutsSelected = data.allergies.includes('nuts');
            const isLactoseSelected = data.allergies.includes('lactose');
            const isGlutenSelected = data.allergies.includes('gluten');
            const isShellfishSelected = data.allergies.includes('shellfish');
            const isEggsSelected = data.allergies.includes('eggs');
            const isSoySelected = data.allergies.includes('soy');
            const isFishSelected = data.allergies.includes('fish');

            const animations: Animated.CompositeAnimation[] = [
                Animated.parallel([
                    Animated.timing(nutsChipTranslateY, {
                        toValue: isNutsSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(nutsChipShadowHeight, {
                        toValue: isNutsSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(nutsChipColorOpacity, {
                        toValue: isNutsSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(lactoseChipTranslateY, {
                        toValue: isLactoseSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(lactoseChipShadowHeight, {
                        toValue: isLactoseSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(lactoseChipColorOpacity, {
                        toValue: isLactoseSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(glutenChipTranslateY, {
                        toValue: isGlutenSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(glutenChipShadowHeight, {
                        toValue: isGlutenSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(glutenChipColorOpacity, {
                        toValue: isGlutenSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(shellfishChipTranslateY, {
                        toValue: isShellfishSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(shellfishChipShadowHeight, {
                        toValue: isShellfishSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(shellfishChipColorOpacity, {
                        toValue: isShellfishSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(eggsChipTranslateY, {
                        toValue: isEggsSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(eggsChipShadowHeight, {
                        toValue: isEggsSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(eggsChipColorOpacity, {
                        toValue: isEggsSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(soyChipTranslateY, {
                        toValue: isSoySelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(soyChipShadowHeight, {
                        toValue: isSoySelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(soyChipColorOpacity, {
                        toValue: isSoySelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(fishChipTranslateY, {
                        toValue: isFishSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(fishChipShadowHeight, {
                        toValue: isFishSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(fishChipColorOpacity, {
                        toValue: isFishSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
            ];

            Animated.parallel(animations).start();
        }
    }, [data.allergies, currentStep]);

    // Animate goal intensity cards when selection changes - pressed button state when selected
    useEffect(() => {
        if (currentStep === 12) { // Goal intensity step is step 12
            const isMildSelected = data.goalIntensity === 'mild';
            const isModerateSelected = data.goalIntensity === 'moderate';
            const isAggressiveSelected = data.goalIntensity === 'aggressive';

            const animations: Animated.CompositeAnimation[] = [
                Animated.parallel([
                    Animated.timing(mildIntensityCardTranslateY, {
                        toValue: isMildSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(mildIntensityCardShadowHeight, {
                        toValue: isMildSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(mildIntensityCardColorOpacity, {
                        toValue: isMildSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(moderateIntensityCardTranslateY, {
                        toValue: isModerateSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(moderateIntensityCardShadowHeight, {
                        toValue: isModerateSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(moderateIntensityCardColorOpacity, {
                        toValue: isModerateSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(aggressiveIntensityCardTranslateY, {
                        toValue: isAggressiveSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(aggressiveIntensityCardShadowHeight, {
                        toValue: isAggressiveSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(aggressiveIntensityCardColorOpacity, {
                        toValue: isAggressiveSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
            ];

            Animated.parallel(animations).start();
        }
    }, [data.goalIntensity, currentStep]);

    // Animate purpose cards when selection changes - pressed button state when selected
    useEffect(() => {
        if (currentStep === 13) { // Purpose step is step 13
            const isMealsSelected = data.purpose === 'meals';
            const isWorkoutsSelected = data.purpose === 'workouts';
            const isBothSelected = data.purpose === 'both';
            const isDisciplineSelected = data.purpose === 'discipline';

            const animations: Animated.CompositeAnimation[] = [
                Animated.parallel([
                    Animated.timing(mealsPurposeCardTranslateY, {
                        toValue: isMealsSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(mealsPurposeCardShadowHeight, {
                        toValue: isMealsSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(mealsPurposeCardColorOpacity, {
                        toValue: isMealsSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(workoutsPurposeCardTranslateY, {
                        toValue: isWorkoutsSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(workoutsPurposeCardShadowHeight, {
                        toValue: isWorkoutsSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(workoutsPurposeCardColorOpacity, {
                        toValue: isWorkoutsSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(bothPurposeCardTranslateY, {
                        toValue: isBothSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(bothPurposeCardShadowHeight, {
                        toValue: isBothSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(bothPurposeCardColorOpacity, {
                        toValue: isBothSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(disciplinePurposeCardTranslateY, {
                        toValue: isDisciplineSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(disciplinePurposeCardShadowHeight, {
                        toValue: isDisciplineSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(disciplinePurposeCardColorOpacity, {
                        toValue: isDisciplineSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
            ];

            Animated.parallel(animations).start();
        }
    }, [data.purpose, currentStep]);

    // Animate macro cards when selection changes - pressed button state when selected
    useEffect(() => {
        // Always run animations when on step 14, or when macrosSetup changes
        if (currentStep === 14) { // Macros step is step 14
            const isAutoSelected = data.macrosSetup === 'auto';
            const isManualSelected = data.macrosSetup === 'manual';

            const animations: Animated.CompositeAnimation[] = [
                Animated.parallel([
                    Animated.timing(autoMacroCardTranslateY, {
                        toValue: isAutoSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(autoMacroCardShadowHeight, {
                        toValue: isAutoSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(autoMacroCardColorOpacity, {
                        toValue: isAutoSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(manualMacroCardTranslateY, {
                        toValue: isManualSelected ? 4 : 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(manualMacroCardShadowHeight, {
                        toValue: isManualSelected ? 0 : 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(manualMacroCardColorOpacity, {
                        toValue: isManualSelected ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
            ];

            Animated.parallel(animations).start();
        }
    }, [data.macrosSetup, currentStep]);

    // Animate macro inputs container when manual is selected
    useEffect(() => {
        if (currentStep === 14) { // Macros step is step 14
            const isManual = data.macrosSetup === 'manual';

            // Reset to lower position when entering the step
            if (!isManual) {
                macrosStepContentTranslateY.setValue(60);
            }

            Animated.parallel([
                Animated.timing(macroInputsOpacity, {
                    toValue: isManual ? 1 : 0,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(macroInputsTranslateY, {
                    toValue: isManual ? 0 : -20,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(macrosStepContentTranslateY, {
                    toValue: isManual ? -40 : 60,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Reset when not on this step
            macrosStepContentTranslateY.setValue(60);
        }
    }, [data.macrosSetup, currentStep]);

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

                        const handlePressIn = () => {
                            const cardShadowHeight = option.key === 'male' ? maleCardShadowHeight : femaleCardShadowHeight;
                            const cardTranslateY = option.key === 'male' ? maleCardTranslateY : femaleCardTranslateY;

                            Animated.parallel([
                                Animated.timing(cardTranslateY, {
                                    toValue: 4,
                                    duration: 120,
                                    easing: Easing.out(Easing.ease),
                                    useNativeDriver: true,
                                }),
                                Animated.timing(cardShadowHeight, {
                                    toValue: 0,
                                    duration: 120,
                                    easing: Easing.out(Easing.ease),
                                    useNativeDriver: false,
                                }),
                            ]).start();
                        };

                        const handlePressOut = () => {
                            // The selection animation will handle the final state
                            // This just provides immediate feedback
                        };

                        const cardShadowHeightAnim = option.key === 'male' ? maleCardShadowHeight : femaleCardShadowHeight;

                        return (
                            <View key={option.key} style={{ position: 'relative' }}>
                                {/* Shadow layer - harsh drop shadow */}
                                <Animated.View
                                    style={[
                                        styles.sexCard,
                                        {
                                            position: 'absolute',
                                            backgroundColor: '#252525',
                                            top: 4,
                                            left: 0,
                                            right: 0,
                                            transform: [{ translateY: 0 }],
                                            opacity: cardShadowHeightAnim.interpolate({
                                                inputRange: [0, 4],
                                                outputRange: [0, 1],
                                            }),
                                            zIndex: 0,
                                            borderWidth: 0,
                                        },
                                    ]}
                                    pointerEvents="none"
                                />
                                <TouchableOpacity
                                    key={option.key}
                                    onPress={(e) => {
                                        // Blue confetti when selecting (card becomes blue), white when deselecting
                                        const willBeSelected = data.sex !== option.key;
                                        triggerConfetti(e, willBeSelected ? '#526EFF' : '#fff');
                                        updateData('sex', option.key);
                                    }}
                                    onPressIn={handlePressIn}
                                    onPressOut={handlePressOut}
                                    activeOpacity={1}
                                    style={{ zIndex: 1 }}
                                >
                                    <Animated.View
                                        style={[
                                            styles.sexCard,
                                            {
                                                transform: [{ translateY: cardTranslateY }],
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
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    // Animate unit preference toggle sliding background when unit changes (only on unit preferences step)
    useEffect(() => {
        if (currentStep === 5) { // Unit preferences step is now step 5
            const isMetric = data.unitPreference.weight === 'kg' && data.unitPreference.height === 'cm';
            Animated.timing(unitPreferenceToggleSlide, {
                toValue: isMetric ? 0 : 1,
                duration: 300,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }).start();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.unitPreference, currentStep]);

    // Sync height and weight units with unit preference when unit preference changes
    useEffect(() => {
        if (currentStep >= 6) { // After unit preference step
            // Sync height unit
            if (data.heightUnit !== data.unitPreference.height) {
                const currentHeight = data.height;
                let convertedHeight = currentHeight;

                // Convert if needed
                if (data.heightUnit === 'cm' && data.unitPreference.height === 'ft') {
                    convertedHeight = currentHeight * 0.393701; // cm to inches
                } else if (data.heightUnit === 'ft' && data.unitPreference.height === 'cm') {
                    convertedHeight = currentHeight * 2.54; // inches to cm
                }

                updateData('heightUnit', data.unitPreference.height);
                updateData('height', Math.round(convertedHeight));
            }

            // Sync weight unit
            if (data.weightUnit !== data.unitPreference.weight) {
                const currentWeight = data.weight;
                let convertedWeight = currentWeight;

                // Convert if needed
                if (data.weightUnit === 'kg' && data.unitPreference.weight === 'lbs') {
                    convertedWeight = currentWeight * 2.20462; // kg to lbs
                } else if (data.weightUnit === 'lbs' && data.unitPreference.weight === 'kg') {
                    convertedWeight = currentWeight * 0.453592; // lbs to kg
                }

                updateData('weightUnit', data.unitPreference.weight);
                updateData('weight', data.unitPreference.weight === 'kg' ? parseFloat(convertedWeight.toFixed(1)) : Math.round(convertedWeight));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.unitPreference, currentStep]);

    // Close modals when entering height or weight steps
    useEffect(() => {
        if (currentStep === 6) { // Height step
            setHeightModalVisible(false);
            heightSlideAnim.setValue(0);
            heightFadeAnim.setValue(0);
        }
        if (currentStep === 7) { // Weight step
            setWeightModalVisible(false);
            weightSlideAnim.setValue(0);
            weightFadeAnim.setValue(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStep]);

    // Shared renderPickerModal function for date, height, and weight selection
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
                            <ScrollView
                                style={styles.modalScrollView}
                                scrollEventThrottle={16}
                                removeClippedSubviews={true}
                                nestedScrollEnabled={true}
                                keyboardShouldPersistTaps="handled"
                                decelerationRate="normal"
                                bounces={true}
                                overScrollMode="auto"
                            >
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

    // Helper function to convert inches to feet and inches string (e.g., 71 -> "5'11\"")
    const inchesToFeetInches = (inches: number): string => {
        const clampedInches = Math.max(48, Math.min(95, Math.round(inches)));
        const feet = Math.floor(clampedInches / 12);
        const remainingInches = clampedInches % 12;
        return `${feet}'${remainingInches}"`;
    };

    // Shared helper for rendering measurement step (height or weight) - Simple dropdown version
    const renderMeasurementStep = (
        title: string,
        currentValue: number,
        currentUnit: string,
        unitKey: 'heightUnit' | 'weightUnit',
        valueKey: 'height' | 'weight',
        unitToggleSlideAnim: Animated.Value,
        modalVisible: boolean,
        setModalVisible: (visible: boolean) => void,
        slideAnim: Animated.Value,
        fadeAnim: Animated.Value,
        config: {
            unit1: string;
            unit2: string;
            min1: number;
            max1: number;
            step1: number;
            min2: number;
            max2: number;
            step2: number;
            convert1To2: (val: number) => number;
            convert2To1: (val: number) => number;
            format1: (val: number) => string;
            format2: (val: number) => string;
        }
    ) => {
        const isUnit1 = currentUnit === config.unit1;
        const minValue = isUnit1 ? config.min1 : config.min2;
        const maxValue = isUnit1 ? config.max1 : config.max2;
        const step = isUnit1 ? config.step1 : config.step2;

        // Clamp and round value
        const steppedValue = Math.round(currentValue / step) * step;
        const clampedValue = Math.max(minValue, Math.min(maxValue, steppedValue));

        const handleUnitChange = (newUnit: string) => {
            if (newUnit === config.unit1 && currentUnit === config.unit2) {
                const converted = config.convert2To1(currentValue);
                const rounded = config.step1 >= 1
                    ? Math.round(converted / config.step1) * config.step1
                    : Math.round(converted * 2) / 2;
                const clamped = Math.max(config.min1, Math.min(config.max1, rounded));
                updateData(unitKey, config.unit1);
                updateData(valueKey, clamped);
            } else if (newUnit === config.unit2 && currentUnit === config.unit1) {
                const converted = config.convert1To2(currentValue);
                const rounded = config.step2 >= 1
                    ? Math.round(converted / config.step2) * config.step2
                    : Math.round(converted);
                const clamped = Math.max(config.min2, Math.min(config.max2, rounded));
                updateData(unitKey, config.unit2);
                updateData(valueKey, clamped);
            }
        };

        // Generate items for dropdown
        const items: string[] = [];
        for (let val = minValue; val <= maxValue; val += step) {
            if (isUnit1) {
                items.push(config.format1(val));
            } else {
                items.push(config.format2(val));
            }
        }

        const formattedValue = isUnit1 ? config.format1(clampedValue) : config.format2(clampedValue);
        const selectedIndex = items.findIndex(item => item === formattedValue);

        const handleOpenModal = () => {
            setModalVisible(true);
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 1,
                    duration: 250,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 250,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        };

        const handleSelect = (index: number) => {
            const selectedValue = minValue + (index * step);
            updateData(valueKey, selectedValue);
        };

        const handleCloseModal = () => {
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
                setModalVisible(false);
            });
        };

        const renderPickerModal = () => {
            const translateY = slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [300, 0],
            });

            return (
                <Modal
                    visible={modalVisible}
                    transparent={true}
                    animationType="none"
                    onRequestClose={handleCloseModal}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={handleCloseModal}
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
                                <ScrollView
                                    style={styles.modalScrollView}
                                    scrollEventThrottle={16}
                                    removeClippedSubviews={true}
                                    nestedScrollEnabled={true}
                                    keyboardShouldPersistTaps="handled"
                                    decelerationRate="normal"
                                    bounces={true}
                                    overScrollMode="auto"
                                >
                                    {items.map((item, index) => {
                                        const isSelected = index === selectedIndex;
                                        return (
                                            <TouchableOpacity
                                                key={index}
                                                style={[
                                                    styles.modalItem,
                                                    isSelected && styles.modalItemSelected
                                                ]}
                                                onPress={() => {
                                                    handleSelect(index);
                                                    handleCloseModal();
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

        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{title}</Text>

                {/* Unit Toggle */}
                <View style={{ position: 'relative', marginBottom: 0, marginTop: 20, alignItems: 'center' }}>
                    {/* Shadow layer - harsh drop shadow */}
                    <Animated.View
                        style={[
                            styles.unitToggle,
                            {
                                position: 'absolute',
                                backgroundColor: '#252525',
                                top: 4,
                                left: 0,
                                opacity: 1,
                                zIndex: 0,
                                borderWidth: 0,
                                marginBottom: 0,
                            },
                        ]}
                        pointerEvents="none"
                    />
                    <View style={[styles.unitToggle, { zIndex: 1 }]}>
                        <Animated.View
                            style={[
                                styles.unitToggleBackground,
                                {
                                    transform: [{
                                        translateX: unitToggleSlideAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, 176],
                                        }),
                                    }],
                                },
                            ]}
                        />
                        <TouchableOpacity
                            style={styles.unitButton}
                            onPress={() => handleUnitChange(config.unit1)}
                        >
                            <Text style={[
                                styles.unitButtonText,
                                currentUnit === config.unit1 && styles.unitButtonTextActive
                            ]}>
                                {config.unit1}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.unitButton}
                            onPress={() => handleUnitChange(config.unit2)}
                        >
                            <Text style={[
                                styles.unitButtonText,
                                currentUnit === config.unit2 && styles.unitButtonTextActive
                            ]}>
                                {config.unit2}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Dropdown */}
                <View style={styles.datePickerContainer}>
                    <TouchableOpacity
                        style={styles.dateDropdown}
                        onPress={handleOpenModal}
                    >
                        <Text
                            style={styles.dateDropdownText}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {formattedValue}
                        </Text>
                        <Ionicons
                            name="chevron-down"
                            size={20}
                            color="#252525"
                            style={styles.dateDropdownIcon}
                        />
                    </TouchableOpacity>
                </View>

                {renderPickerModal()}
            </View>
        );
    };

    const renderHeightStep = () => {
        // Use unit preference for height
        const currentUnit = data.unitPreference.height;
        const isMetric = currentUnit === 'cm';

        // Constants - copy from weight selector
        const TICK_HEIGHT = 14; // px - horizontal spacing (similar to TICK_WIDTH for weight)

        // Range based on unit - rebuild ruler data, don't scale
        const MIN_VALUE = isMetric ? 122 : 48; // 122cm or 48 inches (4'0)
        const MAX_VALUE = isMetric ? 213 : 84; // 213cm or 84 inches (7'0)
        const STEP = 1; // 1cm or 1 inch increments (integers only)
        // Calculate total ticks based on step
        const TOTAL_TICKS = MAX_VALUE - MIN_VALUE + 1;
        // Buffer ticks to fill empty space above and below (no numbers, just visual ticks)
        // Top buffer shows gradient but scrolling stops at maximum value
        const BUFFER_TICKS = 10;
        const TOTAL_TICKS_WITH_BUFFER = TOTAL_TICKS + (2 * BUFFER_TICKS);

        // Set default to middle of range: (122 + 213) / 2 = 167.5 ≈ 168cm or (48 + 84) / 2 = 66 inches
        const defaultHeight = isMetric ? 168 : 66;
        if (!data.height || data.height < MIN_VALUE || data.height > MAX_VALUE) {
            updateData('height', defaultHeight);
        }

        // Clamp and round value to step (integers only)
        const steppedValue = Math.round(data.height);
        const clampedValue = Math.max(MIN_VALUE, Math.min(MAX_VALUE, steppedValue));

        // Format display value using displayedHeight for real-time updates
        const formattedValue = isMetric
            ? `${displayedHeight} cm`
            : (() => {
                const feet = Math.floor(displayedHeight / 12);
                const inches = displayedHeight % 12;
                return `${feet}'${inches} ft`;
            })();

        const screenHeight = Dimensions.get('window').height;
        const rulerHeight = Math.min(screenHeight * 0.5, 400);
        // Perfect center alignment: CENTER_OFFSET = rulerHeight / 2 - tickHeight / 2
        const CENTER_OFFSET = rulerHeight / 2 - TICK_HEIGHT / 2;

        // Handle scroll - update displayed value in real-time - copy from weight selector
        const onScroll = (e: any) => {
            if (isScrollingProgrammatically.current) {
                return;
            }

            const offsetY = e.nativeEvent.contentOffset.y;
            // Calculate which tick should be centered (account for top buffer)
            const index = Math.round(offsetY / TICK_HEIGHT);
            const adjustedIndex = index - BUFFER_TICKS;
            // Clamp to valid range: 0 (MAX_VALUE) to TOTAL_TICKS - 1 (MIN_VALUE)
            const clampedIndex = Math.max(0, Math.min(TOTAL_TICKS - 1, adjustedIndex));

            // Reverse: index 0 = maxValue (top), index TOTAL_TICKS-1 = minValue (bottom)
            const reversedIndex = TOTAL_TICKS - 1 - clampedIndex;
            const newDisplayedValue = MIN_VALUE + reversedIndex;

            // Update displayed value in real-time (not the actual data)
            if (newDisplayedValue !== displayedHeight) {
                setDisplayedHeight(newDisplayedValue);
                // Trigger subtle animation on the display
                Animated.sequence([
                    Animated.timing(heightValueDisplayAnim, {
                        toValue: 0.95,
                        duration: 50,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(heightValueDisplayAnim, {
                        toValue: 1,
                        duration: 100,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]).start();
            }
        };

        // Clamp scroll to prevent overscrolling past min/max
        // Hard stop at maximum valid tick (scrollY = BUFFER_TICKS * TICK_HEIGHT)
        // Minimum valid tick at bottom (scrollY = (BUFFER_TICKS + TOTAL_TICKS - 1) * TICK_HEIGHT)
        const clampScrollPosition = (offsetY: number): number => {
            const minScrollY = (BUFFER_TICKS + TOTAL_TICKS - 1) * TICK_HEIGHT; // Minimum value at bottom
            const maxScrollY = BUFFER_TICKS * TICK_HEIGHT; // Maximum value at top - hard stop
            return Math.max(maxScrollY, Math.min(minScrollY, offsetY));
        };

        // Handle scroll end drag - clamp position if needed
        const onScrollEndDrag = (e: any) => {
            if (isScrollingProgrammatically.current) {
                return;
            }

            const offsetY = e.nativeEvent.contentOffset.y;
            const clampedY = clampScrollPosition(offsetY);

            if (clampedY !== offsetY) {
                isScrollingProgrammatically.current = true;
                heightRulerRef.current?.scrollTo({
                    y: clampedY,
                    animated: true,
                });
                setTimeout(() => {
                    isScrollingProgrammatically.current = false;
                }, 300);
            }
        };

        // Handle scroll end - ONLY update actual state here (after momentum ends)
        const onMomentumScrollEnd = (e: any) => {
            if (isScrollingProgrammatically.current) {
                return;
            }

            const offsetY = e.nativeEvent.contentOffset.y;
            // Calculate which tick should be centered (account for top buffer)
            const index = Math.round(offsetY / TICK_HEIGHT);
            const adjustedIndex = index - BUFFER_TICKS;
            // Clamp to valid range: 0 (MAX_VALUE) to TOTAL_TICKS - 1 (MIN_VALUE)
            const clampedIndex = Math.max(0, Math.min(TOTAL_TICKS - 1, adjustedIndex));

            // Calculate exact scroll position for perfect snapping (add top buffer offset)
            const exactScrollY = (clampedIndex + BUFFER_TICKS) * TICK_HEIGHT;

            // Reverse: index 0 = maxValue (top), index TOTAL_TICKS-1 = minValue (bottom)
            const reversedIndex = TOTAL_TICKS - 1 - clampedIndex;
            const newValue = MIN_VALUE + reversedIndex;

            // Update value only after momentum ends with animation
            if (newValue !== clampedValue) {
                // Animate value display
                Animated.sequence([
                    Animated.timing(heightValueDisplayAnim, {
                        toValue: 0.8,
                        duration: 100,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(heightValueDisplayAnim, {
                        toValue: 1,
                        duration: 200,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]).start();

                updateData('height', newValue);
            }

            // Snap to exact position smoothly
            isScrollingProgrammatically.current = true;
            heightRulerRef.current?.scrollTo({
                y: exactScrollY,
                animated: true,
            });
            setTimeout(() => {
                isScrollingProgrammatically.current = false;
            }, 400);
        };

        const renderTick = (index: number) => {
            // Check if this is a buffer tick (above or below valid range) - copy from weight selector
            const isBufferTick = index < BUFFER_TICKS || index >= BUFFER_TICKS + TOTAL_TICKS;

            if (isBufferTick) {
                // Calculate the "virtual" value this buffer tick represents
                let virtualValue: number;
                let distanceFromValidRange: number;

                if (index < BUFFER_TICKS) {
                    // Top buffer: ticks above MAX_VALUE
                    const ticksAboveMax = BUFFER_TICKS - index;
                    virtualValue = MAX_VALUE + ticksAboveMax;
                    distanceFromValidRange = ticksAboveMax;
                } else {
                    // Bottom buffer: ticks below MIN_VALUE
                    const adjustedIndex = index - BUFFER_TICKS - TOTAL_TICKS;
                    virtualValue = MIN_VALUE - (adjustedIndex + 1);
                    distanceFromValidRange = adjustedIndex + 1;
                }

                // Determine tick type - match the pattern inside valid range
                let isMajor = false;
                let isMedium = false;
                const roundedValue = Math.round(virtualValue);
                if (isMetric) {
                    // Metric: major = 10cm intervals, medium = 5cm intervals
                    isMajor = roundedValue % 10 === 0;
                    isMedium = roundedValue % 5 === 0 && !isMajor;
                } else {
                    // Imperial: major = 10 inch intervals, medium = 5 inch intervals
                    isMajor = roundedValue % 10 === 0;
                    isMedium = roundedValue % 5 === 0 && !isMajor;
                }

                // Calculate fade opacity: stronger fade for ticks further from valid range
                // Fade from 0.6 (closest) to 0.2 (furthest)
                const maxDistance = BUFFER_TICKS;
                const fadeOpacity = Math.max(0.2, 0.6 - (distanceFromValidRange / maxDistance) * 0.4);

                return (
                    <View
                        key={index}
                        style={{
                            height: TICK_HEIGHT,
                            justifyContent: 'center',
                            alignItems: 'flex-start',
                            flexDirection: 'row',
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {/* Tick mark with fade - match valid range pattern, just faded */}
                        <View
                            style={{
                                height: isMajor ? 3 : isMedium ? 2.5 : 2,
                                width: isMajor ? 50 : isMedium ? 34 : 22,
                                backgroundColor: '#DADADA',
                                borderRadius: 3,
                                position: 'absolute',
                                left: 0,
                                alignSelf: 'center',
                                opacity: fadeOpacity,
                            }}
                        />
                        {/* No number indicators on buffer ticks - they're out of range */}
                    </View>
                );
            }

            // Valid tick: calculate value (account for top buffer offset)
            const adjustedIndex = index - BUFFER_TICKS;
            // Reverse: index 0 = MAX_VALUE (top), index TOTAL_TICKS - 1 = MIN_VALUE (bottom)
            const reversedIndex = TOTAL_TICKS - 1 - adjustedIndex;
            const value = MIN_VALUE + reversedIndex;
            const isSelected = value === clampedValue;

            // Tick intervals based on unit - match image: major at 10-unit intervals, medium at 5-unit intervals
            let isMajor = false; // 10-unit intervals (100, 110, 120, etc.)
            let isMedium = false; // 5-unit intervals (105, 115, 125, etc.)

            if (isMetric) {
                // Metric: major = 10cm intervals, medium = 5cm intervals, small = 1cm
                isMajor = value % 10 === 0;
                isMedium = value % 5 === 0 && !isMajor;
            } else {
                // Imperial: major = 10 inch intervals, medium = 5 inch intervals, small = 1 inch
                isMajor = value % 10 === 0;
                isMedium = value % 5 === 0 && !isMajor;
            }

            return (
                <View
                    key={index}
                    style={{
                        height: TICK_HEIGHT,
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                        flexDirection: 'row',
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {/* Tick mark - aligned to left, fixed position like image */}
                    <View
                        style={{
                            height: isSelected ? 3 : (isMajor ? 3 : isMedium ? 2.5 : 2),
                            width: isSelected
                                ? (isMajor ? 50 : isMedium ? 34 : 22) // Selected width matches tick type
                                : (isMajor ? 50 : isMedium ? 34 : 22), // Major = 50px, medium = 34px, small = 22px
                            backgroundColor: isSelected ? '#526EFF' : '#DADADA',
                            borderRadius: 3,
                            position: 'absolute',
                            left: 0,
                            alignSelf: 'center',
                        }}
                    />
                    {/* Number indicator on the right for major and medium ticks - positioned after tick mark */}
                    {(isMajor || isMedium) && (
                        <Text style={[
                            styles.heightRulerLabel,
                            isSelected && styles.heightRulerLabelSelected,
                            {
                                marginLeft: isMajor ? 58 : 40, // Position after tick: major=50px+8px, medium=34px+6px
                            }
                        ]}>
                            {isMetric
                                ? `${value}`
                                : `${Math.floor(value / 12)}'${value % 12}"`
                            }
                        </Text>
                    )}
                </View>
            );
        };

        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Select your height</Text>

                {/* Fixed height value ABOVE the ruler */}
                <View style={styles.heightValueDisplayFixed}>
                    <Animated.Text
                        style={[
                            styles.heightValueText,
                            {
                                transform: [{ scale: heightValueDisplayAnim }],
                                opacity: heightValueDisplayAnim,
                            }
                        ]}
                    >
                        {formattedValue}
                    </Animated.Text>
                </View>

                {/* Vertical ruler centered horizontally */}
                <View style={styles.heightRulerWrapper}>
                    <View style={[styles.heightRulerContainer, { height: rulerHeight }]}>
                        <ScrollView
                            ref={heightRulerRef}
                            showsVerticalScrollIndicator={false}
                            showsHorizontalScrollIndicator={false}
                            snapToInterval={TICK_HEIGHT}
                            decelerationRate={0.92}
                            onScroll={onScroll}
                            onScrollEndDrag={onScrollEndDrag}
                            onMomentumScrollEnd={onMomentumScrollEnd}
                            scrollEnabled={true}
                            horizontal={false}
                            bounces={true}
                            alwaysBounceVertical={true}
                            alwaysBounceHorizontal={false}
                            scrollEventThrottle={16}
                            contentContainerStyle={{
                                paddingVertical: CENTER_OFFSET,
                            }}
                            style={{
                                width: '100%',
                            }}
                        >
                            {Array.from({ length: TOTAL_TICKS_WITH_BUFFER }).map((_, i) => renderTick(i))}
                        </ScrollView>

                        {/* Center indicator line */}
                        <View style={styles.heightRulerCenterLine} />
                    </View>
                </View>
            </View>
        );
    };

    const renderWeightStep = () => {
        // Use unit preference for weight
        const currentUnit = data.unitPreference.weight;
        const isMetric = currentUnit === 'kg';

        // Constants
        const TICK_WIDTH = 14; // px - horizontal spacing (similar to TICK_HEIGHT for vertical)

        // Range based on unit - rebuild ruler data, don't scale
        const MIN_VALUE = isMetric ? 20 : 45; // 20kg or 45lbs
        const MAX_VALUE = isMetric ? 250 : 550; // 250kg or 550lbs
        const STEP = 1; // 1kg or 1lb increments (integers only)
        // Calculate total ticks based on step
        const TOTAL_TICKS = Math.round((MAX_VALUE - MIN_VALUE) / STEP) + 1;
        // Buffer ticks to fill empty space left and right (no numbers, just visual ticks)
        // Right buffer shows gradient but scrolling stops at maximum value
        const BUFFER_TICKS = 10;
        const TOTAL_TICKS_WITH_BUFFER = TOTAL_TICKS + (2 * BUFFER_TICKS);

        // Set default to 65kg or 143lbs (65kg ≈ 143lbs)
        const defaultWeight = isMetric ? 65 : 143;
        if (!data.weight || data.weight < MIN_VALUE || data.weight > MAX_VALUE) {
            updateData('weight', defaultWeight);
        }

        // Clamp and round value to step (integers only)
        const steppedValue = Math.round(data.weight);
        const clampedValue = Math.max(MIN_VALUE, Math.min(MAX_VALUE, steppedValue));

        // Format display value using displayedWeight for real-time updates
        const formattedValue = isMetric
            ? `${Math.round(displayedWeight)} kg`
            : `${Math.round(displayedWeight)} lbs`;

        const screenWidth = Dimensions.get('window').width;
        const rulerWidth = Math.min(screenWidth * 0.9, 400);
        // Perfect center alignment: CENTER_OFFSET = rulerWidth / 2 - tickWidth / 2
        const CENTER_OFFSET = rulerWidth / 2 - TICK_WIDTH / 2;

        // Handle scroll - update displayed value in real-time
        const onScroll = (e: any) => {
            if (isScrollingProgrammaticallyWeight.current) {
                return;
            }

            const offsetX = e.nativeEvent.contentOffset.x;
            // Calculate which tick should be centered (account for left buffer)
            const index = Math.round(offsetX / TICK_WIDTH);
            const adjustedIndex = index - BUFFER_TICKS;
            // Clamp to valid range: 0 (MIN_VALUE) to TOTAL_TICKS - 1 (MAX_VALUE)
            const clampedIndex = Math.max(0, Math.min(TOTAL_TICKS - 1, adjustedIndex));

            // Calculate value (left to right: MIN_VALUE to MAX_VALUE)
            const newDisplayedValue = MIN_VALUE + (clampedIndex * STEP);

            // Update displayed value in real-time (not the actual data)
            if (newDisplayedValue !== displayedWeight) {
                setDisplayedWeight(newDisplayedValue);
                // Trigger subtle animation on the display
                Animated.sequence([
                    Animated.timing(weightValueDisplayAnim, {
                        toValue: 0.95,
                        duration: 50,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(weightValueDisplayAnim, {
                        toValue: 1,
                        duration: 100,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]).start();
            }
        };

        // Clamp scroll to prevent overscrolling past min/max
        // Hard stop at maximum valid tick (scrollX = (BUFFER_TICKS + TOTAL_TICKS - 1) * TICK_WIDTH)
        // Minimum valid tick at left (scrollX = BUFFER_TICKS * TICK_WIDTH)
        const clampScrollPosition = (offsetX: number): number => {
            const minScrollX = BUFFER_TICKS * TICK_WIDTH; // Minimum value at left
            const maxScrollX = (BUFFER_TICKS + TOTAL_TICKS - 1) * TICK_WIDTH; // Maximum value at right - hard stop
            return Math.max(minScrollX, Math.min(maxScrollX, offsetX));
        };

        // Handle scroll end drag - clamp position if needed
        const onScrollEndDrag = (e: any) => {
            if (isScrollingProgrammaticallyWeight.current) {
                return;
            }

            const offsetX = e.nativeEvent.contentOffset.x;
            const clampedX = clampScrollPosition(offsetX);

            if (clampedX !== offsetX) {
                isScrollingProgrammaticallyWeight.current = true;
                weightRulerRef.current?.scrollTo({
                    x: clampedX,
                    animated: true,
                });
                setTimeout(() => {
                    isScrollingProgrammaticallyWeight.current = false;
                }, 300);
            }
        };

        // Handle scroll end - ONLY update actual state here (after momentum ends)
        const onMomentumScrollEnd = (e: any) => {
            if (isScrollingProgrammaticallyWeight.current) {
                return;
            }

            const offsetX = e.nativeEvent.contentOffset.x;
            // Calculate which tick should be centered (account for left buffer)
            const index = Math.round(offsetX / TICK_WIDTH);
            const adjustedIndex = index - BUFFER_TICKS;
            // Clamp to valid range: 0 (MIN_VALUE) to TOTAL_TICKS - 1 (MAX_VALUE)
            const clampedIndex = Math.max(0, Math.min(TOTAL_TICKS - 1, adjustedIndex));

            // Calculate exact scroll position for perfect snapping (add left buffer offset)
            const exactScrollX = (clampedIndex + BUFFER_TICKS) * TICK_WIDTH;

            // Calculate value (left to right: MIN_VALUE to MAX_VALUE)
            const newValue = MIN_VALUE + (clampedIndex * STEP);

            // Update value only after momentum ends with animation
            if (Math.abs(newValue - clampedValue) > 0.01) {
                // Animate value display
                Animated.sequence([
                    Animated.timing(weightValueDisplayAnim, {
                        toValue: 0.8,
                        duration: 100,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(weightValueDisplayAnim, {
                        toValue: 1,
                        duration: 200,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]).start();

                updateData('weight', Math.round(newValue));
            }

            // Snap to exact position smoothly
            isScrollingProgrammaticallyWeight.current = true;
            weightRulerRef.current?.scrollTo({
                x: exactScrollX,
                animated: true,
            });
            setTimeout(() => {
                isScrollingProgrammaticallyWeight.current = false;
            }, 400);
        };

        const renderTick = (index: number) => {
            // Check if this is a buffer tick (left or right of valid range)
            const isBufferTick = index < BUFFER_TICKS || index >= BUFFER_TICKS + TOTAL_TICKS;

            if (isBufferTick) {
                // Calculate the "virtual" value this buffer tick represents
                let virtualValue: number;
                let distanceFromValidRange: number;

                if (index < BUFFER_TICKS) {
                    // Left buffer: ticks below MIN_VALUE
                    const ticksBelowMin = BUFFER_TICKS - index;
                    virtualValue = MIN_VALUE - (ticksBelowMin * STEP);
                    distanceFromValidRange = ticksBelowMin;
                } else {
                    // Right buffer: ticks above MAX_VALUE
                    const adjustedIndex = index - BUFFER_TICKS - TOTAL_TICKS;
                    virtualValue = MAX_VALUE + ((adjustedIndex + 1) * STEP);
                    distanceFromValidRange = adjustedIndex + 1;
                }

                // Determine if this should be a medium tick
                let isMedium = false;
                const roundedValue = Math.round(virtualValue);
                if (isMetric) {
                    // Metric: medium = 5kg intervals
                    isMedium = roundedValue % 5 === 0;
                } else {
                    // Imperial: medium = 10lb intervals
                    isMedium = roundedValue % 10 === 0;
                }

                // Calculate fade opacity: stronger fade for ticks further from valid range
                // Fade from 0.6 (closest) to 0.2 (furthest)
                const maxDistance = BUFFER_TICKS;
                const fadeOpacity = Math.max(0.2, 0.6 - (distanceFromValidRange / maxDistance) * 0.4);

                return (
                    <View
                        key={index}
                        style={{
                            width: TICK_WIDTH,
                            justifyContent: 'flex-start',
                            alignItems: 'center',
                            flexDirection: 'column',
                            height: '100%',
                        }}
                    >
                        {/* Tick mark with fade - medium ticks are taller, small ticks are shorter */}
                        {/* No numbers on buffer ticks - they're out of range */}
                        <View
                            style={{
                                width: isMedium ? 2.5 : 2,
                                height: isMedium ? 34 : 22,
                                backgroundColor: '#DADADA',
                                borderRadius: 3,
                                alignSelf: 'center',
                                opacity: fadeOpacity,
                            }}
                        />
                    </View>
                );
            }

            // Valid tick: calculate value (account for left buffer offset)
            const adjustedIndex = index - BUFFER_TICKS;
            // Left to right: index 0 = MIN_VALUE, index TOTAL_TICKS - 1 = MAX_VALUE
            const value = MIN_VALUE + (adjustedIndex * STEP);
            const isSelected = value === clampedValue;

            // Tick intervals based on unit
            let isMajor = false;
            let isMedium = false;
            let isTenIncrement = false;

            if (isMetric) {
                // Metric: small = 1kg, medium = 5kg, large = 10kg
                isMajor = value % 10 === 0;
                isMedium = value % 5 === 0 && !isMajor;
                isTenIncrement = value % 10 === 0; // Every 10kg
            } else {
                // Imperial: small = 1lb, medium = 10lbs, large = 50lbs
                isMajor = value % 50 === 0;
                isMedium = value % 10 === 0 && !isMajor;
                isTenIncrement = value % 10 === 0; // Every 10lbs
            }

            return (
                <View
                    key={index}
                    style={{
                        width: TICK_WIDTH,
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        flexDirection: 'column',
                        height: '100%',
                    }}
                >
                    {/* Tick mark - vertical, at the top */}
                    <View
                        style={{
                            width: isSelected ? 3 : (isMajor ? 3 : isMedium ? 2.5 : isTenIncrement ? 2.5 : 2),
                            height: isMajor ? 50 : isMedium ? 34 : isTenIncrement ? 34 : 22,
                            backgroundColor: isSelected ? '#526EFF' : '#DADADA',
                            borderRadius: 3,
                            marginBottom: (isMajor || isMedium || isTenIncrement) ? 4 : 0,
                            alignSelf: 'center',
                            transform: isSelected ? [{ scaleY: 1.15 }] : [{ scaleY: 1 }],
                        }}
                    />
                    {/* Number indicator below for major, medium, and 10-increment ticks */}
                    {(isMajor || isMedium || isTenIncrement) && (
                        <Text style={[
                            styles.weightRulerLabel,
                            isSelected && styles.weightRulerLabelSelected
                        ]}>
                            {`${value}`}
                        </Text>
                    )}
                </View>
            );
        };

        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>what's your weight?</Text>

                {/* Fixed weight value ABOVE the ruler */}
                <View style={styles.weightValueDisplayFixed}>
                    <Animated.Text
                        style={[
                            styles.weightValueText,
                            {
                                transform: [{ scale: weightValueDisplayAnim }],
                                opacity: weightValueDisplayAnim,
                            }
                        ]}
                    >
                        {formattedValue}
                    </Animated.Text>
                </View>

                {/* Horizontal ruler centered vertically */}
                <View style={styles.weightRulerWrapper}>
                    <View style={[styles.weightRulerContainer, { width: rulerWidth }]}>
                        <ScrollView
                            ref={weightRulerRef}
                            showsVerticalScrollIndicator={false}
                            showsHorizontalScrollIndicator={false}
                            snapToInterval={TICK_WIDTH}
                            decelerationRate={0.92}
                            onScroll={onScroll}
                            onScrollEndDrag={onScrollEndDrag}
                            onMomentumScrollEnd={onMomentumScrollEnd}
                            scrollEnabled={true}
                            horizontal={true}
                            bounces={true}
                            alwaysBounceVertical={false}
                            alwaysBounceHorizontal={true}
                            scrollEventThrottle={16}
                            contentContainerStyle={{
                                paddingHorizontal: CENTER_OFFSET,
                            }}
                            style={{
                                height: '100%',
                            }}
                        >
                            {Array.from({ length: TOTAL_TICKS_WITH_BUFFER }).map((_, i) => renderTick(i))}
                        </ScrollView>

                        {/* Center indicator line */}
                        <View style={styles.weightRulerCenterLine} />
                    </View>
                </View>
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

                            const handlePressIn = () => {
                                let cardShadowHeight: Animated.Value;
                                let cardTranslateY: Animated.Value;

                                switch (option.key) {
                                    case 'lose':
                                        cardShadowHeight = loseCardShadowHeight;
                                        cardTranslateY = loseCardTranslateY;
                                        break;
                                    case 'maintain':
                                        cardShadowHeight = maintainCardShadowHeight;
                                        cardTranslateY = maintainCardTranslateY;
                                        break;
                                    case 'build':
                                        cardShadowHeight = buildCardShadowHeight;
                                        cardTranslateY = buildCardTranslateY;
                                        break;
                                    default:
                                        return;
                                }

                                Animated.parallel([
                                    Animated.timing(cardTranslateY, {
                                        toValue: 4,
                                        duration: 120,
                                        easing: Easing.out(Easing.ease),
                                        useNativeDriver: true,
                                    }),
                                    Animated.timing(cardShadowHeight, {
                                        toValue: 0,
                                        duration: 120,
                                        easing: Easing.out(Easing.ease),
                                        useNativeDriver: false,
                                    }),
                                ]).start();
                            };

                            const handlePressOut = () => {
                                let cardShadowHeight: Animated.Value;
                                let cardTranslateY: Animated.Value;

                                switch (option.key) {
                                    case 'lose':
                                        cardShadowHeight = loseCardShadowHeight;
                                        cardTranslateY = loseCardTranslateY;
                                        break;
                                    case 'maintain':
                                        cardShadowHeight = maintainCardShadowHeight;
                                        cardTranslateY = maintainCardTranslateY;
                                        break;
                                    case 'build':
                                        cardShadowHeight = buildCardShadowHeight;
                                        cardTranslateY = buildCardTranslateY;
                                        break;
                                    default:
                                        return;
                                }

                                // If not selected, restore shadow and position
                                if (!isSelected) {
                                    Animated.parallel([
                                        Animated.timing(cardTranslateY, {
                                            toValue: 0,
                                            duration: 120,
                                            easing: Easing.out(Easing.ease),
                                            useNativeDriver: true,
                                        }),
                                        Animated.timing(cardShadowHeight, {
                                            toValue: 4,
                                            duration: 120,
                                            easing: Easing.out(Easing.ease),
                                            useNativeDriver: false,
                                        }),
                                    ]).start();
                                }
                            };

                            const getCardShadowAnim = () => {
                                switch (option.key) {
                                    case 'lose': return loseCardShadowHeight;
                                    case 'maintain': return maintainCardShadowHeight;
                                    case 'build': return buildCardShadowHeight;
                                    default: return loseCardShadowHeight;
                                }
                            };
                            const cardShadowHeightAnim = getCardShadowAnim();

                            return (
                                <View key={option.key} style={{ position: 'relative', width: 150, height: 154, marginBottom: 12 }}>
                                    {/* Shadow layer - harsh drop shadow */}
                                    <Animated.View
                                        style={[
                                            {
                                                position: 'absolute',
                                                width: 150,
                                                height: 150,
                                                backgroundColor: '#252525',
                                                borderRadius: 12,
                                                top: 4,
                                                left: 0,
                                                opacity: cardShadowHeightAnim.interpolate({
                                                    inputRange: [0, 4],
                                                    outputRange: [0, 1],
                                                }),
                                                zIndex: 0,
                                            },
                                        ]}
                                        pointerEvents="none"
                                    />
                                    <TouchableOpacity
                                        onPress={(e) => {
                                            // Blue confetti when selecting (card becomes blue), white when deselecting
                                            const willBeSelected = data.goal !== option.key;
                                            triggerConfetti(e, willBeSelected ? '#526EFF' : '#fff');
                                            updateData('goal', option.key);
                                        }}
                                        onPressIn={handlePressIn}
                                        onPressOut={handlePressOut}
                                        activeOpacity={1}
                                        style={{ zIndex: 1, position: 'absolute', top: 0, left: 0 }}
                                    >
                                        <Animated.View
                                            style={[
                                                styles.goalCard,
                                                {
                                                    transform: [{ translateY: animations.translateY }],
                                                    shadowColor: '#252525',
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
                                </View>
                            );
                        })}
                    </View>
                    <View style={styles.goalRowSingle}>
                        {secondRow.map((option) => {
                            const animations = getCardAnimations(option.key);
                            const isSelected = data.goal === option.key;

                            const handlePressIn = () => {
                                let cardShadowHeight: Animated.Value;
                                let cardTranslateY: Animated.Value;

                                switch (option.key) {
                                    case 'lose':
                                        cardShadowHeight = loseCardShadowHeight;
                                        cardTranslateY = loseCardTranslateY;
                                        break;
                                    case 'maintain':
                                        cardShadowHeight = maintainCardShadowHeight;
                                        cardTranslateY = maintainCardTranslateY;
                                        break;
                                    case 'build':
                                        cardShadowHeight = buildCardShadowHeight;
                                        cardTranslateY = buildCardTranslateY;
                                        break;
                                    default:
                                        return;
                                }

                                Animated.parallel([
                                    Animated.timing(cardTranslateY, {
                                        toValue: 4,
                                        duration: 120,
                                        easing: Easing.out(Easing.ease),
                                        useNativeDriver: true,
                                    }),
                                    Animated.timing(cardShadowHeight, {
                                        toValue: 0,
                                        duration: 120,
                                        easing: Easing.out(Easing.ease),
                                        useNativeDriver: false,
                                    }),
                                ]).start();
                            };

                            const handlePressOut = () => {
                                let cardShadowHeight: Animated.Value;
                                let cardTranslateY: Animated.Value;

                                switch (option.key) {
                                    case 'lose':
                                        cardShadowHeight = loseCardShadowHeight;
                                        cardTranslateY = loseCardTranslateY;
                                        break;
                                    case 'maintain':
                                        cardShadowHeight = maintainCardShadowHeight;
                                        cardTranslateY = maintainCardTranslateY;
                                        break;
                                    case 'build':
                                        cardShadowHeight = buildCardShadowHeight;
                                        cardTranslateY = buildCardTranslateY;
                                        break;
                                    default:
                                        return;
                                }

                                // If not selected, restore shadow and position
                                if (!isSelected) {
                                    Animated.parallel([
                                        Animated.timing(cardTranslateY, {
                                            toValue: 0,
                                            duration: 120,
                                            easing: Easing.out(Easing.ease),
                                            useNativeDriver: true,
                                        }),
                                        Animated.timing(cardShadowHeight, {
                                            toValue: 4,
                                            duration: 120,
                                            easing: Easing.out(Easing.ease),
                                            useNativeDriver: false,
                                        }),
                                    ]).start();
                                }
                            };

                            const getCardShadowAnim = () => {
                                switch (option.key) {
                                    case 'lose': return loseCardShadowHeight;
                                    case 'maintain': return maintainCardShadowHeight;
                                    case 'build': return buildCardShadowHeight;
                                    default: return loseCardShadowHeight;
                                }
                            };
                            const cardShadowHeightAnim = getCardShadowAnim();

                            return (
                                <View key={option.key} style={{ position: 'relative', width: 150, height: 154, marginBottom: 12 }}>
                                    {/* Shadow layer - harsh drop shadow */}
                                    <Animated.View
                                        style={[
                                            {
                                                position: 'absolute',
                                                width: 150,
                                                height: 150,
                                                backgroundColor: '#252525',
                                                borderRadius: 12,
                                                top: 4,
                                                left: 0,
                                                opacity: cardShadowHeightAnim.interpolate({
                                                    inputRange: [0, 4],
                                                    outputRange: [0, 1],
                                                }),
                                                zIndex: 0,
                                            },
                                        ]}
                                        pointerEvents="none"
                                    />
                                    <TouchableOpacity
                                        onPress={(e) => {
                                            // Blue confetti when selecting (card becomes blue), white when deselecting
                                            const willBeSelected = data.goal !== option.key;
                                            triggerConfetti(e, willBeSelected ? '#526EFF' : '#fff');
                                            updateData('goal', option.key);
                                        }}
                                        onPressIn={handlePressIn}
                                        onPressOut={handlePressOut}
                                        activeOpacity={1}
                                        style={{ zIndex: 1, position: 'absolute', top: 0, left: 0 }}
                                    >
                                        <Animated.View
                                            style={[
                                                styles.goalCard,
                                                {
                                                    transform: [{ translateY: animations.translateY }],
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
                                </View>
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

                        const handlePressIn = () => {
                            let cardShadowHeight: Animated.Value;
                            let cardTranslateY: Animated.Value;

                            switch (option.key) {
                                case 'sedentary':
                                    cardShadowHeight = sedentaryCardShadowHeight;
                                    cardTranslateY = sedentaryCardTranslateY;
                                    break;
                                case 'lightly':
                                    cardShadowHeight = lightlyCardShadowHeight;
                                    cardTranslateY = lightlyCardTranslateY;
                                    break;
                                case 'moderate':
                                    cardShadowHeight = moderateCardShadowHeight;
                                    cardTranslateY = moderateCardTranslateY;
                                    break;
                                case 'very':
                                    cardShadowHeight = veryCardShadowHeight;
                                    cardTranslateY = veryCardTranslateY;
                                    break;
                                default:
                                    return;
                            }

                            Animated.parallel([
                                Animated.timing(cardTranslateY, {
                                    toValue: 4,
                                    duration: 120,
                                    easing: Easing.out(Easing.ease),
                                    useNativeDriver: true,
                                }),
                                Animated.timing(cardShadowHeight, {
                                    toValue: 0,
                                    duration: 120,
                                    easing: Easing.out(Easing.ease),
                                    useNativeDriver: false,
                                }),
                            ]).start();
                        };

                        const handlePressOut = () => {
                            // The selection animation will handle the final state
                        };

                        const getCardShadowAnim = () => {
                            switch (option.key) {
                                case 'sedentary': return sedentaryCardShadowHeight;
                                case 'lightly': return lightlyCardShadowHeight;
                                case 'moderate': return moderateCardShadowHeight;
                                case 'very': return veryCardShadowHeight;
                                default: return sedentaryCardShadowHeight;
                            }
                        };
                        const cardShadowHeightAnim = getCardShadowAnim();

                        return (
                            <View key={option.key} style={{ position: 'relative', marginBottom: 8, paddingBottom: 4 }}>
                                {/* Shadow layer - harsh drop shadow */}
                                <Animated.View
                                    style={[
                                        styles.activityCard,
                                        {
                                            position: 'absolute',
                                            backgroundColor: '#252525',
                                            top: 4,
                                            left: 0,
                                            right: 0,
                                            opacity: cardShadowHeightAnim.interpolate({
                                                inputRange: [0, 4],
                                                outputRange: [0, 1],
                                            }),
                                            zIndex: 0,
                                            borderWidth: 0,
                                            marginBottom: 0,
                                            padding: 20, // Match card padding
                                        },
                                    ]}
                                    pointerEvents="none"
                                />
                                <TouchableOpacity
                                    onPress={(e) => {
                                        // Blue confetti when selecting (card becomes blue), white when deselecting
                                        const willBeSelected = data.activityLevel !== option.key;
                                        triggerConfetti(e, willBeSelected ? '#526EFF' : '#fff');
                                        updateData('activityLevel', option.key);
                                    }}
                                    onPressIn={handlePressIn}
                                    onPressOut={handlePressOut}
                                    activeOpacity={1}
                                    style={{ zIndex: 1 }}
                                >
                                    <Animated.View
                                        style={[
                                            styles.activityCard,
                                            {
                                                transform: [{ translateY: animations.translateY }],
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
                            </View>
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

                        const handlePressIn = () => {
                            let cardShadowHeight: Animated.Value;
                            let cardTranslateY: Animated.Value;

                            switch (option.key) {
                                case 'regular':
                                    cardShadowHeight = regularCardShadowHeight;
                                    cardTranslateY = regularCardTranslateY;
                                    break;
                                case 'high-protein':
                                    cardShadowHeight = highProteinCardShadowHeight;
                                    cardTranslateY = highProteinCardTranslateY;
                                    break;
                                case 'vegetarian':
                                    cardShadowHeight = vegetarianCardShadowHeight;
                                    cardTranslateY = vegetarianCardTranslateY;
                                    break;
                                case 'vegan':
                                    cardShadowHeight = veganCardShadowHeight;
                                    cardTranslateY = veganCardTranslateY;
                                    break;
                                case 'keto':
                                    cardShadowHeight = ketoCardShadowHeight;
                                    cardTranslateY = ketoCardTranslateY;
                                    break;
                                case 'halal':
                                    cardShadowHeight = halalCardShadowHeight;
                                    cardTranslateY = halalCardTranslateY;
                                    break;
                                default:
                                    return;
                            }

                            Animated.parallel([
                                Animated.timing(cardTranslateY, {
                                    toValue: 4,
                                    duration: 120,
                                    easing: Easing.out(Easing.ease),
                                    useNativeDriver: true,
                                }),
                                Animated.timing(cardShadowHeight, {
                                    toValue: 0,
                                    duration: 120,
                                    easing: Easing.out(Easing.ease),
                                    useNativeDriver: false,
                                }),
                            ]).start();
                        };

                        const handlePressOut = () => {
                            // The selection animation will handle the final state
                        };

                        const getCardShadowAnim = () => {
                            switch (option.key) {
                                case 'regular': return regularCardShadowHeight;
                                case 'high-protein': return highProteinCardShadowHeight;
                                case 'vegetarian': return vegetarianCardShadowHeight;
                                case 'vegan': return veganCardShadowHeight;
                                case 'keto': return ketoCardShadowHeight;
                                case 'halal': return halalCardShadowHeight;
                                default: return regularCardShadowHeight;
                            }
                        };
                        const cardShadowHeightAnim = getCardShadowAnim();

                        return (
                            <View key={option.key} style={{ position: 'relative', width: 150, height: 154, marginBottom: 12 }}>
                                {/* Shadow layer - harsh drop shadow */}
                                <Animated.View
                                    style={[
                                        {
                                            position: 'absolute',
                                            width: 150,
                                            height: 150,
                                            backgroundColor: '#252525',
                                            borderRadius: 12,
                                            top: 4,
                                            left: 0,
                                            opacity: cardShadowHeightAnim.interpolate({
                                                inputRange: [0, 4],
                                                outputRange: [0, 1],
                                            }),
                                            zIndex: 0,
                                        },
                                    ]}
                                    pointerEvents="none"
                                />
                                <TouchableOpacity
                                    onPress={(e) => {
                                        // Blue confetti when selecting (card becomes blue), white when deselecting
                                        const willBeSelected = data.dietPreference !== option.key;
                                        triggerConfetti(e, willBeSelected ? '#526EFF' : '#fff');
                                        updateData('dietPreference', option.key);
                                    }}
                                    onPressIn={handlePressIn}
                                    onPressOut={handlePressOut}
                                    activeOpacity={1}
                                    style={{ zIndex: 1 }}
                                >
                                    <Animated.View
                                        style={[
                                            styles.dietCard,
                                            {
                                                transform: [{ translateY: animations.translateY }],
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
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderAllergiesStep = () => {
        const allergies = ['nuts', 'lactose', 'gluten', 'shellfish', 'eggs', 'soy', 'fish'];
        const topRow = ['nuts', 'eggs', 'soy', 'fish'];
        const bottomRow = ['lactose', 'gluten', 'shellfish'];

        const getChipAnimations = (allergy: string) => {
            switch (allergy) {
                case 'nuts':
                    return {
                        translateY: nutsChipTranslateY,
                        shadowHeight: nutsChipShadowHeightState,
                        colorOpacity: nutsChipColorOpacity,
                    };
                case 'lactose':
                    return {
                        translateY: lactoseChipTranslateY,
                        shadowHeight: lactoseChipShadowHeightState,
                        colorOpacity: lactoseChipColorOpacity,
                    };
                case 'gluten':
                    return {
                        translateY: glutenChipTranslateY,
                        shadowHeight: glutenChipShadowHeightState,
                        colorOpacity: glutenChipColorOpacity,
                    };
                case 'shellfish':
                    return {
                        translateY: shellfishChipTranslateY,
                        shadowHeight: shellfishChipShadowHeightState,
                        colorOpacity: shellfishChipColorOpacity,
                    };
                case 'eggs':
                    return {
                        translateY: eggsChipTranslateY,
                        shadowHeight: eggsChipShadowHeightState,
                        colorOpacity: eggsChipColorOpacity,
                    };
                case 'soy':
                    return {
                        translateY: soyChipTranslateY,
                        shadowHeight: soyChipShadowHeightState,
                        colorOpacity: soyChipColorOpacity,
                    };
                case 'fish':
                    return {
                        translateY: fishChipTranslateY,
                        shadowHeight: fishChipShadowHeightState,
                        colorOpacity: fishChipColorOpacity,
                    };
                default:
                    return {
                        translateY: nutsChipTranslateY,
                        shadowHeight: nutsChipShadowHeightState,
                        colorOpacity: nutsChipColorOpacity,
                    };
            }
        };

        const renderChip = (allergy: string) => {
            const isSelected = data.allergies.includes(allergy);
            const animations = getChipAnimations(allergy);

            const handlePressIn = () => {
                let chipShadowHeight: Animated.Value;
                let chipTranslateY: Animated.Value;

                switch (allergy) {
                    case 'nuts':
                        chipShadowHeight = nutsChipShadowHeight;
                        chipTranslateY = nutsChipTranslateY;
                        break;
                    case 'lactose':
                        chipShadowHeight = lactoseChipShadowHeight;
                        chipTranslateY = lactoseChipTranslateY;
                        break;
                    case 'gluten':
                        chipShadowHeight = glutenChipShadowHeight;
                        chipTranslateY = glutenChipTranslateY;
                        break;
                    case 'shellfish':
                        chipShadowHeight = shellfishChipShadowHeight;
                        chipTranslateY = shellfishChipTranslateY;
                        break;
                    case 'eggs':
                        chipShadowHeight = eggsChipShadowHeight;
                        chipTranslateY = eggsChipTranslateY;
                        break;
                    case 'soy':
                        chipShadowHeight = soyChipShadowHeight;
                        chipTranslateY = soyChipTranslateY;
                        break;
                    case 'fish':
                        chipShadowHeight = fishChipShadowHeight;
                        chipTranslateY = fishChipTranslateY;
                        break;
                    default:
                        return;
                }

                Animated.parallel([
                    Animated.timing(chipTranslateY, {
                        toValue: 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(chipShadowHeight, {
                        toValue: 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                ]).start();
            };

            const handlePressOut = () => {
                // The selection animation will handle the final state
            };

            const getChipShadowAnim = () => {
                switch (allergy) {
                    case 'nuts': return nutsChipShadowHeight;
                    case 'lactose': return lactoseChipShadowHeight;
                    case 'gluten': return glutenChipShadowHeight;
                    case 'shellfish': return shellfishChipShadowHeight;
                    case 'eggs': return eggsChipShadowHeight;
                    case 'soy': return soyChipShadowHeight;
                    case 'fish': return fishChipShadowHeight;
                    default: return nutsChipShadowHeight;
                }
            };
            const chipShadowHeightAnim = getChipShadowAnim();

            return (
                <View key={allergy} style={{ position: 'relative', marginBottom: 4, paddingBottom: 4 }}>
                    {/* Shadow layer - harsh drop shadow */}
                    <Animated.View
                        style={[
                            styles.chip,
                            {
                                position: 'absolute',
                                backgroundColor: '#252525',
                                top: 4,
                                left: 0,
                                right: 0,
                                opacity: chipShadowHeightAnim.interpolate({
                                    inputRange: [0, 4],
                                    outputRange: [0, 1],
                                }),
                                zIndex: 0,
                                borderWidth: 0,
                            },
                        ]}
                        pointerEvents="none"
                    />
                    <TouchableOpacity
                        onPress={(e) => {
                            // Blue confetti when selected (blue background), white when not selected
                            const confettiColor = isSelected ? '#526EFF' : '#fff';
                            triggerConfetti(e, confettiColor);
                            if (isSelected) {
                                updateData('allergies', data.allergies.filter(a => a !== allergy));
                            } else {
                                updateData('allergies', [...data.allergies, allergy]);
                            }
                        }}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        activeOpacity={1}
                        style={{ zIndex: 1 }}
                    >
                        <Animated.View
                            style={[
                                styles.chip,
                                {
                                    transform: [{ translateY: animations.translateY }],
                                },
                            ]}
                        >
                            {/* Color overlay that fades in when selected */}
                            <Animated.View
                                style={[
                                    StyleSheet.absoluteFill,
                                    {
                                        backgroundColor: '#526EFF',
                                        borderRadius: 12,
                                        opacity: animations.colorOpacity,
                                    },
                                ]}
                                pointerEvents="none"
                            />
                            <Text style={[
                                styles.chipText,
                                isSelected && styles.chipTextSelected
                            ]}>
                                {allergy}
                            </Text>
                        </Animated.View>
                    </TouchableOpacity>
                </View>
            );
        };

        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>any allergies?</Text>
                <View style={styles.chipContainer}>
                    <View style={styles.chipRow}>
                        {topRow.map(renderChip)}
                    </View>
                    <View style={[styles.chipRow, styles.chipRowBottom]}>
                        {bottomRow.map(renderChip)}
                    </View>
                </View>
            </View>
        );
    };

    const renderGoalIntensityStep = () => {
        const intensityOptions = [
            { key: 'mild', label: 'mild', desc: 'slow & steady', color: '#526EFF' },
            { key: 'moderate', label: 'moderate', desc: 'balanced approach', color: '#526EFF' },
            { key: 'aggressive', label: 'aggressive', desc: 'fast results', color: '#526EFF' },
        ] as const;

        const getCardAnimations = (key: string) => {
            switch (key) {
                case 'mild':
                    return {
                        translateY: mildIntensityCardTranslateY,
                        shadowHeight: mildIntensityCardShadowHeightState,
                        colorOpacity: mildIntensityCardColorOpacity,
                    };
                case 'moderate':
                    return {
                        translateY: moderateIntensityCardTranslateY,
                        shadowHeight: moderateIntensityCardShadowHeightState,
                        colorOpacity: moderateIntensityCardColorOpacity,
                    };
                case 'aggressive':
                    return {
                        translateY: aggressiveIntensityCardTranslateY,
                        shadowHeight: aggressiveIntensityCardShadowHeightState,
                        colorOpacity: aggressiveIntensityCardColorOpacity,
                    };
                default:
                    return {
                        translateY: mildIntensityCardTranslateY,
                        shadowHeight: mildIntensityCardShadowHeightState,
                        colorOpacity: mildIntensityCardColorOpacity,
                    };
            }
        };

        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>goal intensity?</Text>
                <View style={styles.activityCardContainer}>
                    {intensityOptions.map((option) => {
                        const animations = getCardAnimations(option.key);
                        const isSelected = data.goalIntensity === option.key;

                        const handlePressIn = () => {
                            let cardShadowHeight: Animated.Value;
                            let cardTranslateY: Animated.Value;

                            switch (option.key) {
                                case 'mild':
                                    cardShadowHeight = mildIntensityCardShadowHeight;
                                    cardTranslateY = mildIntensityCardTranslateY;
                                    break;
                                case 'moderate':
                                    cardShadowHeight = moderateIntensityCardShadowHeight;
                                    cardTranslateY = moderateIntensityCardTranslateY;
                                    break;
                                case 'aggressive':
                                    cardShadowHeight = aggressiveIntensityCardShadowHeight;
                                    cardTranslateY = aggressiveIntensityCardTranslateY;
                                    break;
                                default:
                                    return;
                            }

                            Animated.parallel([
                                Animated.timing(cardTranslateY, {
                                    toValue: 4,
                                    duration: 120,
                                    easing: Easing.out(Easing.ease),
                                    useNativeDriver: true,
                                }),
                                Animated.timing(cardShadowHeight, {
                                    toValue: 0,
                                    duration: 120,
                                    easing: Easing.out(Easing.ease),
                                    useNativeDriver: false,
                                }),
                            ]).start();
                        };

                        const handlePressOut = () => {
                            // The selection animation will handle the final state
                        };

                        const getCardShadowAnim = () => {
                            switch (option.key) {
                                case 'mild': return mildIntensityCardShadowHeight;
                                case 'moderate': return moderateIntensityCardShadowHeight;
                                case 'aggressive': return aggressiveIntensityCardShadowHeight;
                                default: return mildIntensityCardShadowHeight;
                            }
                        };
                        const cardShadowHeightAnim = getCardShadowAnim();

                        return (
                            <View key={option.key} style={{ position: 'relative', marginBottom: 22 }}>
                                {/* Shadow layer - harsh drop shadow */}
                                <Animated.View
                                    style={[
                                        styles.activityCard,
                                        {
                                            position: 'absolute',
                                            backgroundColor: '#252525',
                                            top: 4,
                                            left: 0,
                                            right: 0,
                                            opacity: cardShadowHeightAnim.interpolate({
                                                inputRange: [0, 4],
                                                outputRange: [0, 1],
                                            }),
                                            zIndex: 0,
                                            borderWidth: 0,
                                            marginBottom: 0,
                                        },
                                    ]}
                                    pointerEvents="none"
                                />
                                <TouchableOpacity
                                    onPress={(e) => {
                                        // Blue confetti when selecting (card becomes blue), white when deselecting
                                        const willBeSelected = data.goalIntensity !== option.key;
                                        triggerConfetti(e, willBeSelected ? '#526EFF' : '#fff');
                                        updateData('goalIntensity', option.key);
                                    }}
                                    onPressIn={handlePressIn}
                                    onPressOut={handlePressOut}
                                    activeOpacity={1}
                                    style={{ zIndex: 1 }}
                                >
                                    <Animated.View
                                        style={[
                                            styles.activityCard,
                                            {
                                                transform: [{ translateY: animations.translateY }],
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
                            </View>
                        );
                    })}
                </View>
            </View >
        );
    };

    const renderUnitPreferencesStep = () => {
        const isMetric = data.unitPreference.weight === 'kg' && data.unitPreference.height === 'cm';

        const handleMetricPress = () => {
            updateData('unitPreference', { weight: 'kg', height: 'cm' });
        };

        const handleImperialPress = () => {
            updateData('unitPreference', { weight: 'lbs', height: 'ft' });
        };

        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>unit preferences?</Text>
                <View style={{ position: 'relative', marginBottom: 24, marginTop: 20, alignItems: 'center' }}>
                    {/* Shadow layer - harsh drop shadow */}
                    <Animated.View
                        style={[
                            styles.unitToggle,
                            {
                                position: 'absolute',
                                backgroundColor: '#252525',
                                top: 4,
                                left: 0,
                                opacity: 1,
                                zIndex: 0,
                                borderWidth: 0,
                                marginBottom: 0,
                            },
                        ]}
                        pointerEvents="none"
                    />
                    <View style={[styles.unitToggle, { zIndex: 1 }]}>
                        <Animated.View
                            style={[
                                styles.unitToggleBackground,
                                {
                                    transform: [{
                                        translateX: unitPreferenceToggleSlide.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, 176], // Button width for translation
                                        }),
                                    }],
                                },
                            ]}
                        />
                        <TouchableOpacity
                            style={styles.unitButton}
                            onPress={handleMetricPress}
                        >
                            <Text style={[
                                styles.unitButtonText,
                                isMetric && styles.unitButtonTextActive
                            ]}>
                                cm/kg
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.unitButton}
                            onPress={handleImperialPress}
                        >
                            <Text style={[
                                styles.unitButtonText,
                                !isMetric && styles.unitButtonTextActive
                            ]}>
                                ft/lbs
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const renderPurposeStep = () => {
        const purposeOptions = [
            { key: 'meals', label: 'track my meals', icon: '🍎', color: '#526EFF' },
            { key: 'workouts', label: 'track my workouts', icon: '🏋️', color: '#526EFF' },
            { key: 'both', label: 'track both', icon: '🎯', color: '#526EFF' },
            { key: 'discipline', label: 'build discipline', icon: '🔥', color: '#526EFF' },
        ] as const;

        const getCardAnimations = (key: string) => {
            switch (key) {
                case 'meals':
                    return {
                        translateY: mealsPurposeCardTranslateY,
                        shadowHeight: mealsPurposeCardShadowHeightState,
                        colorOpacity: mealsPurposeCardColorOpacity,
                    };
                case 'workouts':
                    return {
                        translateY: workoutsPurposeCardTranslateY,
                        shadowHeight: workoutsPurposeCardShadowHeightState,
                        colorOpacity: workoutsPurposeCardColorOpacity,
                    };
                case 'both':
                    return {
                        translateY: bothPurposeCardTranslateY,
                        shadowHeight: bothPurposeCardShadowHeightState,
                        colorOpacity: bothPurposeCardColorOpacity,
                    };
                case 'discipline':
                    return {
                        translateY: disciplinePurposeCardTranslateY,
                        shadowHeight: disciplinePurposeCardShadowHeightState,
                        colorOpacity: disciplinePurposeCardColorOpacity,
                    };
                default:
                    return {
                        translateY: mealsPurposeCardTranslateY,
                        shadowHeight: mealsPurposeCardShadowHeightState,
                        colorOpacity: mealsPurposeCardColorOpacity,
                    };
            }
        };

        const firstRow = purposeOptions.slice(0, 2);
        const secondRow = purposeOptions.slice(2);

        const renderCard = (option: { key: string; label: string; icon: string; color: string }) => {
            const animations = getCardAnimations(option.key);
            const isSelected = data.purpose === option.key;

            const handlePressIn = () => {
                let cardShadowHeight: Animated.Value;
                let cardTranslateY: Animated.Value;

                switch (option.key) {
                    case 'meals':
                        cardShadowHeight = mealsPurposeCardShadowHeight;
                        cardTranslateY = mealsPurposeCardTranslateY;
                        break;
                    case 'workouts':
                        cardShadowHeight = workoutsPurposeCardShadowHeight;
                        cardTranslateY = workoutsPurposeCardTranslateY;
                        break;
                    case 'both':
                        cardShadowHeight = bothPurposeCardShadowHeight;
                        cardTranslateY = bothPurposeCardTranslateY;
                        break;
                    case 'discipline':
                        cardShadowHeight = disciplinePurposeCardShadowHeight;
                        cardTranslateY = disciplinePurposeCardTranslateY;
                        break;
                    default:
                        return;
                }

                Animated.parallel([
                    Animated.timing(cardTranslateY, {
                        toValue: 4,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(cardShadowHeight, {
                        toValue: 0,
                        duration: 120,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                ]).start();
            };

            const handlePressOut = () => {
                // The selection animation will handle the final state
            };

            const getCardShadowAnim = () => {
                switch (option.key) {
                    case 'meals': return mealsPurposeCardShadowHeight;
                    case 'workouts': return workoutsPurposeCardShadowHeight;
                    case 'both': return bothPurposeCardShadowHeight;
                    case 'discipline': return disciplinePurposeCardShadowHeight;
                    default: return mealsPurposeCardShadowHeight;
                }
            };
            const cardShadowHeightAnim = getCardShadowAnim();

            return (
                <View key={option.key} style={{ position: 'relative' }}>
                    {/* Shadow layer - harsh drop shadow */}
                    <Animated.View
                        style={[
                            styles.goalCard,
                            {
                                position: 'absolute',
                                backgroundColor: '#252525',
                                top: 4,
                                left: 0,
                                right: 0,
                                transform: [{ translateY: 0 }],
                                opacity: cardShadowHeightAnim.interpolate({
                                    inputRange: [0, 4],
                                    outputRange: [0, 1],
                                }),
                                zIndex: 0,
                                borderWidth: 0,
                            },
                        ]}
                        pointerEvents="none"
                    />
                    <TouchableOpacity
                        onPress={(e) => {
                            // Blue confetti when selecting (card becomes blue), white when deselecting
                            const willBeSelected = data.purpose !== option.key;
                            triggerConfetti(e, willBeSelected ? '#526EFF' : '#fff');
                            updateData('purpose', option.key);
                        }}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        activeOpacity={1}
                        style={{ zIndex: 1 }}
                    >
                        <Animated.View
                            style={[
                                styles.goalCard,
                                {
                                    transform: [{ translateY: animations.translateY }],
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
                </View>
            );
        };

        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>what's your purpose?</Text>
                <View style={styles.goalContainer}>
                    <View style={styles.goalRow}>
                        {firstRow.map((option) => renderCard(option))}
                    </View>
                    <View style={styles.goalRow}>
                        {secondRow.map((option) => renderCard(option))}
                    </View>
                </View>
            </View>
        );
    };

    const renderMacrosStep = () => {
        const macroOptions = [
            { key: 'auto', label: 'auto calculate', desc: 'we\'ll calculate based on your goals', color: '#526EFF' },
            { key: 'manual', label: 'custom macros', desc: 'set your own protein, carbs, fats', color: '#526EFF' },
        ] as const;

        const getCardAnimations = (key: string) => {
            switch (key) {
                case 'auto':
                    return {
                        translateY: autoMacroCardTranslateY,
                        shadowHeight: autoMacroCardShadowHeightState,
                        colorOpacity: autoMacroCardColorOpacity,
                    };
                case 'manual':
                    return {
                        translateY: manualMacroCardTranslateY,
                        shadowHeight: manualMacroCardShadowHeightState,
                        colorOpacity: manualMacroCardColorOpacity,
                    };
                default:
                    return {
                        translateY: autoMacroCardTranslateY,
                        shadowHeight: autoMacroCardShadowHeightState,
                        colorOpacity: autoMacroCardColorOpacity,
                    };
            }
        };

        return (
            <Animated.View
                style={[
                    styles.stepContent,
                    {
                        transform: [{ translateY: macrosStepContentTranslateY }],
                    },
                ]}
            >
                <Text style={styles.stepTitle}>macros setup?</Text>
                <View style={styles.activityCardContainer}>
                    {macroOptions.map((option) => {
                        const animations = getCardAnimations(option.key);
                        const isSelected = data.macrosSetup === option.key;

                        const handlePressIn = () => {
                            let cardShadowHeight: Animated.Value;
                            let cardTranslateY: Animated.Value;

                            switch (option.key) {
                                case 'auto':
                                    cardShadowHeight = autoMacroCardShadowHeight;
                                    cardTranslateY = autoMacroCardTranslateY;
                                    break;
                                case 'manual':
                                    cardShadowHeight = manualMacroCardShadowHeight;
                                    cardTranslateY = manualMacroCardTranslateY;
                                    break;
                                default:
                                    return;
                            }

                            Animated.parallel([
                                Animated.timing(cardTranslateY, {
                                    toValue: 4,
                                    duration: 120,
                                    easing: Easing.out(Easing.ease),
                                    useNativeDriver: true,
                                }),
                                Animated.timing(cardShadowHeight, {
                                    toValue: 0,
                                    duration: 120,
                                    easing: Easing.out(Easing.ease),
                                    useNativeDriver: false,
                                }),
                            ]).start();
                        };

                        const handlePressOut = () => {
                            // The selection animation will handle the final state
                        };

                        const cardShadowHeightAnim = option.key === 'auto' ? autoMacroCardShadowHeight : manualMacroCardShadowHeight;

                        return (
                            <View key={option.key} style={{ position: 'relative', marginBottom: 22 }}>
                                {/* Shadow layer - harsh drop shadow */}
                                <Animated.View
                                    style={[
                                        styles.activityCard,
                                        {
                                            position: 'absolute',
                                            backgroundColor: '#252525',
                                            top: 4,
                                            left: 0,
                                            right: 0,
                                            opacity: cardShadowHeightAnim.interpolate({
                                                inputRange: [0, 4],
                                                outputRange: [0, 1],
                                            }),
                                            zIndex: 0,
                                            borderWidth: 0,
                                            marginBottom: 0,
                                        },
                                    ]}
                                    pointerEvents="none"
                                />
                                <TouchableOpacity
                                    onPress={(e) => {
                                        // Blue confetti when selecting (card becomes blue), white when deselecting
                                        const willBeSelected = data.macrosSetup !== option.key;
                                        triggerConfetti(e, willBeSelected ? '#526EFF' : '#fff');
                                        updateData('macrosSetup', option.key);
                                    }}
                                    onPressIn={handlePressIn}
                                    onPressOut={handlePressOut}
                                    activeOpacity={1}
                                    style={{ zIndex: 1 }}
                                >
                                    <Animated.View
                                        style={[
                                            styles.activityCard,
                                            {
                                                transform: [{ translateY: animations.translateY }],
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
                            </View>
                        );
                    })}
                </View>
                <Animated.View
                    style={[
                        styles.macroInputsContainer,
                        {
                            opacity: macroInputsOpacity,
                            transform: [{ translateY: macroInputsTranslateY }],
                        },
                    ]}
                    pointerEvents={data.macrosSetup === 'manual' ? 'auto' : 'none'}
                >
                    <View style={styles.macroInputRow}>
                        <Text style={styles.macroLabel}>protein (g)</Text>
                        <View style={styles.macroInputWrapper}>
                            <RNTextInput
                                style={styles.macroInput}
                                placeholder="0"
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                                value={data.customMacros?.protein?.toString() || ''}
                                onChangeText={(text) => {
                                    const protein = Math.min(parseInt(text) || 0, 500);
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
                            <RNTextInput
                                style={styles.macroInput}
                                placeholder="0"
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                                value={data.customMacros?.carbs?.toString() || ''}
                                onChangeText={(text) => {
                                    const carbs = Math.min(parseInt(text) || 0, 500);
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
                            <RNTextInput
                                style={styles.macroInput}
                                placeholder="0"
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                                value={data.customMacros?.fats?.toString() || ''}
                                onChangeText={(text) => {
                                    const fats = Math.min(parseInt(text) || 0, 500);
                                    updateData('customMacros', {
                                        protein: data.customMacros?.protein || 0,
                                        carbs: data.customMacros?.carbs || 0,
                                        fats,
                                    });
                                }}
                            />
                        </View>
                    </View>
                </Animated.View>
            </Animated.View>
        );
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
            <View style={styles.contentBox} ref={containerRef}>
                {/* Back button in top left */}
                {currentStep > 1 && (
                    <TouchableOpacity
                        style={styles.topBackButton}
                        onPress={(e) => {
                            // White confetti for back button (transparent/white background)
                            triggerConfetti(e, '#fff');
                            prevStep();
                        }}
                    >
                        <Ionicons name="chevron-back" size={24} color="#526EFF" />
                        <Text style={styles.backButtonText}>back</Text>
                    </TouchableOpacity>
                )}
                <View
                    style={styles.scrollView}
                >
                    <Animated.View
                        style={[
                            styles.scrollContent,
                            {
                                opacity: contentFade,
                                transform: [
                                    { translateY: contentSlide },
                                    { scale: contentScale },
                                ],
                            },
                        ]}
                    >
                        {renderStepContent()}
                    </Animated.View>
                </View>
                <View style={styles.buttonContainer}>
                    {currentStep > 1 && renderWeightPlates()}
                    <Button
                        variant="primary"
                        title={currentStep === 1 ? "get started!" : currentStep === TOTAL_STEPS ? "let's go!" : `continue (${currentStep}/${TOTAL_STEPS})`}
                        onPress={(e: any) => {
                            // Blue confetti for primary button (blue background)
                            triggerConfetti(e, '#526EFF');
                            if (currentStep === TOTAL_STEPS) {
                                console.log(`🎯 Step ${TOTAL_STEPS} - "let's go!" button clicked`);
                                handleComplete();
                            } else {
                                nextStep();
                            }
                        }}
                        containerStyle={styles.nextButton}
                        loading={saving && currentStep === TOTAL_STEPS}
                        disabled={saving || checkingUsername || !validateCurrentStep().valid}
                    />
                </View>
            </View>

            {/* Confetti particles */}
            <Confetti particles={confettiParticles} />

        </View>
    );
};

