import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import Svg, { Line } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_SPACING = 40;
const GRID_STROKE = 'rgba(0, 0, 0, 0.04)';
const GRID_HEIGHT = Math.ceil(SCREEN_HEIGHT * 1.2);
const ANIM_DURATION_MS = 90000;

const Grid: React.FC<{ height: number }> = ({ height }) => {
  const verticalLines = useMemo(
    () => Array.from({ length: Math.ceil(SCREEN_WIDTH / GRID_SPACING) + 1 }, (_, i) => i * GRID_SPACING),
    []
  );
  const horizontalLines = useMemo(
    () => Array.from({ length: Math.ceil(height / GRID_SPACING) + 1 }, (_, i) => i * GRID_SPACING),
    [height]
  );

  return (
    <Svg width={SCREEN_WIDTH} height={height} opacity={0.8}>
      {verticalLines.map((x) => (
        <Line key={`v-${x}`} x1={x} y1={0} x2={x} y2={height} stroke={GRID_STROKE} strokeWidth={1} />
      ))}
      {horizontalLines.map((y) => (
        <Line key={`h-${y}`} x1={0} y1={y} x2={SCREEN_WIDTH} y2={y} stroke={GRID_STROKE} strokeWidth={1} />
      ))}
    </Svg>
  );
};

export const ScrollingGridBackground: React.FC = () => {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(translateY, {
        toValue: -GRID_HEIGHT,
        duration: ANIM_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [translateY]);

  return (
    <View pointerEvents="none" style={styles.container}>
      <Animated.View style={[styles.scroller, { transform: [{ translateY }] }]}>
        <Grid height={GRID_HEIGHT} />
        <Grid height={GRID_HEIGHT} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 0,
  },
  scroller: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
