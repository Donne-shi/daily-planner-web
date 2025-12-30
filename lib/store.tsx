import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TodoTask,
  PomodoroSession,
  WeeklyGoal,
  WeeklyReflection,
  YearGoal,
  AppSettings,
  DEFAULT_SETTINGS,
} from './types';

// Storage keys
const STORAGE_KEYS = {
  TASKS: 'daily_planner_tasks',
  SESSIONS: 'daily_planner_sessions',
  WEEKLY_GOALS: 'daily_planner_weekly_goals',
  WEEKLY_REFLECTIONS: 'daily_planner_weekly_reflections',
  YEAR_GOALS: 'daily_planner_year_goals',
  SETTINGS: 'daily_planner_settings',
};

// State interface
interface AppState {
  tasks: TodoTask[];
  sessions: PomodoroSession[];
  weeklyGoals: WeeklyGoal[];
  weeklyReflections: WeeklyReflection[];
  yearGoals: YearGoal[];
  settings: AppSettings;
  isLoading: boolean;
}

// Action types
type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOAD_DATA'; payload: Partial<AppState> }
  | { type: 'ADD_TASK'; payload: TodoTask }
  | { type: 'UPDATE_TASK'; payload: TodoTask }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'ADD_SESSION'; payload: PomodoroSession }
  | { type: 'ADD_WEEKLY_GOAL'; payload: WeeklyGoal }
  | { type: 'UPDATE_WEEKLY_GOAL'; payload: WeeklyGoal }
  | { type: 'DELETE_WEEKLY_GOAL'; payload: string }
  | { type: 'ADD_WEEKLY_REFLECTION'; payload: WeeklyReflection }
  | { type: 'UPDATE_WEEKLY_REFLECTION'; payload: WeeklyReflection }
  | { type: 'ADD_YEAR_GOAL'; payload: YearGoal }
  | { type: 'UPDATE_YEAR_GOAL'; payload: YearGoal }
  | { type: 'DELETE_YEAR_GOAL'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'CLEAR_ALL_DATA' };

// Initial state
const initialState: AppState = {
  tasks: [],
  sessions: [],
  weeklyGoals: [],
  weeklyReflections: [],
  yearGoals: [],
  settings: DEFAULT_SETTINGS,
  isLoading: true,
};

// Reducer
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOAD_DATA':
      return { ...state, ...action.payload, isLoading: false };
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.payload.id ? action.payload : t)),
      };
    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.payload) };
    case 'ADD_SESSION':
      return { ...state, sessions: [...state.sessions, action.payload] };
    case 'ADD_WEEKLY_GOAL':
      return { ...state, weeklyGoals: [...state.weeklyGoals, action.payload] };
    case 'UPDATE_WEEKLY_GOAL':
      return {
        ...state,
        weeklyGoals: state.weeklyGoals.map((g) => (g.id === action.payload.id ? action.payload : g)),
      };
    case 'DELETE_WEEKLY_GOAL':
      return { ...state, weeklyGoals: state.weeklyGoals.filter((g) => g.id !== action.payload) };
    case 'ADD_WEEKLY_REFLECTION':
      return { ...state, weeklyReflections: [...state.weeklyReflections, action.payload] };
    case 'UPDATE_WEEKLY_REFLECTION':
      return {
        ...state,
        weeklyReflections: state.weeklyReflections.map((r) =>
          r.id === action.payload.id ? action.payload : r
        ),
      };
    case 'ADD_YEAR_GOAL':
      return { ...state, yearGoals: [...state.yearGoals, action.payload] };
    case 'UPDATE_YEAR_GOAL':
      return {
        ...state,
        yearGoals: state.yearGoals.map((g) => (g.id === action.payload.id ? action.payload : g)),
      };
    case 'DELETE_YEAR_GOAL':
      return { ...state, yearGoals: state.yearGoals.filter((g) => g.id !== action.payload) };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'CLEAR_ALL_DATA':
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
}

// Context
interface StoreContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Task actions
  addTask: (task: Omit<TodoTask, 'id' | 'createdAt'>) => void;
  toggleTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  // Session actions
  addSession: (session: Omit<PomodoroSession, 'id'>) => void;
  // Weekly goal actions
  addWeeklyGoal: (goal: Omit<WeeklyGoal, 'id' | 'createdAt'>) => void;
  toggleWeeklyGoal: (goalId: string) => void;
  deleteWeeklyGoal: (goalId: string) => void;
  // Weekly reflection actions
  saveWeeklyReflection: (reflection: Omit<WeeklyReflection, 'id' | 'createdAt'>) => void;
  // Year goal actions
  addYearGoal: (goal: Omit<YearGoal, 'id' | 'createdAt'>) => void;
  updateYearGoal: (goal: YearGoal) => void;
  toggleYearGoal: (goalId: string) => void;
  deleteYearGoal: (goalId: string) => void;
  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  clearAllData: () => void;
  // Computed values
  getTodayTasks: () => TodoTask[];
  getTodaySessions: () => PomodoroSession[];
  getWeekSessions: (weekStartDate: string) => PomodoroSession[];
  getTasksByDate: (date: string) => TodoTask[];
  getSessionsByDate: (date: string) => PomodoroSession[];
  getCurrentWeekGoals: () => WeeklyGoal[];
  getCurrentWeekReflection: () => WeeklyReflection | undefined;
}

const StoreContext = createContext<StoreContextType | null>(null);

// Helper functions
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekStartDate(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// Provider component
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load data from AsyncStorage on mount
  useEffect(() => {
    loadData();
  }, []);

  // Save data to AsyncStorage whenever state changes
  useEffect(() => {
    if (!state.isLoading) {
      saveData();
    }
  }, [state.tasks, state.sessions, state.weeklyGoals, state.weeklyReflections, state.yearGoals, state.settings]);

  const loadData = async () => {
    try {
      const [tasks, sessions, weeklyGoals, weeklyReflections, yearGoals, settings] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.TASKS),
        AsyncStorage.getItem(STORAGE_KEYS.SESSIONS),
        AsyncStorage.getItem(STORAGE_KEYS.WEEKLY_GOALS),
        AsyncStorage.getItem(STORAGE_KEYS.WEEKLY_REFLECTIONS),
        AsyncStorage.getItem(STORAGE_KEYS.YEAR_GOALS),
        AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
      ]);

      dispatch({
        type: 'LOAD_DATA',
        payload: {
          tasks: tasks ? JSON.parse(tasks) : [],
          sessions: sessions ? JSON.parse(sessions) : [],
          weeklyGoals: weeklyGoals ? JSON.parse(weeklyGoals) : [],
          weeklyReflections: weeklyReflections ? JSON.parse(weeklyReflections) : [],
          yearGoals: yearGoals ? JSON.parse(yearGoals) : [],
          settings: settings ? { ...DEFAULT_SETTINGS, ...JSON.parse(settings) } : DEFAULT_SETTINGS,
        },
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const saveData = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(state.tasks)),
        AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(state.sessions)),
        AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_GOALS, JSON.stringify(state.weeklyGoals)),
        AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_REFLECTIONS, JSON.stringify(state.weeklyReflections)),
        AsyncStorage.setItem(STORAGE_KEYS.YEAR_GOALS, JSON.stringify(state.yearGoals)),
        AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings)),
      ]);
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  };

  // Task actions
  const addTask = useCallback((task: Omit<TodoTask, 'id' | 'createdAt'>) => {
    const newTask: TodoTask = {
      ...task,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_TASK', payload: newTask });
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (task) {
      const updatedTask: TodoTask = {
        ...task,
        isCompleted: !task.isCompleted,
        completedAt: !task.isCompleted ? new Date().toISOString() : null,
      };
      dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
    }
  }, [state.tasks]);

  const deleteTask = useCallback((taskId: string) => {
    dispatch({ type: 'DELETE_TASK', payload: taskId });
  }, []);

  // Session actions
  const addSession = useCallback((session: Omit<PomodoroSession, 'id'>) => {
    const newSession: PomodoroSession = {
      ...session,
      id: generateId(),
    };
    dispatch({ type: 'ADD_SESSION', payload: newSession });
  }, []);

  // Weekly goal actions
  const addWeeklyGoal = useCallback((goal: Omit<WeeklyGoal, 'id' | 'createdAt'>) => {
    const newGoal: WeeklyGoal = {
      ...goal,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_WEEKLY_GOAL', payload: newGoal });
  }, []);

  const toggleWeeklyGoal = useCallback((goalId: string) => {
    const goal = state.weeklyGoals.find((g) => g.id === goalId);
    if (goal) {
      dispatch({ type: 'UPDATE_WEEKLY_GOAL', payload: { ...goal, isCompleted: !goal.isCompleted } });
    }
  }, [state.weeklyGoals]);

  const deleteWeeklyGoal = useCallback((goalId: string) => {
    dispatch({ type: 'DELETE_WEEKLY_GOAL', payload: goalId });
  }, []);

  // Weekly reflection actions
  const saveWeeklyReflection = useCallback((reflection: Omit<WeeklyReflection, 'id' | 'createdAt'>) => {
    const existing = state.weeklyReflections.find((r) => r.weekStartDate === reflection.weekStartDate);
    if (existing) {
      dispatch({
        type: 'UPDATE_WEEKLY_REFLECTION',
        payload: { ...existing, ...reflection },
      });
    } else {
      const newReflection: WeeklyReflection = {
        ...reflection,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_WEEKLY_REFLECTION', payload: newReflection });
    }
  }, [state.weeklyReflections]);

  // Year goal actions
  const addYearGoal = useCallback((goal: Omit<YearGoal, 'id' | 'createdAt'>) => {
    const newGoal: YearGoal = {
      ...goal,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_YEAR_GOAL', payload: newGoal });
  }, []);

  const updateYearGoal = useCallback((goal: YearGoal) => {
    dispatch({ type: 'UPDATE_YEAR_GOAL', payload: goal });
  }, []);

  const toggleYearGoal = useCallback((goalId: string) => {
    const goal = state.yearGoals.find((g) => g.id === goalId);
    if (goal) {
      dispatch({
        type: 'UPDATE_YEAR_GOAL',
        payload: { ...goal, isCompleted: !goal.isCompleted, progress: !goal.isCompleted ? 100 : goal.progress },
      });
    }
  }, [state.yearGoals]);

  const deleteYearGoal = useCallback((goalId: string) => {
    dispatch({ type: 'DELETE_YEAR_GOAL', payload: goalId });
  }, []);

  // Settings actions
  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  }, []);

  const clearAllData = useCallback(async () => {
    try {
      await Promise.all(Object.values(STORAGE_KEYS).map((key) => AsyncStorage.removeItem(key)));
      dispatch({ type: 'CLEAR_ALL_DATA' });
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }, []);

  // Computed values
  const getTodayTasks = useCallback(() => {
    const today = getToday();
    return state.tasks.filter((t) => t.date === today);
  }, [state.tasks]);

  const getTodaySessions = useCallback(() => {
    const today = getToday();
    return state.sessions.filter((s) => s.date === today && s.isCompleted);
  }, [state.sessions]);

  const getWeekSessions = useCallback((weekStartDate: string) => {
    const start = new Date(weekStartDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return state.sessions.filter((s) => {
      const sessionDate = new Date(s.date);
      return sessionDate >= start && sessionDate < end && s.isCompleted;
    });
  }, [state.sessions]);

  const getTasksByDate = useCallback((date: string) => {
    return state.tasks.filter((t) => t.date === date);
  }, [state.tasks]);

  const getSessionsByDate = useCallback((date: string) => {
    return state.sessions.filter((s) => s.date === date && s.isCompleted);
  }, [state.sessions]);

  const getCurrentWeekGoals = useCallback(() => {
    const weekStart = getWeekStartDate();
    return state.weeklyGoals.filter((g) => g.weekStartDate === weekStart);
  }, [state.weeklyGoals]);

  const getCurrentWeekReflection = useCallback(() => {
    const weekStart = getWeekStartDate();
    return state.weeklyReflections.find((r) => r.weekStartDate === weekStart);
  }, [state.weeklyReflections]);

  const value: StoreContextType = {
    state,
    dispatch,
    addTask,
    toggleTask,
    deleteTask,
    addSession,
    addWeeklyGoal,
    toggleWeeklyGoal,
    deleteWeeklyGoal,
    saveWeeklyReflection,
    addYearGoal,
    updateYearGoal,
    toggleYearGoal,
    deleteYearGoal,
    updateSettings,
    clearAllData,
    getTodayTasks,
    getTodaySessions,
    getWeekSessions,
    getTasksByDate,
    getSessionsByDate,
    getCurrentWeekGoals,
    getCurrentWeekReflection,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// Hook
export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}

// Export helper functions
export { getToday, getWeekStartDate, generateId };
