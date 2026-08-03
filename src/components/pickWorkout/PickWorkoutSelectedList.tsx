import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Easing,
    LayoutChangeEvent,
} from 'react-native';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import { MUSCLE_GROUP_LABELS, MuscleGroup } from '../../workout/muscleGroups';

const SELECTION_PANEL_WIDTH = 104;

interface AnimatedMuscleRowProps {
    muscle: MuscleGroup;
    showBorder: boolean;
    isExiting: boolean;
    onRemove: (muscle: MuscleGroup) => void;
    onExited: (muscle: MuscleGroup) => void;
}

const AnimatedMuscleRow: React.FC<AnimatedMuscleRowProps> = ({
    muscle,
    showBorder,
    isExiting,
    onRemove,
    onExited,
}) => {
    // Single non-native value drives height + opacity + slide together so row
    // animation stays local and never triggers a global LayoutAnimation.
    const progress = useRef(new Animated.Value(0)).current;
    const [measuredHeight, setMeasuredHeight] = useState(0);

    useEffect(() => {
        if (measuredHeight <= 0 || isExiting) return;
        Animated.timing(progress, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [measuredHeight, isExiting, progress]);

    useEffect(() => {
        if (!isExiting) return;
        Animated.timing(progress, {
            toValue: 0,
            duration: 220,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (finished) onExited(muscle);
        });
    }, [isExiting, progress, muscle, onExited]);

    const handleMeasure = (event: LayoutChangeEvent) => {
        const height = event.nativeEvent.layout.height;
        if (height > 0 && measuredHeight === 0) {
            setMeasuredHeight(height);
        }
    };

    const translateX = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [18, 0],
    });

    const animatedHeight =
        measuredHeight > 0
            ? progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, measuredHeight],
              })
            : undefined;

    return (
        <Animated.View
            style={{
                opacity: progress,
                height: animatedHeight,
                overflow: 'hidden',
            }}
        >
            <Animated.View
                onLayout={handleMeasure}
                style={{ transform: [{ translateX }] }}
            >
                <TouchableOpacity
                    style={[styles.row, showBorder && styles.rowBorder]}
                    onPress={() => onRemove(muscle)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${MUSCLE_GROUP_LABELS[muscle]}`}
                    activeOpacity={0.6}
                    disabled={isExiting}
                >
                    <Text style={styles.muscleName}>{MUSCLE_GROUP_LABELS[muscle]}</Text>
                </TouchableOpacity>
            </Animated.View>
        </Animated.View>
    );
};

interface PickWorkoutSelectedListProps {
    selectedMuscles: MuscleGroup[];
    onRemoveMuscle: (muscle: MuscleGroup) => void;
}

export const PickWorkoutSelectedList: React.FC<PickWorkoutSelectedListProps> = ({
    selectedMuscles,
    onRemoveMuscle,
}) => {
    // Keeps removed muscles mounted so they can play their exit animation.
    const [renderList, setRenderList] = useState<MuscleGroup[]>(selectedMuscles);

    useEffect(() => {
        const additions = selectedMuscles.filter(
            (muscle) => !renderList.includes(muscle)
        );
        if (additions.length === 0) return;

        setRenderList((current) => [
            ...current,
            ...additions.filter((muscle) => !current.includes(muscle)),
        ]);
    }, [selectedMuscles, renderList]);

    const handleExited = (muscle: MuscleGroup) => {
        setRenderList((current) => current.filter((item) => item !== muscle));
    };

    return (
        <View style={styles.panel}>
            <Text style={styles.heading}>selected</Text>

            <View style={styles.list}>
                {renderList.map((muscle, index) => (
                    <AnimatedMuscleRow
                        key={muscle}
                        muscle={muscle}
                        showBorder={index < renderList.length - 1}
                        isExiting={!selectedMuscles.includes(muscle)}
                        onRemove={onRemoveMuscle}
                        onExited={handleExited}
                    />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    panel: {
        width: SELECTION_PANEL_WIDTH,
        justifyContent: 'center',
        paddingLeft: 12,
    },
    heading: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
        letterSpacing: 0.5,
        marginBottom: 16,
    },
    list: {
        backgroundColor: 'transparent',
    },
    row: {
        justifyContent: 'center',
        minHeight: 44,
        paddingVertical: 8,
    },
    rowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: WORKOUT_COLORS.divider,
    },
    muscleName: {
        fontFamily: fonts.regular,
        fontSize: 16,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
});
