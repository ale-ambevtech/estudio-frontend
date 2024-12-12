import { useEffect, useRef, useCallback } from 'react';
import type { ServerMessage } from '../types/websocket';
import { createPDIFunction } from '../utils/pdi';
import { checKMirrorAndStorageVideo } from '@/utils/checkVideo';

const WS_URL = import.meta.env.VITE_WS_URL;

if (!WS_URL) {
  throw new Error('VITE_WS_URL environment variable is not defined');
}

interface UseMetadataSyncProps {
  isPlaying: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  markers: any[];
  isSyncEnabled: boolean;
  onMetadataUpdate: (data: ServerMessage['data']) => void;
  selectedMarkerId: string | null;
  isDebugEnabled: boolean;
  onSyncChange: (enabled: boolean) => void;
}

export function useMetadataSync({
  isPlaying,
  videoRef,
  markers,
  isSyncEnabled,
  onMetadataUpdate,
  isDebugEnabled,
  onSyncChange,
}: UseMetadataSyncProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const lastProcessedTimeRef = useRef<number>(0);
  const isConnectedRef = useRef<boolean>(false);

  const cleanupWebSocketConnection = useCallback(() => {
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

  const establishWebSocketConnection = useCallback(async () => {
    if (!isSyncEnabled || wsRef.current) return;
    const res = await checKMirrorAndStorageVideo();

    if (!res.isSameVideo) {
      console.error('O espelhamento de video não corresponde ao mesmo id.');
      return;
    }

    try {
      cleanupWebSocketConnection();
      isDebugEnabled && console.log('Connecting to WebSocket...');

      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onopen = () => {
        isDebugEnabled && console.log('WebSocket connected successfully');
        isConnectedRef.current = true;
      };

      wsRef.current.onclose = (event) => {
        isDebugEnabled && console.log('WebSocket closed:', event);
        isConnectedRef.current = false;
        const isUnintentionalDisconnection = !event.wasClean;
        if (isSyncEnabled && isUnintentionalDisconnection) {
          wsRef.current = null;
          reconnectTimeoutRef.current = setTimeout(establishWebSocketConnection, 3000);
        } else {
          cleanupWebSocketConnection();
          onSyncChange(false);
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
        cleanupWebSocketConnection();
        onSyncChange(false);
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      isConnectedRef.current = false;
      cleanupWebSocketConnection();
      onSyncChange(false);
    }
  }, [isSyncEnabled, onMetadataUpdate, cleanupWebSocketConnection, isDebugEnabled]);

  useEffect(() => {
    if (isSyncEnabled) {
      establishWebSocketConnection();
    } else {
      cleanupWebSocketConnection();
    }

    return cleanupWebSocketConnection;
  }, [isSyncEnabled, establishWebSocketConnection, cleanupWebSocketConnection]);

  const sendMetadata = useCallback(() => {
    if (!wsRef.current || !isConnectedRef.current || !videoRef.current) return;

    const currentTimeInMilliseconds = Math.floor(videoRef.current.currentTime * 1000);
    if (currentTimeInMilliseconds === lastProcessedTimeRef.current) return;

    const markersWithOpenCVFunction = markers.filter((marker) => marker.opencvFunction && marker.opencvParams);

    markersWithOpenCVFunction.forEach((marker) => {
      const pdiFunction = createPDIFunction(marker);
      if (!pdiFunction) return;

      try {
        const message = {
          marker_id: marker.id,
          timestamp: currentTimeInMilliseconds,
          pdi_functions: [pdiFunction],
          roi: {
            position: {
              x: Math.round(marker.x),
              y: Math.round(marker.y),
            },
            size: {
              width: Math.round(marker.width),
              height: Math.round(marker.height),
            },
          },
        };

        wsRef.current?.send(JSON.stringify(message));
        isDebugEnabled && console.log('Processing marker:', marker.id);
      } catch (error) {
        console.error('Error processing marker:', marker.id, error);
      }
    });

    lastProcessedTimeRef.current = currentTimeInMilliseconds;
  }, [markers, isDebugEnabled]);

  const updateMetadataOnTimeChange = useCallback(() => {
    if (!isSyncEnabled || !wsRef.current || !isConnectedRef.current) return;
    sendMetadata();
  }, [isSyncEnabled, sendMetadata]);

  useEffect(() => {
    if (isPlaying && isSyncEnabled) {
      const intervalId = setInterval(updateMetadataOnTimeChange, 33); // ~30fps
      return () => clearInterval(intervalId);
    }
  }, [isPlaying, isSyncEnabled, updateMetadataOnTimeChange]);

  useEffect(() => {
    if (!videoRef.current || !isSyncEnabled) return;

    const videoElement = videoRef.current;

    const handleSeekEvent = () => {
      console.log('Seek detected, sending time update');
      updateMetadataOnTimeChange();
    };

    const handleTimeUpdateEvent = () => {
      if (!isPlaying) {
        console.log('Time updated while paused, sending update');
        updateMetadataOnTimeChange();
      }
    };

    videoElement.addEventListener('seeked', handleSeekEvent);
    videoElement.addEventListener('timeupdate', handleTimeUpdateEvent);

    return () => {
      videoElement.removeEventListener('seeked', handleSeekEvent);
      videoElement.removeEventListener('timeupdate', handleTimeUpdateEvent);
    };
  }, [videoRef, isSyncEnabled, isPlaying, updateMetadataOnTimeChange, isDebugEnabled]);

  return { isConnected: isConnectedRef.current };
}
