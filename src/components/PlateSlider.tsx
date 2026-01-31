import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    ScrollView,
    Dimensions,
    Easing,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';

interface PlateProps {
    weight: number;
    color: string;
    index: number;
    totalPlates: number;
    animation: Animated.Value;
    count?: number; // Number of plates of this weight
}

interface PlateSliderProps {
    value: number;
    onValueChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
}

const BAR_WEIGHT = 20; // kg - standard Olympic barbell weight
const PLATE_WEIGHTS = [25, 20, 15, 10, 5, 2.5, 1.25]; // Standard IWF plate weights (largest to smallest)
// IWF Standard Colors
const PLATE_COLORS: { [key: number]: string } = {
    25: '#FF5151', // Red
    20: '#526EFF', // Blue
    15: '#F9C117', // Yellow
    10: '#26F170', // Green
    5: '#FFFFFF',  // White
    2.5: '#FF5151', // Red-small
    1.25: '#526EFF', // Blue-small
};

// Default to kg, but can be adjusted for lbs
const SNAP_INCREMENT_KG = 2.5; // Snap to 2.5kg increments (lowest plate weight)
const SNAP_INCREMENT_LBS = 5; // Snap to 5lbs increments (lowest plate weight for lbs)
const PLATE_SIZE = 100; // Diameter of each plate (increased)
const PLATE_OFFSET = 12; // Horizontal offset between plates (px) for "peek" effect
const PLATE_3D_OFFSET = 5; // Offset for 3D effect circle
// Removed scaling - plates will always be full size
const BASE_Z_INDEX = 100; // Starting z-index for first plate

// Helper function to darken a color
const darkenColor = (color: string, amount: number = 0.3): string => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const newR = Math.max(0, Math.floor(r * (1 - amount)));
    const newG = Math.max(0, Math.floor(g * (1 - amount)));
    const newB = Math.max(0, Math.floor(b * (1 - amount)));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

// Individual Plate Component
const Plate: React.FC<PlateProps> = ({ weight, color, index, totalPlates, animation }) => {
    // Plate size based on weight - larger weights = larger plates
    // Base size is PLATE_SIZE, scale from 0.6 (1.25kg) to 1.0 (25kg)
    const sizeMultiplier = 0.6 + (weight / 25) * 0.4; // Range: 0.6 to 1.0
    const plateSize = PLATE_SIZE * sizeMultiplier;
    const scale = 1;
    
    const darkerColor = darkenColor(color, 0.4); // Darker color for 3D effect
    
    return (
        <Animated.View
            style={[
                {
                    width: plateSize,
                    height: plateSize,
                    transform: [
                        {
                            scale: Animated.multiply(
                                animation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 1],
                                }),
                                scale
                            ),
                        },
                    ],
                },
            ]}
        >
            {/* 3D Effect Circle (darker, offset to the right) */}
            <View 
                style={[
                    styles.plate, 
                    styles.plate3D,
                    { 
                        backgroundColor: darkerColor,
                        left: PLATE_3D_OFFSET,
                        width: plateSize,
                        height: plateSize,
                        borderRadius: plateSize / 2,
                    }
                ]} 
            />
            {/* Main Plate Circle */}
            <View style={[
                styles.plate, 
                { 
                    backgroundColor: color,
                    width: plateSize,
                    height: plateSize,
                    borderRadius: plateSize / 2,
                }
            ]}>
                <Text style={[styles.plateText, weight === 5 && styles.plateTextWhite]}>{weight}</Text>
            </View>
        </Animated.View>
    );
};

export const PlateSlider: React.FC<PlateSliderProps> = ({
    value,
    onValueChange,
    min = 20,
    max = 200,
    step,
}) => {
    // Use appropriate increment based on default unit system
    // For kg: 2.5kg increments (lowest plate), for lbs: 5lbs increments
    // Max should be based on 25kg plates - typically 200kg+ for multiple 25kg plates
    const snapIncrement = step || SNAP_INCREMENT_KG; // Default to 2.5kg, but can be overridden for lbs (5lbs)
    const screenWidth = Dimensions.get('window').width;
    const rulerRef = useRef<ScrollView>(null);
    const [displayedWeight, setDisplayedWeight] = useState(value);
    const isScrollingProgrammatically = useRef(false);
    const weightValueDisplayAnim = useRef(new Animated.Value(1)).current;
    const [lastSnappedValue, setLastSnappedValue] = useState(value);

    // Constants for weight ruler
    const TICK_WIDTH = 14; // px - horizontal spacing
    const STEP = snapIncrement; // Use the snap increment (2.5kg or 5lbs)
    const MIN_VALUE = min;
    const MAX_VALUE = max;
    const TOTAL_TICKS = Math.round((MAX_VALUE - MIN_VALUE) / STEP) + 1;
    const BUFFER_TICKS = 10;
    const TOTAL_TICKS_WITH_BUFFER = TOTAL_TICKS + (2 * BUFFER_TICKS);
    const rulerWidth = screenWidth - 40; // Fit within screen with 20px padding on each side
    const CENTER_OFFSET = rulerWidth / 2 - TICK_WIDTH / 2;

    /**
     * Pure Weight Algorithm - no barbell offset (compatible with dumbbells and machines)
     * Returns array of plate weights (e.g., [25, 25, 25, 25, 25, 25, 25, 5] for 180kg)
     * Mathematical accuracy: totalWeight = sum of plates
     */
    const calculatePlates = (totalWeight: number): number[] => {
        let target = totalWeight; // Pure weight - no bar offset
        if (target <= 0) return [];
        
        const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];
        const result: number[] = [];
        
        for (const plate of availablePlates) {
            while (target >= plate) {
                result.push(plate);
                target = Math.round((target - plate) * 100) / 100; // Fixes floating point errors
            }
        }
        
        return result;
    };

    /**
     * Group plates by weight and return with counts and colors
     */
    const calculateAllPlates = (totalWeight: number): Array<{ weight: number; color: string; count: number }> => {
        const plates = calculatePlates(totalWeight);
        
        // Group plates by weight and count them
        const plateCounts = new Map<number, number>();
        plates.forEach(weight => {
            plateCounts.set(weight, (plateCounts.get(weight) || 0) + 1);
        });

        // Return grouped plates with counts, sorted by weight (descending - largest first for display)
        return Array.from(plateCounts.entries())
            .map(([weight, count]) => ({
                weight,
                count,
                color: PLATE_COLORS[weight] || '#8E8E93',
            }))
            .sort((a, b) => b.weight - a.weight); // Sort descending (largest first)
    };


    // Initialize ruler position from current weight
    useEffect(() => {
        const index = Math.round((value - MIN_VALUE) / STEP);
        const scrollX = (index + BUFFER_TICKS) * TICK_WIDTH;
        setTimeout(() => {
            rulerRef.current?.scrollTo({
                x: scrollX,
                animated: false,
            });
        }, 100);
        setDisplayedWeight(value);
        setLastSnappedValue(value);
    }, []);

    // Update ruler position when value changes externally
    useEffect(() => {
        if (Math.abs(value - displayedWeight) > 0.1) {
            const index = Math.round((value - MIN_VALUE) / STEP);
            const scrollX = (index + BUFFER_TICKS) * TICK_WIDTH;
            isScrollingProgrammatically.current = true;
            rulerRef.current?.scrollTo({
                x: scrollX,
                animated: true,
            });
            setTimeout(() => {
                isScrollingProgrammatically.current = false;
            }, 300);
            setDisplayedWeight(value);
        }
    }, [value]);

    // Track plate animations by unique key (weight-index)
    const [plateAnimationsMap, setPlateAnimationsMap] = useState<Map<string, Animated.Value>>(new Map());
    const previousPlatesRef = useRef<Array<{ weight: number; color: string; count: number }>>([]);

    // Animate plates when they change - instant update with smooth transitions
    useEffect(() => {
        const currentPlates = calculateAllPlates(value);
        const allPlatesArray = calculatePlates(value);
        const previousPlates = previousPlatesRef.current;

        // Create animations for new plates
        const newAnimations = new Map(plateAnimationsMap);
        
        currentPlates.forEach((plateGroup, index) => {
            const plateKey = `${plateGroup.weight}-${index}`;
            
            // Check if this is a new plate group by comparing with previous plates
            const wasPresent = previousPlates.some((p, i) => 
                p.weight === plateGroup.weight && i === index
            );
            
            if (!wasPresent) {
                // New plate - create animation with "pop" effect
                const anim = new Animated.Value(0);
                newAnimations.set(plateKey, anim);
                
                // Subtle animation: smooth fade in and slide
                Animated.spring(anim, {
                    toValue: 1,
                    tension: 300,
                    friction: 15,
                    useNativeDriver: true,
                }).start();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } else {
                // Existing plate - keep animation and smoothly transition position
                const existingAnim = plateAnimationsMap.get(plateKey);
                if (existingAnim) {
                    newAnimations.set(plateKey, existingAnim);
                } else {
                    const anim = new Animated.Value(1);
                    newAnimations.set(plateKey, anim);
                }
            }
        });

        // Remove animations for plate groups that are no longer present
        plateAnimationsMap.forEach((anim, key) => {
            const stillExists = currentPlates.some((p, i) => `${p.weight}-${i}` === key);
            if (!stillExists) {
                // Animate out with spring - plates slide out smoothly
                Animated.spring(anim, {
                    toValue: 0,
                    tension: 400,
                    friction: 10,
                    useNativeDriver: true,
                }).start(() => {
                    newAnimations.delete(key);
                });
            }
        });

        setPlateAnimationsMap(newAnimations);
        previousPlatesRef.current = currentPlates;
        setLastSnappedValue(value);
        
        // Verify calculation accuracy (pure weight - no bar)
        const calculatedTotal = allPlatesArray.reduce((sum, plate) => sum + plate, 0);
        const difference = Math.abs(calculatedTotal - value);
        if (difference > 0.01) {
            console.warn(`Weight calculation mismatch: Target ${value}kg, Calculated ${calculatedTotal.toFixed(2)}kg, Difference: ${difference.toFixed(2)}kg`);
        }
    }, [value]);

    // Handle scroll - update displayed value in real-time
    const onScroll = (e: any) => {
        if (isScrollingProgrammatically.current) {
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
            // Instant update - triggers calculateAllPlates immediately
            onValueChange(newDisplayedValue);
            // Haptic feedback for each increment/decrement
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    const clampScrollPosition = (offsetX: number): number => {
        const minScrollX = BUFFER_TICKS * TICK_WIDTH;
        const maxScrollX = (BUFFER_TICKS + TOTAL_TICKS - 1) * TICK_WIDTH;
        return Math.max(minScrollX, Math.min(maxScrollX, offsetX));
    };

    // Handle scroll end drag - clamp position if needed
    const onScrollEndDrag = (e: any) => {
        if (isScrollingProgrammatically.current) {
            return;
        }

        const offsetX = e.nativeEvent.contentOffset.x;
        const clampedX = clampScrollPosition(offsetX);

        if (clampedX !== offsetX) {
            isScrollingProgrammatically.current = true;
            rulerRef.current?.scrollTo({
                x: clampedX,
                animated: true,
            });
            setTimeout(() => {
                isScrollingProgrammatically.current = false;
            }, 300);
        }
    };

    // Handle scroll end - snap to exact position
    const onMomentumScrollEnd = (e: any) => {
        if (isScrollingProgrammatically.current) {
            return;
        }

        const offsetX = e.nativeEvent.contentOffset.x;
        // Calculate which tick should be centered (account for left buffer)
        const index = Math.round(offsetX / TICK_WIDTH);
        const adjustedIndex = index - BUFFER_TICKS;
        // Clamp to valid range
        const clampedIndex = Math.max(0, Math.min(TOTAL_TICKS - 1, adjustedIndex));

        // Calculate exact scroll position for perfect snapping
        const exactScrollX = (clampedIndex + BUFFER_TICKS) * TICK_WIDTH;

        // Calculate value
        const newValue = MIN_VALUE + (clampedIndex * STEP);

        // Update value
        if (Math.abs(newValue - displayedWeight) > 0.01) {
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

            onValueChange(newValue);
            setDisplayedWeight(newValue);
        }

        // Snap to exact position smoothly
        isScrollingProgrammatically.current = true;
        rulerRef.current?.scrollTo({
            x: exactScrollX,
            animated: true,
        });
        setTimeout(() => {
            isScrollingProgrammatically.current = false;
        }, 400);
    };

    const renderTick = (index: number) => {
        // Check if this is a buffer tick
        const isBufferTick = index < BUFFER_TICKS || index >= BUFFER_TICKS + TOTAL_TICKS;

        if (isBufferTick) {
            // Buffer ticks - calculate virtual value
            let virtualValue: number;
            let distanceFromValidRange: number;

            if (index < BUFFER_TICKS) {
                const ticksBelowMin = BUFFER_TICKS - index;
                virtualValue = MIN_VALUE - (ticksBelowMin * STEP);
                distanceFromValidRange = ticksBelowMin;
            } else {
                const adjustedIndex = index - BUFFER_TICKS - TOTAL_TICKS;
                virtualValue = MAX_VALUE + ((adjustedIndex + 1) * STEP);
                distanceFromValidRange = adjustedIndex + 1;
            }

            // Determine if this should be a medium tick (every 5kg)
            const roundedValue = Math.round(virtualValue);
            const isMedium = roundedValue % 5 === 0;

            // Calculate fade opacity
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

        // Valid tick: calculate value
        const adjustedIndex = index - BUFFER_TICKS;
        const tickValue = MIN_VALUE + (adjustedIndex * STEP);
        const isSelected = Math.abs(tickValue - displayedWeight) < STEP / 2;

        // Tick intervals: small = 2.5kg, medium = 5kg, large = 10kg
        const isMajor = tickValue % 10 === 0;
        const isMedium = tickValue % 5 === 0 && !isMajor;
        const isTenIncrement = tickValue % 10 === 0;

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
                {/* Tick mark */}
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
                        {`${tickValue}`}
                    </Text>
                )}
            </View>
        );
    };

    const groupedPlates = calculateAllPlates(value);
    const totalRows = groupedPlates.length;
    const allPlates = calculatePlates(value);
    const platesSum = allPlates.reduce((sum, plate) => sum + plate, 0);
    
    // Dynamic offset and scaling for large numbers
    const plateCount = allPlates.length;
    const offset = plateCount > 6 ? 6 : 10; // Reduce offset if too many plates
    const needsScaling = plateCount > 8;
    const containerScale = needsScaling ? 0.8 : 1;

    return (
        <View style={styles.container}>
            {/* Barbell Sleeve Visualization - Centered */}
            <View style={styles.barbellContainer}>
                {/* Single row container - all plates in one horizontal row, centered deck of cards */}
                <View style={styles.plateRowsContainer}>
                    <Animated.View 
                        style={[
                            {
                                width: '100%',
                                height: '100%',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                            },
                            {
                                transform: [{ scale: containerScale }],
                            }
                        ]}
                    >
                        {groupedPlates.map((plateGroup, index) => {
                            const plateKey = `${plateGroup.weight}-${index}`;
                            const anim = plateAnimationsMap.get(plateKey) || new Animated.Value(1);
                            
                            // Center the first plate, then offset subsequent plates to the right
                            // Largest plate (index 0) at center, others offset to the right like deck of cards
                            // Need to account for plate width to center properly
                            const plateSize = PLATE_SIZE * (0.6 + (plateGroup.weight / 25) * 0.4);
                            const translateX = index * offset - (plateSize / 2); // Center first plate, then offset
                            
                            return (
                                <View 
                                    key={plateKey} 
                                    style={[
                                        styles.plateColumn,
                                        {
                                            left: '50%',
                                            marginLeft: -plateSize / 2, // Center the plate
                                            transform: [{ translateX: index * offset }],
                                            zIndex: totalRows - index, // Largest plate (index 0) has highest z-index
                                        }
                                    ]}
                                >
                                    <Plate
                                        weight={plateGroup.weight}
                                        color={plateGroup.color}
                                        index={index}
                                        totalPlates={totalRows}
                                        animation={anim}
                                        count={plateGroup.count}
                                    />
                                    <Text style={styles.plateCount}>×{plateGroup.count}</Text>
                                </View>
                            );
                        })}
                    </Animated.View>
                </View>
                
                {/* Validation label showing the calculation */}
                <View style={styles.validationLabel}>
                    <Text style={styles.validationText}>
                        Plates: {platesSum.toFixed(2)}kg = {platesSum.toFixed(2)}kg
                    </Text>
                </View>
            </View>

            {/* Weight Display */}
            <View style={styles.weightDisplay}>
                <Animated.Text
                    style={[
                        styles.weightValue,
                        {
                            transform: [{ scale: weightValueDisplayAnim }],
                            opacity: weightValueDisplayAnim,
                        }
                    ]}
                >
                    {displayedWeight.toFixed(1)}
                </Animated.Text>
                <Text style={styles.weightUnit}>kg</Text>
            </View>

            {/* Weight Ruler (from onboarding) */}
            <View style={styles.weightRulerWrapper}>
                <View style={[styles.weightRulerContainer, { width: rulerWidth }]}>
                    <ScrollView
                        ref={rulerRef}
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

const styles = StyleSheet.create({
    container: {
        paddingVertical: 20,
        paddingHorizontal: 20,
    },
    barbellContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: 320, // Increased height to accommodate more plates without cutting off
        width: '100%',
        overflow: 'visible', // Changed to visible so plates don't get cut off
        marginBottom: 24,
        position: 'relative',
    },
    barbellBar: {
        position: 'absolute',
        width: '80%',
        maxWidth: 400,
        height: 8,
        backgroundColor: '#9E9E9E',
        borderRadius: 4,
        zIndex: 0,
    },
    barbellSleeve: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: PLATE_SIZE + 40, // Increased to accommodate more plates
        width: '100%',
        overflow: 'visible', // Changed to visible so plates don't get cut off
        position: 'relative',
    },
    plateStackContainer: {
        height: PLATE_SIZE,
        position: 'relative',
        width: '100%',
        overflow: 'visible', // Changed to visible so plates don't get cut off
        justifyContent: 'center',
        alignItems: 'center',
    },
    plateWrapper: {
        position: 'absolute',
        top: 0,
        left: '50%',
        // Width and height will be set dynamically based on weight
    },
    plate: {
        // Width, height, and borderRadius will be set dynamically based on weight
        borderWidth: 2,
        borderColor: '#252525',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
    },
    plate3D: {
        zIndex: -1, // Behind the main plate
    },
    plateText: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: '#252525',
        textAlign: 'center',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    barbellCenter: {
        width: 40,
        height: 8,
        backgroundColor: '#252525',
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#252525',
    },
    weightDisplay: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        marginBottom: 20,
        gap: 8,
    },
    weightValue: {
        fontSize: 48,
        fontFamily: fonts.bold,
        color: '#252525',
    },
    weightUnit: {
        fontSize: 24,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
    },
    plateRowsContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        // Centered deck of cards layout
    },
    plateColumn: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8, // Space between plate and count indicator
        position: 'absolute',
        // translateX will be applied dynamically based on index
    },
    plateCount: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: '#252525',
        marginTop: 4,
    },
    validationLabel: {
        marginTop: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    validationText: {
        fontSize: 14,
        fontFamily: fonts.medium,
        color: '#9E9E9E',
        textAlign: 'center',
    },
});
