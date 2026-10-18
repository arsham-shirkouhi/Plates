import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { fonts } from '../../constants/fonts';
import { Icon, type IconName } from '../icons/Icon';
import { PlatesIcon, getStampInk, type PlatesIconName } from '../icons/PlatesIcon';

const INACTIVE_BORDER = '#D4D7DC';
const INACTIVE_BG = '#FFFFFF';
const INACTIVE_INK = '#9AA0A6';

export interface BodyPartChipProps {
    label: string;
    icon?: PlatesIconName;
    ionicon?: IconName;
    fill: string;
    wash: string;
    isActive?: boolean;
    onPress?: (origin: { x: number; y: number }) => void;
    /** Give the unselected state a clearly muted look so selection is obvious. */
    dimWhenInactive?: boolean;
    /** Force a fixed chip width (used to make a row of chips all match the widest). */
    widthOverride?: number;
    /** Reports the chip's laid-out width so a parent can compute a uniform width. */
    onLayout?: (event: LayoutChangeEvent) => void;
}

export const BodyPartChip: React.FC<BodyPartChipProps> = ({
    label,
    icon,
    ionicon,
    fill,
    wash,
    isActive = false,
    onPress,
    dimWhenInactive = false,
    widthOverride,
    onLayout,
}) => {
    const chipRef = useRef<View>(null);

    const ink = getStampInk(fill);
    const dimmed = dimWhenInactive && !isActive;
    const glyphColor = dimmed
        ? INACTIVE_INK
        : isActive && ink !== '#252525'
        ? '#FFFFFF'
        : ink;
    const hasGlyph = Boolean(icon || ionicon);

    const content = (
        <>
            {icon ? (
                <PlatesIcon
                    name={icon}
                    size={15}
                    color={glyphColor}
                    fill={glyphColor}
                />
            ) : null}
            {ionicon ? (
                <Icon name={ionicon} size={15} color={glyphColor} />
            ) : null}
            <Text
                numberOfLines={1}
                style={[
                    styles.text,
                    { color: glyphColor },
                ]}
            >
                {label}
            </Text>
        </>
    );

    const chipStyle = [
        styles.chip,
        !hasGlyph && styles.chipNoGlyph,
        { backgroundColor: wash, borderColor: fill },
        isActive && { backgroundColor: fill, borderColor: fill },
        dimmed && { backgroundColor: INACTIVE_BG, borderColor: INACTIVE_BORDER },
        widthOverride != null && { width: widthOverride, justifyContent: 'center' as const },
    ];

    if (!onPress) {
        return <View style={chipStyle} onLayout={onLayout}>{content}</View>;
    }

    return (
        <View ref={chipRef} collapsable={false}>
            <TouchableOpacity
                style={chipStyle}
                onLayout={onLayout}
                onPress={() => {
                    chipRef.current?.measureInWindow((x, y, width, height) => {
                        onPress({ x: x + width / 2, y: y + height / 2 });
                    });
                }}
                activeOpacity={0.85}
            >
                {content}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 5,
        paddingRight: 12,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 2,
        gap: 7,
    },
    chipNoGlyph: {
        paddingLeft: 12,
    },
    text: {
        fontSize: 13,
        fontFamily: fonts.bold,
        textTransform: 'lowercase',
    },
});
