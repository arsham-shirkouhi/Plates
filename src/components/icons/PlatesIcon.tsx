import React from 'react';
import { Image } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

const ARMS_ICON = require('../../../assets/images/icons/arms.png');

export type PlatesIconName =
    | 'chest'
    | 'back'
    | 'shoulders'
    | 'arms'
    | 'legs'
    | 'core'
    | 'cardio'
    | 'neck'
    | 'dumbbell'
    | 'search'
    | 'close'
    | 'chevronLeft'
    | 'chevronDown'
    | 'food'
    | 'play';

export interface PlatesIconProps {
    name: PlatesIconName;
    size?: number;
    color?: string;
    fill?: string;
    strokeWidth?: number;
}

const INK = '#252525';

/**
 * Chunky Plates marks — thick ink, flat fill, square-ish joints.
 * Swap these for Harry's custom files later; keep the same `name` keys.
 */
export const PlatesIcon: React.FC<PlatesIconProps> = ({
    name,
    size = 24,
    color = INK,
    fill = 'none',
    strokeWidth,
}) => {
    const sw = strokeWidth ?? 1.9;

    if (name === 'arms') {
        return (
            <Image
                source={ARMS_ICON}
                style={{
                    width: size,
                    height: size,
                    tintColor: color === fill ? color : undefined,
                }}
                resizeMode="contain"
            />
        );
    }

    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            {name === 'chest' ? (
                <>
                    <Path
                        d="M6.4 7.2C6.4 5.6 8.8 4.4 12 4.4C15.2 4.4 17.6 5.6 17.6 7.2V16.2C17.6 19.1 15.1 20.6 12 20.6C8.9 20.6 6.4 19.1 6.4 16.2V7.2Z"
                        fill={fill}
                        stroke={color}
                        strokeWidth={sw}
                        strokeLinejoin="miter"
                    />
                    <Path
                        d="M8.2 9.6C9.6 11.2 10.5 12 12 12.6C13.5 12 14.4 11.2 15.8 9.6"
                        stroke={color}
                        strokeWidth={sw}
                        strokeLinecap="square"
                    />
                </>
            ) : null}
            {name === 'back' ? (
                <>
                    <Path
                        d="M12 3.8L20 9.4L16.8 20.2H7.2L4 9.4L12 3.8Z"
                        fill={fill}
                        stroke={color}
                        strokeWidth={sw}
                        strokeLinejoin="miter"
                    />
                    <Line x1={12} y1={8} x2={12} y2={17.6} stroke={color} strokeWidth={sw} strokeLinecap="square" />
                </>
            ) : null}
            {name === 'shoulders' ? (
                <>
                    <Circle cx={7.2} cy={9} r={3.15} fill={fill} stroke={color} strokeWidth={sw} />
                    <Circle cx={16.8} cy={9} r={3.15} fill={fill} stroke={color} strokeWidth={sw} />
                    <Path
                        d="M9.6 9.4H14.4V14.8C14.4 16.2 13.4 17.2 12 17.2C10.6 17.2 9.6 16.2 9.6 14.8V9.4Z"
                        fill={fill}
                        stroke={color}
                        strokeWidth={sw}
                        strokeLinejoin="miter"
                    />
                </>
            ) : null}
            {name === 'legs' ? (
                <>
                    <Rect
                        x={5.6}
                        y={3.8}
                        width={4.6}
                        height={16.4}
                        rx={1.2}
                        fill={fill}
                        stroke={color}
                        strokeWidth={sw}
                    />
                    <Rect
                        x={13.8}
                        y={3.8}
                        width={4.6}
                        height={16.4}
                        rx={1.2}
                        fill={fill}
                        stroke={color}
                        strokeWidth={sw}
                    />
                </>
            ) : null}
            {name === 'core' ? (
                <>
                    <Rect x={5.2} y={4.2} width={6.2} height={4.8} rx={0.8} fill={fill} stroke={color} strokeWidth={sw} />
                    <Rect x={12.6} y={4.2} width={6.2} height={4.8} rx={0.8} fill={fill} stroke={color} strokeWidth={sw} />
                    <Rect x={5.2} y={9.6} width={6.2} height={4.8} rx={0.8} fill={fill} stroke={color} strokeWidth={sw} />
                    <Rect x={12.6} y={9.6} width={6.2} height={4.8} rx={0.8} fill={fill} stroke={color} strokeWidth={sw} />
                    <Rect x={5.2} y={15} width={6.2} height={4.8} rx={0.8} fill={fill} stroke={color} strokeWidth={sw} />
                    <Rect x={12.6} y={15} width={6.2} height={4.8} rx={0.8} fill={fill} stroke={color} strokeWidth={sw} />
                </>
            ) : null}
            {name === 'cardio' ? (
                <Path
                    d="M12 20.2L4.8 13.2C3.2 11.6 3.3 8.8 5.1 7.2C6.8 5.7 9.2 5.9 10.7 7.5L12 8.9L13.3 7.5C14.8 5.9 17.2 5.7 18.9 7.2C20.7 8.8 20.8 11.6 19.2 13.2L12 20.2Z"
                    fill={fill}
                    stroke={color}
                    strokeWidth={sw}
                    strokeLinejoin="miter"
                />
            ) : null}
            {name === 'neck' ? (
                <>
                    <Path
                        d="M6.4 8.2C8.2 5.8 10 4.6 12 4.6C14 4.6 15.8 5.8 17.6 8.2V10.2H6.4V8.2Z"
                        fill={fill}
                        stroke={color}
                        strokeWidth={sw}
                        strokeLinejoin="miter"
                    />
                    <Rect
                        x={8.8}
                        y={10}
                        width={6.4}
                        height={9.4}
                        rx={1.4}
                        fill={fill}
                        stroke={color}
                        strokeWidth={sw}
                    />
                </>
            ) : null}
            {name === 'dumbbell' ? (
                <>
                    <Rect x={2.6} y={7.4} width={3.6} height={9.2} rx={0.6} fill={fill} stroke={color} strokeWidth={sw} />
                    <Rect x={17.8} y={7.4} width={3.6} height={9.2} rx={0.6} fill={fill} stroke={color} strokeWidth={sw} />
                    <Rect x={6.2} y={10.2} width={11.6} height={3.6} fill={fill} stroke={color} strokeWidth={sw} />
                </>
            ) : null}
            {name === 'search' ? (
                <>
                    <Circle cx={10.4} cy={10.4} r={5.2} stroke={color} strokeWidth={2.2} />
                    <Line
                        x1={14.4}
                        y1={14.4}
                        x2={20}
                        y2={20}
                        stroke={color}
                        strokeWidth={2.2}
                        strokeLinecap="square"
                    />
                </>
            ) : null}
            {name === 'close' ? (
                <>
                    <Line x1={6} y1={6} x2={18} y2={18} stroke={color} strokeWidth={2.2} strokeLinecap="square" />
                    <Line x1={18} y1={6} x2={6} y2={18} stroke={color} strokeWidth={2.2} strokeLinecap="square" />
                </>
            ) : null}
            {name === 'chevronLeft' ? (
                <Path
                    d="M14.8 5.2L8.2 12L14.8 18.8"
                    stroke={color}
                    strokeWidth={2.2}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                />
            ) : null}
            {name === 'chevronDown' ? (
                <Path
                    d="M5.2 9.2L12 15.8L18.8 9.2"
                    stroke={color}
                    strokeWidth={2.2}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                />
            ) : null}
            {name === 'food' ? (
                <>
                    <Circle cx={12} cy={13.2} r={6.4} fill={fill} stroke={color} strokeWidth={sw} />
                    <Path
                        d="M5.6 8.2C7.4 6.2 9.6 5.2 12 5.2C14.4 5.2 16.6 6.2 18.4 8.2"
                        stroke={color}
                        strokeWidth={sw}
                        strokeLinecap="square"
                    />
                </>
            ) : null}
            {name === 'play' ? (
                <Path
                    d="M8.2 5.4L18.2 12L8.2 18.6V5.4Z"
                    fill={fill}
                    stroke={color}
                    strokeWidth={sw}
                    strokeLinejoin="miter"
                />
            ) : null}
        </Svg>
    );
};

export interface BodyPartStamp {
    icon: PlatesIconName;
    fill: string;
    wash: string;
}

const BODY_PART_STAMPS: { keys: string[]; stamp: BodyPartStamp }[] = [
    { keys: ['chest', 'pec'], stamp: { icon: 'chest', fill: '#526EFF', wash: '#EAEEFF' } },
    { keys: ['back', 'lat', 'trap'], stamp: { icon: 'back', fill: '#2ED573', wash: '#D8FCE6' } },
    { keys: ['shoulder', 'delt'], stamp: { icon: 'shoulders', fill: '#F9C117', wash: '#FFF6C8' } },
    { keys: ['bicep', 'tricep', 'arm', 'forearm'], stamp: { icon: 'arms', fill: '#FF5151', wash: '#FFE4E4' } },
    { keys: ['leg', 'quad', 'hamstring', 'glute', 'calf', 'thigh'], stamp: { icon: 'legs', fill: '#B06BFF', wash: '#F3E8FF' } },
    { keys: ['core', 'ab', 'waist', 'oblique'], stamp: { icon: 'core', fill: '#FF8A3D', wash: '#FFE6D4' } },
    { keys: ['cardio', 'heart'], stamp: { icon: 'cardio', fill: '#FF5151', wash: '#FFE4E4' } },
    { keys: ['neck'], stamp: { icon: 'neck', fill: '#5C6670', wash: '#ECEDEF' } },
];

const DEFAULT_STAMP: BodyPartStamp = { icon: 'dumbbell', fill: '#526EFF', wash: '#EAEEFF' };

/** Yellow needs dark ink so chip/title text stays readable. */
export function getStampInk(fill: string): string {
    return fill.toUpperCase() === '#F9C117' ? '#252525' : fill;
}

export function getBodyPartStamp(bodyPart?: string): BodyPartStamp {
    if (!bodyPart) return DEFAULT_STAMP;
    const normalized = bodyPart.trim().toLowerCase();
    const match = BODY_PART_STAMPS.find((entry) =>
        entry.keys.some((key) => normalized.includes(key))
    );
    return match?.stamp ?? DEFAULT_STAMP;
}
