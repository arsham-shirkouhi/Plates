import React, { useRef, useState } from 'react';
import { View, StyleSheet, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { BodyPartChip } from './BodyPartChip';
import { MealType, MEAL_CHIP_FILL, MEAL_CHIP_WASH, MEAL_TAG_ICONS } from '../../food/types';

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

interface MealTypeChipsProps {
    selected: MealType | null;
    onSelect: (meal: MealType) => void;
    style?: StyleProp<ViewStyle>;
}

/**
 * Row of breakfast/lunch/dinner/snacks chips. Measures each chip's natural
 * width and applies the widest ("breakfast") to all of them, so every chip
 * shares a single uniform width on one line.
 */
export const MealTypeChips: React.FC<MealTypeChipsProps> = ({ selected, onSelect, style }) => {
    const [uniformWidth, setUniformWidth] = useState<number | undefined>(undefined);
    const widthsRef = useRef<Partial<Record<MealType, number>>>({});

    const handleLayout = (meal: MealType) => (event: LayoutChangeEvent) => {
        if (uniformWidth != null) return;
        widthsRef.current[meal] = event.nativeEvent.layout.width;
        if (MEALS.every((m) => widthsRef.current[m] != null)) {
            const max = Math.max(...MEALS.map((m) => widthsRef.current[m] as number));
            setUniformWidth(Math.ceil(max));
        }
    };

    return (
        <View style={[styles.row, style]}>
            {MEALS.map((meal) => (
                <BodyPartChip
                    key={meal}
                    label={meal === 'snack' ? 'snacks' : meal}
                    ionicon={MEAL_TAG_ICONS[meal]}
                    fill={MEAL_CHIP_FILL}
                    wash={MEAL_CHIP_WASH}
                    isActive={selected === meal}
                    dimWhenInactive
                    widthOverride={uniformWidth}
                    onLayout={handleLayout(meal)}
                    onPress={() => onSelect(meal)}
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        alignItems: 'center',
        gap: 6,
    },
});
