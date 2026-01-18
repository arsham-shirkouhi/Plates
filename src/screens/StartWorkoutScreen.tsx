import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../components/Button';

type StartWorkoutScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'StartWorkout'>;
type StartWorkoutScreenRouteProp = RouteProp<RootStackParamList, 'StartWorkout'>;

export const StartWorkoutScreen: React.FC = () => {
    const navigation = useNavigation<StartWorkoutScreenNavigationProp>();
    const route = useRoute<StartWorkoutScreenRouteProp>();
    const insets = useSafeAreaInsets();

    // Mock saved workouts - in real app, this would come from database
    const savedWorkouts: Array<{
        id: string;
        name: string;
        lastCompleted: string;
        exerciseCount: number;
        duration: string;
    }> = [
            { id: '1', name: 'Push Day', lastCompleted: '2 days ago', exerciseCount: 6, duration: '45m' },
            { id: '2', name: 'Pull Day', lastCompleted: '4 days ago', exerciseCount: 5, duration: '40m' },
            { id: '3', name: 'Leg Day', lastCompleted: '1 week ago', exerciseCount: 7, duration: '60m' },
        ];
    const hasSavedWorkouts = savedWorkouts.length > 0;

    const handleOptionPress = (type: 'pick-as-you-go' | 'previous' | 'new' | 'schedule', workoutId?: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (type === 'schedule') {
            // Schedule workout - just go back (planning flow only)
            navigation.goBack();
            return;
        }

        // For other options, navigate back to Workout screen with workout started
        // The Workout screen will handle starting the workout based on the type
        navigation.navigate('Workout', {
            startWorkoutType: type === 'previous' ? 'previous' : type,
            workoutId: workoutId
        });
    };

    return (
        <View style={styles.container}>
            <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                <View style={styles.contentInner}>
                    <View style={styles.headerContainer}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => navigation.goBack()}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="chevron-back" size={24} color="#526EFF" />
                            </TouchableOpacity>
                            <View style={styles.headerCenter}>
                                <Text style={styles.headerTitle}>start workout</Text>
                            </View>
                            <View style={styles.addButtonPlaceholder} />
                        </View>
                    </View>

                    {/* Header divider */}
                    <View style={styles.headerDivider} />

                    <View style={styles.contentInnerView}>
                        <ScrollView
                            style={styles.scrollView}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Saved Workouts Section - Individual Scrollable Cards */}
                            {hasSavedWorkouts && (
                                <View style={styles.savedWorkoutsSection}>
                                    <Text style={styles.savedWorkoutsTitle}>your workouts</Text>
                                    <View style={styles.savedWorkoutsScrollContainer}>
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={styles.savedWorkoutsScrollContent}
                                            style={styles.savedWorkoutsScroll}
                                        >
                                            {savedWorkouts.map((workout) => (
                                                <TouchableOpacity
                                                    key={workout.id}
                                                    style={styles.savedWorkoutCard}
                                                    onPress={() => handleOptionPress('previous', workout.id)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.savedWorkoutCardHeader}>
                                                        <View style={styles.savedWorkoutCardContent}>
                                                            <Text style={styles.savedWorkoutCardName}>{workout.name}</Text>
                                                            <View style={styles.savedWorkoutCardStats}>
                                                                <Text style={styles.savedWorkoutCardStatText}>
                                                                    {workout.exerciseCount} {workout.exerciseCount === 1 ? 'exercise' : 'exercises'}
                                                                </Text>
                                                                <Text style={styles.savedWorkoutCardStatSeparator}>•</Text>
                                                                <Text style={styles.savedWorkoutCardStatText}>{workout.duration}</Text>
                                                                <Text style={styles.savedWorkoutCardStatSeparator}>•</Text>
                                                                <Text style={styles.savedWorkoutCardStatText}>last completed: {workout.lastCompleted}</Text>
                                                            </View>
                                                        </View>
                                                        <Ionicons name="chevron-forward" size={20} color="#252525" />
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                        {/* Fade overlay on the right */}
                                        <LinearGradient
                                            colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 1)']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 0.5, y: 0 }}
                                            style={styles.savedWorkoutsFadeOverlay}
                                            pointerEvents="none"
                                        />
                                    </View>
                                    {/* Separator line */}
                                    <View style={styles.savedWorkoutsDivider} />
                                </View>
                            )}

                            {/* Options Section */}
                            <View style={styles.optionsContainer}>
                                {/* Option 1: Pick as you go */}
                                <Button
                                    variant="secondary"
                                    title="pick as you go"
                                    onPress={() => handleOptionPress('pick-as-you-go')}
                                    containerStyle={styles.optionButton}
                                />

                                {/* Option 2: Create new workout */}
                                <Button
                                    variant="secondary"
                                    title="create new workout"
                                    onPress={() => handleOptionPress('new')}
                                    containerStyle={styles.optionButton}
                                />

                                {/* Option 3: Schedule workout */}
                                <Button
                                    variant="secondary"
                                    title="schedule workout"
                                    onPress={() => handleOptionPress('schedule')}
                                    containerStyle={styles.optionButton}
                                />
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        backgroundColor: '#fff',
    },
    contentInner: {
        flex: 1,
    },
    contentInnerView: {
        flex: 1,
        paddingHorizontal: 25,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    headerContainer: {
        paddingHorizontal: 25,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        paddingBottom: 8,
        minHeight: 48,
        paddingLeft: 0,
        paddingRight: 0,
    },
    backButton: {
        padding: 12,
        marginLeft: -12,
        minWidth: 44,
        minHeight: 44,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerCenter: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        textAlign: 'center',
    },
    addButtonPlaceholder: {
        padding: 8,
        marginRight: -8,
        minWidth: 44,
        minHeight: 44,
    },
    headerDivider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        width: '100%',
        marginTop: 0,
    },
    savedWorkoutsSection: {
        paddingTop: 16,
        marginBottom: 16,
    },
    savedWorkoutsTitle: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 12,
    },
    savedWorkoutsScrollContainer: {
        position: 'relative',
        marginHorizontal: -25,
    },
    savedWorkoutsScroll: {
        paddingHorizontal: 25,
    },
    savedWorkoutsFadeOverlay: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 40,
        pointerEvents: 'none',
    },
    savedWorkoutsScrollContent: {
        paddingRight: 25,
        gap: 12,
    },
    savedWorkoutCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2.5,
        borderColor: '#252525',
        paddingVertical: 20,
        paddingHorizontal: 20,
        width: Dimensions.get('window').width * 0.75,
        minHeight: 120,
    },
    savedWorkoutCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flex: 1,
    },
    savedWorkoutCardContent: {
        flex: 1,
        marginRight: 12,
    },
    savedWorkoutCardName: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 8,
    },
    savedWorkoutCardStats: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
    },
    savedWorkoutCardStatText: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
    savedWorkoutCardStatSeparator: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
    },
    savedWorkoutsDivider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        width: '100%',
        marginTop: 16,
        marginLeft: -25,
        marginRight: -25,
    },
    optionsContainer: {
        gap: 12,
        paddingTop: 16,
    },
    optionButton: {
        width: '100%',
    },
});

