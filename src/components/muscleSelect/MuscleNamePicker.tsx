import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Pressable,
} from 'react-native';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import { useRegisterOverlay } from '../../contexts/OverlayContext';
import {
    MUSCLE_GROUP_LABELS,
    MUSCLE_GROUPS,
    MuscleGroup,
    MuscleRecencyMap,
    formatDaysSinceLabel,
} from '../../workout/muscleGroups';

interface MuscleNamePickerProps {
    visible: boolean;
    onClose: () => void;
    selectedMuscles: MuscleGroup[];
    recency: MuscleRecencyMap;
    onToggleMuscle: (muscle: MuscleGroup) => void;
}

export const MuscleNamePicker: React.FC<MuscleNamePickerProps> = ({
    visible,
    onClose,
    selectedMuscles,
    recency,
    onToggleMuscle,
}) => {
    useRegisterOverlay('MuscleNamePicker', visible);
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.root}>
                <Pressable style={styles.backdrop} onPress={onClose} />
                <View style={styles.sheet}>
                    <Text style={styles.title}>select muscles by name</Text>
                    <ScrollView style={styles.list}>
                        {MUSCLE_GROUPS.map((muscle) => {
                            const selected = selectedMuscles.includes(muscle);
                            return (
                                <TouchableOpacity
                                    key={muscle}
                                    style={styles.row}
                                    onPress={() => onToggleMuscle(muscle)}
                                    accessibilityRole="checkbox"
                                    accessibilityState={{ checked: selected }}
                                >
                                    <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                                        {selected ? <Text style={styles.checkmark}>x</Text> : null}
                                    </View>
                                    <View style={styles.rowCopy}>
                                        <Text style={styles.rowTitle}>{MUSCLE_GROUP_LABELS[muscle]}</Text>
                                        <Text style={styles.rowMeta}>
                                            {formatDaysSinceLabel(recency[muscle])}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                    <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                        <Text style={styles.doneText}>done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

interface MuscleNamePickerTriggerProps {
    onPress: () => void;
}

export const MuscleNamePickerTrigger: React.FC<MuscleNamePickerTriggerProps> = ({ onPress }) => {
    return (
        <TouchableOpacity
            style={styles.hiddenTrigger}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel="Select muscles by name"
            accessibilityHint="Opens a checklist of muscle groups"
        >
            <Text style={styles.hiddenTriggerText}>select muscles by name</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFill,
        backgroundColor: WORKOUT_COLORS.backdrop,
    },
    sheet: {
        backgroundColor: WORKOUT_COLORS.background,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderWidth: 2.5,
        borderColor: WORKOUT_COLORS.border,
        borderBottomWidth: 0,
        padding: 20,
        maxHeight: '70%',
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
        marginBottom: 12,
    },
    list: {
        maxHeight: 320,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E0E0E0',
        gap: 12,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderWidth: 2,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: WORKOUT_COLORS.accent,
        borderColor: WORKOUT_COLORS.accent,
    },
    checkmark: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: WORKOUT_COLORS.background,
    },
    rowCopy: {
        flex: 1,
    },
    rowTitle: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    rowMeta: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: WORKOUT_COLORS.placeholder,
        textTransform: 'lowercase',
        marginTop: 2,
    },
    doneButton: {
        marginTop: 14,
        alignSelf: 'center',
    },
    doneText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: WORKOUT_COLORS.accent,
        textTransform: 'lowercase',
    },
    hiddenTrigger: {
        position: 'absolute',
        top: -9999,
        left: 0,
        width: 1,
        height: 1,
        opacity: 0,
    },
    hiddenTriggerText: {
        fontSize: 1,
        color: WORKOUT_COLORS.background,
    },
});
