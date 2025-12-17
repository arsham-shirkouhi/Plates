import React from 'react';
import { TextInput as RNTextInput, TextInputProps as RNTextInputProps, StyleSheet, View, ViewStyle } from 'react-native';
import { fonts } from '../constants/fonts';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

export type TextInputVariant = 'default' | 'password';

interface TextInputProps extends RNTextInputProps {
    variant?: TextInputVariant;
    containerStyle?: ViewStyle;
    showPasswordToggle?: boolean;
    isPasswordVisible?: boolean;
    onTogglePassword?: () => void;
}

export const TextInput: React.FC<TextInputProps> = ({
    variant = 'default',
    containerStyle,
    showPasswordToggle = false,
    isPasswordVisible = false,
    onTogglePassword,
    style,
    ...props
}) => {
    const getInputStyle = () => {
        return {
            backgroundColor: '#F5F5F5',
            borderWidth: 2,
            borderColor: '#252525',
            borderRadius: 10,
            paddingHorizontal: 15,
            paddingVertical: 15,
            fontSize: 18,
            fontFamily: fonts.regular,
            color: '#252525',
            width: 360,
            height: 50,
        };
    };

    if (variant === 'password' || showPasswordToggle) {
        return (
            <View style={[styles.passwordContainer, containerStyle]}>
                <RNTextInput
                    style={[getInputStyle(), styles.passwordInput, style]}
                    placeholderTextColor="#999"
                    secureTextEntry={false}
                    {...props}
                />
                {showPasswordToggle && (
                    <TouchableOpacity
                        onPress={onTogglePassword}
                        style={styles.eyeIcon}
                    >
                        <Ionicons
                            name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color="#252525"
                        />
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    return (
        <RNTextInput
            style={[getInputStyle(), style]}
            placeholderTextColor="#999"
            {...props}
        />
    );
};

const styles = StyleSheet.create({
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderWidth: 2,
        borderColor: '#252525',
        borderRadius: 10,
        width: 360,
        height: 50,
    },
    passwordInput: {
        flex: 1,
        backgroundColor: 'transparent',
        borderWidth: 0,
        paddingRight: 0,
    },
    eyeIcon: {
        paddingRight: 15,
        paddingLeft: 10,
    },
});
