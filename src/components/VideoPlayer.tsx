import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Marker } from '../types';
import { FaPlay, FaPause, FaStepForward, FaStepBackward, FaFastForward, FaFastBackward } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid';

interface FirefoxVideoElement extends HTMLVideoElement {
  mozPresentedFrames?: number;
  mozPaintedFrames?: number;
  mozFrameDelay?: number;
  webkitDecodedFrameCount?: number;
}

interface VideoPlayerProps {
  markers: Marker[];
  addMarker: (marker: Marker) => void;
  selectedMarkerId: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  onDimensionsChange: (dimensions: { width: number; height: number }) => void;
  selectMarker: (id: string) => void; // Adicione esta linha
  mediaType: 'video' | 'image' | null;
  mediaUrl: string | null;
}

const MAX_WIDTH = 640;
const MAX_HEIGHT = 480;

export function VideoPlayer({
  markers,
  addMarker,
  videoRef,
  selectedMarkerId,
  onDimensionsChange,
  selectMarker,
  mediaType,
  mediaUrl,
}: VideoPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(30);
  const [markerCount, setMarkerCount] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isMediaLoaded, setIsMediaLoaded] = useState(false);

  const calculateFps = useCallback(() => {
    const video = videoRef.current as FirefoxVideoElement;
    if (!video) return;

    // Método 1: Firefox
    if (video.mozPresentedFrames && video.mozPaintedFrames && video.mozFrameDelay) {
      const fps = 1000 / video.mozFrameDelay;
      setFps(fps);
      console.log('Firefox FPS:', fps);
      return;
    }

    // ... keep rest of FPS calculation methods
  }, [videoRef]);

  useEffect(() => {
    if (!mediaUrl) {
      console.log('No mediaUrl provided');
      return;
    }

    if (mediaType === 'video') {
      const video = videoRef.current;
      if (!video) {
        console.log('Video ref not available');
        return;
      }

      console.log('Setting up video with URL:', mediaUrl);

      const handleLoadedMetadata = () => {
        console.log('Video loadedmetadata event fired');
        const originalWidth = video.videoWidth;
        const originalHeight = video.videoHeight;
        console.log('Original video dimensions:', originalWidth, 'x', originalHeight);

        const aspectRatio = originalWidth / originalHeight;
        let scaledWidth = originalWidth;
        let scaledHeight = originalHeight;

        if (scaledWidth > MAX_WIDTH) {
          scaledWidth = MAX_WIDTH;
          scaledHeight = Math.floor(scaledWidth / aspectRatio);
        }

        if (scaledHeight > MAX_HEIGHT) {
          scaledHeight = MAX_HEIGHT;
          scaledWidth = Math.floor(scaledHeight * aspectRatio);
        }

        const dimensions = {
          width: Math.floor(scaledWidth),
          height: Math.floor(scaledHeight),
        };

        setVideoDimensions(dimensions);
        setCanvasSize(dimensions);
        onDimensionsChange(dimensions);
      };

      const handleLoaded = () => {
        console.log('Video loadeddata event fired');
        setIsMediaLoaded(true);
        setIsVideoReady(true);
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('loadeddata', handleLoaded);

      video.src = mediaUrl;
      video.load();

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('loadeddata', handleLoaded);
      };
    }
  }, [mediaUrl, mediaType, onDimensionsChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      console.log('Video loadedmetadata event fired');
      calculateFps();

      const originalWidth = video.videoWidth;
      const originalHeight = video.videoHeight;
      console.log('Original video dimensions:', originalWidth, 'x', originalHeight);

      const aspectRatio = originalWidth / originalHeight;

      let scaledWidth = originalWidth;
      let scaledHeight = originalHeight;

      // Redimensiona mantendo a proporção e respeitando os limites máximos
      if (scaledWidth > MAX_WIDTH) {
        scaledWidth = MAX_WIDTH;
        scaledHeight = Math.floor(scaledWidth / aspectRatio);
      }

      if (scaledHeight > MAX_HEIGHT) {
        scaledHeight = MAX_HEIGHT;
        scaledWidth = Math.floor(scaledHeight * aspectRatio);
      }

      const dimensions = {
        width: Math.floor(scaledWidth),
        height: Math.floor(scaledHeight),
      };

      console.log('Video dimensions after scaling:', dimensions);

      setVideoDimensions(dimensions);
      setCanvasSize(dimensions);
      onDimensionsChange(dimensions);
      setIsVideoReady(true);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [calculateFps, onDimensionsChange]);

  useEffect(() => {
    if (mediaType === 'image' && mediaUrl) {
      console.log('Loading image:', mediaUrl);
      const img = new Image();
      img.onload = () => {
        console.log('Image loaded successfully. Dimensions:', img.width, 'x', img.height);
        const dimensions = {
          width: Math.min(img.width, MAX_WIDTH),
          height: Math.min(img.height, MAX_HEIGHT),
        };
        console.log('Calculated dimensions:', dimensions);
        setVideoDimensions(dimensions);
        setCanvasSize(dimensions);
        onDimensionsChange(dimensions);
        setIsVideoReady(true);
        setImage(img);
      };
      img.onerror = (error) => {
        console.error('Error loading image:', error);
      };
      img.src = mediaUrl;
    }
  }, [mediaType, mediaUrl, onDimensionsChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      console.log('Canvas or context not available');
      return;
    }
    if (!isVideoReady || canvasSize.width === 0 || canvasSize.height === 0) {
      console.log('Video or canvas dimensions not ready');
      return;
    }

    console.log('Starting canvas render loop with dimensions:', canvasSize);
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    const renderFrame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (mediaType === 'video' && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      } else if (mediaType === 'image' && image) {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      }

      // Draw markers
      markers.forEach((marker) => {
        ctx.strokeStyle = marker.color;
        ctx.lineWidth = marker.isGeneral
          ? marker.id === selectedMarkerId
            ? 12
            : 4
          : marker.id === selectedMarkerId
            ? 6
            : 2;
        ctx.strokeRect(marker.x, marker.y, marker.width, marker.height);
      });

      if (isDrawing && currentRect) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      }

      requestAnimationFrame(renderFrame);
    };

    renderFrame();
  }, [markers, isDrawing, currentRect, videoRef, isVideoReady, selectedMarkerId, mediaType, image, canvasSize]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setVideoTime(video.currentTime);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const getCanvasMousePosition = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    const scaleX = videoDimensions.width / rect.width;
    const scaleY = videoDimensions.height / rect.height;

    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const { x, y } = getCanvasMousePosition(e);
    setStartPoint({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;
    const { x, y } = getCanvasMousePosition(e);
    setCurrentRect({
      x: startPoint.x,
      y: startPoint.y,
      width: x - startPoint.x,
      height: y - startPoint.y,
    });
  };

  const predefinedColors = [
    '#00FF00', // Lime
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFA500', // Orange
    '#800080', // Purple
    '#008000', // Green
    '#FFC0CB', // Pink
    '#A52A2A', // Brown
    '#808080', // Gray
    '#FFD700', // Gold
    '#4B0082', // Indigo
    '#7FFF00', // Chartreuse
    '#FF4500', // OrangeRed
    '#1E90FF', // DodgerBlue
    '#8B4513', // SaddleBrown
    '#FF1493', // DeepPink
    '#00CED1', // DarkTurquoise
    '#8B008B', // DarkMagenta
    '#556B2F', // DarkOliveGreen
    '#FF6347', // Tomato
    '#00FA9A', // MediumSpringGreen
    '#4682B4', // SteelBlue
    '#9932CC', // DarkOrchid
    '#2F4F4F', // DarkSlateGray
    '#D2691E', // Chocolate
    '#DC143C', // Crimson
    '#7B68EE', // MediumSlateBlue
    '#6B8E23', // OliveDrab
    '#48D1CC', // MediumTurquoise
    '#C71585', // MediumVioletRed
    '#191970', // MidnightBlue
    '#F4A460', // SandyBrown
    '#00BFFF', // DeepSkyBlue
    '#CD5C5C', // IndianRed
    '#32CD32', // LimeGreen
    '#DAA520', // GoldenRod
    '#8FBC8F', // DarkSeaGreen
    '#5F9EA0', // CadetBlue
    '#9400D3', // DarkViolet
    '#FF69B4', // HotPink
    '#CD853F', // Peru
    '#708090', // SlateGray
    '#00FF7F', // SpringGreen
    '#4169E1', // RoyalBlue
    '#8A2BE2', // BlueViolet
    '#20B2AA', // LightSeaGreen
    '#B8860B', // DarkGoldenRod
  ];

  const getNextColor = useCallback(() => {
    if (markerCount < predefinedColors.length) {
      return predefinedColors[markerCount];
    }
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  }, [markerCount]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !startPoint || !currentRect) return;

    const newMarkerCount = markerCount + 1;
    const newMarker: Marker = {
      id: uuidv4(),
      name: `Marker_${newMarkerCount.toString().padStart(3, '0')}`,
      x: currentRect.x,
      y: currentRect.y,
      width: currentRect.width,
      height: currentRect.height,
      color: getNextColor(),
      isGeneral: false,
    };

    addMarker(newMarker);
    selectMarker(newMarker.id);
    setMarkerCount(newMarkerCount);
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentRect(null);
  }, [isDrawing, startPoint, currentRect, markerCount, addMarker, selectMarker, getNextColor]);

  const handlePlayPause = () => {
    const video = videoRef.current!;
    if (video.paused || video.ended) {
      video.play();
    } else {
      video.pause();
    }
  };

  const handleSkipToStart = () => {
    const video = videoRef.current!;
    video.currentTime = 0;
    video.pause();
    // Position will be saved via the pause event listener in App.tsx
  };

  const handleSkipToEnd = () => {
    const video = videoRef.current!;
    video.currentTime = video.duration;
    video.pause();
    // Position will be saved via the pause event listener in App.tsx
  };

  const handleStepForward = () => {
    const video = videoRef.current!;
    if (!fps) return;

    // Obtém o tempo atual do frame
    const currentFrame = Math.floor(video.currentTime * fps);
    // Calcula o tempo do próximo frame
    const nextFrameTime = (currentFrame + 1) / fps;

    if (nextFrameTime <= video.duration) {
      video.currentTime = nextFrameTime;
      console.log(`Stepping to frame ${currentFrame + 1} (${nextFrameTime.toFixed(3)}s) at ${fps} fps`);
    }
  };

  const handleStepBackward = () => {
    const video = videoRef.current!;
    if (!fps) return;

    // Obtém o tempo atual do frame
    const currentFrame = Math.ceil(video.currentTime * fps);
    // Calcula o tempo do frame anterior
    const previousFrameTime = (currentFrame - 1) / fps;

    if (previousFrameTime >= 0) {
      video.currentTime = previousFrameTime;
      console.log(`Stepping to frame ${currentFrame - 1} (${previousFrameTime.toFixed(3)}s) at ${fps} fps`);
    }
  };

  return (
    <div ref={containerRef} className="video-player-container">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className="video-canvas"
        width={canvasSize.width}
        height={canvasSize.height}
      />

      {mediaType === 'video' && isMediaLoaded && (
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
      )}

      {mediaType === 'video' && mediaUrl && <video ref={videoRef} className="hidden" preload="auto" />}
    </div>
  );
}

export default VideoPlayer;
