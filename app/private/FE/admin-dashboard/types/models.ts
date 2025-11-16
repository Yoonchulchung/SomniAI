// 모델 및 분석 결과 관련 타입 정의

export interface ModelInfo {
  model_name: string;
  version: string;
  loaded: boolean;
  last_updated?: string;
}

export interface ModelStats {
  total_predictions: number;
  avg_inference_time_ms: number;
  model_accuracy?: number;
  cache_hit_rate?: number;
}

export interface HealthStatus {
  status: string;
  version?: string;
  uptime?: number;
}

export interface PersonPose {
  person_id: number;
  keypoints: Array<{
    name: string;
    x: number;
    y: number;
    confidence: number;
  }>;
  posture_assessment?: {
    head_tilt: string;
    shoulder_alignment: string;
    spine_curvature: string;
    overall_score: number;
  };
}

export interface AnalysisResult {
  image_url?: string;
  analysis_image_url?: string;
  timestamp: string;
  poses: PersonPose[];
  vlm_output?: string;
  metadata?: {
    processing_time_ms: number;
    model_version: string;
  };
}

export interface SideResult extends AnalysisResult {
  side_specific_data?: any;
}

export interface AirResult extends AnalysisResult {
  air_specific_data?: any;
}

export type UploadType = 'air' | 'side';

export interface UploadResponse {
  message: string;
  file_path?: string;
  analysis_result?: AnalysisResult;
}
