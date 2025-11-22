import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, Image, ImageSourcePropType } from 'react-native';
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
    const getButtonStyle = (): ViewStyle => {
        const baseStyle: ViewStyle = {
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            alignSelf: 'center',
        };

        switch (variant) {
            case 'primary':
                return {
                    ...baseStyle,
                    backgroundColor: '#526EFF',
                    borderWidth: 2,
                    borderColor: '#000',
                    width: 360,
                    height: 50,
                    marginTop: 5,
                    marginBottom: 12,
                };
            case 'google':
                return {
                    ...baseStyle,
                    backgroundColor: '#fff',
                    borderWidth: 2,
                    borderColor: '#000',
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
                    borderColor: '#000',
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

        switch (variant) {
            case 'primary':
                return {
                    ...baseStyle,
                    color: '#fff',
                    fontSize: 20,
                    fontFamily: fonts.bold,
                };
            case 'google':
                return {
                    ...baseStyle,
                    color: '#000',
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

    return (
        <TouchableOpacity
            style={[getButtonStyle(), containerStyle]}
            onPress={props.onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            {...props}
        >
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
                    <Text style={[getTextStyle(), textStyle]}>{title}</Text>
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    icon: {
        width: 20,
        height: 20,
        marginRight: 10,
    },
});

