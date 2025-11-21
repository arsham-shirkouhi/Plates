/**
 * Font Constants
 * 
 * Usage:
 * import { fonts } from '../constants/fonts';
 * 
 * <Text style={{ fontFamily: fonts.regular }}>Regular text</Text>
 * <Text style={{ fontFamily: fonts.bold }}>Bold text</Text>
 */

export const fonts = {
    regular: 'JUST_Sans_Regular',
    bold: 'JUST_Sans_ExBold',
} as const;

export type FontFamily = typeof fonts[keyof typeof fonts];

