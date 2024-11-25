import type { ProcessVideoRequest, ProcessingResult } from '../types/api';

export function validateProcessRequest(request: ProcessVideoRequest): string[] {
  const errors: string[] = [];

  if (request.roi.position.x < 0) errors.push('ROI x position must be positive');
  if (request.roi.position.y < 0) errors.push('ROI y position must be positive');
  if (request.roi.size.width <= 0) errors.push('ROI width must be positive');
  if (request.roi.size.height <= 0) errors.push('ROI height must be positive');
  if (request.timestamp < 0) errors.push('Timestamp must be positive');
  if (request.pdi_functions.length === 0) errors.push('At least one PDI function is required');

  return errors;
}

export function logProcessingResult(result: ProcessingResult): void {
  if (!result.success) {
    console.error('Processing failed:', result);
    return;
  }
} 