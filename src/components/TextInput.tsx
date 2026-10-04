import React from 'react';
import {
    TextInput as RNTextInput,
    TextInputProps as RNTextInputProps,
    StyleSheet,
    View,
    ViewStyle,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/fonts';
import { WORKOUT_COLORS } from '../workout/constants';
import { HARD_SHADOW } from './ui/HardSearchBar';

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
    const showToggle = variant === 'password' || showPasswordToggle;

    return (
        <View style={[styles.wrap, containerStyle]}>
            <View style={styles.shadow} />
            <View style={styles.field}>
                <RNTextInput
                    style={[styles.input, style]}
                    placeholderTextColor={WORKOUT_COLORS.placeholder}
                    secureTextEntry={false}
                    {...props}
                />
                {showToggle ? (
                    <TouchableOpacity onPress={onTogglePassword} style={styles.eye} activeOpacity={0.7}>
                        <Ionicons
                            name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={WORKOUT_COLORS.text}
                        />
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: {
        width: 360,
        paddingBottom: HARD_SHADOW,
        alignSelf: 'center',
    },
    shadow: {
        ...StyleSheet.absoluteFill,
        top: HARD_SHADOW,
        borderRadius: 12,
        backgroundColor: WORKOUT_COLORS.border,
    },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 50,
        paddingHorizontal: 14,
        backgroundColor: WORKOUT_COLORS.background,
        borderRadius: 12,
        borderWidth: 2.5,
        borderColor: WORKOUT_COLORS.border,
        gap: 10,
    },
    input: {
        flex: 1,
        fontSize: 18,
        fontFamily: fonts.regular,
        color: WORKOUT_COLORS.text,
        paddingVertical: 12,
        paddingHorizontal: 0,
    },
    eye: {
        padding: 4,
    },
});
