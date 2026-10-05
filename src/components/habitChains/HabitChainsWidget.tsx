// HABIT CHAINS
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from '../icons/Icon';
import * as Haptics from 'expo-haptics';
import { fonts } from '../../constants/fonts';
import { useAuth } from '../../context/AuthContext';
import {
  completeNextStep,
  loadHabitChains,
  removeHabitChain,
  saveHabitChains,
  upsertHabitChain,
} from '../../habitChains/habitChainService';
import { HabitChain } from '../../habitChains/types';
import { HabitChainCompleteBurst } from './HabitChainCompleteBurst';
import { HabitChainEditor } from './HabitChainEditor';
import { HabitChainRow } from './HabitChainRow';
// HABIT TRAIL
import { ENABLE_HABIT_TRAIL } from '../../habitTrail/featureFlag';
import { loadHabitTrailState, maybeAwardTreasure, recordBestStreak } from '../../habitTrail/trailStateService';
import { HabitTrailState } from '../../habitTrail/types';
import { HabitTrailCompact } from '../habitTrail/HabitTrailCompact';
import { HabitTrailOverlay } from '../habitTrail/HabitTrailOverlay';

const screenWidth = Dimensions.get('window').width;
const containerPadding = 25 * 2;
const widgetSpacing = 16;
const widgetSize = (screenWidth - containerPadding - widgetSpacing) / 2;

export const HabitChainsWidget: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id ?? 'local';
  const [chains, setChains] = useState<HabitChain[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<HabitChain | null>(null);
  const [burst, setBurst] = useState<Array<{ id: number; originX: number; originY: number; angle: number }>>([]);
  const lastTapRef = useRef(0);
  const containerRef = useRef<View>(null);
  // HABIT TRAIL
  const [trailOpen, setTrailOpen] = useState(false);
  const [trailState, setTrailState] = useState<HabitTrailState>({
    treasures: [],
    bestStreaks: {},
  });

  useEffect(() => {
    let mounted = true;
    loadHabitChains(userId).then((loaded) => {
      if (mounted) setChains(loaded);
    });
    return () => {
      mounted = false;
    };
  }, [userId]);

  // HABIT TRAIL
  useEffect(() => {
    if (!ENABLE_HABIT_TRAIL) return;
    loadHabitTrailState(userId).then(setTrailState);
  }, [userId]);

  const persist = useCallback(
    async (next: HabitChain[]) => {
      setChains(next);
      await saveHabitChains(userId, next);
    },
    [userId]
  );

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const handleCardTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      openCreate();
      return;
    }
    lastTapRef.current = now;
  };

  const handleCompleteNext = (chain: HabitChain) => {
    const { chain: updated, justFinished } = completeNextStep(chain);
    persist(upsertHabitChain(chains, updated));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // HABIT TRAIL
    if (ENABLE_HABIT_TRAIL) {
      (async () => {
        let next = await recordBestStreak(userId, updated.id, updated.streak);
        if (justFinished) next = await maybeAwardTreasure(userId, updated.id);
        setTrailState(next);
      })();
    }

    if (justFinished) {
      containerRef.current?.measureInWindow((x, y, width, height) => {
        const originX = width * 0.55;
        const originY = height * 0.45;
        setBurst(
          Array.from({ length: 14 }, (_, i) => ({
            id: Date.now() + i,
            originX,
            originY,
            angle: (i / 14) * 360,
          }))
        );
        setTimeout(() => setBurst([]), 500);
      });
    }
  };

  return (
    <View ref={containerRef} style={[styles.container, { width: widgetSize, height: widgetSize }]}>
      <TouchableOpacity style={styles.header} onPress={handleCardTap} onLongPress={openCreate} activeOpacity={0.7}>
        <Text style={styles.headerText}>habit chains</Text>
        <TouchableOpacity onPress={openCreate} hitSlop={10}>
          <Icon name="add" size={20} color="#252525" />
        </TouchableOpacity>
      </TouchableOpacity>
      <View style={styles.separator} />

      {/* HABIT TRAIL */}
      {ENABLE_HABIT_TRAIL ? (
        <HabitTrailCompact
          chains={chains}
          trailState={trailState}
          width={widgetSize - 30}
          onCompleteNext={handleCompleteNext}
          onExpand={() => setTrailOpen(true)}
        />
      ) : chains.length === 0 ? (
        <TouchableOpacity style={styles.empty} onPress={handleCardTap} onLongPress={openCreate} activeOpacity={0.7}>
          <Text style={styles.emptyText}>double tap to add{'\n'}a morning chain</Text>
        </TouchableOpacity>
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {chains.map((chain) => (
            <HabitChainRow
              key={chain.id}
              chain={chain}
              expanded={expandedId === chain.id}
              onToggle={() => setExpandedId((id) => (id === chain.id ? null : chain.id))}
              onCompleteNext={() => handleCompleteNext(chain)}
              onEdit={() => {
                setEditing(chain);
                setEditorOpen(true);
              }}
            />
          ))}
        </ScrollView>
      )}

      {burst.map((particle) => (
        <HabitChainCompleteBurst
          key={particle.id}
          originX={particle.originX}
          originY={particle.originY}
          angle={particle.angle}
        />
      ))}

      {/* HABIT TRAIL */}
      {ENABLE_HABIT_TRAIL ? (
        <HabitTrailOverlay
          visible={trailOpen}
          userId={userId}
          chains={chains}
          trailState={trailState}
          onTrailState={setTrailState}
          onClose={() => setTrailOpen(false)}
          onCompleteNext={handleCompleteNext}
          onEdit={(chain) => {
            setEditing(chain);
            setEditorOpen(true);
          }}
        />
      ) : null}

      <HabitChainEditor
        visible={editorOpen}
        chain={editing}
        nextOrder={chains.length}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSave={(chain) => persist(upsertHabitChain(chains, chain))}
        onDelete={(id) => persist(removeHabitChain(chains, id))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#252525',
    paddingHorizontal: 15,
    paddingTop: 5,
    paddingBottom: 15,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 1,
    paddingBottom: 6,
  },
  headerText: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: '#252525',
    textTransform: 'lowercase',
  },
  separator: {
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: -15,
    marginBottom: 9,
  },
  list: {
    flex: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: 'rgba(37, 37, 37, 0.5)',
    textTransform: 'lowercase',
    textAlign: 'right',
    lineHeight: 20,
  },
});
