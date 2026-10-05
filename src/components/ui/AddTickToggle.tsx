import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Reanimated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { Icon } from '../icons/Icon';
import { WORKOUT_COLORS } from '../../workout/constants';

export const AddTickToggle: React.FC<{ added: boolean }> = ({ added }) => {
    const progress = useSharedValue(added ? 1 : 0);

    useEffect(() => {
        progress.value = withTiming(added ? 1 : 0, {
            duration: 220,
            easing: Easing.bezier(0.2, 0.8, 0.24, 1),
        });
    }, [added, progress]);

    const plusStyle = useAnimatedStyle(() => ({
        opacity: 1 - progress.value,
        transform: [
            { rotate: `${progress.value * 90}deg` },
            { scale: 1 - progress.value * 0.28 },
        ],
    }));

    const tickStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [
            { rotate: `${-36 + progress.value * 36}deg` },
            { scale: 0.62 + progress.value * 0.38 },
        ],
    }));

    return (
        <View style={styles.hit}>
            <Reanimated.View style={[styles.layer, plusStyle]}>
                <Icon name="add" size={28} color="#ADADAD" />
            </Reanimated.View>
            <Reanimated.View style={[styles.layer, tickStyle]}>
                <Icon name="checkmark" size={28} color={WORKOUT_COLORS.accent} />
            </Reanimated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    hit: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    layer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
