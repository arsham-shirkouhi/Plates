/**
 * Theme Constants
 * Includes default text styles with JUST Sans font
 */

import { TextStyle } from 'react-native';
import { fonts } from './fonts';

export const defaultTextStyle: TextStyle = {
    fontFamily: fonts.regular,
};

export const textStyles = {
    default: defaultTextStyle,
    regular: {
        fontFamily: fonts.regular,
    } as TextStyle,
    bold: {
        fontFamily: fonts.bold,
    } as TextStyle,
    h1: {
        fontFamily: fonts.bold,
        fontSize: 32,
        fontWeight: 'bold' as const,
    } as TextStyle,
    h2: {
        fontFamily: fonts.bold,
        fontSize: 24,
        fontWeight: 'bold' as const,
    } as TextStyle,
    h3: {
        fontFamily: fonts.bold,
        fontSize: 20,
        fontWeight: 'bold' as const,
    } as TextStyle,
    body: {
        fontFamily: fonts.regular,
        fontSize: 16,
    } as TextStyle,
    bodyBold: {
        fontFamily: fonts.bold,
        fontSize: 16,
    } as TextStyle,
    caption: {
        fontFamily: fonts.regular,
        fontSize: 14,
    } as TextStyle,
    captionBold: {
        fontFamily: fonts.bold,
        fontSize: 14,
    } as TextStyle,
};

