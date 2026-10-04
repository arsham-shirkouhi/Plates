import React from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { StartWorkoutRoutine } from '../../workout/startWorkoutTypes';
import { formatRoutineSubtitle } from '../../workout/startWorkoutSelectors';
import { HardListCard, HardStamp } from '../ui/HardListCard';
import { PlatesIcon } from '../icons/PlatesIcon';
import { WORKOUT_COLORS } from '../../workout/constants';

interface RoutineListRowProps {
    routine: StartWorkoutRoutine;
    onPress: () => void;
    onPreview?: () => void;
    onEdit?: () => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
    isLast?: boolean;
}

export const RoutineListRow: React.FC<RoutineListRowProps> = ({
    routine,
    onPress,
    onPreview,
    onEdit,
    onDuplicate,
    onDelete,
}) => {
    const handleLongPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const options: { text: string; onPress?: () => void; style?: 'destructive' | 'cancel' }[] = [
            { text: 'preview', onPress: onPreview },
        ];

        if (routine.source === 'user') {
            options.push({ text: 'edit', onPress: onEdit });
            options.push({ text: 'duplicate', onPress: onDuplicate });
            options.push({ text: 'delete', onPress: onDelete, style: 'destructive' });
        } else {
            options.push({ text: 'duplicate', onPress: onDuplicate });
        }

        options.push({ text: 'cancel', style: 'cancel' });

        Alert.alert(routine.name, undefined, options);
    };

    return (
        <HardListCard
            title={routine.name}
            meta={formatRoutineSubtitle(routine)}
            stamp={<HardStamp icon="dumbbell" fill={WORKOUT_COLORS.accent} />}
            trailing={
                <PlatesIcon name="play" size={18} color={WORKOUT_COLORS.text} fill={WORKOUT_COLORS.accent} />
            }
            onPress={onPress}
            onLongPress={handleLongPress}
            accessibilityLabel={`Start ${routine.name}`}
        />
    );
};
