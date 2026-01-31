import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Easing,
    ScrollView,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';
import { getExerciseDetails, ExerciseDetails } from '../services/exerciseService';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface ExerciseDetailOverlayProps {
    visible: boolean;
    onClose: () => void;
    exerciseId: string;
}

export const ExerciseDetailOverlay: React.FC<ExerciseDetailOverlayProps> = ({
    visible,
    onClose,
    exerciseId,
}) => {
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const [exerciseDetails, setExerciseDetails] = useState<ExerciseDetails | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && exerciseId) {
            loadExerciseDetails();
            // Animate in
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 250,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        } else if (!visible) {
            // Only reset when actually closing (not on initial mount)
            // Reset animation
            slideAnim.setValue(SCREEN_HEIGHT);
            backdropOpacity.setValue(0);
            setExerciseDetails(null);
        }
    }, [visible, exerciseId]);

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

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Animate out before closing
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 300,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 250,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
            statusBarTranslucent={true}
            presentationStyle="overFullScreen"
        >
            <View style={styles.container}>
                {/* Backdrop */}
                <Animated.View
                    style={[
                        styles.backdrop,
                        {
                            opacity: backdropOpacity,
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={handleClose}
                    />
                </Animated.View>

                {/* Content */}
                <Animated.View
                    style={[
                        styles.content,
                        {
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    <View style={styles.contentInner}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={handleClose}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="chevron-back" size={24} color="#526EFF" />
                            </TouchableOpacity>
                            <View style={styles.headerCenter}>
                                <Text style={styles.headerTitle}>exercise info</Text>
                            </View>
                            <View style={styles.headerRight} />
                        </View>

                        {/* Content */}
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#526EFF" />
                                <Text style={styles.loadingText}>loading...</Text>
                            </View>
                        ) : !exerciseDetails ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>exercise not found</Text>
                            </View>
                        ) : (
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
                        )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    content: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#fff',
    },
    contentInner: {
        flex: 1,
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

