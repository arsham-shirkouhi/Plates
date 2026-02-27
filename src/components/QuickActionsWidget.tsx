import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/fonts';

interface QuickActionsWidgetProps {
  foodCount?: number;
  exerciseCount?: number;
  onLogFoodPress?: () => void;
  onLogExercisePress?: () => void;
}

const screenWidth = Dimensions.get('window').width;
const containerPadding = 25 * 2;
const widgetSpacing = 16;
const availableWidth = screenWidth - containerPadding - widgetSpacing;
const widgetSize = availableWidth / 2;
const widgetGap = 15;
const actionHeight = (widgetSize - widgetGap) / 2;
const SHADOW_OFFSET = 4;
const PRESS_ANIM_MS = 120;

const formatCount = (count: number) => {
  if (count <= 0) return 'none logged';
  return `${count} logged`;
};

export const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({
  foodCount = 3,
  exerciseCount = 0,
  onLogFoodPress,
  onLogExercisePress,
}) => {
  return (
    <View style={[styles.container, { width: widgetSize, height: widgetSize }]}>
      <QuickActionButton
        height={actionHeight}
        backgroundColor="#FF5151"
        title="log food!"
        subtitle={formatCount(foodCount)}
        titleColor="#FFFFFF"
        subtitleColor="#FFFFFF"
        icon={<Ionicons name="leaf-outline" size={22} color="#FFFFFF" style={styles.icon} />}
        onPress={onLogFoodPress}
      />

      <QuickActionButton
        height={actionHeight}
        backgroundColor="#F9C117"
        title="log exercise!"
        subtitle={formatCount(exerciseCount)}
        titleColor="#252525"
        subtitleColor="#252525"
        icon={<Ionicons name="add" size={24} color="#252525" style={styles.icon} />}
        onPress={onLogExercisePress}
      />
    </View>
  );
};

interface QuickActionButtonProps {
  height: number;
  backgroundColor: string;
  title: string;
  subtitle: string;
  titleColor: string;
  subtitleColor: string;
  icon: React.ReactNode;
  onPress?: () => void;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  height,
  backgroundColor,
  title,
  subtitle,
  titleColor,
  subtitleColor,
  icon,
  onPress,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const shadowOpacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SHADOW_OFFSET,
        duration: PRESS_ANIM_MS,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(shadowOpacity, {
        toValue: 0,
        duration: PRESS_ANIM_MS,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: PRESS_ANIM_MS,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(shadowOpacity, {
        toValue: 1,
        duration: PRESS_ANIM_MS,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={[styles.actionWrap, { height }]}>
      <Animated.View style={[styles.actionShadow, { opacity: shadowOpacity }]} pointerEvents="none" />
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.touchable}
      >
        <Animated.View
          style={[
            styles.actionButton,
            { backgroundColor, transform: [{ translateY }] },
          ]}
        >
          <View style={styles.textBlock}>
            <Text style={[styles.titleText, { color: titleColor }]}>{title}</Text>
            <Text style={[styles.subtitleText, { color: subtitleColor }]}>{subtitle}</Text>
          </View>
          {icon}
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  actionWrap: {
    position: 'relative',
    overflow: 'visible',
  },
  actionShadow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#252525',
    borderRadius: 12,
    transform: [{ translateY: SHADOW_OFFSET }],
  },
  touchable: {
    flex: 1,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: '#252525',
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  titleText: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: '#252525',
    textTransform: 'lowercase',
  },
  subtitleText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#252525',
    textTransform: 'lowercase',
    marginTop: 'auto',
  },
  lightText: {
    color: '#FFFFFF',
  },
  textBlock: {
    flex: 1,
    alignSelf: 'stretch',
  },
  icon: {
    position: 'absolute',
    right: 10,
    bottom: 8,
  },
});
