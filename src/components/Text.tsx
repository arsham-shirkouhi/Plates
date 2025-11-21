import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { fonts } from '../constants/fonts';

interface TextProps extends RNTextProps {
    bold?: boolean;
}

export const Text: React.FC<TextProps> = ({ style, bold, ...props }) => {
    return (
        <RNText
            style={[
                styles.default,
                bold && styles.bold,
                style,
            ]}
            {...props}
        />
    );
};

const styles = StyleSheet.create({
    default: {
        fontFamily: fonts.regular,
    },
    bold: {
        fontFamily: fonts.bold,
    },
});

