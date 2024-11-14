import type { ProcessVideoRequest, ProcessingResult } from '../types/api';

export function validateProcessRequest(request: ProcessVideoRequest): string[] {
  const errors: string[] = [];

  // Validar ROI
  if (request.roi.position.x < 0) errors.push('ROI x position must be positive');
  if (request.roi.position.y < 0) errors.push('ROI y position must be positive');
  if (request.roi.size.width <= 0) errors.push('ROI width must be positive');
  if (request.roi.size.height <= 0) errors.push('ROI height must be positive');

  // Validar timestamp
  if (request.timestamp < 0) errors.push('Timestamp must be positive');

  // Validar funções PDI
  if (request.pdi_functions.length === 0) errors.push('At least one PDI function is required');

  request.pdi_functions.forEach((fn, index) => {
    if (fn.function === 'color_segmentation') {
      const params = fn.parameters as Record<string, unknown>;
      if (!params.lower_color) errors.push(`Function ${index}: lower_color is required`);
      if (!params.upper_color) errors.push(`Function ${index}: upper_color is required`);
    }
  });

  return errors;
}

export function logProcessingResult(result: ProcessingResult): void {
  console.group('Processing Result');
  console.log('Success:', result.success);
  console.log('Timestamp:', result.timestamp);
  if (result.results) {
    console.log('Results:', result.results);
  }
  console.groupEnd();
} 