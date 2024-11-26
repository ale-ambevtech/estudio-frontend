import React, { useEffect, useState } from 'react';

interface TimelineProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onSeek: (time: number) => void;
  onThumbnailsGenerated: () => void;
}

const Timeline: React.FC<TimelineProps> = ({ videoRef, onSeek, onThumbnailsGenerated }) => {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (video.duration && isFinite(video.duration)) {
        setDuration(video.duration);
        generateThumbnails(video.duration);
        video.currentTime = 0;
      }
    };

    const updateCurrentTime = () => {
      setCurrentTime(video.currentTime);
    };

    if (video.readyState >= 1) {
      handleLoadedMetadata();
    } else {
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
    }

    video.addEventListener('timeupdate', updateCurrentTime);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', updateCurrentTime);
    };
  }, [videoRef.current]);

  const generateThumbnails = (videoDuration: number) => {
    const video = videoRef.current!;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const numberOfThumbnails = 10;

    const thumbnailHeight = 40;
    const thumbnailWidth = (video.videoWidth / video.videoHeight) * thumbnailHeight;

    canvas.width = thumbnailWidth;
    canvas.height = thumbnailHeight;

    const interval = videoDuration / numberOfThumbnails;
    const captures: string[] = [];

    let currentTime = 0;

    const captureFrame = (time: number) => {
      return new Promise<void>((resolve) => {
        if (isFinite(time) && time <= videoDuration) {
          video.currentTime = time;
          video.addEventListener(
            'seeked',
            () => {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              captures.push(canvas.toDataURL('image/png'));
              resolve();
            },
            { once: true }
          );
        } else {
          resolve();
        }
      });
    };

    const generateAllThumbnails = async () => {
      for (let i = 0; i < numberOfThumbnails; i++) {
        await captureFrame(currentTime);
        currentTime += interval;
      }
      setThumbnails(captures);
      videoRef.current!.currentTime = 0;
      onThumbnailsGenerated(); // Chama a função quando os thumbnails estão prontos
    };

    generateAllThumbnails();
  };

  const handleThumbnailClick = (index: number) => {
    const video = videoRef.current!;
    const timeToSeek = (duration / thumbnails.length) * index;
    video.currentTime = timeToSeek;
    onSeek(timeToSeek);
  };

  return (
    <div className="w-[640px] space-y-2 m-auto">
      {/* Container dos thumbnails */}
      <div className="relative w-full h-[60px] bg-gray-300 rounded-lg overflow-hidden">
        <div className="flex h-full">
          {thumbnails.map((thumbnail, index) => (
            <div key={index} className="relative flex-1 h-full min-w-0" onClick={() => handleThumbnailClick(index)}>
              <img
                src={thumbnail}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
              />
            </div>
          ))}
        </div>

        {/* Indicador de progresso */}
        <div
          className="absolute top-0 left-0 h-full bg-orange-700/20 border-r-2 border-yellow-500 pointer-events-none transition-all duration-100"
          style={{ width: `${(currentTime / duration) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default Timeline;
