// HABIT CHAINS
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface HabitChainCompleteBurstProps {
  originX: number;
  originY: number;
  angle: number;
}

export const HabitChainCompleteBurst: React.FC<HabitChainCompleteBurstProps> = ({
  originX,
  originY,
  angle,
}) => {
  const scale = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const angleRad = (angle * Math.PI) / 180;
    const distance = 46 + Math.random() * 28;
    const duration = 420;

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: Math.cos(angleRad) * distance,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: Math.sin(angleRad) * distance,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [angle, opacity, scale, translateX, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          left: originX - 1.5,
          top: originY - 4,
          opacity,
          transform: [{ scale }, { translateX }, { translateY }, { rotate: `${angle + 90}deg` }],
        },
      ]}
    >
      <View style={styles.dot} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    width: 3,
    height: 8,
    zIndex: 1000,
  },
  dot: {
    width: 3,
    height: 8,
    borderRadius: 1.5,
    backgroundColor: '#F9C117',
  },
});
