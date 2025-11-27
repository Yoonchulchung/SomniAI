/**
 * Core Type Definitions for MoJI Application
 * Enterprise-grade type safety and documentation
 */

// ============================================================================
// Domain Models
// ============================================================================

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

export enum TransmissionState {
  IDLE = 'idle',
  TRANSMITTING = 'transmitting',
  PAUSED = 'paused',
  ERROR = 'error',
}

export enum ActivityType {
  CONNECTION = 'connection',
  TRANSMISSION = 'transmission',
  SETTINGS = 'settings',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export enum ActivityStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// ============================================================================
// Data Transfer Objects (DTOs)
// ============================================================================

export interface AiServerStatus {
  readonly isConnected: boolean;
  readonly serverUrl: string;
  readonly uptime: number;
  readonly lastSync: string;
  readonly latency?: number;
}

export interface PublicServerStatus {
  readonly isConnected: boolean;
  readonly serverUrl: string;
  readonly uptime: number;
  readonly lastSync: string;
  readonly latency?: number;
}

export interface MqttServerStatus {
  readonly isConnected: boolean;
  readonly serverUrl: string;
  readonly uptime: number;
  readonly lastSync: string;
  readonly latency?: number;
}

export interface TransmissionStats {
  readonly totalFrames: number;
  readonly successfulFrames: number;
  readonly failedFrames: number;
  readonly successRate: number;
  readonly averageLatency: number;
  readonly peakFps: number;
  readonly averageFps: number;
}

export interface QuickStats {
  readonly totalFramesSent: number;
  readonly successRate: number;
  readonly averageFps: number;
  readonly networkUsage: number;
}

export interface SystemHealth {
  readonly cpu: number;
  readonly memory: number;
  readonly battery: number;
  readonly temperature: number;
  readonly timestamp?: number;
}

export interface ActivityItem {
  readonly id: number;
  readonly timestamp: string;
  readonly type: ActivityType;
  readonly message: string;
  readonly status: ActivityStatus;
  readonly metadata?: Record<string, unknown>;
}

export interface DashboardData {
  readonly aiServerStatus: AiServerStatus;
  readonly publicServerStatus: PublicServerStatus;
  readonly mqttServerStatus: MqttServerStatus;
  readonly quickStats: QuickStats;
  readonly recentActivity: ReadonlyArray<ActivityItem>;
  readonly systemHealth: SystemHealth;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface PeriodStats {
  readonly today: TransmissionStats;
  readonly thisWeek: TransmissionStats;
  readonly thisMonth: TransmissionStats;
}

export interface FPSDataPoint {
  readonly timestamp: string;
  readonly fps: number;
  readonly target: number;
}

export interface NetworkUsageDataPoint {
  readonly hour: string;
  readonly sent: number;
  readonly received: number;
}

export interface ConnectionHistoryDataPoint {
  readonly date: string;
  readonly uptime: number;
  readonly downtime: number;
}

export interface ErrorLogEntry {
  readonly timestamp: string;
  readonly type: string;
  readonly severity: ErrorSeverity;
  readonly message: string;
  readonly resolved: boolean;
  readonly stackTrace?: string;
}

export interface AnalyticsData {
  readonly transmissionStats: PeriodStats;
  readonly fpsHistory: ReadonlyArray<FPSDataPoint>;
  readonly networkUsage: ReadonlyArray<NetworkUsageDataPoint>;
  readonly connectionHistory: ReadonlyArray<ConnectionHistoryDataPoint>;
  readonly errorLog: ReadonlyArray<ErrorLogEntry>;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AppConfig {
  readonly aiServerUrl: string;
  readonly publicServerUrl: string;
  readonly mqttServerUrl: string;
  readonly fps: number;
  readonly batterySaver: boolean;
  readonly autoPauseBackground: boolean;
  readonly vibrationEnabled: boolean;
  readonly statsVisible: boolean;
  readonly autoReconnect: boolean;
  readonly notificationEnabled: boolean;
  readonly maxRetries: number;
  readonly timeout: number;
}

export interface CameraConfig {
  readonly fps: number;
  readonly quality: number;
  readonly format: 'jpeg' | 'png' | 'webp';
  readonly compression: number;
}

// ============================================================================
// API Types
// ============================================================================

export interface APIResponse<T> {
  readonly success: boolean;
  readonly data: T;
  readonly error?: APIError;
  readonly timestamp: number;
}

export interface APIError {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
}

export interface PaginatedResponse<T> {
  readonly items: ReadonlyArray<T>;
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly hasMore: boolean;
}

// ============================================================================
// State Management Types
// ============================================================================

export interface AppState {
  readonly connection: ConnectionState;
  readonly transmission: TransmissionStateData;
  readonly dashboard: DashboardState;
  readonly analytics: AnalyticsState;
  readonly settings: SettingsState;
  readonly ui: UIState;
}

export interface ConnectionState {
  readonly status: ConnectionStatus;
  readonly aiServerUrl: string;
  readonly publicServerUrl: string;
  readonly mqttServerUrl: string;
  readonly lastConnected?: number;
  readonly error?: string;
}

export interface TransmissionStateData {
  readonly state: TransmissionState;
  readonly isTransmitting: boolean;
  readonly currentFps: number;
  readonly targetFps: number;
  readonly framesSent: number;
  readonly framesSuccessful: number;
  readonly framesFailed: number;
  readonly networkUsage: number;
}

export interface DashboardState {
  readonly data: DashboardData | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly lastUpdated: number | null;
}

export interface AnalyticsState {
  readonly data: AnalyticsData | null;
  readonly selectedPeriod: 'today' | 'thisWeek' | 'thisMonth';
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly lastUpdated: number | null;
}

export interface SettingsState {
  readonly config: AppConfig;
  readonly isDirty: boolean;
  readonly isSaving: boolean;
}

export interface UIState {
  readonly isStatsCollapsed: boolean;
  readonly activeModal: string | null;
  readonly toasts: ReadonlyArray<Toast>;
}

export interface Toast {
  readonly id: string;
  readonly message: string;
  readonly type: 'success' | 'error' | 'warning' | 'info';
  readonly duration: number;
}

// ============================================================================
// Event Types
// ============================================================================

export interface AppEvent {
  readonly type: string;
  readonly timestamp: number;
  readonly payload?: unknown;
}

export interface ConnectionEvent extends AppEvent {
  readonly type: 'connection:change' | 'connection:error';
  readonly status: ConnectionStatus;
  readonly error?: string;
}

export interface TransmissionEvent extends AppEvent {
  readonly type: 'transmission:start' | 'transmission:stop' | 'transmission:frame';
  readonly frameNumber?: number;
  readonly success?: boolean;
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseConnectionReturn {
  readonly status: ConnectionStatus;
  readonly connect: (url: string) => Promise<void>;
  readonly disconnect: () => Promise<void>;
  readonly reconnect: () => Promise<void>;
  readonly isConnected: boolean;
  readonly error: string | null;
}

export interface UseTransmissionReturn {
  readonly isTransmitting: boolean;
  readonly start: () => void;
  readonly stop: () => void;
  readonly pause: () => void;
  readonly resume: () => void;
  readonly stats: TransmissionStateData;
}

export interface UseAPIReturn<T> {
  readonly data: T | null;
  readonly isLoading: boolean;
  readonly error: APIError | null;
  readonly refetch: () => Promise<void>;
  readonly mutate: (data: T) => void;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type Result<T, E = Error> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: E };

// ============================================================================
// Function Types
// ============================================================================

export type AsyncFunction<T = void> = () => Promise<T>;

export type Callback<T = void> = (value: T) => void;

export type ErrorCallback = (error: Error) => void;

export type EventHandler<T = unknown> = (event: T) => void;

export type Validator<T> = (value: T) => boolean;

export type Transformer<T, R> = (value: T) => R;

// ============================================================================
// Component Props Types
// ============================================================================

export interface BaseComponentProps {
  readonly testID?: string;
  readonly accessibilityLabel?: string;
}

export interface StatCardProps extends BaseComponentProps {
  readonly value: string | number;
  readonly label: string;
  readonly icon?: string;
  readonly color?: string;
  readonly trend?: {
    readonly value: number;
    readonly direction: 'up' | 'down';
  };
}

export interface ChartProps extends BaseComponentProps {
  readonly data: ReadonlyArray<unknown>;
  readonly width?: number;
  readonly height?: number;
  readonly animated?: boolean;
}

export interface ProgressBarProps extends BaseComponentProps {
  readonly progress: number;
  readonly color?: string;
  readonly backgroundColor?: string;
  readonly height?: number;
  readonly animated?: boolean;
}
