import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet, ScrollView, Image } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Button } from '../components/Button';
import { fonts } from '../constants/fonts';

type MacroResultsScreenRouteProp = RouteProp<RootStackParamList, 'MacroResults'>;
type MacroResultsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MacroResults'>;

// Helper component to display animated numbers
const AnimatedNumber: React.FC<{
    value: Animated.Value;
    target: number;
    style: any;
}> = ({ value, target, style }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const listener = value.addListener(({ value: currentValue }) => {
            setDisplayValue(Math.round(currentValue));
        });

        return () => {
            value.removeListener(listener);
        };
    }, [value, target]);

    // Also set final value when animation completes
    useEffect(() => {
        const timer = setTimeout(() => {
            setDisplayValue(target);
        }, 1500);
        return () => clearTimeout(timer);
    }, [target]);

    return <Text style={style}>{displayValue}</Text>;
};

export const MacroResultsScreen: React.FC = () => {
    const navigation = useNavigation<MacroResultsScreenNavigationProp>();
    const route = useRoute<MacroResultsScreenRouteProp>();
    const { macros: initialMacros, goal, goalIntensity } = route.params;

    // Use the macros from onboarding (no changes allowed)
    const currentMacros = initialMacros;

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const rotateTopRight = useRef(new Animated.Value(0)).current;
    const rotateBottomLeft = useRef(new Animated.Value(0)).current;
    const numberAnimations = useRef({
        calories: new Animated.Value(0),
        protein: new Animated.Value(0),
        carbs: new Animated.Value(0),
        fats: new Animated.Value(0),
        baseTDEE: new Animated.Value(0),
    }).current;

    // Function to animate numbers to new targets
    const animateToTargets = useCallback((targetMacros: typeof currentMacros) => {
        const animateNumber = (anim: Animated.Value, target: number, delay: number = 0) => {
            return Animated.timing(anim, {
                toValue: target,
                duration: 800,
                delay,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            });
        };

        const animations: Animated.CompositeAnimation[] = [];
        if (targetMacros.baseTDEE) {
            animations.push(animateNumber(numberAnimations.baseTDEE, targetMacros.baseTDEE, 0));
        }
        animations.push(
            animateNumber(numberAnimations.calories, targetMacros.calories, 100),
            animateNumber(numberAnimations.protein, targetMacros.protein, 200),
            animateNumber(numberAnimations.carbs, targetMacros.carbs, 300),
            animateNumber(numberAnimations.fats, targetMacros.fats, 400)
        );
        Animated.parallel(animations).start();
    }, [numberAnimations]);

    useEffect(() => {
        // Reset animations
        fadeAnim.setValue(0);
        slideAnim.setValue(50);
        Object.values(numberAnimations).forEach(anim => anim.setValue(0));

        // Animate screen entrance
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 500,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();

        // Animate initial numbers
        animateToTargets(currentMacros);

        // Start aura ball rotations
        Animated.loop(
            Animated.timing(rotateTopRight, {
                toValue: 1,
                duration: 30000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        Animated.loop(
            Animated.timing(rotateBottomLeft, {
                toValue: 1,
                duration: 30000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, [animateToTargets]);

    const topRightRotation = rotateTopRight.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const bottomLeftRotation = rotateBottomLeft.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '-360deg'],
    });

    // Animate initial macros only (no changes)
    useEffect(() => {
        animateToTargets(currentMacros);
    }, [animateToTargets]);

    const getCalorieDifference = () => {
        if (!currentMacros.baseTDEE) return null;
        const diff = currentMacros.calories - currentMacros.baseTDEE;
        return diff;
    };


    const getGoalDescription = () => {
        const intensityLabels = {
            mild: 'mild',
            moderate: 'moderate',
            aggressive: 'aggressive',
        };
        const goalLabels = {
            lose: 'weight loss',
            maintain: 'maintenance',
            build: 'muscle gain',
        };
        return `${intensityLabels[goalIntensity]} ${goalLabels[goal]}`;
    };

    const difference = getCalorieDifference();
    const isDeficit = difference !== null && difference < 0;
    const isSurplus = difference !== null && difference > 0;

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
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                removeClippedSubviews={false}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                decelerationRate="normal"
                bounces={true}
                overScrollMode="auto"
                scrollEnabled={true}
            >
                <Animated.View
                    style={[
                        styles.content,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    <Text style={styles.title}>your macros are ready!</Text>
                    <Text style={styles.subtitle}>{getGoalDescription()}</Text>

                    {/* Calories Display */}
                    <View style={styles.caloriesContainer}>
                        <View style={styles.caloriesRow}>
                            <AnimatedNumber
                                value={numberAnimations.calories}
                                target={currentMacros.calories}
                                style={styles.caloriesNumber}
                            />
                            <Text style={styles.caloriesUnit}>kcal</Text>
                        </View>

                        {currentMacros.baseTDEE && difference !== null && (
                            <View style={styles.explanationContainer}>
                                {difference === 0 ? (
                                    <Text style={styles.explanationText}>
                                        this is your maintenance level
                                    </Text>
                                ) : isDeficit ? (
                                    <Text style={styles.explanationText}>
                                        {Math.abs(difference)} calories less than your maintenance of {currentMacros.baseTDEE}
                                    </Text>
                                ) : (
                                    <Text style={styles.explanationText}>
                                        {difference} calories more than your maintenance of {currentMacros.baseTDEE}
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Macros Breakdown */}
                    <View style={styles.macrosSection}>
                        <Text style={styles.macrosTitle}>macronutrients</Text>
                        <View style={styles.macroItem}>
                            <Text style={styles.macroLabel}>protein</Text>
                            <AnimatedNumber
                                value={numberAnimations.protein}
                                target={currentMacros.protein}
                                style={styles.macroValue}
                            />
                            <Text style={styles.macroUnit}>g</Text>
                        </View>
                        <View style={styles.macroItem}>
                            <Text style={styles.macroLabel}>carbs</Text>
                            <AnimatedNumber
                                value={numberAnimations.carbs}
                                target={currentMacros.carbs}
                                style={styles.macroValue}
                            />
                            <Text style={styles.macroUnit}>g</Text>
                        </View>
                        <View style={styles.macroItem}>
                            <Text style={styles.macroLabel}>fats</Text>
                            <AnimatedNumber
                                value={numberAnimations.fats}
                                target={currentMacros.fats}
                                style={styles.macroValue}
                            />
                            <Text style={styles.macroUnit}>g</Text>
                        </View>
                    </View>

                    <Button
                        variant="primary"
                        title="let's go!"
                        onPress={() => {
                            navigation.replace('Home');
                        }}
                        containerStyle={styles.button}
                    />
                </Animated.View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        zIndex: 0,
    },
    auraBallBottomLeft: {
        position: 'absolute',
        bottom: -250,
        left: -250,
        width: 500,
        height: 500,
        zIndex: 0,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 16,
        alignItems: 'center',
    },
    content: {
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        zIndex: 1,
    },
    title: {
        fontSize: 26,
        fontFamily: fonts.bold,
        textAlign: 'center',
        marginBottom: 4,
        textTransform: 'lowercase',
        color: '#252525',
    },
    subtitle: {
        fontSize: 16,
        fontFamily: fonts.regular,
        textAlign: 'center',
        marginBottom: 20,
        color: '#666',
        textTransform: 'lowercase',
    },
    caloriesContainer: {
        width: 360,
        alignSelf: 'center',
        marginBottom: 24,
        alignItems: 'center',
    },
    caloriesRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        marginBottom: 16,
    },
    caloriesNumber: {
        fontSize: 56,
        fontFamily: fonts.bold,
        color: '#526EFF',
        marginRight: 8,
    },
    caloriesUnit: {
        fontSize: 24,
        fontFamily: fonts.bold,
        color: '#526EFF',
        textTransform: 'lowercase',
    },
    explanationContainer: {
        width: '100%',
        paddingHorizontal: 20,
    },
    explanationText: {
        fontSize: 20,
        fontFamily: fonts.regular,
        color: '#666',
        textAlign: 'center',
        textTransform: 'lowercase',
        lineHeight: 28,
    },
    deficit: {
        color: '#FF5151',
    },
    surplus: {
        color: '#26F170',
    },
    macrosSection: {
        marginBottom: 20,
        width: 360,
        alignSelf: 'center',
    },
    macrosTitle: {
        fontSize: 18,
        fontFamily: fonts.bold,
        marginBottom: 12,
        textAlign: 'center',
        textTransform: 'lowercase',
        color: '#252525',
    },
    macroItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    macroLabel: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#333',
        textTransform: 'lowercase',
        flex: 1,
    },
    macroValue: {
        fontSize: 24,
        fontFamily: fonts.bold,
        color: '#526EFF',
        marginRight: 10,
    },
    macroUnit: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#666',
    },
    button: {
        marginTop: 4,
        marginBottom: 16,
        width: '100%',
    },
});

