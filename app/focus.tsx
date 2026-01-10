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
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useRef, useState, useEffect, useCallback } from "react";

import { ScreenContainer } from "@/components/screen-container";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useStore, getToday } from "@/lib/store";
import { useColors } from "@/hooks/use-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ENERGY_TAGS, EnergyTag } from "@/lib/types";
import { Image } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CIRCLE_SIZE = Math.min(SCREEN_WIDTH * 0.8, 320);
const STROKE_WIDTH = 16;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Time options for slider (5-60 minutes, step 5)
const TIME_OPTIONS = Array.from({ length: 12 }, (_, i) => (i + 1) * 5);
const SLIDER_ITEM_WIDTH = 60;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type TimerStatus = "idle" | "running";

// Play completion sound with multiple beeps (3 seconds total)
const playCompletionSound = () => {
  if (Platform.OS === "web") {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Play beeps for 3 seconds total
      const beepDuration = 0.4;
      const beeps = [
        { frequency: 800, delay: 0 },
        { frequency: 1000, delay: 500 },
        { frequency: 1200, delay: 1000 },
        { frequency: 1000, delay: 1500 },
        { frequency: 1200, delay: 2000 },
        { frequency: 800, delay: 2500 },
      ];
      
      beeps.forEach(({ frequency, delay }) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = frequency;
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + beepDuration);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + beepDuration);
        }, delay);
      });
    } catch (e) {
      console.log("Audio not supported");
    }
  }
};

export default function FocusScreen() {
  useKeepAwake();
  
  const colors = useColors();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { state, addSession } = useStore();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const defaultIndex = TIME_OPTIONS.indexOf(state.settings.defaultPomodoroMinutes);
  const initialIndex = defaultIndex >= 0 ? defaultIndex : 4; // 25 minutes is index 4
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [duration, setDuration] = useState(TIME_OPTIONS[initialIndex]);
  const [remainingSeconds, setRemainingSeconds] = useState(duration * 60);
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [showFeedback, setShowFeedback] = useState(false);
  const [energyScore, setEnergyScore] = useState<number | null>(null);
  const [energyTag, setEnergyTag] = useState<EnergyTag | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progress = useSharedValue(1); // 1 = full, 0 = empty
  const hasInitializedScroll = useRef(false);

  // Scroll to default position on mount
  useEffect(() => {
    if (!hasInitializedScroll.current && scrollViewRef.current) {
      const targetIndex = defaultIndex >= 0 ? defaultIndex : 4; // 25 minutes is index 4
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: targetIndex * SLIDER_ITEM_WIDTH,
          animated: false,
        });
      }, 100);
      hasInitializedScroll.current = true;
    }
  }, [defaultIndex]);

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
    
    // Vibration feedback based on settings
    if (Platform.OS !== "web" && state.settings.vibrationEnabled) {
      // Play success haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // Audio feedback based on settings
    if (state.settings.voiceEnabled) {
      // Play completion sound using Web Audio API or expo-audio
      playCompletionSound();
    }
    
    // Browser notification for web when app is in background
    if (Platform.OS === "web" && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("番茄时钟完成", {
          body: duration + "分钟的专注时间已完成！",
          icon: "/assets/images/icon.png",
          tag: "pomodoro-complete",
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification("番茄时钟完成", {
              body: duration + "分钟的专注时间已完成！",
              icon: "/assets/images/icon.png",
              tag: "pomodoro-complete",
            });
          }
        });
      }
    }
    
    // Show feedback modal
    setShowFeedback(true);
  }, [state.settings.vibrationEnabled, state.settings.voiceEnabled, duration]);

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
      <View className="flex-row items-center px-4 py-3" style={{ zIndex: 100 }}>
        <Pressable
          onPress={handleBack}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.7, backgroundColor: colorScheme === 'light' ? colors.primary : colors.surface },
          ]}
        >
          <Ionicons name="chevron-back" size={26} color={colorScheme === 'light' ? '#fff' : colors.foreground} />
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
            <Image
              source={require("@/assets/images/icon.png")}
              style={{
                width: status === "running" ? 72 : 48,
                height: status === "running" ? 72 : 48,
                marginBottom: 8,
                borderRadius: status === "running" ? 18 : 12,
              }}
            />
            <Text
              className="font-bold text-foreground"
              style={{ 
                fontSize: status === "running" ? 64 : 48,
                fontVariant: ["tabular-nums"],
                letterSpacing: status === "running" ? 2 : 0,
              }}
            >
              {formatTime(remainingSeconds)}
            </Text>
            {status === "idle" && (
              <Text className="text-muted text-sm mt-3">
                滑动下方选择时间
              </Text>
            )}
            {status === "running" && (
              <View className="items-center mt-3">
                <Text className="text-primary text-sm font-medium">
                  专注中...
                </Text>
                <Text className="text-muted text-xs mt-1" style={{ fontVariant: ["tabular-nums"] }}>
                  已专注 {formatTime(duration * 60 - remainingSeconds)}
                </Text>
              </View>
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
            <Ionicons name="play" size={26} color="#fff" />
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
            <Ionicons name="close" size={26} color="#fff" />
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
            <Text className="text-xl font-bold text-foreground mb-4">
              番茄完成！
            </Text>
            <Text className="text-foreground text-center mb-6">
              这段专注的精力状态如何？
            </Text>

            {/* Energy Score - 1-5 Rating */}
            <View className="mb-8">
              <View className="flex-row justify-center gap-3 mb-3">
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
                      className={`text-2xl font-bold ${
                        energyScore === score ? "text-white" : "text-foreground"
                      }`}
                    >
                      {score}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text className="text-muted text-xs text-center">1=低能 2=疲惫 3=平稳 4=高能 5=心流</Text>
            </View>

            {/* Actions */}
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => handleSaveSession(true)}
                style={({ pressed }) => [
                  styles.modalButton,
                  { backgroundColor: colorScheme === 'light' ? colors.primary : colors.surface },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text className={`font-medium ${colorScheme === 'light' ? 'text-white' : 'text-foreground'}`}>跳过</Text>
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
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
