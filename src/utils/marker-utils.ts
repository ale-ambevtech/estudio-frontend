import { v4 as uuidv4 } from 'uuid';
import type { Marker } from '../types';
import type { RGBColor } from '../types/api';

function hexToRgb(hex: string): RGBColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

export function createDefaultMarker(
  x: number,
  y: number,
  width: number,
  height: number,
  name: string,
  color: string,
  isGeneral: boolean = false
): Marker {
  return {
    id: uuidv4(),
    name,
    x,
    y,
    width,
    height,
    color,
    isGeneral,
    opencvFunction: 'colorSegmentation',
    opencvParams: {
      lowerColor: { r: 0, g: 0, b: 0 },
      upperColor: { r: 255, g: 255, b: 255 },
      tolerance: 10,
      minArea: 100,
      maxArea: 10000
    }
  };
}

// ... resto do código ... 