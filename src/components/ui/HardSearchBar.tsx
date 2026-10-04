import React from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    type TextInputProps,
    type ViewStyle,
    type StyleProp,
} from 'react-native';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import { PlatesIcon } from '../icons/PlatesIcon';

export const HARD_SHADOW = 4;

interface HardSearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
    inputRef?: React.Ref<TextInput>;
    returnKeyType?: TextInputProps['returnKeyType'];
    onSubmitEditing?: TextInputProps['onSubmitEditing'];
    autoCorrect?: boolean;
    autoCapitalize?: TextInputProps['autoCapitalize'];
    containerStyle?: StyleProp<ViewStyle>;
    accessibilityLabel?: string;
}

export const HardSearchBar: React.FC<HardSearchBarProps> = ({
    value,
    onChangeText,
    placeholder = 'search',
    autoFocus,
    inputRef,
    returnKeyType = 'search',
    onSubmitEditing,
    autoCorrect = false,
    autoCapitalize = 'none',
    containerStyle,
    accessibilityLabel,
}) => {
    return (
        <View style={[styles.wrap, containerStyle]}>
            <View style={styles.shadow} />
            <View style={styles.field}>
                <PlatesIcon name="search" size={18} color={WORKOUT_COLORS.text} />
                <TextInput
                    ref={inputRef}
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={WORKOUT_COLORS.placeholder}
                    autoCapitalize={autoCapitalize}
                    autoCorrect={autoCorrect}
                    autoFocus={autoFocus}
                    returnKeyType={returnKeyType}
                    onSubmitEditing={onSubmitEditing}
                    autoComplete="off"
                    spellCheck={false}
                    accessibilityLabel={accessibilityLabel ?? placeholder}
                />
                {value.length > 0 ? (
                    <TouchableOpacity
                        onPress={() => onChangeText('')}
                        style={styles.clear}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Clear search"
                    >
                        <PlatesIcon name="close" size={16} color={WORKOUT_COLORS.text} />
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: {
        paddingBottom: HARD_SHADOW,
    },
    shadow: {
        ...StyleSheet.absoluteFill,
        top: HARD_SHADOW,
        borderRadius: 12,
        backgroundColor: WORKOUT_COLORS.border,
    },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: WORKOUT_COLORS.background,
        borderRadius: 12,
        borderWidth: 2.5,
        borderColor: WORKOUT_COLORS.border,
        gap: 10,
    },
    input: {
        flex: 1,
        fontSize: 18,
        fontFamily: fonts.regular,
        color: WORKOUT_COLORS.text,
        padding: 0,
    },
    clear: {
        padding: 4,
    },
});
