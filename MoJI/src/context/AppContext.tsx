/**
 * Global Application State Management
 * Enterprise-grade Context API implementation with optimized re-renders
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import type {
  AppState,
  ConnectionStatus,
  TransmissionState,
  DashboardData,
  AnalyticsData,
  AppConfig,
  Toast,
} from '../types';
import { MMKV } from 'react-native-mmkv';
import { appLogger } from '../utils/logger';

const storage = new MMKV();

// ============================================================================
// Initial State
// ============================================================================

const STORAGE_KEYS = {
  SERVER_URL: 'server_url',
  FPS: 'fps',
  BATTERY_SAVER: 'battery_saver',
  AUTO_PAUSE: 'auto_pause_background',
  VIBRATION: 'vibration_enabled',
  STATS_VISIBLE: 'stats_visible',
  AUTO_RECONNECT: 'auto_reconnect',
  NOTIFICATION: 'notification_enabled',
};

const initialConfig: AppConfig = {
  serverUrl: storage.getString(STORAGE_KEYS.SERVER_URL) || 'http://192.168.0.100:8000',
  fps: storage.getNumber(STORAGE_KEYS.FPS) || 10,
  batterySaver: storage.getBoolean(STORAGE_KEYS.BATTERY_SAVER) || false,
  autoPauseBackground: storage.getBoolean(STORAGE_KEYS.AUTO_PAUSE) ?? true,
  vibrationEnabled: storage.getBoolean(STORAGE_KEYS.VIBRATION) ?? true,
  statsVisible: storage.getBoolean(STORAGE_KEYS.STATS_VISIBLE) ?? true,
  autoReconnect: storage.getBoolean(STORAGE_KEYS.AUTO_RECONNECT) ?? true,
  notificationEnabled: storage.getBoolean(STORAGE_KEYS.NOTIFICATION) ?? true,
  maxRetries: 3,
  timeout: 10000,
};

const initialState: AppState = {
  connection: {
    status: 'disconnected' as ConnectionStatus,
    serverUrl: initialConfig.serverUrl,
    uptime: 0,
  },
  transmission: {
    state: 'idle' as TransmissionState,
    isTransmitting: false,
    currentFps: 0,
    targetFps: initialConfig.fps,
    framesSent: 0,
    framesSuccessful: 0,
    framesFailed: 0,
    networkUsage: 0,
  },
  dashboard: {
    data: null,
    isLoading: false,
    error: null,
    lastUpdated: null,
  },
  analytics: {
    data: null,
    selectedPeriod: 'today',
    isLoading: false,
    error: null,
    lastUpdated: null,
  },
  settings: {
    config: initialConfig,
    isDirty: false,
    isSaving: false,
  },
  ui: {
    isStatsCollapsed: false,
    activeModal: null,
    toasts: [],
  },
};

// ============================================================================
// Action Types
// ============================================================================

type Action =
  | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus }
  | { type: 'SET_SERVER_URL'; payload: string }
  | { type: 'UPDATE_UPTIME'; payload: number }
  | { type: 'SET_CONNECTION_ERROR'; payload: string }
  | { type: 'START_TRANSMISSION' }
  | { type: 'STOP_TRANSMISSION' }
  | { type: 'PAUSE_TRANSMISSION' }
  | { type: 'RESUME_TRANSMISSION' }
  | { type: 'UPDATE_TRANSMISSION_STATS'; payload: Partial<AppState['transmission']> }
  | { type: 'SET_DASHBOARD_LOADING'; payload: boolean }
  | { type: 'SET_DASHBOARD_DATA'; payload: DashboardData }
  | { type: 'SET_DASHBOARD_ERROR'; payload: string }
  | { type: 'SET_ANALYTICS_LOADING'; payload: boolean }
  | { type: 'SET_ANALYTICS_DATA'; payload: AnalyticsData }
  | { type: 'SET_ANALYTICS_ERROR'; payload: string }
  | { type: 'SET_ANALYTICS_PERIOD'; payload: 'today' | 'thisWeek' | 'thisMonth' }
  | { type: 'UPDATE_CONFIG'; payload: Partial<AppConfig> }
  | { type: 'SET_CONFIG_DIRTY'; payload: boolean }
  | { type: 'SET_CONFIG_SAVING'; payload: boolean }
  | { type: 'TOGGLE_STATS_COLLAPSED' }
  | { type: 'SET_ACTIVE_MODAL'; payload: string | null }
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'RESET_STATE' };

// ============================================================================
// Reducer
// ============================================================================

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connection: {
          ...state.connection,
          status: action.payload,
          lastConnected:
            action.payload === 'connected' ? Date.now() : state.connection.lastConnected,
        },
      };

    case 'SET_SERVER_URL':
      return {
        ...state,
        connection: {
          ...state.connection,
          serverUrl: action.payload,
        },
        settings: {
          ...state.settings,
          config: {
            ...state.settings.config,
            serverUrl: action.payload,
          },
        },
      };

    case 'UPDATE_UPTIME':
      return {
        ...state,
        connection: {
          ...state.connection,
          uptime: action.payload,
        },
      };

    case 'SET_CONNECTION_ERROR':
      return {
        ...state,
        connection: {
          ...state.connection,
          error: action.payload,
        },
      };

    case 'START_TRANSMISSION':
      return {
        ...state,
        transmission: {
          ...state.transmission,
          state: 'transmitting' as TransmissionState,
          isTransmitting: true,
        },
      };

    case 'STOP_TRANSMISSION':
      return {
        ...state,
        transmission: {
          ...state.transmission,
          state: 'idle' as TransmissionState,
          isTransmitting: false,
        },
      };

    case 'PAUSE_TRANSMISSION':
      return {
        ...state,
        transmission: {
          ...state.transmission,
          state: 'paused' as TransmissionState,
          isTransmitting: false,
        },
      };

    case 'RESUME_TRANSMISSION':
      return {
        ...state,
        transmission: {
          ...state.transmission,
          state: 'transmitting' as TransmissionState,
          isTransmitting: true,
        },
      };

    case 'UPDATE_TRANSMISSION_STATS':
      return {
        ...state,
        transmission: {
          ...state.transmission,
          ...action.payload,
        },
      };

    case 'SET_DASHBOARD_LOADING':
      return {
        ...state,
        dashboard: {
          ...state.dashboard,
          isLoading: action.payload,
        },
      };

    case 'SET_DASHBOARD_DATA':
      return {
        ...state,
        dashboard: {
          ...state.dashboard,
          data: action.payload,
          isLoading: false,
          error: null,
          lastUpdated: Date.now(),
        },
      };

    case 'SET_DASHBOARD_ERROR':
      return {
        ...state,
        dashboard: {
          ...state.dashboard,
          error: action.payload,
          isLoading: false,
        },
      };

    case 'SET_ANALYTICS_LOADING':
      return {
        ...state,
        analytics: {
          ...state.analytics,
          isLoading: action.payload,
        },
      };

    case 'SET_ANALYTICS_DATA':
      return {
        ...state,
        analytics: {
          ...state.analytics,
          data: action.payload,
          isLoading: false,
          error: null,
          lastUpdated: Date.now(),
        },
      };

    case 'SET_ANALYTICS_ERROR':
      return {
        ...state,
        analytics: {
          ...state.analytics,
          error: action.payload,
          isLoading: false,
        },
      };

    case 'SET_ANALYTICS_PERIOD':
      return {
        ...state,
        analytics: {
          ...state.analytics,
          selectedPeriod: action.payload,
        },
      };

    case 'UPDATE_CONFIG':
      const newConfig = { ...state.settings.config, ...action.payload };
      // Persist to storage
      Object.entries(action.payload).forEach(([key, value]) => {
        const storageKey = Object.entries(STORAGE_KEYS).find(
          ([k]) => k.toLowerCase() === key.toLowerCase()
        )?.[1];
        if (storageKey) {
          if (typeof value === 'boolean') {
            storage.set(storageKey, value);
          } else if (typeof value === 'number') {
            storage.set(storageKey, value);
          } else if (typeof value === 'string') {
            storage.set(storageKey, value);
          }
        }
      });
      return {
        ...state,
        settings: {
          ...state.settings,
          config: newConfig,
          isDirty: true,
        },
      };

    case 'SET_CONFIG_DIRTY':
      return {
        ...state,
        settings: {
          ...state.settings,
          isDirty: action.payload,
        },
      };

    case 'SET_CONFIG_SAVING':
      return {
        ...state,
        settings: {
          ...state.settings,
          isSaving: action.payload,
        },
      };

    case 'TOGGLE_STATS_COLLAPSED':
      return {
        ...state,
        ui: {
          ...state.ui,
          isStatsCollapsed: !state.ui.isStatsCollapsed,
        },
      };

    case 'SET_ACTIVE_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          activeModal: action.payload,
        },
      };

    case 'ADD_TOAST':
      return {
        ...state,
        ui: {
          ...state.ui,
          toasts: [...state.ui.toasts, action.payload],
        },
      };

    case 'REMOVE_TOAST':
      return {
        ...state,
        ui: {
          ...state.ui,
          toasts: state.ui.toasts.filter((toast) => toast.id !== action.payload),
        },
      };

    case 'RESET_STATE':
      storage.clearAll();
      return initialState;

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  actions: {
    // Connection
    setConnectionStatus: (status: ConnectionStatus) => void;
    setServerURL: (url: string) => void;
    updateUptime: (uptime: number) => void;
    setConnectionError: (error: string) => void;
    // Transmission
    startTransmission: () => void;
    stopTransmission: () => void;
    pauseTransmission: () => void;
    resumeTransmission: () => void;
    updateTransmissionStats: (stats: Partial<AppState['transmission']>) => void;
    // Dashboard
    setDashboardLoading: (loading: boolean) => void;
    setDashboardData: (data: DashboardData) => void;
    setDashboardError: (error: string) => void;
    // Analytics
    setAnalyticsLoading: (loading: boolean) => void;
    setAnalyticsData: (data: AnalyticsData) => void;
    setAnalyticsError: (error: string) => void;
    setAnalyticsPeriod: (period: 'today' | 'thisWeek' | 'thisMonth') => void;
    // Settings
    updateConfig: (config: Partial<AppConfig>) => void;
    setConfigDirty: (dirty: boolean) => void;
    setConfigSaving: (saving: boolean) => void;
    // UI
    toggleStatsCollapsed: () => void;
    setActiveModal: (modal: string | null) => void;
    showToast: (message: string, type: Toast['type'], duration?: number) => void;
    removeToast: (id: string) => void;
    // System
    resetState: () => void;
  };
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const toastTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Memoized actions to prevent unnecessary re-renders
  const actions = useMemo(
    () => ({
      // Connection
      setConnectionStatus: (status: ConnectionStatus) =>
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: status }),
      setServerURL: (url: string) => dispatch({ type: 'SET_SERVER_URL', payload: url }),
      updateUptime: (uptime: number) => dispatch({ type: 'UPDATE_UPTIME', payload: uptime }),
      setConnectionError: (error: string) =>
        dispatch({ type: 'SET_CONNECTION_ERROR', payload: error }),
      // Transmission
      startTransmission: () => dispatch({ type: 'START_TRANSMISSION' }),
      stopTransmission: () => dispatch({ type: 'STOP_TRANSMISSION' }),
      pauseTransmission: () => dispatch({ type: 'PAUSE_TRANSMISSION' }),
      resumeTransmission: () => dispatch({ type: 'RESUME_TRANSMISSION' }),
      updateTransmissionStats: (stats: Partial<AppState['transmission']>) =>
        dispatch({ type: 'UPDATE_TRANSMISSION_STATS', payload: stats }),
      // Dashboard
      setDashboardLoading: (loading: boolean) =>
        dispatch({ type: 'SET_DASHBOARD_LOADING', payload: loading }),
      setDashboardData: (data: DashboardData) =>
        dispatch({ type: 'SET_DASHBOARD_DATA', payload: data }),
      setDashboardError: (error: string) =>
        dispatch({ type: 'SET_DASHBOARD_ERROR', payload: error }),
      // Analytics
      setAnalyticsLoading: (loading: boolean) =>
        dispatch({ type: 'SET_ANALYTICS_LOADING', payload: loading }),
      setAnalyticsData: (data: AnalyticsData) =>
        dispatch({ type: 'SET_ANALYTICS_DATA', payload: data }),
      setAnalyticsError: (error: string) =>
        dispatch({ type: 'SET_ANALYTICS_ERROR', payload: error }),
      setAnalyticsPeriod: (period: 'today' | 'thisWeek' | 'thisMonth') =>
        dispatch({ type: 'SET_ANALYTICS_PERIOD', payload: period }),
      // Settings
      updateConfig: (config: Partial<AppConfig>) =>
        dispatch({ type: 'UPDATE_CONFIG', payload: config }),
      setConfigDirty: (dirty: boolean) =>
        dispatch({ type: 'SET_CONFIG_DIRTY', payload: dirty }),
      setConfigSaving: (saving: boolean) =>
        dispatch({ type: 'SET_CONFIG_SAVING', payload: saving }),
      // UI
      toggleStatsCollapsed: () => dispatch({ type: 'TOGGLE_STATS_COLLAPSED' }),
      setActiveModal: (modal: string | null) =>
        dispatch({ type: 'SET_ACTIVE_MODAL', payload: modal }),
      showToast: (message: string, type: Toast['type'], duration: number = 3000) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        const toast: Toast = { id, message, type, duration };
        dispatch({ type: 'ADD_TOAST', payload: toast });

        // Auto-remove toast after duration
        const timeout = setTimeout(() => {
          dispatch({ type: 'REMOVE_TOAST', payload: id });
          toastTimeouts.current.delete(id);
        }, duration);
        toastTimeouts.current.set(id, timeout);
      },
      removeToast: (id: string) => {
        const timeout = toastTimeouts.current.get(id);
        if (timeout) {
          clearTimeout(timeout);
          toastTimeouts.current.delete(id);
        }
        dispatch({ type: 'REMOVE_TOAST', payload: id });
      },
      // System
      resetState: () => dispatch({ type: 'RESET_STATE' }),
    }),
    []
  );

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      toastTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      toastTimeouts.current.clear();
    };
  }, []);

  // Log state changes in development
  useEffect(() => {
    if (__DEV__) {
      appLogger.debug('App state updated', { state });
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch, actions }), [state, actions]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ============================================================================
// Hook
// ============================================================================

export const useAppContext = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

// Optimized selectors to prevent unnecessary re-renders
export const useConnection = () => {
  const { state } = useAppContext();
  return state.connection;
};

export const useTransmission = () => {
  const { state } = useAppContext();
  return state.transmission;
};

export const useDashboard = () => {
  const { state } = useAppContext();
  return state.dashboard;
};

export const useAnalytics = () => {
  const { state } = useAppContext();
  return state.analytics;
};

export const useSettings = () => {
  const { state } = useAppContext();
  return state.settings;
};

export const useUI = () => {
  const { state } = useAppContext();
  return state.ui;
};
