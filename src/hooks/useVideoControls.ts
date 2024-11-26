import { useCallback } from 'react';

interface UseVideoControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  fps: number;
  onPlayPauseChange: (isPlaying: boolean) => void;
}

export function useVideoControls({ videoRef, fps, onPlayPauseChange }: UseVideoControlsProps) {
  const handlePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    
    if (videoRef.current.paused) {
      videoRef.current.play();
      onPlayPauseChange(true);
    } else {
      videoRef.current.pause();
      onPlayPauseChange(false);
    }
  }, [videoRef, onPlayPauseChange]);

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