import React from 'react';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { WORKOUT_COLORS } from '../../workout/constants';
import { MuscleGroup, MuscleRecencyMap } from '../../workout/muscleGroups';
import { formatMuscleSelectAccessibilityLabel } from '../../workout/muscleSelectSelectors';
import {
    BACK_DEFINITION_LINES,
    BACK_MUSCLE_GROUPS,
    BACK_MUSCLE_PATHS,
    SILHOUETTE_PATHS,
} from '../startWorkout/bodyMapPaths';
import { MuscleMapPath } from './MuscleMapPath';

const DEFINITION_OPACITY = 0.4;
const DEFINITION_STROKE = 1.75;
const SILHOUETTE_STROKE = 2.5;

interface SelectableBodyMapBackProps {
    recency: MuscleRecencyMap;
    selectedMuscles: MuscleGroup[];
    onToggleMuscle: (muscle: MuscleGroup) => void;
    width: number;
    height: number;
}

export const SelectableBodyMapBack: React.FC<SelectableBodyMapBackProps> = ({
    recency,
    selectedMuscles,
    onToggleMuscle,
    width,
    height,
}) => {
    const handlePress = (muscle: MuscleGroup) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggleMuscle(muscle);
    };

    const renderMuscleFills = (muscle: MuscleGroup) => {
        const pathKeys = BACK_MUSCLE_GROUPS[muscle];
        if (pathKeys.length === 0) return [];

        const isSelected = selectedMuscles.includes(muscle);

        return pathKeys.map((key) => (
            <MuscleMapPath
                key={key}
                d={BACK_MUSCLE_PATHS[key]}
                isSelected={isSelected}
                onPress={() => handlePress(muscle)}
                accessibilityLabel={formatMuscleSelectAccessibilityLabel(
                    muscle,
                    recency[muscle],
                    isSelected
                )}
            />
        ));
    };

    return (
        <Svg width={width} height={height} viewBox="0 0 220 396">
            <Path
                d={SILHOUETTE_PATHS.body}
                fill={WORKOUT_COLORS.background}
                stroke={WORKOUT_COLORS.text}
                strokeWidth={SILHOUETTE_STROKE}
                strokeLinejoin="round"
                strokeLinecap="round"
                pointerEvents="none"
            />
            <Path
                d={SILHOUETTE_PATHS.armR}
                fill={WORKOUT_COLORS.background}
                stroke={WORKOUT_COLORS.text}
                strokeWidth={SILHOUETTE_STROKE}
                strokeLinejoin="round"
                strokeLinecap="round"
                pointerEvents="none"
            />
            <Path
                d={SILHOUETTE_PATHS.armL}
                fill={WORKOUT_COLORS.background}
                stroke={WORKOUT_COLORS.text}
                strokeWidth={SILHOUETTE_STROKE}
                strokeLinejoin="round"
                strokeLinecap="round"
                pointerEvents="none"
            />

            {(Object.keys(BACK_MUSCLE_GROUPS) as MuscleGroup[]).flatMap((muscle) =>
                renderMuscleFills(muscle)
            )}

            {BACK_DEFINITION_LINES.map((d, index) => (
                <Path
                    key={`def-${index}`}
                    d={d}
                    fill="none"
                    stroke={WORKOUT_COLORS.text}
                    strokeWidth={DEFINITION_STROKE}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={DEFINITION_OPACITY}
                    pointerEvents="none"
                />
            ))}
        </Svg>
    );
};
