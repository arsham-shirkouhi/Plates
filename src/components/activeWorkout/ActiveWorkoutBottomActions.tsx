import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from '../Button';
import { WORKOUT_COLORS } from '../../workout/constants';

interface ActiveWorkoutBottomActionsProps {
    onAddExercises: () => void;
}

export const ActiveWorkoutBottomActions: React.FC<ActiveWorkoutBottomActionsProps> = ({
    onAddExercises,
}) => {
    return (
        <View style={styles.container}>
            <Button title="add exercise" onPress={onAddExercises} containerStyle={styles.primaryButton} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: '#ECECEC',
        backgroundColor: WORKOUT_COLORS.background,
    },
    primaryButton: {
        width: '100%',
    },
});
