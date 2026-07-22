import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/fonts';
import { Button } from '../Button';
import { WORKOUT_COLORS } from '../../workout/constants';

interface ActiveWorkoutHeaderProps {
    title: string;
    onTitleChange: (title: string) => void;
    onCollapse: () => void;
    onFinish: () => void;
}

export const ActiveWorkoutHeader: React.FC<ActiveWorkoutHeaderProps> = ({
    title,
    onTitleChange,
    onCollapse,
    onFinish,
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.topRow}>
                <TouchableOpacity
                    onPress={onCollapse}
                    style={styles.iconButton}
                    accessibilityLabel="Minimize workout"
                >
                    <Ionicons name="chevron-down" size={24} color={WORKOUT_COLORS.text} />
                </TouchableOpacity>
                <TextInput
                    value={title}
                    onChangeText={onTitleChange}
                    style={styles.titleInput}
                    placeholder="workout title"
                    placeholderTextColor={WORKOUT_COLORS.placeholder}
                    numberOfLines={1}
                />
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
    titleInput: {
        flex: 1,
        fontFamily: fonts.bold,
        fontSize: 18,
        color: WORKOUT_COLORS.text,
        paddingVertical: 6,
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
