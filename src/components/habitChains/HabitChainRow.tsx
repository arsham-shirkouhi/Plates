// HABIT CHAINS
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/fonts';
import { HabitChain } from '../../habitChains/types';
import {
  formatAnchor,
  formatProgress,
  isChainCompleteToday,
  nextStepIndex,
} from '../../habitChains/selectors';

interface HabitChainRowProps {
  chain: HabitChain;
  expanded: boolean;
  onToggle: () => void;
  onCompleteNext: () => void;
  onEdit: () => void;
}

export const HabitChainRow: React.FC<HabitChainRowProps> = ({
  chain,
  expanded,
  onToggle,
  onCompleteNext,
  onEdit,
}) => {
  const nextIndex = nextStepIndex(chain);
  const doneToday = isChainCompleteToday(chain);
  const anchor = formatAnchor(chain.anchor);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.header}
        onPress={onToggle}
        onLongPress={onEdit}
        activeOpacity={0.7}
      >
        <View style={styles.titleBlock}>
          <Text style={[styles.name, doneToday && styles.nameDone]} numberOfLines={1}>
            {chain.name}
          </Text>
          {!!anchor && (
            <Text style={styles.anchor} numberOfLines={1}>
              {anchor}
            </Text>
          )}
        </View>
        <Text style={styles.progress}>{doneToday ? `${chain.streak}d` : formatProgress(chain)}</Text>
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={16}
          color="#252525"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.steps}>
          {chain.steps.map((step, index) => {
            const isNext = index === nextIndex;
            const locked = index > nextIndex && nextIndex >= 0;
            return (
              <TouchableOpacity
                key={step.id}
                style={styles.stepRow}
                onPress={isNext ? onCompleteNext : undefined}
                activeOpacity={isNext ? 0.7 : 1}
                disabled={!isNext}
              >
                <View style={[styles.mark, step.completed && styles.markDone, isNext && styles.markNext]} />
                <Text
                  style={[
                    styles.stepText,
                    step.completed && styles.stepDone,
                    locked && styles.stepLocked,
                  ]}
                  numberOfLines={1}
                >
                  {step.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: '#252525',
    textTransform: 'lowercase',
    lineHeight: 20,
  },
  nameDone: {
    color: '#1F6B38',
  },
  anchor: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: 'rgba(37, 37, 37, 0.45)',
    textTransform: 'lowercase',
  },
  progress: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: '#252525',
  },
  steps: {
    marginTop: 6,
    paddingLeft: 4,
    gap: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  mark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#252525',
    backgroundColor: 'transparent',
  },
  markDone: {
    backgroundColor: '#1F6B38',
    borderColor: '#1F6B38',
  },
  markNext: {
    backgroundColor: '#F9C117',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#252525',
    textTransform: 'lowercase',
  },
  stepDone: {
    color: '#1F6B38',
    textDecorationLine: 'line-through',
  },
  stepLocked: {
    color: 'rgba(37, 37, 37, 0.35)',
  },
});
