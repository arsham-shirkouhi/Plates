import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface IconProps {
    name: IconName | string;
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle>;
}

/** Original app icons — Expo Ionicons. No third-party icon packs. */
export const Icon: React.FC<IconProps> = ({ name, size = 24, color = '#252525', style }) => {
    return (
        <Ionicons
            name={name as IconName}
            size={size}
            color={color}
            style={style}
        />
    );
};

export function isIconName(value: string): value is IconName {
    return typeof value === 'string' && value.length > 0;
}
