import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated, TouchableOpacity, TextInput } from 'react-native';
import { fonts } from '../constants/fonts';
import { Ionicons } from '@expo/vector-icons';

interface SliderProps {
    value: number;
    onValueChange: (value: number) => void;
    minimumValue: number;
    maximumValue: number;
    step?: number;
    unit?: string;
    formatValue?: (value: number) => string;
    editableText?: boolean; // Allow editing the value directly via text input
}

const SLIDER_WIDTH = 360;
const THUMB_SIZE = 24;

export const Slider: React.FC<SliderProps> = ({
    value,
    onValueChange,
    minimumValue,
    maximumValue,
    step = 1,
    unit = '',
    formatValue,
    editableText = false,
}) => {
    const pan = useRef(new Animated.Value(0)).current;
    const sliderWidth = SLIDER_WIDTH - THUMB_SIZE;
    const [isEditing, setIsEditing] = useState(false);
    const [textValue, setTextValue] = useState(value.toString());
    const currentDragValue = useRef(value); // Track the value during drag

    const getValueFromPosition = (x: number): number => {
        const percentage = Math.max(0, Math.min(1, x / sliderWidth));
        const rawValue = minimumValue + (maximumValue - minimumValue) * percentage;
        const steppedValue = Math.round(rawValue / step) * step;
        return Math.max(minimumValue, Math.min(maximumValue, steppedValue));
    };

    const getPositionFromValue = (val: number): number => {
        const percentage = (val - minimumValue) / (maximumValue - minimumValue);
        return percentage * sliderWidth;
    };

    // Update text value when slider value changes (but not when user is editing)
    useEffect(() => {
        if (!isEditing) {
            if (formatValue) {
                // Extract just the number part (remove unit)
                const formatted = formatValue(value);
                // Remove unit and any special characters like ' and "
                const cleaned = formatted.replace(unit ? ' ' + unit : '', '').replace(/'/g, '').replace(/"/g, '').trim();
                setTextValue(cleaned);
            } else {
                // Store just the number without unit
                setTextValue(value.toString());
            }
        }
    }, [value, isEditing, formatValue, unit]);

    // Animate thumb position smoothly - only when value changes externally, not during drag
    const isDragging = useRef(false);

    // Update current drag value when value prop changes
    useEffect(() => {
        currentDragValue.current = value;
    }, [value]);

    useEffect(() => {
        if (!isDragging.current) {
            const position = getPositionFromValue(value);
            Animated.spring(pan, {
                toValue: position,
                useNativeDriver: true,
                tension: 50,
                friction: 7,
            }).start();
        }
    }, [value, minimumValue, maximumValue]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                isDragging.current = true;
                // Get the touch position relative to the track
                const trackX = evt.nativeEvent.locationX - THUMB_SIZE / 2;
                const clampedX = Math.max(0, Math.min(sliderWidth, trackX));
                const newValue = getValueFromPosition(clampedX);
                currentDragValue.current = newValue;
                onValueChange(newValue);
                // Set position immediately without animation during drag
                pan.setValue(clampedX);
            },
            onPanResponderMove: (evt) => {
                const trackX = evt.nativeEvent.locationX - THUMB_SIZE / 2;
                const clampedX = Math.max(0, Math.min(sliderWidth, trackX));
                const newValue = getValueFromPosition(clampedX);
                currentDragValue.current = newValue;
                onValueChange(newValue);
                // Smooth real-time updates during drag - direct setValue for responsiveness
                pan.setValue(clampedX);
            },
            onPanResponderRelease: () => {
                isDragging.current = false;
                // Use the current drag value (the last value set during drag)
                const finalValue = currentDragValue.current;
                const finalPosition = getPositionFromValue(finalValue);
                // Ensure the value is properly set
                onValueChange(finalValue);
                // Snap to final position with spring animation
                Animated.spring(pan, {
                    toValue: finalPosition,
                    useNativeDriver: true,
                    tension: 100,
                    friction: 8,
                }).start();
            },
        })
    ).current;

    const handleTextChange = (text: string) => {
        // Only allow digits, max 3 digits
        const digitsOnly = text.replace(/[^\d]/g, '');
        if (digitsOnly.length > 3) {
            return; // Don't update if more than 3 digits
        }
        setTextValue(digitsOnly);

        // Extract number from text (text should only contain numbers now, no unit)
        // Handle feet and inches format (e.g., "5'11" or "5'11\"")
        let numValue: number;

        // Check if it's in feet and inches format
        const feetInchesMatch = digitsOnly.match(/(\d+)'(\d+)"/);
        if (feetInchesMatch) {
            const feet = parseInt(feetInchesMatch[1], 10);
            const inches = parseInt(feetInchesMatch[2], 10);
            numValue = feet * 12 + inches; // Convert to inches
        } else {
            // Just parse the number (no unit to remove)
            numValue = parseFloat(digitsOnly);
        }

        if (!isNaN(numValue)) {
            const clampedValue = Math.max(minimumValue, Math.min(maximumValue, numValue));
            // Round to step for integer steps, or round to nearest 0.5 for decimal steps
            const steppedValue = step >= 1
                ? Math.round(clampedValue / step) * step
                : Math.round(clampedValue * 2) / 2;
            onValueChange(steppedValue);
        }
    };

    const handleTextBlur = () => {
        setIsEditing(false);

        // Handle feet and inches format
        let numValue: number;
        const feetInchesMatch = textValue.match(/(\d+)'(\d+)"/);
        if (feetInchesMatch) {
            const feet = parseInt(feetInchesMatch[1], 10);
            const inches = parseInt(feetInchesMatch[2], 10);
            numValue = feet * 12 + inches; // Convert to inches
        } else {
            // Just parse the number (no unit to remove)
            numValue = parseFloat(textValue);
        }

        if (isNaN(numValue) || numValue < minimumValue || numValue > maximumValue) {
            // Reset to current value (number only, no unit)
            if (formatValue) {
                const formatted = formatValue(value);
                const cleaned = formatted.replace(unit ? ' ' + unit : '', '').replace(/'/g, '').replace(/"/g, '').trim();
                setTextValue(cleaned);
            } else {
                setTextValue(value.toString());
            }
        } else {
            // Round to step for integer steps, or round to nearest 0.5 for decimal steps
            const steppedValue = step >= 1
                ? Math.round(numValue / step) * step
                : Math.round(numValue * 2) / 2;
            onValueChange(steppedValue);
        }
    };

    const handleTextFocus = () => {
        setIsEditing(true);
    };

    const displayValue = formatValue ? formatValue(value) : `${value}${unit ? ' ' + unit : ''}`;
    const displayText = editableText ? textValue : displayValue;

    return (
        <View style={styles.container}>
            {editableText ? (
                <View style={styles.editableValueContainer}>
                    <TextInput
                        style={[styles.editableValueText, isEditing && styles.editableValueTextFocused]}
                        value={displayText}
                        onChangeText={handleTextChange}
                        onBlur={handleTextBlur}
                        onFocus={handleTextFocus}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                        maxLength={step < 1 ? 5 : 3} // Allow decimals for weight
                    />
                    <Ionicons
                        name="create-outline"
                        size={20}
                        color={isEditing ? '#526EFF' : '#999'}
                        style={styles.editIcon}
                    />
                </View>
            ) : (
                <Text style={styles.valueText}>{displayValue}</Text>
            )}
            <View style={styles.sliderTrack} {...panResponder.panHandlers}>
                <Animated.View
                    style={[
                        styles.sliderThumb,
                        {
                            transform: [{ translateX: pan }],
                        },
                    ]}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: SLIDER_WIDTH,
        alignSelf: 'center',
    },
    valueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 0,
        marginBottom: 20,
    },
    valueText: {
        fontSize: 48,
        fontFamily: fonts.bold,
        color: '#526EFF',
        textAlign: 'center',
        marginTop: 0,
        marginBottom: 20,
    },
    valueTextEditable: {
        borderBottomWidth: 2,
        borderBottomColor: '#526EFF',
        paddingBottom: 4,
        maxWidth: 90, // Max width for 3 digits
        textAlign: 'center',
    },
    editingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    unitText: {
        fontSize: 48,
        fontFamily: fonts.bold,
        color: '#526EFF',
        marginLeft: 8,
    },
    editButton: {
        marginLeft: 12,
        padding: 4,
    },
    editableValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        marginBottom: 20,
        position: 'relative',
    },
    editableValueText: {
        fontSize: 48,
        fontFamily: fonts.bold,
        color: '#526EFF',
        textAlign: 'center',
        minWidth: 80,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    editableValueTextFocused: {
        borderBottomColor: '#526EFF',
    },
    editIcon: {
        marginLeft: 8,
        opacity: 0.6,
    },
    sliderTrack: {
        height: 12,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#000',
        borderRadius: 6,
        position: 'relative',
        marginBottom: 10,
        width: '100%',
    },
    sliderThumb: {
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        backgroundColor: '#526EFF',
        borderWidth: 3,
        borderColor: '#000',
        position: 'absolute',
        top: -8,
        left: 0,
    },
    labels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
    },
    label: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#666',
    },
});
