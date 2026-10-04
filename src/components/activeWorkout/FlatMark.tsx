import React from 'react';
import Svg, { Line, Polyline, Rect } from 'react-native-svg';

export const COMPLETE_BG = '#E8F6EC';
export const COMPLETE_BORDER = '#2A8F4A';
export const COMPLETE_INK = '#1F6B38';

interface MarkProps {
    color: string;
    size?: number;
    strokeWidth?: number;
}

export const FlatTick: React.FC<MarkProps> = ({ color, size = 16, strokeWidth = 2.2 }) => (
    <Svg width={size} height={size} viewBox="0 0 16 16">
        <Polyline
            points="2.2,8.2 6.2,12.2 13.8,3.4"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="square"
            strokeLinejoin="miter"
        />
    </Svg>
);

export const FlatBox: React.FC<MarkProps> = ({ color, size = 16 }) => (
    <Svg width={size} height={size} viewBox="0 0 16 16">
        <Rect
            x={2.4}
            y={2.4}
            width={11.2}
            height={11.2}
            fill="none"
            stroke={color}
            strokeWidth={1.8}
        />
    </Svg>
);

export const FlatPlus: React.FC<MarkProps> = ({ color, size = 16, strokeWidth = 2.2 }) => (
    <Svg width={size} height={size} viewBox="0 0 16 16">
        <Line x1={8} y1={2.4} x2={8} y2={13.6} stroke={color} strokeWidth={strokeWidth} strokeLinecap="square" />
        <Line x1={2.4} y1={8} x2={13.6} y2={8} stroke={color} strokeWidth={strokeWidth} strokeLinecap="square" />
    </Svg>
);

export const FlatMinus: React.FC<MarkProps> = ({ color, size = 16, strokeWidth = 2.2 }) => (
    <Svg width={size} height={size} viewBox="0 0 16 16">
        <Line x1={2.4} y1={8} x2={13.6} y2={8} stroke={color} strokeWidth={strokeWidth} strokeLinecap="square" />
    </Svg>
);
