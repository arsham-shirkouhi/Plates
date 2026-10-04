import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, type ViewStyle, type StyleProp } from 'react-native';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import { FlatPlus, FlatTick } from '../activeWorkout/FlatMark';
import { PlatesIcon, type PlatesIconName } from '../icons/PlatesIcon';
import { HARD_SHADOW } from './HardSearchBar';

interface HardStampProps {
    icon: PlatesIconName;
    fill: string;
    size?: number;
    style?: StyleProp<ViewStyle>;
}

export const HardStamp: React.FC<HardStampProps> = ({ icon, fill, size = 52, style }) => (
    <View
        style={[
            styles.stamp,
            {
                width: size,
                height: size,
                borderRadius: size > 40 ? 14 : 7,
                backgroundColor: fill,
            },
            style,
        ]}
    >
        <PlatesIcon
            name={icon}
            size={icon === 'arms' ? (size >= 36 ? Math.round(size * 0.78) : 16) : size >= 36 ? Math.round(size * 0.52) : 12}
            color={WORKOUT_COLORS.text}
            fill="#FFFFFF"
        />
    </View>
);

interface HardAddButtonProps {
    added?: boolean;
}

export const HardAddButton: React.FC<HardAddButtonProps> = ({ added = false }) => (
    <View style={styles.addHit}>
        <View style={styles.addShadow} />
        <View style={[styles.addFace, added && styles.addFaceAdded]}>
            {added ? (
                <FlatTick size={16} color="#FFFFFF" />
            ) : (
                <FlatPlus size={16} color={WORKOUT_COLORS.accent} />
            )}
        </View>
    </View>
);

interface HardListCardProps {
    title: string;
    meta?: string;
    stamp?: React.ReactNode;
    trailing?: React.ReactNode;
    highlighted?: boolean;
    onPress?: () => void;
    onLongPress?: () => void;
    children?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    accessibilityLabel?: string;
    accessibilityRole?: 'button' | 'checkbox';
    accessibilityState?: { checked?: boolean };
}

export const HardListCard: React.FC<HardListCardProps> = ({
    title,
    meta,
    stamp,
    trailing,
    highlighted,
    onPress,
    onLongPress,
    children,
    style,
    accessibilityLabel,
    accessibilityRole = 'button',
    accessibilityState,
}) => {
    const content = (
        <>
            <View style={styles.shadow} />
            <View style={[styles.card, highlighted && styles.cardHighlighted]}>
                <View style={styles.top}>
                    {stamp}
                    <View style={styles.copy}>
                        <Text style={styles.title} numberOfLines={2}>
                            {title}
                        </Text>
                        {meta ? (
                            <Text style={styles.meta} numberOfLines={1}>
                                {meta}
                            </Text>
                        ) : null}
                    </View>
                    {trailing}
                </View>
                {children}
            </View>
        </>
    );

    if (onPress || onLongPress) {
        return (
            <TouchableOpacity
                style={[styles.hit, style]}
                onPress={onPress}
                onLongPress={onLongPress}
                activeOpacity={0.9}
                accessibilityRole={accessibilityRole}
                accessibilityLabel={accessibilityLabel ?? title}
                accessibilityState={accessibilityState}
            >
                {content}
            </TouchableOpacity>
        );
    }

    return <View style={[styles.hit, style]}>{content}</View>;
};

const styles = StyleSheet.create({
    hit: {
        marginBottom: 12,
        paddingBottom: HARD_SHADOW,
    },
    shadow: {
        ...StyleSheet.absoluteFill,
        top: HARD_SHADOW,
        borderRadius: 16,
        backgroundColor: WORKOUT_COLORS.border,
    },
    card: {
        backgroundColor: WORKOUT_COLORS.background,
        borderRadius: 16,
        borderWidth: 2.5,
        borderColor: WORKOUT_COLORS.border,
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    cardHighlighted: {
        backgroundColor: '#F5F7FF',
    },
    top: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    copy: {
        flex: 1,
        minWidth: 0,
        paddingRight: 10,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    meta: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
        marginTop: 4,
    },
    stamp: {
        borderWidth: 2.5,
        borderColor: WORKOUT_COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    addHit: {
        width: 40,
        height: 40,
    },
    addShadow: {
        position: 'absolute',
        top: HARD_SHADOW,
        left: 0,
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: WORKOUT_COLORS.border,
    },
    addFace: {
        width: 40,
        height: 40,
        borderRadius: 12,
        borderWidth: 2.5,
        borderColor: WORKOUT_COLORS.border,
        backgroundColor: WORKOUT_COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addFaceAdded: {
        backgroundColor: WORKOUT_COLORS.accent,
    },
});
