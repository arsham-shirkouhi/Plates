import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { fonts } from '../../constants/fonts';
import { PlatesIcon, getStampInk, type PlatesIconName } from '../icons/PlatesIcon';

export interface BodyPartChipProps {
    label: string;
    icon: PlatesIconName;
    fill: string;
    wash: string;
    isActive?: boolean;
    onPress?: (origin: { x: number; y: number }) => void;
}

export const BodyPartChip: React.FC<BodyPartChipProps> = ({
    label,
    icon,
    fill,
    wash,
    isActive = false,
    onPress,
}) => {
    const chipRef = useRef<View>(null);

    const ink = getStampInk(fill);
    const glyphColor = isActive && ink !== '#252525' ? '#FFFFFF' : ink;

    const content = (
        <>
            <PlatesIcon
                name={icon}
                size={15}
                color={glyphColor}
                fill={glyphColor}
            />
            <Text
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
        { backgroundColor: wash, borderColor: fill },
        isActive && { backgroundColor: fill, borderColor: fill },
    ];

    if (!onPress) {
        return <View style={chipStyle}>{content}</View>;
    }

    return (
        <View ref={chipRef} collapsable={false}>
            <TouchableOpacity
                style={chipStyle}
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
    text: {
        fontSize: 13,
        fontFamily: fonts.bold,
        textTransform: 'lowercase',
    },
});
