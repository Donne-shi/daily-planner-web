import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
  Dimensions,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useStore, getToday } from "@/lib/store";
import { useColors } from "@/hooks/use-colors";
import { ENERGY_TAGS, EnergyTag } from "@/lib/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CIRCLE_SIZE = Math.min(SCREEN_WIDTH * 0.7, 280);
const STROKE_WIDTH = 14;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Time options for slider (5-60 minutes, step 5)
const TIME_OPTIONS = Array.from({ length: 12 }, (_, i) => (i + 1) * 5);
const SLIDER_ITEM_WIDTH = 60;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type TimerStatus = "idle" | "running";

export default function FocusScreen() {
  useKeepAwake();
  
  const colors = useColors();
  const router = useRouter();
  const { state, addSession } = useStore();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const defaultIndex = TIME_OPTIONS.indexOf(state.settings.defaultPomodoroMinutes);
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex >= 0 ? defaultIndex : 4);
  const [duration, setDuration] = useState(TIME_OPTIONS[selectedIndex]);
  const [remainingSeconds, setRemainingSeconds] = useState(duration * 60);
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [showFeedback, setShowFeedback] = useState(false);
  const [energyScore, setEnergyScore] = useState<number | null>(null);
  const [energyTag, setEnergyTag] = useState<EnergyTag | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progress = useSharedValue(1); // 1 = full, 0 = empty

  // Update remaining seconds when duration changes (only in idle state)
  useEffect(() => {
    if (status === "idle") {
      setRemainingSeconds(duration * 60);
      progress.value = 1;
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

  // Update progress animation - circle decreases as time passes
  useEffect(() => {
    if (status === "running") {
      const totalSeconds = duration * 60;
      const remainingRatio = remainingSeconds / totalSeconds;
      progress.value = withTiming(remainingRatio, {
        duration: 900,
        easing: Easing.linear,
      });
    }
  }, [remainingSeconds, duration, status]);

  const handleTimerComplete = useCallback(() => {
    setStatus("idle");
    progress.value = 1;
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

  const handleStop = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    setStatus("idle");
    setRemainingSeconds(duration * 60);
    progress.value = withTiming(1, { duration: 300 });
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
    progress.value = withTiming(1, { duration: 300 });
  };

  const handleBack = () => {
    if (status === "running") {
      // Confirm before leaving
      handleStop();
    }
    router.back();
  };

  // Handle time slider scroll
  const handleScroll = (event: any) => {
    if (status !== "idle") return;
    
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SLIDER_ITEM_WIDTH);
    const clampedIndex = Math.max(0, Math.min(TIME_OPTIONS.length - 1, index));
    
    if (clampedIndex !== selectedIndex) {
      setSelectedIndex(clampedIndex);
      setDuration(TIME_OPTIONS[clampedIndex]);
      if (Platform.OS !== "web") {
        Haptics.selectionAsync();
      }
    }
  };

  const handleScrollEnd = (event: any) => {
    if (status !== "idle") return;
    
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SLIDER_ITEM_WIDTH);
    const clampedIndex = Math.max(0, Math.min(TIME_OPTIONS.length - 1, index));
    
    // Snap to nearest item
    scrollViewRef.current?.scrollTo({
      x: clampedIndex * SLIDER_ITEM_WIDTH,
      animated: true,
    });
    
    setSelectedIndex(clampedIndex);
    setDuration(TIME_OPTIONS[clampedIndex]);
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Animated props for the progress circle
  const animatedCircleProps = useAnimatedProps(() => {
    const strokeDashoffset = CIRCUMFERENCE * (1 - progress.value);
    return {
      strokeDashoffset,
    };
  });

  // Animated style for circle glow effect
  const animatedGlowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 0.3, 1], [0.3, 0.6, 1]);
    return {
      opacity,
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
        <View style={styles.circleContainer}>
          {/* SVG Progress Circle */}
          <Animated.View style={[styles.svgContainer, animatedGlowStyle]}>
            <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
              {/* Background circle */}
              <Circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                stroke={colors.surface}
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              {/* Progress circle - decreases as time passes */}
              <AnimatedCircle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                stroke={colors.primary}
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                animatedProps={animatedCircleProps}
                rotation="-90"
                origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
              />
            </Svg>
          </Animated.View>
          
          {/* Center content */}
          <View style={styles.centerContent}>
            <Text className="text-5xl mb-2">🍅</Text>
            <Text
              className="text-5xl font-bold text-foreground"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {formatTime(remainingSeconds)}
            </Text>
            {status === "idle" && (
              <Text className="text-muted text-sm mt-3">
                滑动下方选择时间
              </Text>
            )}
            {status === "running" && (
              <Text className="text-primary text-sm mt-3 font-medium">
                专注中...
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Time Slider - Only show in idle state */}
      {status === "idle" && (
        <View className="mb-6">
          <View className="items-center mb-2">
            <Text className="text-lg font-semibold text-foreground">
              {duration} 分钟
            </Text>
          </View>
          
          <View style={styles.sliderContainer}>
            {/* Left fade indicator */}
            <View style={[styles.fadeIndicator, styles.fadeLeft, { backgroundColor: colors.background }]} />
            
            {/* Center indicator line */}
            <View style={[styles.centerIndicator, { backgroundColor: colors.primary }]} />
            
            <ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={SLIDER_ITEM_WIDTH}
              decelerationRate="fast"
              contentContainerStyle={{
                paddingHorizontal: (SCREEN_WIDTH - SLIDER_ITEM_WIDTH) / 2,
              }}
              onScroll={handleScroll}
              onMomentumScrollEnd={handleScrollEnd}
              scrollEventThrottle={16}
            >
              {TIME_OPTIONS.map((time, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <Pressable
                    key={time}
                    onPress={() => {
                      setSelectedIndex(index);
                      setDuration(time);
                      scrollViewRef.current?.scrollTo({
                        x: index * SLIDER_ITEM_WIDTH,
                        animated: true,
                      });
                      if (Platform.OS !== "web") {
                        Haptics.selectionAsync();
                      }
                    }}
                    style={[
                      styles.sliderItem,
                      { width: SLIDER_ITEM_WIDTH },
                    ]}
                  >
                    <Text
                      className={`text-lg font-medium ${
                        isSelected ? "text-primary" : "text-muted"
                      }`}
                      style={[
                        isSelected && { fontSize: 22, fontWeight: "700" },
                      ]}
                    >
                      {time}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            
            {/* Right fade indicator */}
            <View style={[styles.fadeIndicator, styles.fadeRight, { backgroundColor: colors.background }]} />
          </View>
          
          <Text className="text-center text-muted text-xs mt-2">
            左右滑动选择专注时长
          </Text>
        </View>
      )}

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
          <Pressable
            onPress={handleStop}
            style={({ pressed }) => [
              styles.mainButton,
              { backgroundColor: colors.error },
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <IconSymbol name="stop.fill" size={28} color="#fff" />
            <Text className="text-white text-lg font-semibold ml-2">放弃</Text>
          </Pressable>
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
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  sliderContainer: {
    height: 60,
    position: "relative",
  },
  sliderItem: {
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  centerIndicator: {
    position: "absolute",
    top: 0,
    left: "50%",
    marginLeft: -1,
    width: 2,
    height: 60,
    zIndex: 10,
    opacity: 0.3,
  },
  fadeIndicator: {
    position: "absolute",
    top: 0,
    width: 60,
    height: 60,
    zIndex: 5,
  },
  fadeLeft: {
    left: 0,
  },
  fadeRight: {
    right: 0,
  },
  mainButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
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
