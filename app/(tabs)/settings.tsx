import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Switch,
  Modal,
  Alert,
  Platform,
  Linking,
} from "react-native";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useStore } from "@/lib/store";
import { useColors } from "@/hooks/use-colors";
import { useThemeContext } from "@/lib/theme-provider";

const APP_VERSION = "1.0.0";

export default function SettingsScreen() {
  const colors = useColors();
  const { state, updateSettings, clearAllData } = useStore();
  const { colorScheme, setColorScheme } = useThemeContext();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleDefaultTimeChange = (delta: number) => {
    const newValue = Math.max(5, Math.min(60, state.settings.defaultPomodoroMinutes + delta));
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    updateSettings({ defaultPomodoroMinutes: newValue });
  };

  const handleMaxTimeChange = (delta: number) => {
    const newValue = Math.max(
      state.settings.defaultPomodoroMinutes,
      Math.min(120, state.settings.maxPomodoroMinutes + delta)
    );
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    updateSettings({ maxPomodoroMinutes: newValue });
  };

  const handleVoiceToggle = (value: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateSettings({ voiceEnabled: value });
  };

  const handleVibrationToggle = (value: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateSettings({ vibrationEnabled: value });
  };

  const handleDarkModeToggle = (value: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setColorScheme(value ? "dark" : "light");
    updateSettings({ darkMode: value });
  };

  const handleClearData = () => {
    setShowClearConfirm(true);
  };

  const confirmClearData = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    await clearAllData();
    setShowClearConfirm(false);
  };

  const handlePrivacyPolicy = () => {
    // In a real app, this would link to your privacy policy
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Alert.alert("隐私政策", "我们重视您的隐私。所有数据均存储在本地设备上，不会上传到服务器。");
  };

  if (state.isLoading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted mt-4">加载中...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="pt-4 pb-6">
          <Text className="text-3xl font-bold text-foreground">设置</Text>
          <Text className="text-muted mt-1">自定义你的应用体验</Text>
        </View>

        {/* Pomodoro Settings */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-foreground mb-3">
            🍅 番茄设置
          </Text>
          <View className="bg-surface rounded-2xl overflow-hidden">
            {/* Default Duration */}
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-border">
              <View>
                <Text className="text-foreground font-medium">默认时长</Text>
                <Text className="text-muted text-sm">每个番茄的默认时间</Text>
              </View>
              <View className="flex-row items-center">
                <Pressable
                  onPress={() => handleDefaultTimeChange(-5)}
                  style={({ pressed }) => [
                    styles.timeButton,
                    { backgroundColor: colors.background },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text className="text-foreground text-lg">-</Text>
                </Pressable>
                <Text className="text-foreground font-semibold mx-3 min-w-[50px] text-center">
                  {state.settings.defaultPomodoroMinutes} 分钟
                </Text>
                <Pressable
                  onPress={() => handleDefaultTimeChange(5)}
                  style={({ pressed }) => [
                    styles.timeButton,
                    { backgroundColor: colors.background },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text className="text-foreground text-lg">+</Text>
                </Pressable>
              </View>
            </View>

            {/* Max Duration */}
            <View className="flex-row items-center justify-between px-4 py-4">
              <View>
                <Text className="text-foreground font-medium">最大时长</Text>
                <Text className="text-muted text-sm">番茄计时器的最大时间</Text>
              </View>
              <View className="flex-row items-center">
                <Pressable
                  onPress={() => handleMaxTimeChange(-5)}
                  style={({ pressed }) => [
                    styles.timeButton,
                    { backgroundColor: colors.background },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text className="text-foreground text-lg">-</Text>
                </Pressable>
                <Text className="text-foreground font-semibold mx-3 min-w-[50px] text-center">
                  {state.settings.maxPomodoroMinutes} 分钟
                </Text>
                <Pressable
                  onPress={() => handleMaxTimeChange(5)}
                  style={({ pressed }) => [
                    styles.timeButton,
                    { backgroundColor: colors.background },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text className="text-foreground text-lg">+</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Notification Settings */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-foreground mb-3">
            🔔 提醒设置
          </Text>
          <View className="bg-surface rounded-2xl overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-border">
              <View>
                <Text className="text-foreground font-medium">提示音</Text>
                <Text className="text-muted text-sm">番茄完成时播放提示音</Text>
              </View>
              <Switch
                value={state.settings.voiceEnabled}
                onValueChange={handleVoiceToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            <View className="flex-row items-center justify-between px-4 py-4">
              <View>
                <Text className="text-foreground font-medium">震动提醒</Text>
                <Text className="text-muted text-sm">番茄完成时震动提醒</Text>
              </View>
              <Switch
                value={state.settings.vibrationEnabled ?? true}
                onValueChange={handleVibrationToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Appearance Settings */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-foreground mb-3">
            🎨 外观
          </Text>
          <View className="bg-surface rounded-2xl overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-4">
              <View>
                <Text className="text-foreground font-medium">深色模式</Text>
                <Text className="text-muted text-sm">切换深色/浅色主题</Text>
              </View>
              <Switch
                value={colorScheme === "dark"}
                onValueChange={handleDarkModeToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Data Management */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-foreground mb-3">
            💾 数据管理
          </Text>
          <View className="bg-surface rounded-2xl overflow-hidden">
            <Pressable
              onPress={handleClearData}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && { opacity: 0.7 },
              ]}
            >
              <View className="flex-row items-center">
                <Ionicons name="trash-outline" size={20} color={colors.error} />
                <Text className="text-error font-medium ml-3">清除全部数据</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
          </View>
          <Text className="text-muted text-xs mt-2 px-2">
            此操作将删除所有任务、番茄记录和设置，且无法恢复。
          </Text>
        </View>

        {/* About */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-foreground mb-3">
            ℹ️ 关于
          </Text>
          <View className="bg-surface rounded-2xl overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-border">
              <Text className="text-foreground font-medium">版本号</Text>
              <Text className="text-muted">{APP_VERSION}</Text>
            </View>
            <Pressable
              onPress={handlePrivacyPolicy}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text className="text-foreground font-medium">隐私政策</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        {/* App Info */}
        <View className="items-center py-8">
          <Text className="text-4xl mb-2">🍅</Text>
          <Text className="text-foreground font-semibold">时间好管家</Text>
          <Text className="text-muted text-sm mt-1">
            专注效率，成就更好的自己
          </Text>
        </View>
      </ScrollView>

      {/* Clear Data Confirmation Modal */}
      <Modal
        visible={showClearConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.background }]}
          >
            <View className="items-center mb-4">
              <Ionicons name="warning-outline" size={48} color={colors.warning} />
            </View>
            <Text className="text-xl font-bold text-foreground text-center mb-2">
              确认清除数据？
            </Text>
            <Text className="text-muted text-center mb-6">
              此操作将删除所有任务、番茄记录、目标和设置。此操作无法撤销。
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowClearConfirm(false)}
                style={({ pressed }) => [
                  styles.modalButton,
                  { backgroundColor: colors.surface, flex: 1 },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text className="text-foreground font-medium">取消</Text>
              </Pressable>
              <Pressable
                onPress={confirmClearData}
                style={({ pressed }) => [
                  styles.modalButton,
                  { backgroundColor: colors.error, flex: 1 },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text className="text-white font-semibold">确认清除</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  timeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
