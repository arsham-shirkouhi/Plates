import React, { useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Easing,
    Dimensions,
    Image,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';
import { useRegisterOverlay } from '../contexts/OverlayContext';
import { Button } from './Button';

export type ProfileIconOrigin = {
    x: number;
    y: number;
    width: number;
    height: number;
};

interface ProfileOverlayProps {
    visible: boolean;
    origin: ProfileIconOrigin | null;
    username?: string;
    email?: string;
    streak: number;
    onClose: () => void;
    onLogout?: () => void;
    loggingOut?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_SIZE = 132;
const CLOSE_ROW_HEIGHT = 44;
const HERO_TOP_GAP = 8;
const PROFILE_IMAGE = require('../../assets/images/temp_pfp.png');
const OPEN_MS = 420;
const CLOSE_MS = 320;

const FALLBACK_ORIGIN: ProfileIconOrigin = {
    x: SCREEN_WIDTH - 85,
    y: 56,
    width: 60,
    height: 60,
};

const getCoverScale = (origin: ProfileIconOrigin): number => {
    const cx = origin.x + origin.width / 2;
    const cy = origin.y + origin.height / 2;
    const maxDist = Math.max(
        Math.hypot(cx, cy),
        Math.hypot(SCREEN_WIDTH - cx, cy),
        Math.hypot(cx, SCREEN_HEIGHT - cy),
        Math.hypot(SCREEN_WIDTH - cx, SCREEN_HEIGHT - cy),
    );
    const radius = Math.max(origin.width / 2, 1);
    return maxDist / radius + 0.2;
};

export const ProfileOverlay: React.FC<ProfileOverlayProps> = ({
    visible,
    origin,
    username,
    email,
    streak,
    onClose,
    onLogout,
    loggingOut = false,
}) => {
    useRegisterOverlay('ProfileOverlay', visible);
    const insets = useSafeAreaInsets();
    const progress = useRef(new Animated.Value(0)).current;
    const closingRef = useRef(false);

    const animOrigin = origin && origin.width > 0 ? origin : FALLBACK_ORIGIN;

    const motion = useMemo(() => {
        const originCenterX = animOrigin.x + animOrigin.width / 2;
        const originCenterY = animOrigin.y + animOrigin.height / 2;
        const targetCenterX = SCREEN_WIDTH / 2;
        const targetCenterY = insets.top + CLOSE_ROW_HEIGHT + HERO_TOP_GAP + HERO_SIZE / 2;
        const avatarScale = HERO_SIZE / Math.max(animOrigin.width, 1);

        return {
            translateX: targetCenterX - originCenterX,
            translateY: targetCenterY - originCenterY,
            avatarScale,
            coverScale: getCoverScale(animOrigin),
            heroBottom: targetCenterY + HERO_SIZE / 2,
        };
    }, [animOrigin, insets.top]);

    useEffect(() => {
        if (!visible) {
            closingRef.current = false;
            progress.setValue(0);
            return;
        }

        closingRef.current = false;
        progress.setValue(0);
        Animated.timing(progress, {
            toValue: 1,
            duration: OPEN_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [visible, progress]);

    const handleClose = () => {
        if (closingRef.current) return;
        closingRef.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.timing(progress, {
            toValue: 0,
            duration: CLOSE_MS,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) {
                onClose();
            } else {
                closingRef.current = false;
            }
        });
    };

    const displayName = username?.trim()
        ? `@${username.trim().toLowerCase()}`
        : 'your profile';

    const dimOpacity = progress.interpolate({
        inputRange: [0, 0.25, 1],
        outputRange: [0, 0.45, 0.2],
    });

    const pageScale = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, motion.coverScale],
    });

    const avatarTranslateX = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, motion.translateX],
    });

    const avatarTranslateY = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, motion.translateY],
    });

    const avatarScale = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, motion.avatarScale],
    });

    const pageFillOpacity = progress.interpolate({
        inputRange: [0, 0.4, 0.7, 1],
        outputRange: [0, 0, 1, 1],
    });

    const contentOpacity = progress.interpolate({
        inputRange: [0, 0.45, 1],
        outputRange: [0, 0, 1],
    });

    const contentTranslateY = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [18, 0],
    });

    const heroSpacer = Math.max(motion.heroBottom - insets.top - CLOSE_ROW_HEIGHT + 16, HERO_SIZE);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent={Platform.OS === 'android'}
            onRequestClose={handleClose}
        >
            <View style={styles.root} pointerEvents="box-none">
                <Animated.View
                    pointerEvents="none"
                    style={[styles.dim, { opacity: dimOpacity }]}
                />

                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.pageBurst,
                        {
                            left: animOrigin.x,
                            top: animOrigin.y,
                            width: animOrigin.width,
                            height: animOrigin.height,
                            borderRadius: animOrigin.width / 2,
                            transform: [{ scale: pageScale }],
                        },
                    ]}
                />

                <Animated.View
                    pointerEvents="none"
                    style={[styles.pageFill, { opacity: pageFillOpacity }]}
                />

                <Animated.View
                    style={[
                        styles.content,
                        {
                            paddingTop: insets.top,
                            paddingBottom: Math.max(insets.bottom, 16),
                            opacity: contentOpacity,
                            transform: [{ translateY: contentTranslateY }],
                        },
                    ]}
                    pointerEvents={visible ? 'auto' : 'none'}
                >
                    <View style={styles.closeRow}>
                        <View style={styles.closeSpacer} />
                        <TouchableOpacity
                            onPress={handleClose}
                            style={styles.closeButton}
                            activeOpacity={0.7}
                            accessibilityLabel="Close profile"
                        >
                            <Ionicons name="close" size={26} color="#252525" />
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: heroSpacer }} />

                    <Text style={styles.displayName}>{displayName}</Text>
                    {email ? <Text style={styles.email}>{email.toLowerCase()}</Text> : null}

                    <View style={styles.streakPill}>
                        <Text style={styles.streakText}>
                            <Text style={styles.streakNumber}>{streak}</Text> day streak
                        </Text>
                    </View>

                    <View style={styles.bottomActions}>
                        {onLogout ? (
                            <Button
                                variant="secondary"
                                title="logout"
                                onPress={onLogout}
                                loading={loggingOut}
                                disabled={loggingOut}
                            />
                        ) : null}
                    </View>
                </Animated.View>

                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.flyingAvatar,
                        {
                            left: animOrigin.x,
                            top: animOrigin.y,
                            width: animOrigin.width,
                            height: animOrigin.height,
                            borderRadius: animOrigin.width / 2,
                            transform: [
                                { translateX: avatarTranslateX },
                                { translateY: avatarTranslateY },
                                { scale: avatarScale },
                            ],
                        },
                    ]}
                >
                    <Image
                        source={PROFILE_IMAGE}
                        style={styles.flyingImage}
                        resizeMode="cover"
                    />
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        overflow: 'visible',
    },
    dim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#252525',
    },
    pageBurst: {
        position: 'absolute',
        backgroundColor: '#fff',
    },
    pageFill: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        paddingHorizontal: 25,
        zIndex: 2,
    },
    closeRow: {
        height: CLOSE_ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 20,
    },
    closeSpacer: {
        flex: 1,
    },
    closeButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    displayName: {
        fontSize: 32,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        textAlign: 'center',
    },
    email: {
        marginTop: 4,
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        textAlign: 'center',
    },
    streakPill: {
        alignSelf: 'center',
        marginTop: 18,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 2.5,
        borderColor: '#252525',
        backgroundColor: '#fff',
    },
    streakText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
    },
    streakNumber: {
        fontFamily: fonts.bold,
    },
    bottomActions: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingBottom: 12,
    },
    flyingAvatar: {
        position: 'absolute',
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#252525',
        overflow: 'hidden',
        zIndex: 10,
    },
    flyingImage: {
        width: '100%',
        height: '100%',
    },
});
