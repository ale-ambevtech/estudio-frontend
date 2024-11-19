import { PDIFunctionType, RGBColor } from './api';

export interface Marker {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isGeneral: boolean;
  functions?: PDIFunctionType[];
  opencvParams: {
    lowerColor: RGBColor;
    upperColor: RGBColor;
    tolerance?: number;
    minArea?: number;
    maxArea?: number;
  };
}