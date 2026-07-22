import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { WORKOUT_COLORS } from '../../workout/constants';
import {
    formatMuscleAccessibilityLabel,
    getMuscleFillColor,
    MuscleGroup,
    MuscleRecencyMap,
} from '../../workout/muscleGroups';
import {
    FRONT_DEFINITION_LINES,
    FRONT_MUSCLE_GROUPS,
    FRONT_MUSCLE_PATHS,
    SILHOUETTE_PATHS,
} from './bodyMapPaths';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface BodyMapFrontProps {
    recency: MuscleRecencyMap;
    selectedMuscle: MuscleGroup | null;
    onToggleMuscle: (muscle: MuscleGroup) => void;
    width?: number;
    height?: number;
}

export const BodyMapFront: React.FC<BodyMapFrontProps> = ({
    recency,
    selectedMuscle,
    onToggleMuscle,
    width = 176,
    height = 317,
}) => {
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        fadeAnim.setValue(0.7);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: false,
        }).start();
    }, [selectedMuscle, recency, fadeAnim]);

    const handlePress = (muscle: MuscleGroup) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggleMuscle(muscle);
    };

    const renderMuscleGroup = (muscle: MuscleGroup) => {
        const pathKeys = FRONT_MUSCLE_GROUPS[muscle];
        if (pathKeys.length === 0) return [];

        const fill = getMuscleFillColor(recency[muscle]);
        const isSelected = selectedMuscle === muscle;

        return [
            ...pathKeys.map((key) => (
                <AnimatedPath
                    key={key}
                    d={FRONT_MUSCLE_PATHS[key]}
                    fill={fill}
                    stroke="none"
                    opacity={fadeAnim}
                    onPress={() => handlePress(muscle)}
                    accessibilityRole="button"
                    accessibilityLabel={formatMuscleAccessibilityLabel(muscle, recency[muscle])}
                />
            )),
            ...(isSelected
                ? pathKeys.map((key) => (
                      <Path
                          key={`${key}-sel`}
                          d={FRONT_MUSCLE_PATHS[key]}
                          fill="none"
                          stroke={WORKOUT_COLORS.text}
                          strokeWidth={3.5}
                          pointerEvents="none"
                      />
                  ))
                : []),
        ];
    };

    return (
        <Svg width={width} height={height} viewBox="0 0 220 396">
            <Path
                d={SILHOUETTE_PATHS.body}
                fill={WORKOUT_COLORS.background}
                stroke={WORKOUT_COLORS.text}
                strokeWidth={3}
                strokeLinejoin="round"
            />
            <Path
                d={SILHOUETTE_PATHS.armR}
                fill={WORKOUT_COLORS.background}
                stroke={WORKOUT_COLORS.text}
                strokeWidth={3}
                strokeLinejoin="round"
            />
            <Path
                d={SILHOUETTE_PATHS.armL}
                fill={WORKOUT_COLORS.background}
                stroke={WORKOUT_COLORS.text}
                strokeWidth={3}
                strokeLinejoin="round"
            />

            {(Object.keys(FRONT_MUSCLE_GROUPS) as MuscleGroup[]).flatMap((muscle) =>
                renderMuscleGroup(muscle)
            )}

            {FRONT_DEFINITION_LINES.map((d, index) => (
                <Path
                    key={`def-${index}`}
                    d={d}
                    fill="none"
                    stroke={WORKOUT_COLORS.text}
                    strokeWidth={2}
                    strokeLinecap="round"
                    opacity={0.55}
                    pointerEvents="none"
                />
            ))}
        </Svg>
    );
};
