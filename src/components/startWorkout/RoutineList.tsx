import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import { MUSCLE_GROUP_LABELS, MuscleGroup } from '../../workout/muscleGroups';
import { StartWorkoutRoutine } from '../../workout/startWorkoutTypes';
import { RoutineListRow } from './RoutineListRow';
import { Button } from '../Button';

interface RoutineListProps {
    routines: StartWorkoutRoutine[];
    activeMuscle: MuscleGroup | null;
    onStartRoutine: (routine: StartWorkoutRoutine) => void;
    onPreviewRoutine: (routine: StartWorkoutRoutine) => void;
    onDuplicateRoutine: (routine: StartWorkoutRoutine) => void;
    onDeleteRoutine: (routine: StartWorkoutRoutine) => void;
    onCreateForMuscle?: (muscle: MuscleGroup) => void;
}

export const RoutineList: React.FC<RoutineListProps> = ({
    routines,
    activeMuscle,
    onStartRoutine,
    onPreviewRoutine,
    onDuplicateRoutine,
    onDeleteRoutine,
    onCreateForMuscle,
}) => {
    if (routines.length === 0) {
        const label = activeMuscle
            ? `no routines for ${MUSCLE_GROUP_LABELS[activeMuscle]} yet`
            : 'no routines match these filters';

        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>{label}</Text>
                {activeMuscle && onCreateForMuscle ? (
                    <Button
                        variant="secondary"
                        title={`create ${MUSCLE_GROUP_LABELS[activeMuscle]} routine`}
                        onPress={() => onCreateForMuscle(activeMuscle)}
                        containerStyle={styles.emptyButton}
                        buttonBodyStyle={styles.emptyButtonBody}
                    />
                ) : null}
            </View>
        );
    }

    return (
        <View style={styles.list}>
            {routines.map((routine, index) => (
                <RoutineListRow
                    key={`${routine.source}-${routine.id}`}
                    routine={routine}
                    isLast={index === routines.length - 1}
                    onPress={() => onStartRoutine(routine)}
                    onPreview={() => onPreviewRoutine(routine)}
                    onEdit={() => onPreviewRoutine(routine)}
                    onDuplicate={() => onDuplicateRoutine(routine)}
                    onDelete={() => onDeleteRoutine(routine)}
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    list: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#E0E0E0',
    },
    empty: {
        paddingVertical: 20,
        alignItems: 'flex-start',
        gap: 12,
    },
    emptyText: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
    },
    emptyButton: {
        width: '100%',
    },
    emptyButtonBody: {
        width: '100%',
    },
});
