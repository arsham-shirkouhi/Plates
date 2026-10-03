import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon } from 'react-native-svg';
import Reanimated, {
    Easing,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

const AnimatedG = Reanimated.createAnimatedComponent(G);

const CAL_BLUE = '#526EFF';

interface CalMascotProps {
    size?: number;
}

export const CalMascot: React.FC<CalMascotProps> = ({ size = 132 }) => {
    const bob = useSharedValue(0);
    const wave = useSharedValue(0);

    useEffect(() => {
        bob.value = withRepeat(
            withSequence(
                withTiming(-5, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
                withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            false
        );
        wave.value = withRepeat(
            withSequence(
                withTiming(16, { duration: 420, easing: Easing.inOut(Easing.quad) }),
                withTiming(-6, { duration: 420, easing: Easing.inOut(Easing.quad) })
            ),
            -1,
            false
        );
    }, [bob, wave]);

    const bodyStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: bob.value }],
    }));

    const armProps = useAnimatedProps(() => ({
        rotation: wave.value,
        originX: 74,
        originY: 78,
    }));

    return (
        <View style={[styles.frame, { width: size, height: size }]}>
            <Reanimated.View style={bodyStyle}>
                <Svg width={size} height={size} viewBox="0 0 120 140">
                    <Ellipse cx="60" cy="128" rx="22" ry="5" fill={CAL_BLUE} opacity={0.14} />

                    <G
                        stroke={CAL_BLUE}
                        strokeWidth={7}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                    >
                        <Line x1="51" y1="88" x2="48" y2="118" />
                        <Line x1="69" y1="88" x2="72" y2="118" />
                        <Line x1="46" y1="80" x2="30" y2="96" />
                    </G>

                    <Polygon points="22,48 50,18 48,54" fill={CAL_BLUE} />
                    <Path d="M62 22 H90 V36 H74 V58 H60 V36 H62 Z" fill={CAL_BLUE} />
                    <Circle cx="58" cy="56" r="6.5" fill={CAL_BLUE} />
                    <Path
                        d="M32 62 Q60 98 88 62"
                        fill="none"
                        stroke={CAL_BLUE}
                        strokeWidth={9}
                        strokeLinecap="round"
                    />

                    <AnimatedG animatedProps={armProps}>
                        <Path
                            d="M74 78 L96 58"
                            stroke={CAL_BLUE}
                            strokeWidth={7}
                            strokeLinecap="round"
                            fill="none"
                        />
                        <Path
                            d="M96 58 Q108 48 100 38"
                            stroke={CAL_BLUE}
                            strokeWidth={6}
                            strokeLinecap="round"
                            fill="none"
                        />
                    </AnimatedG>
                </Svg>
            </Reanimated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    frame: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
