import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { Path } from 'react-native-svg';
import { WORKOUT_COLORS } from '../../workout/constants';
import { MUSCLE_NEUTRAL_FILL, MUSCLE_SELECTED_FILL } from '../../workout/muscleGroups';

/** Visible but not heavy — sits between the old 3px black and faint 1.25px red */
const SELECT_STROKE_WIDTH = 1.75;
const SELECT_STROKE_OPACITY = 0.55;

interface MuscleMapPathProps {
    d: string;
    isSelected: boolean;
    onPress: () => void;
    accessibilityLabel: string;
}

export const MuscleMapPath: React.FC<MuscleMapPathProps> = ({
    d,
    isSelected,
    onPress,
    accessibilityLabel,
}) => {
    const highlightOpacity = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
    const [renderOpacity, setRenderOpacity] = useState(isSelected ? 1 : 0);

    useEffect(() => {
        const listenerId = highlightOpacity.addListener(({ value }) => {
            if (Number.isFinite(value)) {
                setRenderOpacity(Math.max(0, Math.min(1, value)));
            }
        });

        return () => {
            highlightOpacity.removeListener(listenerId);
        };
    }, [highlightOpacity]);

    useEffect(() => {
        if (isSelected) {
            highlightOpacity.setValue(0.55);
            Animated.spring(highlightOpacity, {
                toValue: 1,
                friction: 8,
                tension: 140,
                useNativeDriver: false,
            }).start();
            return;
        }

        Animated.timing(highlightOpacity, {
            toValue: 0,
            duration: 160,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [isSelected, highlightOpacity]);

    if (renderOpacity <= 0.01) {
        return (
            <Path
                d={d}
                fill={MUSCLE_NEUTRAL_FILL}
                stroke="none"
                onPress={onPress}
                accessibilityLabel={accessibilityLabel}
            />
        );
    }

    return (
        <>
            <Path
                d={d}
                fill={MUSCLE_NEUTRAL_FILL}
                stroke="none"
                onPress={onPress}
                accessibilityLabel={accessibilityLabel}
            />
            <Path
                d={d}
                fill={MUSCLE_SELECTED_FILL}
                stroke={WORKOUT_COLORS.text}
                strokeWidth={SELECT_STROKE_WIDTH}
                strokeOpacity={SELECT_STROKE_OPACITY}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={renderOpacity}
                pointerEvents="none"
            />
        </>
    );
};
