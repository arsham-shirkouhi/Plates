import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
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
const widgetGap = 16;
const actionHeight = (widgetSize - widgetGap) / 2;

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
      <View style={[styles.actionWrap, { height: actionHeight }]}>
        <TouchableOpacity
          style={[styles.actionButton, styles.foodButton]}
          onPress={onLogFoodPress}
          activeOpacity={0.8}
        >
          <View style={styles.textBlock}>
            <Text style={[styles.titleText, styles.lightText]}>log food!</Text>
            <Text style={[styles.subtitleText, styles.lightText]}>{formatCount(foodCount)}</Text>
          </View>
          <Ionicons name="leaf-outline" size={22} color="#FFFFFF" style={styles.icon} />
        </TouchableOpacity>
      </View>

      <View style={[styles.actionWrap, { height: actionHeight }]}>
        <TouchableOpacity
          style={[styles.actionButton, styles.exerciseButton]}
          onPress={onLogExercisePress}
          activeOpacity={0.8}
        >
          <View style={styles.textBlock}>
            <Text style={styles.titleText}>log exercise!</Text>
            <Text style={styles.subtitleText}>{formatCount(exerciseCount)}</Text>
          </View>
          <Ionicons name="add" size={24} color="#252525" style={styles.icon} />
        </TouchableOpacity>
      </View>
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
  foodButton: {
    backgroundColor: '#526EFF',
  },
  exerciseButton: {
    backgroundColor: '#26F170',
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
