import { WorkoutSettings } from './types';

export const WORKOUT_STORAGE_KEY = '@plates/active-workout/v1';

export const MINI_BAR_HEIGHT = 72;

export const DEFAULT_WORKOUT_SETTINGS: WorkoutSettings = {
    excludeWarmupFromVolume: true,
    excludeWarmupFromSetCount: true,
    showRpeColumn: false,
    restTimerSoundEnabled: false,
};

export const SUPERSET_COLORS = ['#526EFF', '#E53935', '#7B1FA2', '#00897B', '#F57C00', '#455A64'];

export const SET_TYPE_META = {
    normal: { label: 'Normal Set', badge: null as string | null, color: '#252525' },
    warmup: { label: 'Warm Up Set', badge: 'W', color: '#F57C00' },
    failure: { label: 'Failure Set', badge: 'F', color: '#E53935' },
    drop: { label: 'Drop Set', badge: 'D', color: '#526EFF' },
} as const;

export const WORKOUT_COLORS = {
    accent: '#526EFF',
    text: '#252525',
    muted: '#616161',
    placeholder: '#9E9E9E',
    border: '#252525',
    destructive: '#E53935',
    completedRow: '#E8F5E9',
    completedBorder: '#A5D6A7',
    background: '#FFFFFF',
    /** Secondary panels — matches #F5F5F5 used in FoodLog / TextInput surfaces */
    surfaceSecondary: '#F5F5F5',
    divider: '#E0E0E0',
    backdrop: 'rgba(0, 0, 0, 0.42)',
};

/** Fixed layout for Pick Workout — figure shrinks, these never do */
export const PICK_WORKOUT_LAYOUT = {
    topBarHeight: 72,
    bottomAreaHeight: 118,
    bottomRow1Height: 32,
    bottomRow2Height: 44,
    bottomRow3Height: 44,
    padding: 16,
    rowGap: 10,
    itemGap: 8,
    touchTarget: 40,
    buttonRadius: 12,
    borderWidth: 2,
} as const;
