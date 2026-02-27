import React, { useRef, useState, useEffect } from 'react';
import { View, TouchableOpacity, TouchableOpacityProps, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, Image, ImageSourcePropType, Animated, Easing } from 'react-native';
import { fonts } from '../constants/fonts';

export type ButtonVariant = 'primary' | 'google' | 'secondary' | 'link';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
    variant?: ButtonVariant;
    title: string;
    loading?: boolean;
    icon?: ImageSourcePropType;
    containerStyle?: ViewStyle;
    textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    title,
    loading = false,
    icon,
    disabled,
    containerStyle,
    textStyle,
    ...props
}) => {
    const isDisabled = disabled || loading;
    const prevDisabledRef = useRef(isDisabled);

    // Animation refs for press effect (for all button variants except link)
    const translateY = useRef(new Animated.Value(0)).current;
    const shadowHeight = useRef(new Animated.Value(isDisabled ? 0 : 4)).current;
    const [shadowHeightState, setShadowHeightState] = useState(isDisabled ? 0 : 4);
    const colorOverlayOpacity = useRef(new Animated.Value(isDisabled ? 0 : 1)).current;

    // Sync animated shadow value with state for style updates
    useEffect(() => {
        const listenerId = shadowHeight.addListener(({ value }) => {
            setShadowHeightState(value);
        });
        return () => {
            shadowHeight.removeListener(listenerId);
        };
    }, []);

    // Animate when button transitions from disabled to enabled (for all variants except link)
    useEffect(() => {
        if (variant !== 'link') {
            const wasDisabled = prevDisabledRef.current;
            const nowEnabled = !isDisabled;

            if (wasDisabled && nowEnabled) {
                // Animate enable transition: shadow appears, and bounce
                const animations = [
                    // Shadow appears
                    Animated.timing(shadowHeight, {
                        toValue: 4,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    // Bounce animation - move up then spring back
                    Animated.sequence([
                        Animated.timing(translateY, {
                            toValue: -8,
                            duration: 200,
                            easing: Easing.out(Easing.ease),
                            useNativeDriver: true,
                        }),
                        Animated.spring(translateY, {
                            toValue: 0,
                            tension: 100,
                            friction: 8,
                            useNativeDriver: true,
                        }),
                    ]),
                ];

                // Color overlay fades in (only for primary)
                if (variant === 'primary') {
                    animations.push(
                        Animated.timing(colorOverlayOpacity, {
                            toValue: 1,
                            duration: 300,
                            easing: Easing.out(Easing.ease),
                            useNativeDriver: true,
                        })
                    );
                }

                Animated.parallel(animations).start();
            } else if (!wasDisabled && isDisabled) {
                // Reset to disabled state immediately
                shadowHeight.setValue(0);
                if (variant === 'primary') {
                    colorOverlayOpacity.setValue(0);
                }
                translateY.setValue(0);
            }

            prevDisabledRef.current = isDisabled;
        }
    }, [isDisabled, variant]);
    const getButtonStyle = (): ViewStyle => {
        const baseStyle: ViewStyle = {
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            alignSelf: 'center',
        };

        const isDisabled = loading || disabled;

        switch (variant) {
            case 'primary':
                return {
                    ...baseStyle,
                    backgroundColor: isDisabled ? '#fff' : '#526EFF',
                    borderWidth: 2,
                    borderColor: isDisabled ? '#252525' : '#252525',
                    width: 360,
                    height: 50,
                    marginTop: 5,
                    marginBottom: 12,
                    // Shadow properties will be handled by Animated.View
                };
            case 'google':
                return {
                    ...baseStyle,
                    backgroundColor: '#fff',
                    borderWidth: 2,
                    borderColor: '#252525',
                    flexDirection: 'row',
                    width: 360,
                    height: 50,
                    marginBottom: 10,
                };
            case 'secondary':
                return {
                    ...baseStyle,
                    backgroundColor: '#fff',
                    borderWidth: 2,
                    borderColor: '#252525',
                    width: 360,
                    height: 50,
                    marginBottom: 12,
                };
            case 'link':
                return {
                    ...baseStyle,
                    backgroundColor: 'transparent',
                    borderWidth: 0,
                    width: 'auto',
                    height: 'auto',
                    marginTop: 12,
                    marginBottom: 0,
                };
            default:
                return baseStyle;
        }
    };

    const getTextStyle = (): TextStyle => {
        const baseStyle: TextStyle = {
            textTransform: 'lowercase' as const,
        };

        const isDisabled = disabled || loading;

        switch (variant) {
            case 'primary':
                return {
                    ...baseStyle,
                    color: isDisabled ? '#252525' : '#fff',
                    fontSize: 20,
                    fontFamily: fonts.bold,
                };
            case 'google':
                return {
                    ...baseStyle,
                    color: '#252525',
                    fontSize: 20,
                    fontFamily: fonts.regular,
                };
            case 'secondary':
                return {
                    ...baseStyle,
                    color: '#526EFF',
                    fontSize: 20,
                    fontFamily: fonts.bold,
                };
            case 'link':
                return {
                    ...baseStyle,
                    color: '#333',
                    fontSize: 18,
                    fontFamily: fonts.regular,
                };
            default:
                return baseStyle;
        }
    };

    const getLoadingColor = (): string => {
        switch (variant) {
            case 'primary':
                return '#fff';
            case 'google':
                return '#4285F4';
            case 'secondary':
                return '#526EFF';
            case 'link':
                return '#333';
            default:
                return '#fff';
        }
    };

    if (variant === 'link') {
        return (
            <TouchableOpacity
                onPress={props.onPress}
                disabled={disabled || loading}
                activeOpacity={0.7}
                style={containerStyle}
                {...props}
            >
                {loading ? (
                    <ActivityIndicator color={getLoadingColor()} size="small" />
                ) : (
                    <Text style={[getTextStyle(), textStyle]}>{title}</Text>
                )}
            </TouchableOpacity>
        );
    }

    // Press animation handlers for all button variants (except link)
    const handlePressIn = () => {
        if (!isDisabled) {
            // Animate button down and shadow disappearing simultaneously
            // Button moves down 4px to reduce shadow
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 4,
                    duration: 120,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(shadowHeight, {
                    toValue: 0,
                    duration: 120,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: false, // Shadow offset can't use native driver
                }),
            ]).start();
        }
    };

    const handlePressOut = () => {
        if (!isDisabled) {
            // Animate button back up and shadow reappearing simultaneously
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 120,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(shadowHeight, {
                    toValue: 4,
                    duration: 120,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: false,
                }),
            ]).start();
        }
    };

    // For all button variants (except link), use Animated.View with shadow
    // Link variant returns early above, so we know variant is not 'link' here
    if (variant === 'primary' || variant === 'google' || variant === 'secondary') {
        const buttonStyle = getButtonStyle();
        
        // Allow width override from containerStyle (supports both number and string like '100%')
        const containerWidth = containerStyle?.width;
        const effectiveWidth = containerWidth !== undefined ? containerWidth : buttonStyle.width;
        const buttonWidth = containerWidth !== undefined ? containerWidth : buttonStyle.width;

        // Extract dimensions for shadow (without margins)
        const shadowStyle: ViewStyle = {
            width: typeof effectiveWidth === 'number' ? effectiveWidth : '100%',
            height: buttonStyle.height,
            borderRadius: buttonStyle.borderRadius || 12,
            backgroundColor: '#252525',
        };

        return (
            <View style={[containerStyle, { position: 'relative', alignItems: 'center' }]}>
                {/* Shadow layer - positioned behind button for harsh drop shadow */}
                <Animated.View
                    style={[
                        shadowStyle,
                        {
                            position: 'absolute',
                            top: ((typeof buttonStyle.marginTop === 'number' ? buttonStyle.marginTop : 0) + 4), // Account for button margin + 4px offset
                            alignSelf: 'center',
                            transform: [
                                {
                                    translateY: shadowHeight.interpolate({
                                        inputRange: [0, 4],
                                        outputRange: [0, 0], // Shadow position stays constant
                                    }),
                                },
                            ],
                            opacity: shadowHeight.interpolate({
                                inputRange: [0, 4],
                                outputRange: [0, 1],
                            }),
                            zIndex: 0,
                        },
                    ]}
                    pointerEvents="none"
                />
                <TouchableOpacity
                    onPress={props.onPress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={isDisabled}
                    activeOpacity={1}
                    style={{ zIndex: 1, width: '100%', alignItems: 'center' }}
                >
                    <Animated.View
                        style={[
                            buttonStyle,
                            isDisabled && styles.disabledButton,
                            {
                                transform: [{ translateY }],
                                overflow: 'hidden',
                                width: buttonWidth,
                            },
                        ]}
                    >
                        {/* Color overlay for smooth background color transition (only for primary) */}
                        {variant === 'primary' && (
                            <Animated.View
                                style={[
                                    StyleSheet.absoluteFill,
                                    {
                                        backgroundColor: '#526EFF',
                                        borderRadius: 10,
                                        opacity: colorOverlayOpacity,
                                    },
                                ]}
                                pointerEvents="none"
                            />
                        )}
                        {loading ? (
                            <ActivityIndicator color={getLoadingColor()} />
                        ) : (
                            <>
                                {icon && variant === 'google' && (
                                    <Image
                                        source={icon}
                                        style={styles.icon}
                                        resizeMode="contain"
                                    />
                                )}
                                {variant === 'primary' ? (
                                    <Animated.Text
                                        style={[
                                            getTextStyle(),
                                            textStyle,
                                            {
                                                color: textStyle?.color || (isDisabled ? '#252525' : '#fff'),
                                                opacity: colorOverlayOpacity.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [1, 1],
                                                }),
                                            },
                                        ]}
                                    >
                                        {title}
                                    </Animated.Text>
                                ) : (
                                    <Text style={[getTextStyle(), textStyle]}>{title}</Text>
                                )}
                            </>
                        )}
                    </Animated.View>
                </TouchableOpacity>
            </View>
        );
    }

    // This should never be reached, but TypeScript requires it for type safety
    return null;
};

const styles = StyleSheet.create({
    icon: {
        width: 20,
        height: 20,
        marginRight: 10,
    },
    disabledButton: {
        opacity: 1, // Remove opacity reduction for cleaner look
    },
});

