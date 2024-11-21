import { OPENCV_FUNCTIONS, OUTPUT_TYPES } from '../types/api';
import type { Marker } from '../types';

export function createPDIFunction(marker: Marker) {
  if (!marker.opencvFunction || !marker.opencvParams) return null;

  switch (marker.opencvFunction) {
    case 'colorSegmentation':
      return {
        function: OPENCV_FUNCTIONS.COLOR_SEGMENTATION,
        parameters: {
          lower_color: marker.opencvParams.lowerColor || { r: 0, g: 0, b: 0 },
          upper_color: marker.opencvParams.upperColor || { r: 255, g: 255, b: 255 },
          tolerance: Number(marker.opencvParams.tolerance) || 10,
          min_area: Number(marker.opencvParams.minArea) || 100,
          max_area: Number(marker.opencvParams.maxArea) || 10000,
        },
        output_type: OUTPUT_TYPES.BOUNDING_BOX,
      };

    case 'detectShapes':
      return {
        function: OPENCV_FUNCTIONS.SHAPE_DETECTION,
        parameters: {
          shapes: marker.opencvParams.shapes || ['circle', 'rectangle', 'triangle'],
          shape_tolerance: Number(marker.opencvParams.shapeTolerance) || 0.1,
        },
        output_type: OUTPUT_TYPES.BOUNDING_BOX,
      };

    // ... outros casos ...

    default:
      return null;
  }
} 