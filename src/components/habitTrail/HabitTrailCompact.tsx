// HABIT TRAIL
import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { fonts } from '../../constants/fonts';
import { HabitChain } from '../../habitChains/types';
import { trailCaption } from '../../habitTrail/selectors';
import { buildTrailGeom, COMPACT_GAP } from '../../habitTrail/trailLayout';
import { HabitTrailState } from '../../habitTrail/types';
import { createPulse, HabitTrailSvg } from './HabitTrailSvg';

interface HabitTrailCompactProps {
  chains: HabitChain[];
  trailState?: HabitTrailState;
  width: number;
  onCompleteNext: (chain: HabitChain) => void;
  onExpand: () => void;
}

export const HabitTrailCompact: React.FC<HabitTrailCompactProps> = ({
  chains,
  trailState,
  width,
  onCompleteNext,
  onExpand,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const { pulse, loop } = useRef(createPulse()).current;

  useEffect(() => {
    loop.start();
    return () => loop.stop();
  }, [loop]);

  const geom = buildTrailGeom(chains, width, COMPACT_GAP, trailState);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: Math.max(0, geom.current.y - 40), animated: true });
  }, [geom.current.y]);

  if (chains.length === 0) {
    return (
      <TouchableOpacity style={styles.empty} onPress={onExpand} activeOpacity={0.7}>
        <Text style={styles.emptyText}>add a chain to{'\n'}start the trail</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroller}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <HabitTrailSvg
          chains={chains}
          trailState={trailState}
          width={width}
          gap={COMPACT_GAP}
          pulse={pulse}
          onStonePress={(chainId) => {
            const chain = chains.find((item) => item.id === chainId);
            if (!chain) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onCompleteNext(chain);
          }}
        />
      </ScrollView>
      <TouchableOpacity style={styles.expand} onPress={onExpand} hitSlop={8}>
        <Text style={styles.caption} numberOfLines={1}>
          {trailCaption(chains)}
        </Text>
        <Ionicons name="expand-outline" size={15} color="#252525" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  scroller: {
    flex: 1,
  },
  expand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
  },
  caption: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#252525',
    textTransform: 'lowercase',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: 'rgba(37, 37, 37, 0.5)',
    textTransform: 'lowercase',
    textAlign: 'right',
    lineHeight: 20,
  },
});
