import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import Reanimated, {
    Easing,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { fonts } from '../constants/fonts';

export const FLY_CHIP_WIDTH = 176;
export const FLY_CHIP_HEIGHT = 42;
const FLY_DURATION = 480;

export interface FoodLogFlight {
    id: string;
    name: string;
    calories: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

interface FoodLogFlyOverlayProps {
    flights: FoodLogFlight[];
    onFlightComplete: (id: string) => void;
}

function FlyingFoodChip({
    flight,
    onComplete,
}: {
    flight: FoodLogFlight;
    onComplete: (id: string) => void;
}) {
    const progress = useSharedValue(0);
    const controlX = (flight.startX + flight.endX) / 2 + (flight.endX >= flight.startX ? -48 : 48);
    const controlY = Math.min(flight.startY, flight.endY) - 70;

    useEffect(() => {
        progress.value = withTiming(
            1,
            { duration: FLY_DURATION, easing: Easing.bezier(0.15, 0.7, 0.25, 1) },
            (finished) => {
                if (finished) runOnJS(onComplete)(flight.id);
            }
        );
    }, [flight.id, onComplete, progress]);

    const style = useAnimatedStyle(() => {
        const t = progress.value;
        const inv = 1 - t;
        const x = inv * inv * flight.startX + 2 * inv * t * controlX + t * t * flight.endX;
        const y = inv * inv * flight.startY + 2 * inv * t * controlY + t * t * flight.endY;
        const scale = interpolate(t, [0, 0.35, 1], [1, 0.72, 0]);
        const opacity = interpolate(t, [0, 0.82, 1], [1, 1, 0]);
        const rotate = interpolate(t, [0, 1], [-4, 10]);

        return {
            opacity,
            transform: [{ translateX: x }, { translateY: y }, { scale }, { rotate: `${rotate}deg` }],
        };
    });

    return (
        <Reanimated.View style={[styles.chip, style]} pointerEvents="none">
            <Text style={styles.chipName} numberOfLines={1}>
                {flight.name.toLowerCase()}
            </Text>
            <Text style={styles.chipCalories}>{flight.calories}</Text>
            <Image
                source={require('../../assets/images/icons/fire.png')}
                style={styles.chipFire}
                resizeMode="contain"
            />
        </Reanimated.View>
    );
}

export const FoodLogFlyOverlay: React.FC<FoodLogFlyOverlayProps> = ({
    flights,
    onFlightComplete,
}) => {
    if (flights.length === 0) return null;

    return (
        <View style={styles.overlay} pointerEvents="none">
            {flights.map((flight) => (
                <FlyingFoodChip key={flight.id} flight={flight} onComplete={onFlightComplete} />
            ))}
        </View>
    );
};

export function buildFlightFromTarget(
    id: string,
    name: string,
    calories: number,
    target: { x: number; y: number; width: number; height: number }
): FoodLogFlight {
    const { width, height } = Dimensions.get('window');
    const insetX = 22;
    const insetY = 18;
    const innerWidth = Math.max(8, target.width - insetX * 2);
    const innerHeight = Math.max(8, target.height - insetY * 2);
    const landX = target.x + insetX + Math.random() * innerWidth;
    const landY = target.y + insetY + Math.random() * innerHeight;

    return {
        id,
        name,
        calories,
        startX: width / 2 - FLY_CHIP_WIDTH / 2,
        startY: height * 0.56,
        endX: landX - FLY_CHIP_WIDTH / 2,
        endY: landY - FLY_CHIP_HEIGHT / 2,
    };
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFill,
        zIndex: 80,
        elevation: 80,
    },
    chip: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: FLY_CHIP_WIDTH,
        height: FLY_CHIP_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        borderWidth: 2.5,
        borderColor: '#252525',
        shadowColor: '#252525',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 8,
    },
    chipName: {
        flex: 1,
        fontSize: 14,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        marginRight: 8,
    },
    chipCalories: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#252525',
        marginRight: 4,
    },
    chipFire: {
        width: 16,
        height: 16,
    },
});
