import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from '../Button';
import { WORKOUT_COLORS } from '../../workout/constants';

const BUTTON_HEIGHT = 50;

interface ActiveWorkoutBottomActionsProps {
    onFinish: () => void;
}

export const ActiveWorkoutBottomActions: React.FC<ActiveWorkoutBottomActionsProps> = ({
    onFinish,
}) => {
    return (
        <View style={styles.container}>
            <Button
                title="finish workout!"
                onPress={onFinish}
                containerStyle={styles.addButton}
                buttonBodyStyle={styles.addButtonBody}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
        backgroundColor: WORKOUT_COLORS.background,
    },
    addButton: {
        width: '100%',
    },
    addButtonBody: {
        width: '100%',
        height: BUTTON_HEIGHT,
        marginTop: 0,
        marginBottom: 0,
    },
});
