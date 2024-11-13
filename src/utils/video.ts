import { VIDEO } from '@/constants/dimensions';

interface Dimensions {
  width: number;
  height: number;
}

export function calculateScaledDimensions(originalWidth: number, originalHeight: number): Dimensions {
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

export interface FirefoxVideoElement extends HTMLVideoElement {
  mozPresentedFrames?: number;
  mozPaintedFrames?: number;
  mozFrameDelay?: number;
  webkitDecodedFrameCount?: number;
}

export function calculateFps(video: HTMLVideoElement): number {
  const firefoxVideo = video as FirefoxVideoElement;
  
  // Método 1: Firefox
  if (firefoxVideo.mozPresentedFrames && firefoxVideo.mozPaintedFrames && firefoxVideo.mozFrameDelay) {
    const fps = 1000 / firefoxVideo.mozFrameDelay;
    console.log('Firefox FPS:', fps);
    return fps;
  }

  // Método 2: Chrome/Safari
  if ('webkitDecodedFrameCount' in video) {
    // Implementation for Chrome/Safari if needed
    return 30;
  }

  // Método 3: MediaSource API
  if ('getVideoPlaybackQuality' in video) {
    // Implementation for MediaSource API if needed
    return 30;
  }

  // Default fallback
  return 30;
} 