import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    type GestureResponderHandlers,
} from 'react-native';
import { Button } from '../Button';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import { PlatesIcon } from '../icons/PlatesIcon';
import { Icon } from '../icons/Icon';

interface ActiveWorkoutHeaderProps {
    title?: string;
    onCollapse: () => void;
    onFinish: () => void;
    onScanEquipment?: () => void;
    collapsePanHandlers?: GestureResponderHandlers;
}

export const ActiveWorkoutHeader: React.FC<ActiveWorkoutHeaderProps> = ({
    title = 'workout',
    onCollapse,
    onFinish,
    onScanEquipment,
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
                    <PlatesIcon name="chevronDown" size={24} color={WORKOUT_COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.title} numberOfLines={1}>
                    {title.toLowerCase()}
                </Text>
                {onScanEquipment && (
                    <TouchableOpacity
                        onPress={onScanEquipment}
                        style={styles.scanButton}
                        accessibilityLabel="Scan gym equipment"
                        accessibilityHint="Opens the camera to identify a machine or instruction label"
                    >
                        <Icon name="camera-outline" size={23} color={WORKOUT_COLORS.text} />
                    </TouchableOpacity>
                )}
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
        paddingHorizontal: 12,
        paddingTop: 6,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
        backgroundColor: WORKOUT_COLORS.background,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    iconButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        flex: 1,
        minWidth: 0,
        fontFamily: fonts.bold,
        fontSize: 18,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    finishButtonWrap: {
        width: 84,
    },
    scanButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 2,
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
