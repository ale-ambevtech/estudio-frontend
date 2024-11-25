import { v4 as uuidv4 } from 'uuid';
import type { Marker } from '../types';


export function createDefaultMarker(
  x: number,
  y: number,
  width: number,
  height: number,
  name: string,
  color: string,
  isGeneral: boolean = false,
  id?: string,
  withDefaults: boolean = true
): Marker {
  return {
    id: id || uuidv4(),
    name,
    x,
    y,
    width,
    height,
    color,
    isGeneral,
    opencvFunction: withDefaults ? 'colorSegmentation' : undefined,
    opencvParams: withDefaults ? {
      lowerColor: { r: 0, g: 0, b: 0 },
      upperColor: { r: 255, g: 255, b: 255 },
      tolerance: 10,
      minArea: 100,
      maxArea: 10000
    } : undefined
  };
}

// ... resto do código ... 