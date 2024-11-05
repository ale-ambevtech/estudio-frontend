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
    const video = videoRef.current!;

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

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', updateCurrentTime);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', updateCurrentTime);
    };
  }, [videoRef]);

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
    const time = (index / thumbnails.length) * duration;
    onSeek(time);
  };

  const progressPercent = (currentTime / duration) * 100;

  return (
    <div className="timeline-container">
      <div className="timeline">
        {thumbnails.map((thumb, index) => (
          <img
            key={index}
            src={thumb}
            alt={`Thumbnail ${index}`}
            onClick={() => handleThumbnailClick(index)}
            className="thumbnail"
          />
        ))}
      </div>
      <div className="timeline-progress" style={{ width: `${progressPercent}%` }}></div>
    </div>
  );
};

export default Timeline;
