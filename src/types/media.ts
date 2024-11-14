export type MediaType = 'video' | 'image' | null;

export interface MediaMetadata {
  type: MediaType;
  url: string | null;
  width: number;
  height: number;
} 