import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getExerciseDetails, ExerciseDetails } from '../services/exerciseService';

type ExerciseInfoScreenRouteProp = RouteProp<RootStackParamList, 'ExerciseInfo'>;
type ExerciseInfoScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExerciseInfo'>;

export const ExerciseInfoScreen: React.FC = () => {
    const navigation = useNavigation<ExerciseInfoScreenNavigationProp>();
    const route = useRoute<ExerciseInfoScreenRouteProp>();
    const insets = useSafeAreaInsets();
    const { exerciseId } = route.params;

    const [exerciseDetails, setExerciseDetails] = useState<ExerciseDetails | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadExerciseDetails();
    }, [exerciseId]);

    const loadExerciseDetails = async () => {
        setLoading(true);
        try {
            const details = await getExerciseDetails(exerciseId);
            setExerciseDetails(details);
        } catch (error) {
            console.error('Error loading exercise details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.goBack();
    };

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBack}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={24} color="#526EFF" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>exercise info</Text>
                    </View>
                    <View style={styles.headerRight} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#526EFF" />
                    <Text style={styles.loadingText}>loading...</Text>
                </View>
            </View>
        );
    }

    if (!exerciseDetails) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBack}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={24} color="#526EFF" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>exercise info</Text>
                    </View>
                    <View style={styles.headerRight} />
                </View>
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>exercise not found</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBack}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chevron-back" size={24} color="#526EFF" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>exercise info</Text>
                </View>
                <View style={styles.headerRight} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Title */}
                <View style={styles.section}>
                    <Text style={styles.label}>title</Text>
                    <Text style={styles.value}>{exerciseDetails.Title}</Text>
                </View>

                {/* Description */}
                {exerciseDetails.Desc && (
                    <View style={styles.section}>
                        <Text style={styles.label}>description</Text>
                        <Text style={styles.value}>{exerciseDetails.Desc}</Text>
                    </View>
                )}

                {/* Type */}
                {exerciseDetails.Type && (
                    <View style={styles.section}>
                        <Text style={styles.label}>type</Text>
                        <Text style={styles.value}>{exerciseDetails.Type}</Text>
                    </View>
                )}

                {/* Body Part */}
                {exerciseDetails.BodyPart && (
                    <View style={styles.section}>
                        <Text style={styles.label}>body part</Text>
                        <Text style={styles.value}>{exerciseDetails.BodyPart}</Text>
                    </View>
                )}

                {/* Equipment */}
                {exerciseDetails.Equipment && (
                    <View style={styles.section}>
                        <Text style={styles.label}>equipment</Text>
                        <Text style={styles.value}>{exerciseDetails.Equipment}</Text>
                    </View>
                )}

                {/* Level */}
                {exerciseDetails.Level && (
                    <View style={styles.section}>
                        <Text style={styles.label}>level</Text>
                        <Text style={styles.value}>{exerciseDetails.Level}</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 2,
        borderBottomColor: '#F0F0F0',
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerRight: {
        width: 40,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontFamily: fonts.bold,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginBottom: 8,
    },
    value: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
        lineHeight: 26,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
});

