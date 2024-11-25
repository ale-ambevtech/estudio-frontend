import { VIDEO } from '@/constants/dimensions';
import type { VideoDimensions } from '../types';

export function calculateScaledDimensions(originalWidth: number, originalHeight: number): VideoDimensions {
  const aspectRatio = originalWidth / originalHeight;
  let scaledWidth = originalWidth;
  let scaledHeight = originalHeight;

  if (scaledWidth > VIDEO.MAX_WIDTH) {
    scaledWidth = VIDEO.MAX_WIDTH;
    scaledHeight = Math.floor(scaledWidth / aspectRatio);
  }

  if (scaledHeight > VIDEO.MAX_HEIGHT) {
    scaledHeight = VIDEO.MAX_HEIGHT;
    scaledWidth = Math.floor(scaledHeight * aspectRatio);
  }

  return {
    width: Math.floor(scaledWidth),
    height: Math.floor(scaledHeight)
  };
}

export function getVideoPosition(videoRef: React.RefObject<HTMLVideoElement>): number {
  return videoRef.current?.currentTime || 0;
}

export function calculateFps(video: HTMLVideoElement): number {
  if ('mozPresentedFrames' in video && 'mozPaintedFrames' in video && 'mozFrameDelay' in video) {
    const fps = 1000 / (video as any).mozFrameDelay;
    return Math.round(fps);
  }

  return 30; // Default fallback
} 