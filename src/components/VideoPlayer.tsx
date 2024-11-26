import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Marker } from '../types/marker';
import { v4 as uuidv4 } from 'uuid';
import { VIDEO } from '../constants/dimensions';
import { MARKER_COLORS } from '../constants/colors';
import { calculateScaledDimensions, calculateFps } from '../utils/video';
import { useMetadataSync } from '../hooks/useMetadataSync';
import { type BoundingBoxResult } from '../types/api';
import { useSyncContext } from '../contexts/SyncContext';

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
  onProcessVideo: () => void;
  fps: number;
  onFpsChange: (fps: number) => void;
  isDebugEnabled?: boolean;
  onDebugChange: (enabled: boolean) => void;
}

interface WebSocketBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
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
  onProcessVideo,
  onFpsChange,
  isDebugEnabled = false,
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
  const [markerCount, setMarkerCount] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [, setIsVideoReady] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [, setImage] = useState<HTMLImageElement | null>(null);
  const [, setIsMediaLoaded] = useState(false);
  const [wsBoxes] = useState<WebSocketBoundingBox[]>([]);
  const wsBoxesRef = useRef<WebSocketBoundingBox[]>([]);
  const [syncResults, setSyncResults] = useState<Map<string, BoundingBoxResult[]>>(new Map());

  useSyncContext();

  useEffect(() => {
    wsBoxesRef.current = wsBoxes;
  }, [wsBoxes]);

  const onMetadataUpdate = useCallback(
    (wsResponse: any) => {
      if (!wsResponse?.data?.results || !wsResponse?.data?.marker_id) {
        isDebugEnabled && console.log('Skipping update, invalid response structure');
        return;
      }

      const firstResult = wsResponse.data.results[0];
      if (!firstResult?.bounding_boxes) {
        isDebugEnabled && console.log('No bounding boxes in result');
        return;
      }

      const markerId = wsResponse.data.marker_id;

      setSyncResults((prev) => {
        const newResults = new Map(prev);
        newResults.set(markerId, [
          {
            function: firstResult.function,
            bounding_boxes: firstResult.bounding_boxes,
          },
        ]);
        return newResults;
      });

      isDebugEnabled && console.log('Updated sync results for marker:', markerId);
    },
    [isDebugEnabled]
  );

  useMetadataSync({
    isPlaying,
    videoRef,
    markers,
    isSyncEnabled,
    onMetadataUpdate,
    selectedMarkerId,
    isDebugEnabled,
  });

  const handleFpsCalculation = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const newFps = calculateFps(video);
    onFpsChange(newFps);
  }, [videoRef, onFpsChange]);

  useEffect(() => {
    if (!mediaUrl || mediaType !== 'video') return;

    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
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
      const img = new Image();
      img.onload = () => {
        const dimensions = {
          width: Math.min(img.width, VIDEO.MAX_WIDTH),
          height: Math.min(img.height, VIDEO.MAX_HEIGHT),
        };
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

      // Limpar o canvas
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      // Desenhar o frame do vídeo
      if (mediaType === 'video' && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, ctx.canvas.width, ctx.canvas.height);
      }

      // Desenhar os marcadores
      markers.forEach((marker) => {
        ctx.strokeStyle = marker.color;
        ctx.lineWidth = marker.id === selectedMarkerId ? 2 : 1;
        ctx.strokeRect(marker.x, marker.y, marker.width, marker.height);
      });

      // Desenhar resultados do processamento para todos os marcadores
      markers.forEach((marker) => {
        const results = isSyncEnabled ? syncResults.get(marker.id) : processingResults.get(marker.id);

        if (marker && results?.[0]) {
          ctx.strokeStyle = marker.color;
          ctx.lineWidth = marker.id === selectedMarkerId ? 2 : 1;

          results[0].bounding_boxes.forEach((box) => {
            const [x, y, width, height] = box;
            ctx.beginPath();
            ctx.rect(marker.x + x, marker.y + y, width, height);
            ctx.stroke();
          });
        }
      });

      // Adicionar desenho do retângulo temporário
      if (isDrawing && currentRect) {
        ctx.strokeStyle = '#00ff00'; // ou use a cor que preferir
        ctx.lineWidth = 2;
        ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      }
    },
    [
      markers,
      selectedMarkerId,
      processingResults,
      syncResults,
      isSyncEnabled,
      mediaType,
      videoRef,
      isDrawing,
      currentRect,
    ]
  );

  // Consolidar os useEffects de renderização
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

  // Atualizar quando os resultados mudarem
  useEffect(() => {
    if (!processingResults?.size) return;

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

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !startPoint) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      setCurrentRect({
        x: Math.min(startPoint.x, x),
        y: Math.min(startPoint.y, y),
        width: Math.abs(x - startPoint.x),
        height: Math.abs(y - startPoint.y),
      });
    },
    [isDrawing, startPoint]
  );

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
  useEffect(() => {}, [markers, selectedMarkerId, processingResults]);

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
        <div className="absolute inset-0 flex items-center justify-center bg-gray-300 rounded-lg min-h-[360px]">
          <p className="text-gray-500">Nenhuma mídia carregada</p>
        </div>
      )}
      {!isSyncEnabled && (
        <div className="flex justify-center mt-4">
          <button onClick={onProcessVideo} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Processar Marcadores
          </button>
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;
