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
  lowerColor: RGBColor;
  upperColor: RGBColor;
} 