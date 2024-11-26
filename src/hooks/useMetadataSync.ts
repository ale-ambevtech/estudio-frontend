import { useEffect, useRef, useCallback } from 'react';
import type { ServerMessage } from '../types/websocket';
import { createPDIFunction } from '../utils/pdi';

const WS_URL = import.meta.env.VITE_WS_URL;

if (!WS_URL) {
  throw new Error('VITE_WS_URL environment variable is not defined');
}

interface UseMetadataSyncProps {
  isPlaying: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  markers: Array<any>;
  isSyncEnabled: boolean;
  onMetadataUpdate: (data: ServerMessage['data']) => void;
  selectedMarkerId: string | null;
  isDebugEnabled: boolean;
}



export function useMetadataSync({
  isPlaying,
  videoRef,
  markers,
  isSyncEnabled,
  onMetadataUpdate,
  isDebugEnabled
}: UseMetadataSyncProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const lastProcessedTimeRef = useRef<number>(0);
  const isConnectedRef = useRef<boolean>(false);

  const cleanupWebSocket = useCallback(() => {
    isConnectedRef.current = false;
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
  }, []);

  const connect = useCallback(() => {
    if (!isSyncEnabled || wsRef.current) return;

    try {
      cleanupWebSocket();
      isDebugEnabled && console.log('Connecting to WebSocket...');
      
      wsRef.current = new WebSocket(WS_URL);
      
      wsRef.current.onopen = () => {
        isDebugEnabled && console.log('WebSocket connected successfully');
        isConnectedRef.current = true;
      };

      wsRef.current.onclose = (event) => {
        isDebugEnabled && console.log('WebSocket closed:', event);
        isConnectedRef.current = false;
        if (isSyncEnabled && !event.wasClean) {
          wsRef.current = null;
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        } else {
          cleanupWebSocket();
        }
      };

      wsRef.current.onmessage = (event) => {
        isDebugEnabled && console.log('WebSocket message received:', event.data);
        if (onMetadataUpdate) {
          try {
            const data = JSON.parse(event.data);
            isDebugEnabled && console.log('Parsed WebSocket data:', data);
            onMetadataUpdate(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      isConnectedRef.current = false;
      cleanupWebSocket();
    }
  }, [isSyncEnabled, onMetadataUpdate, cleanupWebSocket, isDebugEnabled]);

  useEffect(() => {
    if (isSyncEnabled) {
      connect();
    } else {
      cleanupWebSocket();
    }

    return cleanupWebSocket;
  }, [isSyncEnabled, connect, cleanupWebSocket]);

  const sendVideoTime = useCallback(() => {
    if (!wsRef.current || !isConnectedRef.current || !videoRef.current) return;

    const currentTime = Math.floor(videoRef.current.currentTime * 1000);
    if (currentTime === lastProcessedTimeRef.current) return;

    // Processa todos os marcadores que têm função OpenCV configurada
    const markersToProcess = markers.filter(marker => 
      marker.opencvFunction && marker.opencvParams
    );

    markersToProcess.forEach(marker => {
      const pdiFunction = createPDIFunction(marker);
      if (!pdiFunction) return;

      try {
        const message = {
          marker_id: marker.id,
          timestamp: currentTime,
          pdi_functions: [pdiFunction],
          roi: {
            position: {
              x: Math.round(marker.x),
              y: Math.round(marker.y)
            },
            size: {
              width: Math.round(marker.width),
              height: Math.round(marker.height)
            }
          }
        };

        wsRef.current?.send(JSON.stringify(message));
        isDebugEnabled && console.log('Processing marker:', marker.id);
      } catch (error) {
        console.error('Error processing marker:', marker.id, error);
      }
    });

    lastProcessedTimeRef.current = currentTime;
  }, [markers, isDebugEnabled]);

  // Função para processar mudanças no tempo do vídeo
  const handleTimeUpdate = useCallback(() => {
    if (!isSyncEnabled || !wsRef.current || !isConnectedRef.current) return;
    sendVideoTime();
  }, [isSyncEnabled, sendVideoTime]);

  // Efeito para lidar com o intervalo durante a reprodução
  useEffect(() => {
    if (isPlaying && isSyncEnabled) {
      const intervalId = setInterval(handleTimeUpdate, 33); // ~30fps
      return () => clearInterval(intervalId);
    }
  }, [isPlaying, isSyncEnabled, handleTimeUpdate]);

  // Efeito para lidar com eventos de seeking e timeupdate
  useEffect(() => {
    if (!videoRef.current || !isSyncEnabled) return;

    const video = videoRef.current;
    
    // Processa imediatamente após um seek
    const handleSeek = () => {
      console.log('Seek detected, sending time update');
      handleTimeUpdate();
    };

    // Processa quando o tempo é atualizado (inclui play/pause e seeking)
    const handleVideoTimeUpdate = () => {
      if (!isPlaying) { // Só processa se não estiver em reprodução
        console.log('Time updated while paused, sending update');
        handleTimeUpdate();
      }
    };

    video.addEventListener('seeked', handleSeek);
    video.addEventListener('timeupdate', handleVideoTimeUpdate);

    return () => {
      video.removeEventListener('seeked', handleSeek);
      video.removeEventListener('timeupdate', handleVideoTimeUpdate);
    };
  }, [videoRef, isSyncEnabled, isPlaying, handleTimeUpdate, isDebugEnabled]);

  return { isConnected: isConnectedRef.current };
} 