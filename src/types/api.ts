export interface VideoMetadata {
  id: string;
  filename: string;
  file_size: number;
  duration: number;
  width: number;
  height: number;
  fps: number;
  uploaded_at: string;
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface PDIColorSegmentationParameters {
  lower_color?: RGBColor;
  upper_color?: RGBColor;
  tolerance?: number;
  min_area?: number;
  max_area?: number;
}

export const OPENCV_FUNCTIONS = {
  COLOR_SEGMENTATION: 'color_segmentation',
  SHAPE_DETECTION: 'shape_detection',
  TEMPLATE_MATCHING: 'template_matching',
  PEOPLE_DETECTION: 'people_detection'
} as const;

export const OUTPUT_TYPES = {
  BOUNDING_BOX: 'bounding_box',
  COUNT: 'count',
  BOOLEAN: 'boolean'
} as const;

export type PDIFunctionType = typeof OPENCV_FUNCTIONS[keyof typeof OPENCV_FUNCTIONS];
export type PDIFunctionOutputType = typeof OUTPUT_TYPES[keyof typeof OUTPUT_TYPES];

export interface PDIFunction {
  function: PDIFunctionType;
  parameters: PDIColorSegmentationParameters | Record<string, unknown>;
  output_type: PDIFunctionOutputType;
}

export interface ProcessVideoRequest {
  pdi_functions: PDIFunction[];
  roi: ROI;
  timestamp: number;
}

export interface ROI {
  position: Point;
  size: Size;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProcessingResult {
  success: boolean;
  timestamp: number;
  bounding_boxes?: BoundingBox[];
  results: Array<{
    function: PDIFunctionType;
    output: unknown;
  }>;
}

export interface BoundingBoxResult {
  function: string;
  bounding_boxes: number[][];
} 