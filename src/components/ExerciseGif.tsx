import React, { useState } from 'react';
import {
    View,
    Image,
    StyleSheet,
    ActivityIndicator,
    Text,
    StyleProp,
    ViewStyle,
} from 'react-native';
import { fonts } from '../constants/fonts';

interface ExerciseGifProps {
    /** Absolute URL to the demo GIF (from WorkoutX `gifUrl`). */
    uri?: string | null;
    /** Optional container style override. */
    style?: StyleProp<ViewStyle>;
    /** Accessibility label describing the exercise. */
    accessibilityLabel?: string;
}

/**
 * Renders an exercise demo GIF with an inline loading spinner and a friendly
 * empty/error state. Uses `resizeMode="contain"` so full-body demonstrations
 * are not cropped. The `Image` component decodes GIFs off the JS thread on
 * both iOS and Android in RN 0.71+, so this does not freeze the UI.
 */
export const ExerciseGif: React.FC<ExerciseGifProps> = ({
    uri,
    style,
    accessibilityLabel,
}) => {
    const [loading, setLoading] = useState<boolean>(!!uri);
    const [errored, setErrored] = useState<boolean>(false);

    if (!uri) {
        return (
            <View style={[styles.container, style]}>
                <Text style={styles.placeholderText}>no demo available</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            {!errored && (
                <Image
                    source={{ uri }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="contain"
                    onLoadStart={() => setLoading(true)}
                    onLoadEnd={() => setLoading(false)}
                    onError={() => {
                        setLoading(false);
                        setErrored(true);
                    }}
                    accessible
                    accessibilityLabel={accessibilityLabel ?? 'exercise demonstration'}
                    accessibilityRole="image"
                />
            )}
            {loading && !errored && (
                <View style={styles.centerFill} pointerEvents="none">
                    <ActivityIndicator size="small" color="#526EFF" />
                </View>
            )}
            {errored && (
                <View style={styles.centerFill}>
                    <Text style={styles.placeholderText}>demo failed to load</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#F5F5F7',
        borderRadius: 16,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerFill: {
        ...StyleSheet.absoluteFill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
});
