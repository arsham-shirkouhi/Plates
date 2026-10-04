// HABIT TRAIL
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fonts } from '../../constants/fonts';
import { HabitChain } from '../../habitChains/types';
import { effectiveStreak } from '../../habitTrail/selectors';
import { TimeOfDay, TRAIL_PROGRESSION } from '../../habitTrail/trailConfig';
import { HabitTrailState } from '../../habitTrail/types';

interface HabitTrailDebugPanelProps {
  chains: HabitChain[];
  trailState?: HabitTrailState;
  onSetStreak: (chainId: string, streak: number | null) => void;
  onSetTimeOfDay: (time: TimeOfDay | null) => void;
}

const STREAKS = [
  TRAIL_PROGRESSION.dirt.min,
  TRAIL_PROGRESSION.stone.min,
  TRAIL_PROGRESSION.flowers.min,
  TRAIL_PROGRESSION.lanterns.min,
] as const;

const TIMES: TimeOfDay[] = ['morning', 'midday', 'afternoon', 'evening', 'night'];

export const HabitTrailDebugPanel: React.FC<HabitTrailDebugPanelProps> = ({
  chains,
  trailState,
  onSetStreak,
  onSetTimeOfDay,
}) => {
  if (!__DEV__) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>debug trail</Text>
      <View style={styles.row}>
        {TIMES.map((time) => (
          <TouchableOpacity key={time} style={styles.chip} onPress={() => onSetTimeOfDay(time)}>
            <Text style={styles.chipText}>{time[0]}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.chip} onPress={() => onSetTimeOfDay(null)}>
          <Text style={styles.chipText}>auto</Text>
        </TouchableOpacity>
      </View>
      {chains.map((chain) => (
        <View key={chain.id} style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>
            {chain.name} ({effectiveStreak(chain, trailState)})
          </Text>
          {STREAKS.map((value) => (
            <TouchableOpacity key={value} style={styles.chip} onPress={() => onSetStreak(chain.id, value)}>
              <Text style={styles.chipText}>{value}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.chip} onPress={() => onSetStreak(chain.id, null)}>
            <Text style={styles.chipText}>real</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#252525',
    textTransform: 'lowercase',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  name: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#252525',
    textTransform: 'lowercase',
  },
  chip: {
    borderWidth: 1.5,
    borderColor: '#252525',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#252525',
    textTransform: 'lowercase',
  },
});
