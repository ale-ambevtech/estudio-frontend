import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Marker } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { VIDEO } from '../constants/dimensions';
import { MARKER_COLORS } from '../constants/colors';
import { calculateScaledDimensions, calculateFps } from '../utils/video';

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
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isMediaLoaded, setIsMediaLoaded] = useState(false);

  const handleFpsCalculation = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const newFps = calculateFps(video);
    setFps(newFps);
    console.log('Calculated FPS:', newFps);
  }, [videoRef]);

  useEffect(() => {
    if (!mediaUrl || mediaType !== 'video') return;

    const video = videoRef.current;
    if (!video) return;

    console.log('Setting up video with URL:', mediaUrl);

    const handleLoadedMetadata = () => {
      console.log('Video loadedmetadata event fired');
      const { width: scaledWidth, height: scaledHeight } = calculateScaledDimensions(
        video.videoWidth,
        video.videoHeight
      );

      const dimensions = {
        width: scaledWidth,
        height: scaledHeight,
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
  }, [mediaUrl, mediaType, onDimensionsChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      console.log('Video loadedmetadata event fired');
      handleFpsCalculation();

      const { width: scaledWidth, height: scaledHeight } = calculateScaledDimensions(
        video.videoWidth,
        video.videoHeight
      );

      const dimensions = {
        width: scaledWidth,
        height: scaledHeight,
      };

      setVideoDimensions(dimensions);
      setCanvasSize(dimensions);
      onDimensionsChange(dimensions);
      setIsVideoReady(true);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [handleFpsCalculation, onDimensionsChange]);

  useEffect(() => {
    if (mediaType === 'image' && mediaUrl) {
      console.log('Loading image:', mediaUrl);
      const img = new Image();
      img.onload = () => {
        console.log('Image loaded successfully. Dimensions:', img.width, 'x', img.height);
        const dimensions = {
          width: Math.min(img.width, VIDEO.MAX_WIDTH),
          height: Math.min(img.height, VIDEO.MAX_HEIGHT),
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

  const getNextColor = useCallback(() => {
    if (markerCount < MARKER_COLORS.length) {
      return MARKER_COLORS[markerCount];
    }
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  }, [markerCount]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !startPoint || !currentRect) return;

    const newMarkerCount = markerCount + 1;
    const newMarker: Marker = {
      id: uuidv4(),
      name: `Marcador ${newMarkerCount.toString().padStart(3, '0')}`,
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
      {mediaType === 'video' && mediaUrl && <video ref={videoRef} className="hidden" preload="auto" />}
    </div>
  );
}

export default VideoPlayer;
