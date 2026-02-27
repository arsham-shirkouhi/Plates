import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { fonts } from '../constants/fonts';

type ExerciseLogScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExerciseLog'>;

export const ExerciseLogScreen: React.FC = () => {
  const navigation = useNavigation<ExerciseLogScreenNavigationProp>();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color="#252525" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>exercise log</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>exercise log</Text>
        <Text style={styles.subtitle}>coming soon</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingBottom: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: fonts.bold,
    color: '#252525',
    textTransform: 'lowercase',
  },
  headerSpacer: {
    width: 32,
    height: 32,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: '#252525',
    textTransform: 'lowercase',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: '#666666',
    textTransform: 'lowercase',
  },
});
