import { RGBColor } from './api';

export interface Marker {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isGeneral: boolean;
  opencvFunction?: 'colorSegmentation' | 'detectShapes' | 'templateMatching' | 'detectPeople';
  opencvParams?: {
    lowerColor?: RGBColor;
    upperColor?: RGBColor;
    tolerance?: number;
    minArea?: number;
    maxArea?: number;
    shapes?: string[];
    shapeTolerance?: number;
    templateImage?: string;
    threshold?: number;
    // Add any other parameters that might be used
  };
}
