import { FaPlay, FaPause, FaStepForward, FaStepBackward, FaFastForward, FaFastBackward } from 'react-icons/fa';
import { useVideoControls } from '../hooks/useVideoControls';

interface VideoControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  fps: number;
  isPlaying: boolean;
}

export function VideoControls({ videoRef, fps, isPlaying }: VideoControlsProps) {
  const { handlePlayPause, handleStepForward, handleStepBackward } = useVideoControls({
    videoRef,
    fps,
  });

  const handleSkipToStart = () => {
    const video = videoRef.current!;
    video.currentTime = 0;
    video.pause();
  };

  const handleSkipToEnd = () => {
    const video = videoRef.current!;
    video.currentTime = video.duration;
    video.pause();
  };

  return (
    <div className="controls">
      <button type="button" onClick={handleSkipToStart} aria-label="Ir para o início">
        <FaFastBackward />
      </button>
      <button type="button" onClick={handleStepBackward} aria-label="Retroceder um quadro">
        <FaStepBackward />
      </button>
      <button type="button" onClick={handlePlayPause} aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}>
        {isPlaying ? <FaPause /> : <FaPlay />}
      </button>
      <button type="button" onClick={handleStepForward} aria-label="Avançar um quadro">
        <FaStepForward />
      </button>
      <button type="button" onClick={handleSkipToEnd} aria-label="Ir para o final">
        <FaFastForward />
      </button>
    </div>
  );
}
