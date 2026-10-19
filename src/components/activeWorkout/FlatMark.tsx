import React from 'react';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';

export const COMPLETE_BG = '#EAEEFF';
export const COMPLETE_BORDER = '#8FA4FF';
export const COMPLETE_LINE = '#B8C4FF';
export const COMPLETE_INK = '#526EFF';

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

export const FlatDots: React.FC<MarkProps> = ({ color, size = 16 }) => (
    <Svg width={size} height={size} viewBox="0 0 16 16">
        <Circle cx={3.2} cy={8} r={1.5} fill={color} />
        <Circle cx={8} cy={8} r={1.5} fill={color} />
        <Circle cx={12.8} cy={8} r={1.5} fill={color} />
    </Svg>
);

/** Four corners and a label line — scan a tag, not a camera. */
export const FlatScan: React.FC<MarkProps> = ({ color, size = 22, strokeWidth = 2.2 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Polyline
            points="3.5,9 3.5,3.5 9,3.5"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="square"
            strokeLinejoin="miter"
        />
        <Polyline
            points="15,3.5 20.5,3.5 20.5,9"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="square"
            strokeLinejoin="miter"
        />
        <Polyline
            points="20.5,15 20.5,20.5 15,20.5"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="square"
            strokeLinejoin="miter"
        />
        <Polyline
            points="9,20.5 3.5,20.5 3.5,15"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="square"
            strokeLinejoin="miter"
        />
        <Line
            x1={7.5}
            y1={12}
            x2={16.5}
            y2={12}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="square"
        />
    </Svg>
);

/** Straight shaft with an open arrowhead, each barb 45° off the line. */
function LineArrow({
    x1,
    y1,
    x2,
    y2,
    color,
    strokeWidth,
}: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    strokeWidth: number;
}) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const barb = 3.15;
    const cos = Math.cos(Math.PI / 4);
    const sin = Math.sin(Math.PI / 4);
    const backX = -ux;
    const backY = -uy;
    const leftX = x2 + (backX * cos - backY * sin) * barb;
    const leftY = y2 + (backX * sin + backY * cos) * barb;
    const rightX = x2 + (backX * cos + backY * sin) * barb;
    const rightY = y2 + (-backX * sin + backY * cos) * barb;
    const stroke = {
        stroke: color,
        strokeWidth,
        strokeLinecap: 'round' as const,
    };

    return (
        <>
            <Line x1={x1} y1={y1} x2={x2} y2={y2} {...stroke} />
            <Line x1={x2} y1={y2} x2={leftX} y2={leftY} {...stroke} />
            <Line x1={x2} y1={y2} x2={rightX} y2={rightY} {...stroke} />
        </>
    );
}

/** Four diagonal line arrows aimed at the middle, with a wide gap — minimize. */
export const FlatArrowsIn: React.FC<MarkProps> = ({ color, size = 22, strokeWidth = 2.15 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <LineArrow x1={2.4} y1={2.4} x2={8.6} y2={8.6} color={color} strokeWidth={strokeWidth} />
        <LineArrow x1={21.6} y1={2.4} x2={15.4} y2={8.6} color={color} strokeWidth={strokeWidth} />
        <LineArrow x1={2.4} y1={21.6} x2={8.6} y2={15.4} color={color} strokeWidth={strokeWidth} />
        <LineArrow x1={21.6} y1={21.6} x2={15.4} y2={15.4} color={color} strokeWidth={strokeWidth} />
    </Svg>
);

/** Four diagonal line arrows aimed at the corners, with the same gap — maximize. */
export const FlatArrowsOut: React.FC<MarkProps> = ({ color, size = 22, strokeWidth = 2.15 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <LineArrow x1={8.6} y1={8.6} x2={2.4} y2={2.4} color={color} strokeWidth={strokeWidth} />
        <LineArrow x1={15.4} y1={8.6} x2={21.6} y2={2.4} color={color} strokeWidth={strokeWidth} />
        <LineArrow x1={8.6} y1={15.4} x2={2.4} y2={21.6} color={color} strokeWidth={strokeWidth} />
        <LineArrow x1={15.4} y1={15.4} x2={21.6} y2={21.6} color={color} strokeWidth={strokeWidth} />
    </Svg>
);

/** Two thick sliders — adjust amounts, same weight as plus/tick. */
export const FlatTune: React.FC<MarkProps> = ({ color, size = 16, strokeWidth = 2.2 }) => (
    <Svg width={size} height={size} viewBox="0 0 16 16">
        <Line x1={2} y1={5} x2={14} y2={5} stroke={color} strokeWidth={strokeWidth} strokeLinecap="square" />
        <Rect x={9} y={3} width={4} height={4} fill={color} />
        <Line x1={2} y1={11} x2={14} y2={11} stroke={color} strokeWidth={strokeWidth} strokeLinecap="square" />
        <Rect x={3} y={9} width={4} height={4} fill={color} />
    </Svg>
);
