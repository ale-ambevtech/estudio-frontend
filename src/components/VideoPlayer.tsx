import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Marker } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { VIDEO } from '../constants/dimensions';
import { MARKER_COLORS } from '../constants/colors';
import { calculateScaledDimensions, calculateFps } from '../utils/video';
import { useMetadataSync } from '../hooks/useMetadataSync';
import type { BoundingBoxResult } from '../types/api';

interface VideoPlayerProps {
  markers: Marker[];
  addMarker: (marker: Marker) => void;
  selectedMarkerId: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  onDimensionsChange: (dimensions: { width: number; height: number }) => void;
  selectMarker: (id: string) => void;
  mediaType: 'video' | 'image' | null;
  mediaUrl: string | null;
  processingResults: Map<string, BoundingBoxResult[]>;
  isSyncEnabled: boolean;
  onSyncChange: (enabled: boolean) => void;
}

interface WebSocketBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FrameInfo {
  markings?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  detections?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  // outros campos possíveis
}

interface MetadataResponse {
  timestamp: number;
  video_id: string;
  frame_info: FrameInfo;
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
  processingResults,
  isSyncEnabled,
  onSyncChange,
}: VideoPlayerProps) {
  console.log('VideoPlayer rendered with:', {
    markersCount: markers.length,
    selectedMarkerId,
    hasResults: !!processingResults?.size,
    processingResults,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const isFirstRender = useRef(true);

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
  const [wsBoxes, setWsBoxes] = useState<WebSocketBoundingBox[]>([]);
  const wsBoxesRef = useRef<WebSocketBoundingBox[]>([]);

  useEffect(() => {
    wsBoxesRef.current = wsBoxes;
    console.log('WebSocket boxes updated:', wsBoxes);
  }, [wsBoxes]);

  const handleMetadataUpdate = useCallback((data: MetadataResponse) => {
    console.log('Raw metadata response:', JSON.stringify(data, null, 2));

    const markings = data.frame_info?.markings || data.frame_info?.detections || [];
    console.log('Extracted markings:', markings);

    if (markings.length > 0) {
      const newBoxes = markings.filter((box) => {
        const isValid =
          box &&
          typeof box.x === 'number' &&
          typeof box.y === 'number' &&
          typeof box.width === 'number' &&
          typeof box.height === 'number';

        const isBackground = box.x === 0 && box.y === 0 && box.width === 640 && box.height === 360;

        console.log('Box validation:', {
          box,
          isValid,
          isBackground,
          willBeIncluded: isValid && !isBackground,
        });

        return isValid && !isBackground;
      });

      console.log('Setting new boxes:', newBoxes);
      setWsBoxes(newBoxes);
      wsBoxesRef.current = newBoxes;
    }
  }, []);

  useMetadataSync({
    isPlaying,
    videoRef,
    markers,
    isSyncEnabled,
    onMetadataUpdate: handleMetadataUpdate,
    selectedMarkerId,
  });

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

  const getNextColor = useCallback(() => {
    if (markerCount < MARKER_COLORS.length) {
      return MARKER_COLORS[markerCount];
    }
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  }, [markerCount]);

  const drawFrame = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!ctx) return;

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      // Draw video frame
      if (mediaType === 'video' && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, ctx.canvas.width, ctx.canvas.height);
      }

      // Draw WebSocket boxes
      if (isSyncEnabled && wsBoxesRef.current.length > 0) {
        console.log('Drawing WS boxes:', {
          boxes: wsBoxesRef.current,
          canvasWidth: ctx.canvas.width,
          canvasHeight: ctx.canvas.height,
        });

        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;

        wsBoxesRef.current.forEach((box) => {
          console.log('Drawing box:', box);
          ctx.beginPath();
          ctx.rect(box.x, box.y, box.width, box.height);
          ctx.stroke();
        });
      }

      // Draw markers
      markers.forEach((marker) => {
        ctx.strokeStyle = marker.color;
        ctx.lineWidth = marker.id === selectedMarkerId ? 2 : 1;
        ctx.strokeRect(marker.x, marker.y, marker.width, marker.height);
      });

      // Draw current rectangle being created
      if (isDrawing && currentRect) {
        ctx.strokeStyle = getNextColor();
        ctx.lineWidth = 2;
        ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      }

      // Draw processing results
      if (selectedMarkerId) {
        const markerResults = processingResults.get(selectedMarkerId);
        const selectedMarker = markers.find((m) => m.id === selectedMarkerId);

        if (selectedMarker && markerResults && markerResults.length > 0) {
          const boxes = markerResults[0].bounding_boxes;

          ctx.strokeStyle = selectedMarker.color;
          ctx.lineWidth = 2;

          boxes.forEach((box: number[]) => {
            const [x, y, width, height] = box;
            const boxX = selectedMarker.x + x;
            const boxY = selectedMarker.y + y;

            ctx.beginPath();
            ctx.rect(boxX, boxY, width, height);
            ctx.stroke();
          });
        }
      }
    },
    [
      markers,
      selectedMarkerId,
      processingResults,
      mediaType,
      videoRef,
      isDrawing,
      currentRect,
      getNextColor,
      isSyncEnabled,
    ]
  );

  // Use um único useEffect para o loop de renderização
  useEffect(() => {
    let animationFrame: number;

    const render = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (ctx) {
        drawFrame(ctx);
      }

      animationFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [drawFrame]);

  useEffect(() => {
    console.log('Processing results updated');

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (ctx) {
      // Renderizar apenas uma vez, sem iniciar loop
      drawFrame(ctx);
    }
  }, [processingResults, drawFrame]);

  useEffect(() => {
    console.log('Processing results updated:', {
      hasResults: !!processingResults?.size,
      results: processingResults,
    });

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (ctx) {
      drawFrame(ctx);
    }
  }, [processingResults, drawFrame]);

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
      opencvParams: {
        lowerColor: { r: 0, g: 0, b: 0 },
        upperColor: { r: 255, g: 255, b: 255 },
      },
    };

    addMarker(newMarker);
    selectMarker(newMarker.id);
    setMarkerCount(newMarkerCount);
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentRect(null);
  }, [isDrawing, startPoint, currentRect, markerCount, addMarker, selectMarker, getNextColor]);

  // Adicionar useEffect para monitorar mudanças nas props
  useEffect(() => {
    console.log('Props updated:', {
      markersCount: markers.length,
      selectedMarkerId,
      hasResults: !!processingResults?.size,
      processingResults,
    });
  }, [markers, selectedMarkerId, processingResults]);

  return (
    <div className="relative">
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
      {!mediaUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <p className="text-gray-500">Nenhuma mídia carregada</p>
        </div>
      )}
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={isSyncEnabled}
              onChange={(e) => onSyncChange(e.target.checked)}
            />
            <div className="w-10 h-5 bg-gray-300 rounded-full shadow-inner"></div>
            <div
              className={`absolute w-3 h-3 bg-white rounded-full shadow -translate-y-1/2 top-1/2 transition-transform ${
                isSyncEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            ></div>
          </div>
          <span className="ml-2 text-sm text-gray-600">Sync</span>
        </label>
      </div>
    </div>
  );
}

export default VideoPlayer;
