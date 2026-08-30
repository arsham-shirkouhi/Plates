import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Easing,
    Dimensions,
    PanResponder,
    BackHandler,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';
import { useRegisterOverlay } from '../contexts/OverlayContext';
import { useAuth } from '../context/AuthContext';
import { getDailyMacroLogsRange, getTodayDateString } from '../services/userService';
import {
    WEEKDAY_LABELS,
    buildMonthGrid,
    getMonthDateRange,
    getMonthLabel,
    isSameMonth,
    shiftMonth,
} from '../utils/calendar';

interface CalendarOverlayProps {
    visible: boolean;
    onClose: () => void;
    targetCalories: number;
    todayCalories: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_PADDING = 25;
const GRID_GAP = 8;
const DAY_SIZE = (SCREEN_WIDTH - CARD_PADDING * 2 - GRID_GAP * 6) / 7;
const RING_SIZE = Math.min(DAY_SIZE, 46);
const RING_STROKE = 3.5;
const PAGE_WIDTH = SCREEN_WIDTH;
const SLIDE_DURATION = 160;
const MONTH_WINDOW = 36;
const PAGE_HEIGHT = 36 + 14 + 29 + 8 + 6 * (DAY_SIZE + GRID_GAP);
const HIDDEN_OFFSET = -(PAGE_HEIGHT + 140);

function createMonthOrigin(date = new Date()) {
    return shiftMonth(date.getFullYear(), date.getMonth(), -MONTH_WINDOW);
}

function DayCalorieRing({
    day,
    progress,
    isToday,
    isFuture,
    animKey,
    delay,
    animate,
}: {
    day: number;
    progress: number;
    isToday: boolean;
    isFuture: boolean;
    animKey: number;
    delay: number;
    animate: boolean;
}) {
    const clamped = Math.min(1, Math.max(0, progress));
    const radius = (RING_SIZE - RING_STROKE) / 2;
    const center = RING_SIZE / 2;
    const circumference = 2 * Math.PI * radius;
    const hitGoal = clamped >= 1;
    const showRing = !isFuture;
    const ringColor = hitGoal ? '#26F170' : '#4463F7';
    const animated = useRef(new Animated.Value(0)).current;
    const progressRef = useRef(clamped);
    const startedRef = useRef(false);
    const [dashOffset, setDashOffset] = useState(circumference);

    progressRef.current = clamped;

    useEffect(() => {
        startedRef.current = false;
        animated.stopAnimation();

        if (!animate || isFuture) {
            animated.setValue(clamped);
            setDashOffset(circumference * (1 - clamped));
            startedRef.current = true;
            return;
        }

        animated.setValue(0);
        setDashOffset(circumference);

        const listener = animated.addListener(({ value }) => {
            setDashOffset(circumference * (1 - value));
        });

        const timer = setTimeout(() => {
            startedRef.current = true;
            if (progressRef.current <= 0) {
                return;
            }
            Animated.timing(animated, {
                toValue: progressRef.current,
                duration: 360,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start();
        }, delay);

        return () => {
            clearTimeout(timer);
            animated.removeListener(listener);
            animated.stopAnimation();
        };
    }, [animKey, animate, animated, circumference, delay, isFuture]);

    useEffect(() => {
        if (animate || isFuture) {
            return;
        }
        animated.setValue(clamped);
        setDashOffset(circumference * (1 - clamped));
    }, [animate, animated, circumference, clamped, isFuture]);

    useEffect(() => {
        if (isFuture || !startedRef.current) {
            return;
        }
        Animated.timing(animated, {
            toValue: clamped,
            duration: 280,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [animated, clamped, isFuture]);

    return (
        <View style={ringStyles.wrap}>
            {showRing && (
                <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
                    <Circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke={isToday ? '#D9DFF8' : '#EFEFEF'}
                        strokeWidth={RING_STROKE}
                        fill="transparent"
                    />
                    {clamped > 0 && dashOffset < circumference && (
                        <Circle
                            cx={center}
                            cy={center}
                            r={radius}
                            stroke={ringColor}
                            strokeWidth={RING_STROKE}
                            fill="transparent"
                            strokeDasharray={`${circumference} ${circumference}`}
                            strokeDashoffset={dashOffset}
                            strokeLinecap="round"
                            transform={`rotate(-90 ${center} ${center})`}
                        />
                    )}
                </Svg>
            )}
            <Text
                style={[
                    ringStyles.dayText,
                    isToday && ringStyles.todayText,
                    isFuture && ringStyles.futureText,
                ]}
            >
                {day}
            </Text>
        </View>
    );
}

const ringStyles = StyleSheet.create({
    wrap: {
        width: RING_SIZE,
        height: RING_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayText: {
        fontSize: 14,
        fontFamily: fonts.bold,
        color: '#252525',
    },
    todayText: {
        color: '#4463F7',
    },
    futureText: {
        color: '#BDBDBD',
        fontFamily: fonts.regular,
    },
});

function MonthPage({
    year,
    month,
    today,
    todayCalories,
    targetCalories,
    caloriesByDate,
    animateRings,
    animKey,
    onDayPress,
}: {
    year: number;
    month: number;
    today: string;
    todayCalories: number;
    targetCalories: number;
    caloriesByDate: Record<string, number>;
    animateRings: boolean;
    animKey: number;
    onDayPress: () => void;
}) {
    const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

    const progressForDate = (date: string): number => {
        if (targetCalories <= 0) return 0;
        const calories = date === today ? todayCalories : caloriesByDate[date] ?? 0;
        return calories / targetCalories;
    };

    return (
        <View>
            <Text style={styles.monthLabel}>{getMonthLabel(year, month)}</Text>
            <View style={styles.weekdayRow}>
                {WEEKDAY_LABELS.map((label, index) => (
                    <Text
                        key={`${label}-${index}`}
                        style={[styles.weekday, index === 6 && styles.cellLast]}
                    >
                        {label}
                    </Text>
                ))}
            </View>
            <View style={styles.grid}>
                {cells.map((cell, index) => {
                    const cellStyle = [styles.dayCell, index % 7 === 6 && styles.cellLast];

                    if (!cell) {
                        return <View key={`pad-${index}`} style={cellStyle} />;
                    }

                    const isToday = cell.date === today;
                    const isFuture = cell.date > today;

                    return (
                        <TouchableOpacity
                            key={cell.date}
                            style={cellStyle}
                            onPress={isFuture ? undefined : onDayPress}
                            activeOpacity={isFuture ? 1 : 0.7}
                            disabled={isFuture}
                        >
                            <DayCalorieRing
                                day={cell.day}
                                progress={progressForDate(cell.date)}
                                isToday={isToday}
                                isFuture={isFuture}
                                animKey={animKey}
                                delay={150}
                                animate={animateRings}
                            />
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

export const CalendarOverlay: React.FC<CalendarOverlayProps> = ({
    visible,
    onClose,
    targetCalories,
    todayCalories,
}) => {
    useRegisterOverlay('CalendarOverlay', visible);
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [pageIndex, setPageIndex] = useState(MONTH_WINDOW);
    const [caloriesByDate, setCaloriesByDate] = useState<Record<string, number>>({});
    const [animKey, setAnimKey] = useState(0);
    const [allowRingIntro, setAllowRingIntro] = useState(true);
    const monthCacheRef = useRef<Record<string, Record<string, number>>>({});
    const originRef = useRef(createMonthOrigin(now));

    const slideAnim = useRef(new Animated.Value(HIDDEN_OFFSET)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const pagerX = useRef(new Animated.Value(-MONTH_WINDOW * PAGE_WIDTH)).current;
    const closingRef = useRef(false);
    const slidingRef = useRef(false);
    const dismissRef = useRef<() => void>(() => {});
    const shiftMonthRef = useRef<(delta: number) => void>(() => {});
    const pageIndexRef = useRef(MONTH_WINDOW);

    pageIndexRef.current = pageIndex;

    const today = getTodayDateString();
    const viewingCurrentMonth = isSameMonth(year, month);

    useLayoutEffect(() => {
        if (!visible) {
            closingRef.current = false;
            slideAnim.setValue(HIDDEN_OFFSET);
            backdropOpacity.setValue(0);
            return;
        }

        slideAnim.setValue(HIDDEN_OFFSET);
        backdropOpacity.setValue(0);
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 200,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 1,
                duration: 160,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();
    }, [visible, slideAnim, backdropOpacity]);

    useEffect(() => {
        if (!visible) return;

        const current = new Date();
        originRef.current = createMonthOrigin(current);
        pageIndexRef.current = MONTH_WINDOW;
        pagerX.setValue(-MONTH_WINDOW * PAGE_WIDTH);
        setAllowRingIntro(true);
        setAnimKey((key) => key + 1);

        const nextYear = current.getFullYear();
        const nextMonth = current.getMonth();
        if (year !== nextYear || month !== nextMonth || pageIndex !== MONTH_WINDOW) {
            setYear(nextYear);
            setMonth(nextMonth);
            setPageIndex(MONTH_WINDOW);
        }
    }, [visible]);

    useEffect(() => {
        if (!user) return;

        let cancelled = false;
        const current = new Date();
        const key = `${current.getFullYear()}-${current.getMonth()}`;
        const { start, end } = getMonthDateRange(current.getFullYear(), current.getMonth());

        const prefetch = async () => {
            const logs = await getDailyMacroLogsRange(user, start, end);
            if (cancelled) return;
            const next: Record<string, number> = {};
            for (const log of logs) {
                next[log.date] = log.calories;
            }
            monthCacheRef.current[key] = next;
            setCaloriesByDate((prev) => (Object.keys(prev).length === 0 ? next : prev));
        };

        void prefetch();
        return () => {
            cancelled = true;
        };
    }, [user]);

    useEffect(() => {
        if (!visible || !user) return;

        let cancelled = false;
        const monthsToLoad = [-1, 0, 1].map((offset) => shiftMonth(year, month, offset));

        const load = async () => {
            await Promise.all(
                monthsToLoad.map(async ({ year: nextYear, month: nextMonth }) => {
                    if (nextYear * 12 + nextMonth > now.getFullYear() * 12 + now.getMonth()) {
                        return;
                    }
                    const key = `${nextYear}-${nextMonth}`;
                    const { start, end } = getMonthDateRange(nextYear, nextMonth);
                    const logs = await getDailyMacroLogsRange(user, start, end);
                    if (cancelled) return;

                    const next: Record<string, number> = {};
                    for (const log of logs) {
                        next[log.date] = log.calories;
                    }
                    monthCacheRef.current[key] = next;
                    setCaloriesByDate((prev) => ({ ...prev, ...next }));
                })
            );
        };

        const cached = monthCacheRef.current[`${year}-${month}`];
        if (cached) {
            setCaloriesByDate((prev) => ({ ...prev, ...cached }));
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, [visible, user, year, month]);

    const animateOut = (after?: () => void) => {
        if (closingRef.current) return;
        closingRef.current = true;
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: HIDDEN_OFFSET,
                duration: 180,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 200,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start(({ finished }) => {
            closingRef.current = false;
            if (finished) {
                after?.();
            }
        });
    };

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        animateOut(onClose);
    };

    dismissRef.current = handleClose;

    const handlePanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gesture) =>
                gesture.dy < -6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
            onPanResponderMove: (_, gesture) => {
                if (gesture.dy >= 0) {
                    slideAnim.setValue(0);
                    backdropOpacity.setValue(1);
                    return;
                }
                slideAnim.setValue(gesture.dy);
                backdropOpacity.setValue(Math.max(0, 1 + gesture.dy / 220));
            },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dy < -80 || gesture.vy < -0.7) {
                    dismissRef.current();
                    return;
                }
                Animated.parallel([
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 100,
                        friction: 8,
                    }),
                    Animated.timing(backdropOpacity, {
                        toValue: 1,
                        duration: 180,
                        useNativeDriver: true,
                    }),
                ]).start();
            },
        })
    ).current;

    const settledX = () => -pageIndexRef.current * PAGE_WIDTH;

    const commitIndex = (nextIndex: number) => {
        pageIndexRef.current = nextIndex;
        setPageIndex(nextIndex);
        const next = shiftMonth(originRef.current.year, originRef.current.month, nextIndex);
        setYear(next.year);
        setMonth(next.month);
    };

    const handleShiftMonth = (delta: number) => {
        if (slidingRef.current) return;
        const nextIndex = pageIndexRef.current + delta;
        if (nextIndex < 0 || nextIndex > MONTH_WINDOW) return;
        slidingRef.current = true;
        setAllowRingIntro(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.timing(pagerX, {
            toValue: -nextIndex * PAGE_WIDTH,
            duration: SLIDE_DURATION,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start(({ finished }) => {
            slidingRef.current = false;
            if (finished) {
                commitIndex(nextIndex);
            } else {
                pagerX.setValue(settledX());
            }
        });
    };

    shiftMonthRef.current = handleShiftMonth;

    const monthSwipeResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gesture) =>
                Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.1,
            onMoveShouldSetPanResponderCapture: (_, gesture) =>
                Math.abs(gesture.dx) > 16 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.1,
            onPanResponderMove: (_, gesture) => {
                if (slidingRef.current) return;
                let { dx } = gesture;
                const index = pageIndexRef.current;
                if (index >= MONTH_WINDOW && dx < 0) {
                    dx *= 0.28;
                }
                if (index <= 0 && dx > 0) {
                    dx *= 0.28;
                }
                pagerX.setValue(-index * PAGE_WIDTH + dx);
            },
            onPanResponderRelease: (_, gesture) => {
                if (slidingRef.current) return;
                const index = pageIndexRef.current;
                const wentNext =
                    index < MONTH_WINDOW && (gesture.dx < -PAGE_WIDTH * 0.22 || gesture.vx < -0.55);
                const wentPrev =
                    index > 0 && (gesture.dx > PAGE_WIDTH * 0.22 || gesture.vx > 0.55);
                if (wentNext) {
                    shiftMonthRef.current(1);
                    return;
                }
                if (wentPrev) {
                    shiftMonthRef.current(-1);
                    return;
                }
                Animated.spring(pagerX, {
                    toValue: -index * PAGE_WIDTH,
                    useNativeDriver: true,
                    tension: 80,
                    friction: 12,
                }).start();
            },
            onPanResponderTerminate: () => {
                if (slidingRef.current) return;
                Animated.spring(pagerX, {
                    toValue: settledX(),
                    useNativeDriver: true,
                    tension: 80,
                    friction: 12,
                }).start();
            },
        })
    ).current;

    const handleDayPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const pageMonths = [pageIndex - 2, pageIndex - 1, pageIndex, pageIndex + 1, pageIndex + 2]
        .filter((index) => index >= 0 && index <= MONTH_WINDOW)
        .map((index) => ({
            index,
            offset: index - pageIndex,
            ...shiftMonth(originRef.current.year, originRef.current.month, index),
        }));

    useEffect(() => {
        if (!visible) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            handleClose();
            return true;
        });
        return () => sub.remove();
    }, [visible]);

    if (!visible) {
        return null;
    }

    return (
        <View style={styles.container} pointerEvents="box-none">
                <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={handleClose}
                    />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.card,
                        {
                            paddingTop: insets.top + 8,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    <View style={styles.pagerWrap}>
                        <View style={styles.pagerClip} {...monthSwipeResponder.panHandlers}>
                            <Animated.View
                                style={[
                                    styles.pagerRow,
                                    { transform: [{ translateX: pagerX }] },
                                ]}
                            >
                                {pageMonths.map(({ index, offset, year: pageYear, month: pageMonth }) => (
                                    <View
                                        key={`${pageYear}-${pageMonth}`}
                                        style={[styles.page, { left: index * PAGE_WIDTH }]}
                                    >
                                        <MonthPage
                                            year={pageYear}
                                            month={pageMonth}
                                            today={today}
                                            todayCalories={todayCalories}
                                            targetCalories={targetCalories}
                                            caloriesByDate={caloriesByDate}
                                            animateRings={offset === 0 && allowRingIntro}
                                            animKey={animKey}
                                            onDayPress={handleDayPress}
                                        />
                                    </View>
                                ))}
                            </Animated.View>
                        </View>

                        <View style={styles.arrowRow} pointerEvents="box-none">
                            <TouchableOpacity
                                style={styles.monthButton}
                                onPress={() => handleShiftMonth(-1)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="chevron-back" size={20} color="#252525" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.monthButton, viewingCurrentMonth && styles.monthButtonDisabled]}
                                onPress={() => handleShiftMonth(1)}
                                activeOpacity={0.7}
                                disabled={viewingCurrentMonth}
                            >
                                <Ionicons
                                    name="chevron-forward"
                                    size={20}
                                    color={viewingCurrentMonth ? '#C8C8C8' : '#252525'}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.caption}>rings show calorie goal for each day</Text>

                    <View style={styles.handleSection} {...handlePanResponder.panHandlers}>
                        <View style={styles.handleBar} />
                    </View>
                </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 40,
        elevation: 40,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(37, 37, 37, 0.35)',
    },
    card: {
        width: SCREEN_WIDTH,
        backgroundColor: '#fff',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        borderWidth: 2,
        borderColor: '#252525',
        borderTopWidth: 0,
        paddingBottom: 4,
        overflow: 'hidden',
        shadowColor: '#252525',
        shadowOpacity: 0.16,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
    },
    handleSection: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 10,
        paddingBottom: 14,
    },
    handleBar: {
        width: 44,
        height: 5,
        backgroundColor: '#D0D0D0',
        borderRadius: 3,
    },
    pagerWrap: {
        position: 'relative',
    },
    pagerClip: {
        width: PAGE_WIDTH,
        overflow: 'hidden',
    },
    pagerRow: {
        height: PAGE_HEIGHT,
    },
    page: {
        position: 'absolute',
        top: 0,
        width: PAGE_WIDTH,
        paddingHorizontal: CARD_PADDING,
    },
    arrowRow: {
        position: 'absolute',
        top: 0,
        left: CARD_PADDING,
        right: CARD_PADDING,
        height: 36,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    monthButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthButtonDisabled: {
        opacity: 0.7,
    },
    monthLabel: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        textAlign: 'center',
        height: 36,
        lineHeight: 36,
        marginBottom: 14,
        paddingHorizontal: 40,
    },
    weekdayRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    weekday: {
        width: DAY_SIZE,
        marginRight: GRID_GAP,
        textAlign: 'center',
        fontSize: 13,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: DAY_SIZE,
        height: DAY_SIZE,
        marginRight: GRID_GAP,
        marginBottom: GRID_GAP,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cellLast: {
        marginRight: 0,
    },
    caption: {
        marginTop: 6,
        textAlign: 'center',
        fontSize: 13,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
});
