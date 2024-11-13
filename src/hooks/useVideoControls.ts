import { useCallback } from 'react';

interface UseVideoControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  fps: number;
}

export function useVideoControls({ videoRef, fps }: UseVideoControlsProps) {
  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.paused || video.ended) {
      video.play();
    } else {
      video.pause();
    }
  }, [videoRef]);

  const handleStepForward = useCallback(() => {
    const video = videoRef.current;
    if (!video || !fps) return;

    const currentFrame = Math.ceil(video.currentTime * fps);
    const nextFrameTime = (currentFrame + 1) / fps;

    if (nextFrameTime <= video.duration) {
      video.currentTime = nextFrameTime;
    }
  }, [videoRef, fps]);

  const handleStepBackward = useCallback(() => {
    const video = videoRef.current;
    if (!video || !fps) return;

    const currentFrame = Math.ceil(video.currentTime * fps);
    const previousFrameTime = (currentFrame - 1) / fps;

    if (previousFrameTime >= 0) {
      video.currentTime = previousFrameTime;
    }
  }, [videoRef, fps]);

  return {
    handlePlayPause,
    handleStepForward,
    handleStepBackward
  };
} 