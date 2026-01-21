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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';
import { LinearGradient } from 'expo-linear-gradient';

type BrowseWorkoutsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BrowseWorkouts'>;

interface Workout {
    id: string;
    name: string;
    exerciseCount: number;
    duration: string;
    type: 'preset' | 'community';
    author?: string; // For community workouts
    likes?: number; // For community workouts
}

export const BrowseWorkoutsScreen: React.FC = () => {
    const navigation = useNavigation<BrowseWorkoutsScreenNavigationProp>();
    const insets = useSafeAreaInsets();

    // Mock presets - in real app, this would come from database
    const presets: Workout[] = [
        { id: 'p1', name: 'beginner full body', exerciseCount: 6, duration: '45m', type: 'preset' },
        { id: 'p2', name: 'upper/lower split', exerciseCount: 8, duration: '60m', type: 'preset' },
        { id: 'p3', name: 'push/pull/legs', exerciseCount: 9, duration: '75m', type: 'preset' },
        { id: 'p4', name: '5/3/1 strength', exerciseCount: 4, duration: '90m', type: 'preset' },
        { id: 'p5', name: 'hiit cardio', exerciseCount: 10, duration: '30m', type: 'preset' },
    ];

    // Mock community workouts - in real app, this would come from database
    const communityWorkouts: Workout[] = [
        { id: 'c1', name: 'powerlifting basics', exerciseCount: 5, duration: '90m', type: 'community', author: 'johndoe', likes: 234 },
        { id: 'c2', name: 'bodyweight mastery', exerciseCount: 8, duration: '40m', type: 'community', author: 'fitlife', likes: 189 },
        { id: 'c3', name: 'hypertrophy focus', exerciseCount: 7, duration: '70m', type: 'community', author: 'gains', likes: 156 },
        { id: 'c4', name: 'mobility & strength', exerciseCount: 6, duration: '50m', type: 'community', author: 'flexy', likes: 98 },
    ];

    const handleWorkoutPress = (workout: Workout) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Navigate to StartWorkout screen with the selected workout
        // In a real app, this would pass the workout data and start it directly
        navigation.navigate('StartWorkout', { selectedWorkoutId: workout.id });
    };

    const renderWorkoutCard = (workout: Workout) => (
        <TouchableOpacity
            key={workout.id}
            style={styles.workoutCard}
            onPress={() => handleWorkoutPress(workout)}
            activeOpacity={0.7}
        >
            <View style={styles.workoutCardHeader}>
                <View style={styles.workoutCardContent}>
                    <Text style={styles.workoutCardName}>{workout.name}</Text>
                    <View style={styles.workoutCardStats}>
                        <Text style={styles.workoutCardStatText}>
                            {workout.exerciseCount} {workout.exerciseCount === 1 ? 'exercise' : 'exercises'}
                        </Text>
                        <Text style={styles.workoutCardStatSeparator}>•</Text>
                        <Text style={styles.workoutCardStatText}>{workout.duration}</Text>
                        {workout.type === 'community' && workout.likes !== undefined && (
                            <>
                                <Text style={styles.workoutCardStatSeparator}>•</Text>
                                <View style={styles.likesContainer}>
                                    <Ionicons name="heart" size={14} color="#9E9E9E" />
                                    <Text style={styles.workoutCardStatText}>{workout.likes}</Text>
                                </View>
                            </>
                        )}
                    </View>
                    {workout.type === 'community' && workout.author && (
                        <Text style={styles.workoutCardAuthor}>by {workout.author}</Text>
                    )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#252525" />
            </View>
        </TouchableOpacity>
    );

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
                                <Text style={styles.headerTitle}>browse workouts</Text>
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
                            {/* Presets Section */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>presets</Text>
                                <View style={styles.workoutsGrid}>
                                    {presets.map(workout => renderWorkoutCard(workout))}
                                </View>
                            </View>

                            {/* Divider */}
                            <View style={styles.sectionDivider} />

                            {/* Community Workouts Section */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>community</Text>
                                <View style={styles.workoutsGrid}>
                                    {communityWorkouts.map(workout => renderWorkoutCard(workout))}
                                </View>
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
        paddingTop: 16,
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
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 12,
    },
    sectionDivider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        width: '100%',
        marginLeft: -25,
        marginRight: -25,
        marginBottom: 24,
    },
    workoutsGrid: {
        gap: 12,
    },
    workoutCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2.5,
        borderColor: '#252525',
        paddingVertical: 20,
        paddingHorizontal: 20,
        width: '100%',
    },
    workoutCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flex: 1,
    },
    workoutCardContent: {
        flex: 1,
        marginRight: 12,
    },
    workoutCardName: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 8,
    },
    workoutCardStats: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 4,
    },
    workoutCardStatText: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
    workoutCardStatSeparator: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
    },
    workoutCardAuthor: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginTop: 4,
    },
    likesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
});

