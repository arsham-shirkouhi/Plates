import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Animated, ScrollView, TouchableOpacity, Alert, PanResponder, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { TextInput as RNTextInput } from 'react-native';
import { Slider } from '../components/Slider';
import { styles } from './OnboardingScreen.styles';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { saveOnboardingData, OnboardingData as OnboardingDataType, hasCompletedOnboarding } from '../services/userService';

type OnboardingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

interface OnboardingData {
    name: string;
    age: number;
    sex: 'male' | 'female' | 'other' | '';
    height: number;
    heightUnit: 'cm' | 'ft';
    weight: number;
    weightUnit: 'kg' | 'lbs';
    goal: 'lose' | 'maintain' | 'build' | '';
    activityLevel: 'sedentary' | 'lightly' | 'moderate' | 'very' | '';
    workoutFrequency: '0-1' | '2-3' | '4-5' | '6+' | '';
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

const TOTAL_STEPS = 15;

export const OnboardingScreen: React.FC = () => {
    const navigation = useNavigation<OnboardingScreenNavigationProp>();
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState<OnboardingData>({
        name: '',
        age: 18,
        sex: '',
        height: 170,
        heightUnit: 'cm',
        weight: 70,
        weightUnit: 'kg',
        goal: '',
        activityLevel: '',
        workoutFrequency: '',
        dietPreference: '',
        allergies: [],
        goalIntensity: 'moderate',
        unitPreference: { weight: 'kg', height: 'cm' },
        purpose: '',
        macrosSetup: '',
    });

    // Animation refs
    const contentFade = useRef(new Animated.Value(1)).current;
    const contentSlide = useRef(new Animated.Value(0)).current;

    // Rotation animations for aura balls
    const rotateTopRight = useRef(new Animated.Value(0)).current;
    const rotateBottomLeft = useRef(new Animated.Value(0)).current;

    // Age picker refs
    const ageScrollViewRef = useRef<ScrollView>(null);
    const ITEM_HEIGHT = 100; // Height of each number item - increased for more spacing
    const ages = Array.from({ length: 99 - 18 + 1 }, (_, i) => 18 + i); // 18 to 99
    const scrollY = useRef(new Animated.Value(0)).current;

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

    useEffect(() => {
        // Animate step transitions
        contentFade.setValue(0);
        contentSlide.setValue(20);
        Animated.parallel([
            Animated.timing(contentFade, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(contentSlide, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        // Scroll to current age when step changes to age step
        if (currentStep === 3 && ageScrollViewRef.current) {
            const currentIndex = ages.indexOf(data.age);
            if (currentIndex >= 0) {
                const offset = currentIndex * ITEM_HEIGHT;
                scrollY.setValue(offset);
                // Use a longer timeout to ensure the view is fully rendered
                setTimeout(() => {
                    ageScrollViewRef.current?.scrollTo({
                        y: offset,
                        animated: false,
                    });
                }, 300);
            }
        }
    }, [currentStep]);

    // Snap to center when age changes
    useEffect(() => {
        if (currentStep === 3 && ageScrollViewRef.current) {
            const currentIndex = ages.indexOf(data.age);
            if (currentIndex >= 0) {
                const offset = currentIndex * ITEM_HEIGHT;
                // Use spring animation for smooth feel
                Animated.spring(scrollY, {
                    toValue: offset,
                    tension: 68,
                    friction: 8,
                    useNativeDriver: false,
                }).start(() => {
                    scrollY.setValue(offset);
                });

                // Small delay to ensure scroll view is ready
                const timeoutId = setTimeout(() => {
                    ageScrollViewRef.current?.scrollTo({
                        y: offset,
                        animated: true,
                    });
                }, 50);
                return () => clearTimeout(timeoutId);
            }
        }
    }, [data.age, currentStep]);


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
                age: 18,
                sex: '',
                height: 170,
                heightUnit: 'cm',
                weight: 70,
                weightUnit: 'kg',
                goal: '',
                activityLevel: '',
                workoutFrequency: '',
                dietPreference: '',
                allergies: [],
                goalIntensity: 'moderate',
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
    };

    const validateCurrentStep = (): { valid: boolean; message?: string } => {
        switch (currentStep) {
            case 1: // Welcome - no validation needed
                return { valid: true };
            case 2: // Name - REQUIRED
                if (!data.name || data.name.trim() === '') {
                    return { valid: false, message: 'please enter your name' };
                }
                break;
            case 3: // Age - REQUIRED
                if (data.age < 18 || data.age > 99) {
                    return { valid: false, message: 'age must be between 18 and 99' };
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
            case 9: // Workout Frequency - REQUIRED
                if (data.workoutFrequency === '') {
                    return { valid: false, message: 'please select workout frequency' };
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
        if (!data.name || !data.sex || !data.goal || !data.activityLevel || !data.workoutFrequency ||
            !data.dietPreference || !data.goalIntensity || !data.purpose || !data.macrosSetup) {
            console.log('❌ Validation failed - missing required fields');
            Alert.alert('Incomplete', 'Please complete all required fields.');
            return;
        }

        console.log('✅ All required fields validated');
        console.log('📝 Saving onboarding data and marking as complete...');

        setSaving(true);
        try {
            // Convert data to the format expected by userService
            const onboardingData: OnboardingDataType = {
                name: data.name,
                age: data.age,
                sex: data.sex as 'male' | 'female' | 'other',
                height: data.height,
                heightUnit: data.heightUnit,
                weight: data.weight,
                weightUnit: data.weightUnit,
                goal: data.goal as 'lose' | 'maintain' | 'build',
                activityLevel: data.activityLevel as 'sedentary' | 'lightly' | 'moderate' | 'very',
                workoutFrequency: data.workoutFrequency as '0-1' | '2-3' | '4-5' | '6+',
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

    const renderProgressBar = () => {
        const progress = (currentStep / TOTAL_STEPS) * 100;
        return (
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <Animated.View
                        style={[
                            styles.progressFill,
                            { width: `${progress}%` }
                        ]}
                    />
                </View>
                <Text style={styles.progressText}>{currentStep} / {TOTAL_STEPS}</Text>
            </View>
        );
    };

    const renderWelcomeStep = () => (
        <View style={styles.stepContent}>
            <Text style={styles.welcomeTitle}>welcome!</Text>
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
                return renderWorkoutFrequencyStep();
            case 10:
                return renderDietPreferenceStep();
            case 11:
                return renderAllergiesStep();
            case 12:
                return renderGoalIntensityStep();
            case 13:
                return renderUnitPreferencesStep();
            case 14:
                return renderPurposeStep();
            case 15:
                return renderMacrosStep();
            default:
                return null;
        }
    };

    const renderNameStep = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>what's your name?</Text>
            <View style={styles.inputWrapper}>
                <TextInput
                    placeholder="your name"
                    value={data.name}
                    onChangeText={(text) => updateData('name', text)}
                    autoCapitalize="words"
                />
            </View>
        </View>
    );

    const renderAgeStep = () => {
        const currentAge = data.age;

        const updateSelectedAge = (offsetY: number) => {
            const index = Math.round(offsetY / ITEM_HEIGHT);
            const clampedIndex = Math.max(0, Math.min(ages.length - 1, index));
            const targetAge = ages[clampedIndex];

            if (targetAge && targetAge !== data.age) {
                updateData('age', targetAge);
            }
        };

        const handleScroll = Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            {
                useNativeDriver: false,
                listener: (event: any) => {
                    const offsetY = event.nativeEvent.contentOffset.y;
                    updateSelectedAge(offsetY);
                },
            }
        );

        const snapToCenter = (targetIndex: number) => {
            if (ageScrollViewRef.current) {
                const targetOffset = targetIndex * ITEM_HEIGHT;

                // Use spring animation for smooth Apple-like feel
                Animated.spring(scrollY, {
                    toValue: targetOffset,
                    tension: 68,
                    friction: 8,
                    useNativeDriver: false,
                }).start(() => {
                    // Ensure final position is exact
                    scrollY.setValue(targetOffset);
                });

                // Animate the scroll view with smooth easing
                ageScrollViewRef.current.scrollTo({
                    y: targetOffset,
                    animated: true,
                });
            }
        };

        const handleMomentumScrollEnd = (event: any) => {
            const offsetY = event.nativeEvent.contentOffset.y;
            const index = Math.round(offsetY / ITEM_HEIGHT);
            const clampedIndex = Math.max(0, Math.min(ages.length - 1, index));
            const targetAge = ages[clampedIndex];

            if (targetAge) {
                snapToCenter(clampedIndex);
                if (targetAge !== data.age) {
                    updateData('age', targetAge);
                }
            }
        };

        const handleScrollEndDrag = (event: any) => {
            const offsetY = event.nativeEvent.contentOffset.y;
            const index = Math.round(offsetY / ITEM_HEIGHT);
            const clampedIndex = Math.max(0, Math.min(ages.length - 1, index));
            const targetAge = ages[clampedIndex];

            if (targetAge) {
                snapToCenter(clampedIndex);
                if (targetAge !== data.age) {
                    updateData('age', targetAge);
                }
            }
        };

        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>how old are you?</Text>
                <View style={styles.agePickerContainer}>
                    {/* Mask to only show 3 items */}
                    <View style={styles.agePickerMask}>
                        {/* Scrollable age list */}
                        <Animated.ScrollView
                            ref={ageScrollViewRef}
                            style={styles.ageScrollView}
                            contentContainerStyle={styles.ageScrollContent}
                            showsVerticalScrollIndicator={false}
                            snapToInterval={ITEM_HEIGHT}
                            snapToAlignment="start"
                            decelerationRate="normal"
                            bounces={false}
                            onScroll={handleScroll}
                            scrollEventThrottle={8}
                            onMomentumScrollEnd={handleMomentumScrollEnd}
                            onScrollEndDrag={handleScrollEndDrag}
                            removeClippedSubviews={false}
                        >
                            {/* Top padding to center middle item */}
                            <View style={{ height: 100 }} />

                            {/* Age numbers - render all for scrolling, mask shows only 3 */}
                            {ages.map((age, index) => {
                                const isSelected = age === currentAge;

                                return (
                                    <View
                                        key={age}
                                        style={[
                                            styles.ageItem,
                                            {
                                                height: ITEM_HEIGHT,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                isSelected ? styles.agePickerTextSelected : styles.agePickerNumberSecondary,
                                            ]}
                                        >
                                            {age}
                                        </Text>
                                    </View>
                                );
                            })}

                            {/* Bottom padding to center middle item */}
                            <View style={{ height: 100 }} />
                        </Animated.ScrollView>
                    </View>
                </View>
            </View>
        );
    };

    const renderSexStep = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>what's your sex?</Text>
            <View style={styles.cardContainer}>
                {(['male', 'female', 'other'] as const).map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.card,
                            data.sex === option && styles.cardSelected
                        ]}
                        onPress={() => updateData('sex', option)}
                    >
                        <Text style={[
                            styles.cardText,
                            data.sex === option && styles.cardTextSelected
                        ]}>
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderHeightStep = () => {
        const minHeight = data.heightUnit === 'cm' ? 100 : 3;
        const maxHeight = data.heightUnit === 'cm' ? 250 : 8;
        const step = data.heightUnit === 'cm' ? 1 : 0.1;

        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>what's your height?</Text>
                <View style={styles.unitToggle}>
                    <TouchableOpacity
                        style={[styles.unitButton, data.heightUnit === 'cm' && styles.unitButtonActive]}
                        onPress={() => {
                            updateData('heightUnit', 'cm');
                            updateData('height', 170);
                        }}
                    >
                        <Text style={[styles.unitButtonText, data.heightUnit === 'cm' && styles.unitButtonTextActive]}>cm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.unitButton, data.heightUnit === 'ft' && styles.unitButtonActive]}
                        onPress={() => {
                            updateData('heightUnit', 'ft');
                            updateData('height', 5.6);
                        }}
                    >
                        <Text style={[styles.unitButtonText, data.heightUnit === 'ft' && styles.unitButtonTextActive]}>ft</Text>
                    </TouchableOpacity>
                </View>
                <Slider
                    value={data.height}
                    onValueChange={(value) => updateData('height', data.heightUnit === 'cm' ? Math.round(value) : Math.round(value * 10) / 10)}
                    minimumValue={minHeight}
                    maximumValue={maxHeight}
                    step={step}
                    unit={data.heightUnit}
                    formatValue={(val) => data.heightUnit === 'cm' ? `${Math.round(val)} cm` : `${val.toFixed(1)} ft`}
                />
            </View>
        );
    };

    const renderWeightStep = () => {
        const minWeight = data.weightUnit === 'kg' ? 30 : 66;
        const maxWeight = data.weightUnit === 'kg' ? 200 : 440;
        const step = data.weightUnit === 'kg' ? 0.5 : 1;

        // Ensure weight is within valid range when unit changes
        const currentWeight = Math.max(minWeight, Math.min(maxWeight, data.weight));
        if (currentWeight !== data.weight) {
            // Update if out of range
            updateData('weight', currentWeight);
        }

        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>what's your weight?</Text>
                <View style={styles.unitToggle}>
                    <TouchableOpacity
                        style={[styles.unitButton, data.weightUnit === 'kg' && styles.unitButtonActive]}
                        onPress={() => {
                            // Convert weight when switching units
                            const newWeight = data.weightUnit === 'lbs' ? Math.round(data.weight * 0.453592 * 2) / 2 : 70;
                            updateData('weightUnit', 'kg');
                            updateData('weight', Math.max(30, Math.min(200, newWeight)));
                        }}
                    >
                        <Text style={[styles.unitButtonText, data.weightUnit === 'kg' && styles.unitButtonTextActive]}>kg</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.unitButton, data.weightUnit === 'lbs' && styles.unitButtonActive]}
                        onPress={() => {
                            // Convert weight when switching units
                            const newWeight = data.weightUnit === 'kg' ? Math.round(data.weight * 2.20462) : 154;
                            updateData('weightUnit', 'lbs');
                            updateData('weight', Math.max(66, Math.min(440, newWeight)));
                        }}
                    >
                        <Text style={[styles.unitButtonText, data.weightUnit === 'lbs' && styles.unitButtonTextActive]}>lbs</Text>
                    </TouchableOpacity>
                </View>
                <Slider
                    value={currentWeight}
                    onValueChange={(value) => {
                        const newValue = data.weightUnit === 'kg' ? Math.round(value * 2) / 2 : Math.round(value);
                        updateData('weight', newValue);
                    }}
                    minimumValue={minWeight}
                    maximumValue={maxWeight}
                    step={step}
                    unit={data.weightUnit}
                    formatValue={(val) => data.weightUnit === 'kg' ? `${val.toFixed(1)} kg` : `${Math.round(val)} lbs`}
                    editableText={true}
                />
            </View>
        );
    };

    const renderGoalStep = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>what's your goal?</Text>
            <View style={styles.cardContainer}>
                {([
                    { key: 'lose', label: 'lose weight', icon: '📉' },
                    { key: 'maintain', label: 'maintain', icon: '⚖️' },
                    { key: 'build', label: 'build muscle', icon: '💪' },
                ] as const).map((option) => (
                    <TouchableOpacity
                        key={option.key}
                        style={[
                            styles.goalCard,
                            data.goal === option.key && styles.goalCardSelected
                        ]}
                        onPress={() => updateData('goal', option.key)}
                    >
                        <Text style={styles.goalIcon}>{option.icon}</Text>
                        <Text style={[
                            styles.goalCardText,
                            data.goal === option.key && styles.goalCardTextSelected
                        ]}>
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderActivityLevelStep = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>how active are you?</Text>
            <View style={styles.cardContainer}>
                {([
                    { key: 'sedentary', label: 'sedentary', desc: 'little to no exercise' },
                    { key: 'lightly', label: 'lightly active', desc: 'light exercise 1-3 days/week' },
                    { key: 'moderate', label: 'moderately active', desc: 'moderate exercise 3-5 days/week' },
                    { key: 'very', label: 'very active', desc: 'hard exercise 6-7 days/week' },
                ] as const).map((option) => (
                    <TouchableOpacity
                        key={option.key}
                        style={[
                            styles.activityCard,
                            data.activityLevel === option.key && styles.activityCardSelected
                        ]}
                        onPress={() => updateData('activityLevel', option.key)}
                    >
                        <Text style={[
                            styles.activityCardTitle,
                            data.activityLevel === option.key && styles.activityCardTitleSelected
                        ]}>
                            {option.label}
                        </Text>
                        <Text style={[
                            styles.activityCardDesc,
                            data.activityLevel === option.key && styles.activityCardDescSelected
                        ]}>
                            {option.desc}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderWorkoutFrequencyStep = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>workout frequency?</Text>
            <View style={styles.cardContainer}>
                {([
                    { key: '0-1', label: '0-1 days', icon: '🏠' },
                    { key: '2-3', label: '2-3 days', icon: '💪' },
                    { key: '4-5', label: '4-5 days', icon: '🔥' },
                    { key: '6+', label: '6+ days', icon: '⚡' },
                ] as const).map((option) => (
                    <TouchableOpacity
                        key={option.key}
                        style={[
                            styles.frequencyCard,
                            data.workoutFrequency === option.key && styles.frequencyCardSelected
                        ]}
                        onPress={() => updateData('workoutFrequency', option.key)}
                    >
                        <Text style={styles.frequencyIcon}>{option.icon}</Text>
                        <Text style={[
                            styles.frequencyCardText,
                            data.workoutFrequency === option.key && styles.frequencyCardTextSelected
                        ]}>
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderDietPreferenceStep = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>diet preference?</Text>
            <View style={styles.cardContainer}>
                {([
                    { key: 'regular', label: 'regular', icon: '🍽️' },
                    { key: 'high-protein', label: 'high protein', icon: '🥩' },
                    { key: 'vegetarian', label: 'vegetarian', icon: '🥗' },
                    { key: 'vegan', label: 'vegan', icon: '🌱' },
                    { key: 'keto', label: 'keto', icon: '🥑' },
                    { key: 'halal', label: 'halal / no pork', icon: '🕌' },
                ] as const).map((option) => (
                    <TouchableOpacity
                        key={option.key}
                        style={[
                            styles.dietCard,
                            data.dietPreference === option.key && styles.dietCardSelected
                        ]}
                        onPress={() => updateData('dietPreference', option.key)}
                    >
                        <Text style={styles.dietIcon}>{option.icon}</Text>
                        <Text style={[
                            styles.dietCardText,
                            data.dietPreference === option.key && styles.dietCardTextSelected
                        ]}>
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

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
                            transform: [{ translateY: contentSlide }],
                        }}
                    >
                        {renderStepContent()}
                    </Animated.View>
                </ScrollView>
                <View style={styles.buttonContainer}>
                    {currentStep > 1 && renderProgressBar()}
                    <Button
                        variant="primary"
                        title={currentStep === 1 ? "get started!" : currentStep === TOTAL_STEPS ? "let's go!" : "next"}
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

