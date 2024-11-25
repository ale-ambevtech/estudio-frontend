import type { Marker } from './marker';
import type { MediaType } from './media';

export interface VideoPlayerProps {
  markers: Marker[];
  addMarker: (marker: Marker) => void;
  selectedMarkerId: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  onDimensionsChange: (dimensions: { width: number; height: number }) => void;
  selectMarker: (id: string) => void;
  mediaType: MediaType;
  mediaUrl: string | null;
  processingResults: Map<string, Array<{ function: string; bounding_boxes: number[][] }>>;
  isSyncEnabled: boolean;
  onSyncChange: (enabled: boolean) => void;
  onProcessVideo: () => void;
  fps: number;
  onFpsChange: (fps: number) => void;
  isDebugEnabled?: boolean;
  onDebugChange: (enabled: boolean) => void;
}

export interface LoadingProps {
  message?: string;
}

export interface UseMetadataSyncProps {
  isPlaying: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  markers: Marker[];
  isSyncEnabled: boolean;
  onMetadataUpdate: (data: any) => void;
  selectedMarkerId: string | null;
  isDebugEnabled: boolean;
}

// Adicione outras interfaces de props conforme necessário 