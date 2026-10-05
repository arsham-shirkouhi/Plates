// HABIT CHAINS
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from '../icons/Icon';
import { fonts } from '../../constants/fonts';
import { useRegisterOverlay } from '../../contexts/OverlayContext';
import { createHabitChain } from '../../habitChains/habitChainService';
import { HabitChain, HabitChainAnchor } from '../../habitChains/types';

interface HabitChainEditorProps {
  visible: boolean;
  chain?: HabitChain | null;
  nextOrder: number;
  onClose: () => void;
  onSave: (chain: HabitChain) => void;
  onDelete?: (id: string) => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

const newStepId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export const HabitChainEditor: React.FC<HabitChainEditorProps> = ({
  visible,
  chain,
  nextOrder,
  onClose,
  onSave,
  onDelete,
}) => {
  useRegisterOverlay('HabitChainEditor', visible);
  const [sheetOpen, setSheetOpen] = useState(visible);
  const [name, setName] = useState('');
  const [anchorText, setAnchorText] = useState('');
  const [steps, setSteps] = useState<Array<{ id: string; title: string }>>([{ id: newStepId(), title: '' }]);

  const slide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const isEdit = !!chain;

  useEffect(() => {
    if (visible) {
      setName(chain?.name ?? '');
      setAnchorText(
        chain?.anchor?.type === 'cue'
          ? chain.anchor.text
          : chain?.anchor?.type === 'time'
            ? chain.anchor.time
            : ''
      );
      setSteps(
        chain?.steps.length
          ? chain.steps.map((step) => ({ id: step.id, title: step.title }))
          : [{ id: newStepId(), title: '' }]
      );
      setSheetOpen(true);
      Animated.parallel([
        Animated.timing(slide, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!sheetOpen) return;
    Animated.parallel([
      Animated.timing(slide, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => setSheetOpen(false));
  }, [visible, chain, fade, sheetOpen, slide]);

  const anchor: HabitChainAnchor | undefined = useMemo(() => {
    const trimmed = anchorText.trim();
    if (!trimmed) return undefined;
    return /^\d{1,2}:\d{2}$/.test(trimmed)
      ? { type: 'time', time: trimmed }
      : { type: 'cue', text: trimmed.toLowerCase() };
  }, [anchorText]);

  const handleSave = () => {
    const titles = steps.map((step) => step.title.trim()).filter(Boolean);
    if (titles.length === 0) {
      Alert.alert('add a step', 'a chain needs at least one step.');
      return;
    }

    if (chain) {
      onSave({
        ...chain,
        name: name.trim().toLowerCase() || chain.name,
        anchor,
        steps: titles.map((title, index) => {
          const existing = chain.steps[index];
          return {
            id: existing?.id ?? newStepId(),
            title: title.toLowerCase(),
            completed: existing?.title === title.toLowerCase() ? existing.completed : false,
          };
        }),
      });
    } else {
      onSave(createHabitChain(name, titles, anchor, nextOrder));
    }
    onClose();
  };

  const handleDelete = () => {
    if (!chain || !onDelete) return;
    Alert.alert('delete chain', `remove ${chain.name}?`, [
      { text: 'cancel', style: 'cancel' },
      {
        text: 'delete',
        style: 'destructive',
        onPress: () => {
          onDelete(chain.id);
          onClose();
        },
      },
    ]);
  };

  const moveStep = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= steps.length) return;
    const copy = [...steps];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    setSteps(copy);
  };

  if (!sheetOpen) return null;

  return (
    <Modal transparent visible={sheetOpen} animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slide }] }]}>
          <Text style={styles.title}>{isEdit ? 'edit chain' : 'new chain'}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="name (morning)"
            placeholderTextColor="rgba(37, 37, 37, 0.35)"
          />
          <TextInput
            style={styles.input}
            value={anchorText}
            onChangeText={setAnchorText}
            placeholder="anchor (after waking up / 07:30)"
            placeholderTextColor="rgba(37, 37, 37, 0.35)"
          />

          <Text style={styles.section}>steps</Text>
          <ScrollView style={styles.stepList} keyboardShouldPersistTaps="handled">
            {steps.map((step, index) => (
              <View key={step.id} style={styles.stepEdit}>
                <TextInput
                  style={[styles.input, styles.stepInput]}
                  value={step.title}
                  onChangeText={(text) => {
                    const copy = [...steps];
                    copy[index] = { ...copy[index], title: text };
                    setSteps(copy);
                  }}
                  placeholder={`step ${index + 1}`}
                  placeholderTextColor="rgba(37, 37, 37, 0.35)"
                />
                <TouchableOpacity onPress={() => moveStep(index, -1)} hitSlop={8}>
                  <Icon name="chevron-up" size={16} color="#252525" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveStep(index, 1)} hitSlop={8}>
                  <Icon name="chevron-down" size={16} color="#252525" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSteps(steps.filter((item) => item.id !== step.id))}
                  hitSlop={8}
                >
                  <Icon name="close" size={16} color="#252525" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.addStep}
              onPress={() => setSteps([...steps, { id: newStepId(), title: '' }])}
            >
              <Text style={styles.addStepText}>+ add step</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.actions}>
            {isEdit && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <Text style={styles.deleteText}>delete</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>save</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
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
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: SCREEN_HEIGHT * 0.78,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: '#252525',
    textTransform: 'lowercase',
    marginBottom: 12,
  },
  section: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: '#252525',
    textTransform: 'lowercase',
    marginTop: 8,
    marginBottom: 8,
  },
  input: {
    borderWidth: 2.5,
    borderColor: '#252525',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: '#252525',
    marginBottom: 8,
    textTransform: 'lowercase',
  },
  stepList: {
    maxHeight: 240,
  },
  stepEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepInput: {
    flex: 1,
    marginBottom: 8,
  },
  addStep: {
    paddingVertical: 8,
  },
  addStepText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#252525',
    textTransform: 'lowercase',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  deleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  deleteText: {
    fontFamily: fonts.bold,
    color: '#E53935',
    textTransform: 'lowercase',
  },
  saveBtn: {
    backgroundColor: '#F9C117',
    borderWidth: 2.5,
    borderColor: '#252525',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  saveText: {
    fontFamily: fonts.bold,
    color: '#252525',
    textTransform: 'lowercase',
  },
});
