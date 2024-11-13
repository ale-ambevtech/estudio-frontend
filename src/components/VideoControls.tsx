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

  return (
    <div className="flex justify-center gap-2 p-2">
      <button
        onClick={() => (videoRef.current!.currentTime = 0)}
        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
        aria-label="Ir para o início"
      >
        <FaFastBackward className="w-4 h-4" />
      </button>
      <button
        onClick={handleStepBackward}
        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
        aria-label="Retroceder um quadro"
      >
        <FaStepBackward className="w-4 h-4" />
      </button>
      <button
        onClick={handlePlayPause}
        className="p-3 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
        aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
      >
        {isPlaying ? <FaPause className="w-5 h-5" /> : <FaPlay className="w-5 h-5" />}
      </button>
      <button
        onClick={handleStepForward}
        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
        aria-label="Avançar um quadro"
      >
        <FaStepForward className="w-4 h-4" />
      </button>
      <button
        onClick={() => (videoRef.current!.currentTime = videoRef.current!.duration)}
        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
        aria-label="Ir para o final"
      >
        <FaFastForward className="w-4 h-4" />
      </button>
    </div>
  );
}
