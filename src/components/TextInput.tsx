import React from 'react';
import { TextInput as RNTextInput, TextInputProps as RNTextInputProps, StyleSheet } from 'react-native';
import { fonts } from '../constants/fonts';

export const TextInput: React.FC<RNTextInputProps> = ({ style, ...props }) => {
    return (
        <RNTextInput
            style={[styles.default, style]}
            {...props}
        />
    );
};

const styles = StyleSheet.create({
    default: {
        fontFamily: fonts.regular,
    },
});

