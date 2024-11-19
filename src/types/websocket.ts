import { PDIFunctionType, RGBColor } from './api';

export interface PDIParameters {
  color_segmentation?: {
    lower_color?: RGBColor;
    upper_color?: RGBColor;
    tolerance?: number;
    min_area?: number;
    max_area?: number;
  };
  shape_detection?: {
    shapes?: string[];
    shape_tolerance?: number;
  };
  template_matching?: {
    template_image?: string;
    threshold?: number;
  };
  people_detection?: {
    min_area?: number;
    max_area?: number;
  };
}

export interface ClientMessage {
  timestamp: number;
  frame_info: {
    markings: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
    functions: string[];
    parameters: {
      color_segmentation: string;
    };
  };
}

export interface ServerMessage {
  type: 'metadata_sync' | 'error';
  data?: {
    timestamp: number;
    video_id: string;
    frame_info: {
      markings?: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
      }>;
      detections?: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
      }>;
      functions?: PDIFunctionType[];
      parameters?: PDIParameters;
    };
  };
  message?: string; // For error messages
} 