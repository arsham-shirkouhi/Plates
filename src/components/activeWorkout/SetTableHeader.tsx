import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';

interface SetTableHeaderProps {
    showRpe?: boolean;
}

export const SetTableHeader: React.FC<SetTableHeaderProps> = ({ showRpe = false }) => {
    return (
        <View style={styles.row}>
            <Text style={[styles.cell, styles.setCell]}>set</Text>
            <Text style={[styles.cell, styles.previousCell]}>previous</Text>
            <Text style={[styles.cell, styles.inputCell]}>kg</Text>
            <Text style={[styles.cell, styles.inputCell]}>reps</Text>
            {showRpe ? <Text style={[styles.cell, styles.rpeCell]}>rpe</Text> : null}
            <Text style={[styles.cell, styles.checkCell]}>✓</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
    cell: {
        fontFamily: fonts.bold,
        fontSize: 11,
        color: WORKOUT_COLORS.muted,
        textTransform: 'uppercase',
    },
    setCell: { width: 34 },
    previousCell: { flex: 1.2 },
    inputCell: { width: 52, textAlign: 'center' },
    rpeCell: { width: 40, textAlign: 'center' },
    checkCell: { width: 28, textAlign: 'center' },
});
