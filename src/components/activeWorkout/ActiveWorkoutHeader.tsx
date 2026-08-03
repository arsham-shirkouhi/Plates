import React from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    type GestureResponderHandlers,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../Button';
import { WORKOUT_COLORS } from '../../workout/constants';

interface ActiveWorkoutHeaderProps {
    onCollapse: () => void;
    onFinish: () => void;
    collapsePanHandlers?: GestureResponderHandlers;
}

export const ActiveWorkoutHeader: React.FC<ActiveWorkoutHeaderProps> = ({
    onCollapse,
    onFinish,
    collapsePanHandlers,
}) => {
    return (
        <View style={styles.container} {...collapsePanHandlers}>
            <View style={styles.topRow}>
                <TouchableOpacity
                    onPress={onCollapse}
                    style={styles.iconButton}
                    accessibilityLabel="Minimize workout"
                >
                    <Ionicons name="chevron-down" size={24} color={WORKOUT_COLORS.text} />
                </TouchableOpacity>
                <View style={styles.spacer} />
                <Button
                    title="finish"
                    onPress={onFinish}
                    containerStyle={styles.finishButtonWrap}
                    buttonBodyStyle={styles.finishButtonBody}
                    textStyle={styles.finishButtonText}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
        backgroundColor: WORKOUT_COLORS.background,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    spacer: {
        flex: 1,
    },
    finishButtonWrap: {
        width: 88,
    },
    finishButtonBody: {
        minHeight: 36,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    finishButtonText: {
        fontSize: 14,
    },
});
