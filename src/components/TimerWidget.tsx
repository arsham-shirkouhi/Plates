import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "../constants/fonts";
import * as Haptics from "expo-haptics";

const screenWidth = Dimensions.get("window").width;
const containerPadding = 25 * 2;
const widgetSpacing = 16;
const availableWidth = screenWidth - containerPadding - widgetSpacing;
const widgetSize = availableWidth / 2;

// Min/Max constraints
const MIN_TIME_SECONDS = 0;
const MAX_TIME_SECONDS = 5 * 60; // 5 minutes

// Bar animation timing (keep this in sync with Animated.timing duration below)
const BAR_ANIM_MS = 350;

interface TimerWidgetProps {
  initialMinutes?: number;
  initialSeconds?: number;
  onComplete?: () => void;
  onInteractionChange?: (interacting: boolean) => void;
  resetKey?: string | number;
}

export const TimerWidget: React.FC<TimerWidgetProps> = ({
  initialMinutes = 0,
  initialSeconds = 60,
  onComplete,
  onInteractionChange,
  resetKey,
}) => {
  const initialTotal = useMemo(() => {
    const v = initialMinutes * 60 + initialSeconds;
    return Math.min(Math.max(MIN_TIME_SECONDS, v), MAX_TIME_SECONDS);
  }, [initialMinutes, initialSeconds]);

  const [totalSeconds, setTotalSeconds] = useState(() => initialTotal);
  const [isRunning, setIsRunning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const dragStartY = useRef(0);
  const dragStartTime = useRef(0);

  // keep latest totalSeconds available to PanResponder closures
  const totalSecondsRef = useRef(totalSeconds);
  useEffect(() => {
    totalSecondsRef.current = totalSeconds;
  }, [totalSeconds]);

  // Optional manual reset
  useEffect(() => {
    if (resetKey === undefined) return;

    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTotalSeconds(initialTotal);
  }, [resetKey, initialTotal]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Fixed-scale progress: 0..5min
  const remainingRatio = Math.max(0, Math.min(1, totalSeconds / MAX_TIME_SECONDS));
  const progress = remainingRatio * 100;

  useEffect(() => {
    if (isDragging) {
      progressAnim.setValue(progress);
    } else {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: BAR_ANIM_MS,
        useNativeDriver: false,
      }).start();
    }
  }, [progress, isDragging, progressAnim]);

  // Countdown
  useEffect(() => {
    if (isRunning && totalSeconds > MIN_TIME_SECONDS) {
      intervalRef.current = setInterval(() => {
        setTotalSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, totalSeconds, onComplete]);

  // --- HAPTICS HELPERS ---
  const safeHaptic = async (type: "light" | "medium" | "heavy") => {
    try {
      if (type === "light") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (type === "medium") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (type === "heavy") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // ignore if haptics not available
    }
  };

  // Drag haptics: step-based
  const HAPTIC_STEP_SECONDS = 1;

  const maybeHapticOnChange = (newTime: number, prevTime: number) => {
    const prevStep = Math.floor(prevTime / HAPTIC_STEP_SECONDS);
    const nextStep = Math.floor(newTime / HAPTIC_STEP_SECONDS);
    if (prevStep === nextStep) return;

    if (newTime === MIN_TIME_SECONDS || newTime === MAX_TIME_SECONDS) {
      void safeHaptic("heavy");
    } else {
      void safeHaptic("light");
    }
  };

  // ✅ Button spam haptics ONLY while the bar animation is moving
  const spamHapticIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const spamHapticStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stopButtonHapticSpam = () => {
    if (spamHapticIntervalRef.current) {
      clearInterval(spamHapticIntervalRef.current);
      spamHapticIntervalRef.current = null;
    }
    if (spamHapticStopTimeoutRef.current) {
      clearTimeout(spamHapticStopTimeoutRef.current);
      spamHapticStopTimeoutRef.current = null;
    }
  };

  const startButtonHapticSpamFor = (type: "medium" | "heavy", durationMs: number) => {
    stopButtonHapticSpam();

    // fire immediately
    void safeHaptic(type);

    // spam while animating
    spamHapticIntervalRef.current = setInterval(() => {
      void safeHaptic(type);
    }, 90); // spam rate (50–90)

    // stop when animation should be done
    spamHapticStopTimeoutRef.current = setTimeout(() => {
      stopButtonHapticSpam();
    }, durationMs);
  };

  useEffect(() => {
    return () => {
      stopButtonHapticSpam();
    };
  }, []);

  const handleAdd = () => {
    if (isRunning) return;

    setTotalSeconds((prev) => {
      const next = Math.min(MAX_TIME_SECONDS, prev + 60);

      if (next !== prev) {
        const hType: "medium" | "heavy" = next === MAX_TIME_SECONDS ? "heavy" : "medium";
        startButtonHapticSpamFor(hType, BAR_ANIM_MS + 50);
      }

      return next;
    });
  };

  const handleSubtract = () => {
    if (isRunning) return;

    setTotalSeconds((prev) => {
      const next = Math.max(MIN_TIME_SECONDS, prev - 60);

      if (next !== prev) {
        const hType: "medium" | "heavy" = next === MIN_TIME_SECONDS ? "heavy" : "medium";
        startButtonHapticSpamFor(hType, BAR_ANIM_MS + 50);
      }

      return next;
    });
  };

  const handlePlayPause = () => {
    if (totalSeconds <= MIN_TIME_SECONDS) return;
    setIsRunning((v) => !v);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isRunning,
      onStartShouldSetPanResponderCapture: () => !isRunning,
      onMoveShouldSetPanResponder: (_, g) => !isRunning && Math.abs(g.dy) > 1,
      onMoveShouldSetPanResponderCapture: () => !isRunning,

      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,

      onPanResponderGrant: (evt) => {
        if (isRunning) return;

        // if user drags while button spam is running, stop it
        stopButtonHapticSpam();

        setIsDragging(true);
        onInteractionChange?.(true);

        dragStartY.current = evt.nativeEvent.pageY;
        dragStartTime.current = totalSecondsRef.current;

        // pause while adjusting
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsRunning(false);
      },

      onPanResponderMove: (evt, gestureState) => {
        if (isRunning) return;

        const verticalMovement = Math.abs(gestureState.dy);
        const horizontalMovement = Math.abs(gestureState.dx);

        if (verticalMovement > 3 && verticalMovement >= horizontalMovement) {
          const dragDelta = dragStartY.current - evt.nativeEvent.pageY;
          const timeChange = Math.round(dragDelta / 3);

          const newTime = Math.min(
            MAX_TIME_SECONDS,
            Math.max(MIN_TIME_SECONDS, dragStartTime.current + timeChange)
          );

          maybeHapticOnChange(newTime, totalSecondsRef.current);

          // update ref immediately so comparisons are correct next frame
          totalSecondsRef.current = newTime;

          setTotalSeconds(newTime);
        }
      },

      onPanResponderRelease: () => {
        setIsDragging(false);
        onInteractionChange?.(false);
      },

      onPanResponderTerminate: () => {
        setIsDragging(false);
        onInteractionChange?.(false);
      },
    })
  ).current;

  const containerSize = widgetSize;
  const padding = 15;
  const availableHeight = containerSize - padding * 2;
  const progressContainerHeight = availableHeight;
  const buttonSize = (availableHeight - 20) / 3;

  const progressHeightPercent = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[styles.container, { width: containerSize, height: containerSize }]}>
      <View style={styles.displayContainer}>
        <View
          style={[styles.progressContainer, { height: progressContainerHeight }]}
          {...panResponder.panHandlers}
          collapsable={false}
          pointerEvents="auto"
        >
          <Animated.View style={[styles.progressFill, { height: progressHeightPercent }]} />

          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(totalSeconds)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, { width: buttonSize, height: buttonSize }]}
          onPress={handleAdd}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={buttonSize * 0.8} color="#252525" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, { width: buttonSize, height: buttonSize }]}
          onPress={handleSubtract}
          activeOpacity={0.7}
        >
          <Ionicons name="remove" size={buttonSize * 0.8} color="#252525" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, { width: buttonSize, height: buttonSize }]}
          onPress={handlePlayPause}
          activeOpacity={0.7}
        >
          <Ionicons name={isRunning ? "pause" : "play"} size={buttonSize * 0.5} color="#252525" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: "#252525",
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  displayContainer: { flex: 2, marginRight: 10 },
  progressContainer: {
    width: "100%",
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: "#252525",
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#fff",
  },
  progressFill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#26F170",
    width: "100%",
  },
  timeContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 8,
    zIndex: 1,
    minHeight: 40,
  },
  timeText: {
    fontSize: 25,
    fontFamily: fonts.bold,
    color: "#252525",
    fontWeight: "bold",
  },
  controlsContainer: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: 5,
    gap: 8,
  },
  controlButton: {
    borderRadius: 10,
    backgroundColor: "#26F170",
    borderWidth: 2.5,
    borderColor: "#252525",
    justifyContent: "center",
    alignItems: "center",
  },
});
