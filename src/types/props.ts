import type { Marker } from './marker';
import type { MediaType, MediaMetadata } from './media';

export interface VideoPlayerProps {
  markers: Marker[];
  addMarker: (marker: Marker) => void;
  selectedMarkerId: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  onDimensionsChange: (dimensions: { width: number; height: number }) => void;
  selectMarker: (id: string) => void;
  mediaType: MediaType;
  mediaUrl: string | null;
}

export interface LoadingProps {
  message?: string;
}

// Adicione outras interfaces de props conforme necessário 