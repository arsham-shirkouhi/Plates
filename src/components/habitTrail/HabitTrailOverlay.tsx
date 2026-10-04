// HABIT TRAIL
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { fonts } from '../../constants/fonts';
import { useRegisterOverlay } from '../../contexts/OverlayContext';
import { HabitChain } from '../../habitChains/types';
import { formatProgress } from '../../habitChains/selectors';
import { bestStreakFor, effectiveStreak, signpostLabel } from '../../habitTrail/selectors';
import { TimeOfDay } from '../../habitTrail/trailConfig';
import { EXPANDED_GAP } from '../../habitTrail/trailLayout';
import {
  loadHabitTrailState,
  setDebugStreakOverride,
  setDebugTimeOfDay,
} from '../../habitTrail/trailStateService';
import { HabitTrailState } from '../../habitTrail/types';
import { HabitChainRow } from '../habitChains/HabitChainRow';
import { HabitTrailDebugPanel } from './HabitTrailDebugPanel';
import { createPulse, HabitTrailSvg } from './HabitTrailSvg';

interface HabitTrailOverlayProps {
  visible: boolean;
  userId: string;
  chains: HabitChain[];
  trailState: HabitTrailState;
  onTrailState: (state: HabitTrailState) => void;
  onClose: () => void;
  onCompleteNext: (chain: HabitChain) => void;
  onEdit: (chain: HabitChain) => void;
}

const SCREEN = Dimensions.get('window');

export const HabitTrailOverlay: React.FC<HabitTrailOverlayProps> = ({
  visible,
  userId,
  chains,
  trailState,
  onTrailState,
  onClose,
  onCompleteNext,
  onEdit,
}) => {
  useRegisterOverlay('HabitTrailOverlay', visible);
  const { pulse, loop } = useRef(createPulse()).current;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapWidth = SCREEN.width - 48;

  useEffect(() => {
    if (!visible) return;
    loop.start();
    loadHabitTrailState(userId).then(onTrailState);
    return () => loop.stop();
  }, [loop, onTrailState, userId, visible]);

  const selected = useMemo(
    () => chains.find((chain) => chain.id === selectedId) ?? null,
    [chains, selectedId]
  );

  const handleStonePress = (chainId: string) => {
    const chain = chains.find((item) => item.id === chainId);
    if (!chain) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCompleteNext(chain);
    setSelectedId(chainId);
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>habit trail</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Text style={styles.close}>close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.map} showsVerticalScrollIndicator={false}>
            <HabitTrailSvg
              chains={chains}
              trailState={trailState}
              width={mapWidth}
              gap={EXPANDED_GAP}
              expanded
              pulse={pulse}
              onStonePress={handleStonePress}
              onSelectChain={setSelectedId}
            />
          </ScrollView>

          {selected ? (
            <View style={styles.detail}>
              <Text style={styles.detailTitle}>{signpostLabel(selected)}</Text>
              <Text style={styles.meta}>
                streak {effectiveStreak(selected, trailState)} · best {bestStreakFor(selected, trailState)}
              </Text>
              <HabitChainRow
                chain={selected}
                expanded
                onToggle={() => setSelectedId(null)}
                onCompleteNext={() => onCompleteNext(selected)}
                onEdit={() => onEdit(selected)}
              />
            </View>
          ) : (
            <Text style={styles.hint}>
              tap a node for details · {chains[0] ? formatProgress(chains[0]) : ''}
            </Text>
          )}

          <HabitTrailDebugPanel
            chains={chains}
            trailState={trailState}
            onSetStreak={async (chainId, streak) => {
              onTrailState(await setDebugStreakOverride(userId, chainId, streak));
            }}
            onSetTimeOfDay={async (time: TimeOfDay | null) => {
              onTrailState(await setDebugTimeOfDay(userId, time));
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(37, 37, 37, 0.35)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 2.5,
    borderColor: '#252525',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    maxHeight: SCREEN.height * 0.88,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: '#252525',
    textTransform: 'lowercase',
  },
  close: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#252525',
    textTransform: 'lowercase',
  },
  map: {
    maxHeight: SCREEN.height * 0.48,
  },
  detail: {
    marginTop: 10,
  },
  detailTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#252525',
    textTransform: 'lowercase',
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: 'rgba(37, 37, 37, 0.55)',
    textTransform: 'lowercase',
    marginBottom: 6,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: 'rgba(37, 37, 37, 0.5)',
    textTransform: 'lowercase',
    textAlign: 'center',
    marginTop: 8,
  },
});
