import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, Animated, Easing, StyleSheet } from 'react-native';
import { Button } from './Button';
import { fonts } from '../constants/fonts';

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

interface MacroResultsModalProps {
    visible: boolean;
    onClose: () => void;
    macros: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
        baseTDEE?: number;
    };
    goal: 'lose' | 'maintain' | 'build';
    goalIntensity: 'mild' | 'moderate' | 'aggressive';
}

export const MacroResultsModal: React.FC<MacroResultsModalProps> = ({
    visible,
    onClose,
    macros,
    goal,
    goalIntensity,
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const numberAnimations = useRef({
        calories: new Animated.Value(0),
        protein: new Animated.Value(0),
        carbs: new Animated.Value(0),
        fats: new Animated.Value(0),
        baseTDEE: new Animated.Value(0),
    }).current;

    useEffect(() => {
        if (visible) {
            // Reset animations
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.8);
            slideAnim.setValue(50);
            Object.values(numberAnimations).forEach(anim => anim.setValue(0));

            // Animate modal entrance
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 400,
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
        }
    }, [visible, macros]);

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
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            opacity: fadeAnim,
                            transform: [
                                { scale: scaleAnim },
                                { translateY: slideAnim },
                            ],
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
                        onPress={onClose}
                        containerStyle={styles.button}
                    />
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        borderWidth: 2.5,
        borderColor: '#252525',
        shadowColor: '#252525',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    title: {
        fontSize: 28,
        fontFamily: fonts.bold,
        textAlign: 'center',
        marginBottom: 8,
        textTransform: 'lowercase',
        color: '#252525',
    },
    subtitle: {
        fontSize: 16,
        fontFamily: fonts.regular,
        textAlign: 'center',
        marginBottom: 24,
        color: '#666',
        textTransform: 'lowercase',
    },
    section: {
        alignItems: 'center',
        marginBottom: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#666',
        marginBottom: 8,
        textTransform: 'lowercase',
    },
    largeNumber: {
        fontSize: 48,
        fontFamily: fonts.bold,
        color: '#526EFF',
        marginBottom: 4,
    },
    sectionDesc: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: '#999',
        textTransform: 'lowercase',
    },
    adjustmentContainer: {
        marginBottom: 20,
        paddingVertical: 12,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    adjustmentRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    adjustmentLabel: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#666',
        marginRight: 8,
        textTransform: 'lowercase',
    },
    adjustmentValue: {
        fontSize: 20,
        fontFamily: fonts.bold,
    },
    deficit: {
        color: '#FF5151',
    },
    surplus: {
        color: '#26F170',
    },
    macrosSection: {
        marginBottom: 24,
    },
    macrosTitle: {
        fontSize: 18,
        fontFamily: fonts.bold,
        marginBottom: 16,
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
        marginRight: 8,
    },
    macroUnit: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#666',
    },
    button: {
        marginTop: 8,
    },
});

