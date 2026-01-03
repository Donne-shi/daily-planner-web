import { useState, useMemo } from "react";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { FeatherIcon } from "@/components/feather-icon";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useStore } from "@/lib/store";
import { useColors } from "@/hooks/use-colors";
import { YearGoal } from "@/lib/types";

const CATEGORIES = ["工作", "学习", "健康", "财务", "家庭", "个人成长", "其他"];

export default function GoalsScreen() {
  const colors = useColors();
  const {
    state,
    updateSettings,
    addYearGoal,
    updateYearGoal,
    toggleYearGoal,
    deleteYearGoal,
  } = useStore();

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<YearGoal | null>(null);
  const [goalForm, setGoalForm] = useState({
    title: "",
    category: "",
    progress: 0,
    notes: "",
  });

  const yearGoals = useMemo(
    () => state.yearGoals.sort((a, b) => (a.isCompleted ? 1 : 0) - (b.isCompleted ? 1 : 0)),
    [state.yearGoals]
  );

  const handleSaveMission = (text: string) => {
    updateSettings({ mission: text });
  };

  const handleSaveVision = (text: string) => {
    updateSettings({ vision: text });
  };

  const handleAddGoal = () => {
    if (!goalForm.title.trim()) return;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (editingGoal) {
      updateYearGoal({
        ...editingGoal,
        title: goalForm.title.trim(),
        category: goalForm.category || undefined,
        progress: goalForm.progress,
        notes: goalForm.notes || undefined,
      });
    } else {
      addYearGoal({
        title: goalForm.title.trim(),
        category: goalForm.category || undefined,
        progress: goalForm.progress,
        notes: goalForm.notes || undefined,
        isCompleted: false,
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setGoalForm({ title: "", category: "", progress: 0, notes: "" });
    setEditingGoal(null);
    setShowAddGoal(false);
  };

  const handleEditGoal = (goal: YearGoal) => {
    setEditingGoal(goal);
    setGoalForm({
      title: goal.title,
      category: goal.category || "",
      progress: goal.progress,
      notes: goal.notes || "",
    });
    setShowAddGoal(true);
  };

  const handleToggleGoal = (goalId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    toggleYearGoal(goalId);
  };

  const handleDeleteGoal = (goalId: string) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    deleteYearGoal(goalId);
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
          <Text className="text-3xl font-bold text-foreground">目标</Text>
          <Text className="text-muted mt-1">定义你的使命与愿景</Text>
        </View>

        {/* Mission */}
        <View className="mb-6">
          <View className="flex-row items-center mb-3">
            <FeatherIcon name="target" size={20} color={colors.foreground} style={{ marginRight: 8 }} />
            <Text className="text-lg font-semibold text-foreground">
              使命 (Mission)
            </Text>
          </View>
          <TextInput
            className="bg-surface rounded-xl px-4 py-4 text-foreground"
            placeholder="我的人生使命是..."
            placeholderTextColor={colors.muted}
            value={state.settings.mission || ""}
            onChangeText={handleSaveMission}
            multiline
            numberOfLines={3}
            style={{ minHeight: 80, textAlignVertical: "top" }}
          />
        </View>

        {/* Vision */}
        <View className="mb-6">
          <View className="flex-row items-center mb-3">
            <FeatherIcon name="eye" size={20} color={colors.foreground} style={{ marginRight: 8 }} />
            <Text className="text-lg font-semibold text-foreground">
              愿景 (Vision)
            </Text>
          </View>
          <TextInput
            className="bg-surface rounded-xl px-4 py-4 text-foreground"
            placeholder="我希望成为..."
            placeholderTextColor={colors.muted}
            value={state.settings.vision || ""}
            onChangeText={handleSaveVision}
            multiline
            numberOfLines={3}
            style={{ minHeight: 80, textAlignVertical: "top" }}
          />
        </View>

        {/* Year Goals */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <FeatherIcon name="trophy" size={20} color={colors.foreground} style={{ marginRight: 8 }} />
              <Text className="text-lg font-semibold text-foreground">
                年目标
              </Text>
            </View>
            <Pressable
              onPress={() => setShowAddGoal(true)}
              style={({ pressed }) => [
                styles.addGoalButton,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text className="text-white font-medium ml-1">添加</Text>
            </Pressable>
          </View>

          {yearGoals.length === 0 ? (
            <View className="items-center py-8 bg-surface/50 rounded-xl">
              <FeatherIcon name="target" size={48} color={colors.muted} style={{ marginBottom: 8 }} />
              <Text className="text-muted">暂无年目标</Text>
              <Text className="text-muted text-sm mt-1">
                点击上方按钮添加你的年度目标
              </Text>
            </View>
          ) : (
            yearGoals.map((goal) => (
              <View
                key={goal.id}
                className="bg-surface rounded-xl p-4 mb-3"
              >
                <View className="flex-row items-start">
                  <Pressable
                    onPress={() => handleToggleGoal(goal.id)}
                    style={({ pressed }) => [
                      styles.checkbox,
                      { borderColor: colors.primary },
                      goal.isCompleted && { backgroundColor: colors.primary },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    {goal.isCompleted && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </Pressable>
                  <View className="flex-1 ml-3">
                    <Text
                      className={`text-base font-medium ${
                        goal.isCompleted ? "text-muted line-through" : "text-foreground"
                      }`}
                    >
                      {goal.title}
                    </Text>
                    {goal.category && (
                      <View className="flex-row mt-1">
                        <View className="bg-primary/20 px-2 py-0.5 rounded-full">
                          <Text className="text-primary text-xs">{goal.category}</Text>
                        </View>
                      </View>
                    )}
                    {goal.notes && (
                      <Text className="text-muted text-sm mt-2">{goal.notes}</Text>
                    )}
                    
                    {/* Progress Bar */}
                    <View className="mt-3">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-muted text-xs">进度</Text>
                        <Text className="text-foreground text-xs font-medium">
                          {goal.progress}%
                        </Text>
                      </View>
                      <View className="h-2 bg-border rounded-full overflow-hidden">
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${goal.progress}%`,
                            backgroundColor: goal.isCompleted ? colors.success : colors.primary,
                          }}
                        />
                      </View>
                    </View>
                  </View>
                  <View className="flex-row ml-2">
                    <Pressable
                      onPress={() => handleEditGoal(goal)}
                      style={({ pressed }) => [
                        styles.iconButton,
                        pressed && { opacity: 0.5 },
                      ]}
                    >
                      <Ionicons name="create-outline" size={18} color={colors.muted} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteGoal(goal.id)}
                      style={({ pressed }) => [
                        styles.iconButton,
                        pressed && { opacity: 0.5 },
                      ]}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Goal Modal */}
      <Modal
        visible={showAddGoal}
        transparent
        animationType="slide"
        onRequestClose={resetForm}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.background }]}
          >
            <Text className="text-xl font-bold text-foreground mb-4">
              {editingGoal ? "编辑年目标" : "添加年目标"}
            </Text>

            <Text className="text-foreground font-medium mb-2">目标标题</Text>
            <TextInput
              className="bg-surface rounded-xl px-4 py-3 text-foreground mb-4"
              placeholder="输入目标..."
              placeholderTextColor={colors.muted}
              value={goalForm.title}
              onChangeText={(text) => setGoalForm({ ...goalForm, title: text })}
            />

            <Text className="text-foreground font-medium mb-2">分类（可选）</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              <View className="flex-row">
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() =>
                      setGoalForm({
                        ...goalForm,
                        category: goalForm.category === cat ? "" : cat,
                      })
                    }
                    style={({ pressed }) => [
                      styles.categoryChip,
                      {
                        backgroundColor:
                          goalForm.category === cat ? colors.primary : colors.surface,
                        borderColor: colors.border,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text
                      className={`text-sm ${
                        goalForm.category === cat ? "text-white" : "text-foreground"
                      }`}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text className="text-foreground font-medium mb-2">
              进度: {goalForm.progress}%
            </Text>
            <View className="flex-row items-center mb-4">
              <Pressable
                onPress={() =>
                  setGoalForm({
                    ...goalForm,
                    progress: Math.max(0, goalForm.progress - 10),
                  })
                }
                style={({ pressed }) => [
                  styles.progressButton,
                  { backgroundColor: colors.surface },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text className="text-foreground text-lg">-</Text>
              </Pressable>
              <View className="flex-1 mx-3 h-3 bg-surface rounded-full overflow-hidden">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${goalForm.progress}%`,
                    backgroundColor: colors.primary,
                  }}
                />
              </View>
              <Pressable
                onPress={() =>
                  setGoalForm({
                    ...goalForm,
                    progress: Math.min(100, goalForm.progress + 10),
                  })
                }
                style={({ pressed }) => [
                  styles.progressButton,
                  { backgroundColor: colors.surface },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text className="text-foreground text-lg">+</Text>
              </Pressable>
            </View>

            <Text className="text-foreground font-medium mb-2">备注（可选）</Text>
            <TextInput
              className="bg-surface rounded-xl px-4 py-3 text-foreground mb-4"
              placeholder="添加备注..."
              placeholderTextColor={colors.muted}
              value={goalForm.notes}
              onChangeText={(text) => setGoalForm({ ...goalForm, notes: text })}
              multiline
              numberOfLines={2}
            />

            <View className="flex-row gap-3">
              <Pressable
                onPress={resetForm}
                style={({ pressed }) => [
                  styles.modalButton,
                  { backgroundColor: colors.surface },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text className="text-foreground font-medium">取消</Text>
              </Pressable>
              <Pressable
                onPress={handleAddGoal}
                style={({ pressed }) => [
                  styles.modalButton,
                  { backgroundColor: colors.primary, flex: 1 },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text className="text-white font-semibold">
                  {editingGoal ? "保存" : "添加"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  addGoalButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    padding: 4,
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
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    maxHeight: "80%",
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  progressButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
