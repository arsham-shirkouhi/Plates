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
                setTextValue(formatted.replace(unit ? ' ' + unit : '', ''));
            } else {
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
        setTextValue(text);
        // Handle decimal values for weight (kg can have 0.5 steps)
        const numValue = parseFloat(text);
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
        const numValue = parseFloat(textValue);
        if (isNaN(numValue) || numValue < minimumValue || numValue > maximumValue) {
            // Reset to current value if invalid
            setTextValue(formatValue ? formatValue(value).replace(unit ? ' ' + unit : '', '') : value.toString());
        } else {
            // Round to step for integer steps, or round to nearest 0.5 for decimal steps
            const steppedValue = step >= 1
                ? Math.round(numValue / step) * step
                : Math.round(numValue * 2) / 2;
            onValueChange(steppedValue);
            // Format the display value correctly
            if (formatValue) {
                setTextValue(formatValue(steppedValue).replace(unit ? ' ' + unit : '', ''));
            } else {
                setTextValue(steppedValue.toString());
            }
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
            <View style={styles.labels}>
                <Text style={styles.label}>{minimumValue}</Text>
                <Text style={styles.label}>{maximumValue}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: SLIDER_WIDTH,
        alignSelf: 'center',
    },
    valueText: {
        fontSize: 48,
        fontFamily: fonts.bold,
        color: '#526EFF',
        textAlign: 'center',
        marginBottom: 30,
    },
    editableValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
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
        height: 8,
        backgroundColor: '#F5F5F5',
        borderRadius: 4,
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
