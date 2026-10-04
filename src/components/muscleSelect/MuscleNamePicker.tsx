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
import { getBodyPartStamp } from '../icons/PlatesIcon';
import { FlatTick } from '../activeWorkout/FlatMark';
import { HardListCard, HardStamp } from '../ui/HardListCard';

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
                            const stamp = getBodyPartStamp(muscle);
                            return (
                                <HardListCard
                                    key={muscle}
                                    title={MUSCLE_GROUP_LABELS[muscle]}
                                    meta={formatDaysSinceLabel(recency[muscle])}
                                    stamp={<HardStamp icon={stamp.icon} fill={stamp.fill} />}
                                    highlighted={selected}
                                    trailing={
                                        <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                                            {selected ? <FlatTick size={12} color="#FFFFFF" /> : null}
                                        </View>
                                    }
                                    onPress={() => onToggleMuscle(muscle)}
                                    accessibilityRole="checkbox"
                                    accessibilityState={{ checked: selected }}
                                />
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
        maxHeight: 360,
    },
    checkbox: {
        width: 28,
        height: 28,
        borderWidth: 2.5,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: WORKOUT_COLORS.background,
    },
    checkboxChecked: {
        backgroundColor: WORKOUT_COLORS.accent,
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
