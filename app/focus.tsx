import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useStore, getToday } from "@/lib/store";
import { useColors } from "@/hooks/use-colors";
import { ENERGY_TAGS, EnergyTag } from "@/lib/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CIRCLE_SIZE = Math.min(SCREEN_WIDTH * 0.7, 280);
const STROKE_WIDTH = 12;

type TimerStatus = "idle" | "running" | "paused";

export default function FocusScreen() {
  useKeepAwake();
  
  const colors = useColors();
  const router = useRouter();
  const { state, addSession } = useStore();
  
  const [duration, setDuration] = useState(state.settings.defaultPomodoroMinutes);
  const [remainingSeconds, setRemainingSeconds] = useState(duration * 60);
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [showFeedback, setShowFeedback] = useState(false);
  const [energyScore, setEnergyScore] = useState<number | null>(null);
  const [energyTag, setEnergyTag] = useState<EnergyTag | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progress = useSharedValue(0);

  // Update remaining seconds when duration changes (only in idle state)
  useEffect(() => {
    if (status === "idle") {
      setRemainingSeconds(duration * 60);
    }
  }, [duration, status]);

  // Timer logic
  useEffect(() => {
    if (status === "running") {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            // Timer completed
            clearInterval(timerRef.current!);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [status]);

  // Update progress animation
  useEffect(() => {
    const totalSeconds = duration * 60;
    const currentProgress = (totalSeconds - remainingSeconds) / totalSeconds;
    progress.value = withTiming(currentProgress, {
      duration: 300,
      easing: Easing.linear,
    });
  }, [remainingSeconds, duration]);

  const handleTimerComplete = useCallback(() => {
    setStatus("idle");
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // Show feedback modal
    setShowFeedback(true);
  }, []);

  const handleStart = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSessionStartTime(new Date().toISOString());
    setStatus("running");
  };

  const handlePause = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setStatus("paused");
  };

  const handleResume = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setStatus("running");
  };

  const handleStop = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    setStatus("idle");
    setRemainingSeconds(duration * 60);
    progress.value = withTiming(0, { duration: 300 });
    setSessionStartTime(null);
  };

  const handleSaveSession = (skip: boolean = false) => {
    if (sessionStartTime) {
      addSession({
        startAt: sessionStartTime,
        endAt: new Date().toISOString(),
        durationMinutes: duration,
        date: getToday(),
        isCompleted: true,
        energyScore: skip ? null : energyScore,
        energyTag: skip ? null : energyTag,
      });
    }
    
    // Reset state
    setShowFeedback(false);
    setEnergyScore(null);
    setEnergyTag(null);
    setSessionStartTime(null);
    setRemainingSeconds(duration * 60);
    progress.value = withTiming(0, { duration: 300 });
  };

  const handleBack = () => {
    if (status === "running" || status === "paused") {
      // Confirm before leaving
      handleStop();
    }
    router.back();
  };

  // Gesture for adjusting duration (only in idle state)
  const panGesture = Gesture.Pan()
    .enabled(status === "idle")
    .runOnJS(true)
    .onUpdate((event) => {
      const delta = -event.translationY / 10;
      const newDuration = Math.round(
        Math.min(
          state.settings.maxPomodoroMinutes,
          Math.max(5, duration + delta)
        )
      );
      if (newDuration !== duration) {
        setDuration(newDuration);
        if (Platform.OS !== "web") {
          Haptics.selectionAsync();
        }
      }
    });

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Progress circle animation
  const circumference = (CIRCLE_SIZE - STROKE_WIDTH) * Math.PI;
  const animatedCircleStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
    };
  });

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="flex-1">
      {/* Header */}
      <View className="flex-row items-center px-4 py-2">
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <IconSymbol name="chevron.left" size={28} color={colors.foreground} />
        </Pressable>
        <Text className="flex-1 text-center text-xl font-semibold text-foreground">
          番茄任务
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* Timer Circle */}
      <View className="flex-1 items-center justify-center">
        <GestureDetector gesture={panGesture}>
          <View style={styles.circleContainer}>
            <Animated.View style={styles.svgContainer}>
              {/* Background circle */}
              <View
                style={[
                  styles.circleBackground,
                  {
                    width: CIRCLE_SIZE,
                    height: CIRCLE_SIZE,
                    borderRadius: CIRCLE_SIZE / 2,
                    borderWidth: STROKE_WIDTH,
                    borderColor: colors.surface,
                  },
                ]}
              />
              {/* Progress circle (simplified without SVG for web compatibility) */}
              <Animated.View
                style={[
                  styles.progressRing,
                  {
                    width: CIRCLE_SIZE,
                    height: CIRCLE_SIZE,
                    borderRadius: CIRCLE_SIZE / 2,
                    borderWidth: STROKE_WIDTH,
                    borderColor: colors.primary,
                  },
                  animatedCircleStyle,
                ]}
              />
            </Animated.View>
            
            {/* Center content */}
            <View style={styles.centerContent}>
              <Text className="text-6xl mb-2">🍅</Text>
              <Text
                className="text-4xl font-bold text-foreground"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {formatTime(remainingSeconds)}
              </Text>
              {status === "idle" && (
                <Text className="text-muted text-sm mt-2">
                  上下滑动调整时间
                </Text>
              )}
            </View>
          </View>
        </GestureDetector>

        {/* Duration indicator */}
        {status === "idle" && (
          <Text className="text-muted mt-4">
            {duration} 分钟
          </Text>
        )}
      </View>

      {/* Control Buttons */}
      <View className="px-6 pb-8">
        {status === "idle" && (
          <Pressable
            onPress={handleStart}
            style={({ pressed }) => [
              styles.mainButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <IconSymbol name="play.fill" size={28} color="#fff" />
            <Text className="text-white text-lg font-semibold ml-2">开始专注</Text>
          </Pressable>
        )}

        {status === "running" && (
          <View className="flex-row justify-center gap-4">
            <Pressable
              onPress={handlePause}
              style={({ pressed }) => [
                styles.controlButton,
                { backgroundColor: colors.warning },
                pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
              ]}
            >
              <IconSymbol name="pause.fill" size={24} color="#fff" />
              <Text className="text-white font-semibold ml-2">暂停</Text>
            </Pressable>
            <Pressable
              onPress={handleStop}
              style={({ pressed }) => [
                styles.controlButton,
                { backgroundColor: colors.error },
                pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
              ]}
            >
              <IconSymbol name="stop.fill" size={24} color="#fff" />
              <Text className="text-white font-semibold ml-2">放弃</Text>
            </Pressable>
          </View>
        )}

        {status === "paused" && (
          <View className="flex-row justify-center gap-4">
            <Pressable
              onPress={handleResume}
              style={({ pressed }) => [
                styles.controlButton,
                { backgroundColor: colors.success },
                pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
              ]}
            >
              <IconSymbol name="play.fill" size={24} color="#fff" />
              <Text className="text-white font-semibold ml-2">继续</Text>
            </Pressable>
            <Pressable
              onPress={handleStop}
              style={({ pressed }) => [
                styles.controlButton,
                { backgroundColor: colors.error },
                pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
              ]}
            >
              <IconSymbol name="stop.fill" size={24} color="#fff" />
              <Text className="text-white font-semibold ml-2">放弃</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Energy Feedback Modal */}
      <Modal
        visible={showFeedback}
        transparent
        animationType="fade"
        onRequestClose={() => handleSaveSession(true)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.background }]}
          >
            <Text className="text-2xl mb-2">🎉</Text>
            <Text className="text-xl font-bold text-foreground mb-4">
              番茄完成！
            </Text>
            <Text className="text-foreground text-center mb-6">
              这段专注的精力状态如何？
            </Text>

            {/* Energy Score */}
            <View className="flex-row justify-center mb-4">
              {[1, 2, 3, 4, 5].map((score) => (
                <Pressable
                  key={score}
                  onPress={() => {
                    setEnergyScore(score);
                    if (Platform.OS !== "web") {
                      Haptics.selectionAsync();
                    }
                  }}
                  style={({ pressed }) => [
                    styles.scoreButton,
                    {
                      backgroundColor:
                        energyScore === score ? colors.primary : colors.surface,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text
                    className={`text-lg font-bold ${
                      energyScore === score ? "text-white" : "text-foreground"
                    }`}
                  >
                    {score}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text className="text-muted text-sm mb-4">1=低 → 5=高</Text>

            {/* Energy Tags */}
            <View className="flex-row flex-wrap justify-center mb-6">
              {ENERGY_TAGS.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => {
                    setEnergyTag(energyTag === tag ? null : tag);
                    if (Platform.OS !== "web") {
                      Haptics.selectionAsync();
                    }
                  }}
                  style={({ pressed }) => [
                    styles.tagButton,
                    {
                      backgroundColor:
                        energyTag === tag ? colors.primary : colors.surface,
                      borderColor: colors.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text
                    className={`text-sm ${
                      energyTag === tag ? "text-white" : "text-foreground"
                    }`}
                  >
                    {tag}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Actions */}
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => handleSaveSession(true)}
                style={({ pressed }) => [
                  styles.modalButton,
                  { backgroundColor: colors.surface },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text className="text-foreground font-medium">跳过</Text>
              </Pressable>
              <Pressable
                onPress={() => handleSaveSession(false)}
                style={({ pressed }) => [
                  styles.modalButton,
                  { backgroundColor: colors.primary, flex: 1 },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text className="text-white font-semibold">保存</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  circleContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  svgContainer: {
    position: "absolute",
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
  },
  circleBackground: {
    position: "absolute",
  },
  progressRing: {
    position: "absolute",
    opacity: 0.3,
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  mainButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
  },
  controlButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 120,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  scoreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  tagButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 4,
    borderWidth: 1,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
