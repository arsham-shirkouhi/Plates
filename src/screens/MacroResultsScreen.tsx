import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
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
    const { macros, goal, goalIntensity } = route.params;

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const numberAnimations = useRef({
        calories: new Animated.Value(0),
        protein: new Animated.Value(0),
        carbs: new Animated.Value(0),
        fats: new Animated.Value(0),
        baseTDEE: new Animated.Value(0),
    }).current;

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

        // Animate numbers counting up with delays
        const animateNumber = (anim: Animated.Value, target: number, delay: number) => {
            return Animated.timing(anim, {
                toValue: target,
                duration: 1200,
                delay,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            });
        };

        const animations: Animated.CompositeAnimation[] = [];
        if (macros.baseTDEE) {
            animations.push(animateNumber(numberAnimations.baseTDEE, macros.baseTDEE, 200));
        }
        animations.push(
            animateNumber(numberAnimations.calories, macros.calories, 400),
            animateNumber(numberAnimations.protein, macros.protein, 600),
            animateNumber(numberAnimations.carbs, macros.carbs, 800),
            animateNumber(numberAnimations.fats, macros.fats, 1000)
        );
        Animated.parallel(animations).start();
    }, []);

    const getCalorieDifference = () => {
        if (!macros.baseTDEE) return null;
        const diff = macros.calories - macros.baseTDEE;
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

                {/* Base TDEE */}
                {macros.baseTDEE && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>maintenance calories</Text>
                        <AnimatedNumber
                            value={numberAnimations.baseTDEE}
                            target={macros.baseTDEE}
                            style={styles.largeNumber}
                        />
                        <Text style={styles.sectionDesc}>calories to maintain weight</Text>
                    </View>
                )}

                {/* Calorie Adjustment */}
                {difference !== null && (
                    <View style={styles.adjustmentContainer}>
                        {isDeficit && (
                            <View style={styles.adjustmentRow}>
                                <Text style={styles.adjustmentLabel}>deficit:</Text>
                                <Text style={[styles.adjustmentValue, styles.deficit]}>
                                    -{Math.abs(difference)} cal
                                </Text>
                            </View>
                        )}
                        {isSurplus && (
                            <View style={styles.adjustmentRow}>
                                <Text style={styles.adjustmentLabel}>surplus:</Text>
                                <Text style={[styles.adjustmentValue, styles.surplus]}>
                                    +{difference} cal
                                </Text>
                            </View>
                        )}
                        {difference === 0 && (
                            <View style={styles.adjustmentRow}>
                                <Text style={styles.adjustmentLabel}>maintenance</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Target Calories */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>target calories</Text>
                    <AnimatedNumber
                        value={numberAnimations.calories}
                        target={macros.calories}
                        style={styles.largeNumber}
                    />
                    <Text style={styles.sectionDesc}>daily calorie goal</Text>
                </View>

                {/* Macros Breakdown */}
                <View style={styles.macrosSection}>
                    <Text style={styles.macrosTitle}>macronutrients</Text>
                    <View style={styles.macroItem}>
                        <Text style={styles.macroLabel}>protein</Text>
                        <AnimatedNumber
                            value={numberAnimations.protein}
                            target={macros.protein}
                            style={styles.macroValue}
                        />
                        <Text style={styles.macroUnit}>g</Text>
                    </View>
                    <View style={styles.macroItem}>
                        <Text style={styles.macroLabel}>carbs</Text>
                        <AnimatedNumber
                            value={numberAnimations.carbs}
                            target={macros.carbs}
                            style={styles.macroValue}
                        />
                        <Text style={styles.macroUnit}>g</Text>
                    </View>
                    <View style={styles.macroItem}>
                        <Text style={styles.macroLabel}>fats</Text>
                        <AnimatedNumber
                            value={numberAnimations.fats}
                            target={macros.fats}
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontFamily: fonts.bold,
        textAlign: 'center',
        marginBottom: 8,
        textTransform: 'lowercase',
        color: '#000',
    },
    subtitle: {
        fontSize: 18,
        fontFamily: fonts.regular,
        textAlign: 'center',
        marginBottom: 32,
        color: '#666',
        textTransform: 'lowercase',
    },
    section: {
        alignItems: 'center',
        marginBottom: 24,
        paddingVertical: 20,
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#666',
        marginBottom: 12,
        textTransform: 'lowercase',
    },
    largeNumber: {
        fontSize: 56,
        fontFamily: fonts.bold,
        color: '#526EFF',
        marginBottom: 8,
    },
    sectionDesc: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#999',
        textTransform: 'lowercase',
    },
    adjustmentContainer: {
        marginBottom: 24,
        paddingVertical: 16,
        paddingHorizontal: 24,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        width: '100%',
        borderWidth: 2,
        borderColor: '#000',
    },
    adjustmentRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    adjustmentLabel: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#666',
        marginRight: 12,
        textTransform: 'lowercase',
    },
    adjustmentValue: {
        fontSize: 24,
        fontFamily: fonts.bold,
    },
    deficit: {
        color: '#FF5151',
    },
    surplus: {
        color: '#26F170',
    },
    macrosSection: {
        marginBottom: 32,
        width: '100%',
    },
    macrosTitle: {
        fontSize: 22,
        fontFamily: fonts.bold,
        marginBottom: 20,
        textAlign: 'center',
        textTransform: 'lowercase',
        color: '#000',
    },
    macroItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    macroLabel: {
        fontSize: 20,
        fontFamily: fonts.regular,
        color: '#333',
        textTransform: 'lowercase',
        flex: 1,
    },
    macroValue: {
        fontSize: 28,
        fontFamily: fonts.bold,
        color: '#526EFF',
        marginRight: 12,
    },
    macroUnit: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#666',
    },
    button: {
        marginTop: 8,
        width: '100%',
    },
});

