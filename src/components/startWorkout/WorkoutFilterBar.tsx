import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import { MUSCLE_GROUP_LABELS, MuscleGroup } from '../../workout/muscleGroups';
import { StartWorkoutFilters } from '../../workout/startWorkoutTypes';

interface WorkoutFilterBarProps {
    filters: StartWorkoutFilters;
    onChange: (next: StartWorkoutFilters) => void;
}

export const WorkoutFilterBar: React.FC<WorkoutFilterBarProps> = ({ filters, onChange }) => {
    const [searchOpen, setSearchOpen] = useState(false);

    const toggleUserRoutines = () => {
        onChange({ ...filters, showUserRoutines: !filters.showUserRoutines });
    };

    const togglePresets = () => {
        onChange({ ...filters, showPresets: !filters.showPresets });
    };

    const clearMuscle = () => {
        onChange({ ...filters, muscleGroup: null });
    };

    return (
        <View style={styles.container}>
            <View style={styles.chipRow}>
                {filters.muscleGroup ? (
                    <TouchableOpacity
                        style={styles.chipFilled}
                        onPress={clearMuscle}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${MUSCLE_GROUP_LABELS[filters.muscleGroup]} filter`}
                    >
                        <Text style={styles.chipFilledText}>
                            {MUSCLE_GROUP_LABELS[filters.muscleGroup]}
                        </Text>
                        <Ionicons name="close" size={14} color={WORKOUT_COLORS.background} />
                    </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                    style={[styles.chipOutline, filters.showUserRoutines && styles.chipOutlineActive]}
                    onPress={toggleUserRoutines}
                    accessibilityRole="button"
                    accessibilityState={{ selected: filters.showUserRoutines }}
                >
                    <Text
                        style={[
                            styles.chipOutlineText,
                            filters.showUserRoutines && styles.chipOutlineTextActive,
                        ]}
                    >
                        yours
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.chipOutline, filters.showPresets && styles.chipOutlineActive]}
                    onPress={togglePresets}
                    accessibilityRole="button"
                    accessibilityState={{ selected: filters.showPresets }}
                >
                    <Text
                        style={[
                            styles.chipOutlineText,
                            filters.showPresets && styles.chipOutlineTextActive,
                        ]}
                    >
                        presets
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.searchButton}
                    onPress={() => setSearchOpen((value) => !value)}
                    accessibilityRole="button"
                    accessibilityLabel={searchOpen ? 'Close search' : 'Search routines'}
                >
                    <Ionicons
                        name={searchOpen ? 'close' : 'search'}
                        size={18}
                        color={WORKOUT_COLORS.text}
                    />
                </TouchableOpacity>
            </View>

            {searchOpen ? (
                <TextInput
                    value={filters.searchQuery}
                    onChangeText={(searchQuery) => onChange({ ...filters, searchQuery })}
                    placeholder="search routines"
                    placeholderTextColor={WORKOUT_COLORS.placeholder}
                    style={styles.searchInput}
                    autoFocus
                    accessibilityLabel="Search routines by name"
                />
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    chipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    chipFilled: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: WORKOUT_COLORS.accent,
    },
    chipFilledText: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: WORKOUT_COLORS.background,
        textTransform: 'lowercase',
    },
    chipOutline: {
        borderWidth: 2,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: WORKOUT_COLORS.background,
    },
    chipOutlineActive: {
        borderColor: WORKOUT_COLORS.accent,
    },
    chipOutlineText: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    chipOutlineTextActive: {
        fontFamily: fonts.bold,
        color: WORKOUT_COLORS.accent,
    },
    searchButton: {
        width: 34,
        height: 34,
        borderWidth: 2,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 'auto',
    },
    searchInput: {
        marginTop: 10,
        borderWidth: 2,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontFamily: fonts.regular,
        fontSize: 15,
        color: WORKOUT_COLORS.text,
        backgroundColor: WORKOUT_COLORS.background,
    },
});
