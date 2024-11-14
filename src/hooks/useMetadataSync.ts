import { useEffect, useRef, useCallback } from 'react';
import { debounce } from '../utils/debounce';
import type { ClientMessage, ServerMessage } from '../types/websocket';

const WS_URL = 'ws://localhost:8000/api/v1/ws/metadata';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000;

interface UseMetadataSyncProps {
  isPlaying: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  markers: Array<any>;
  isSyncEnabled: boolean;
  onMetadataUpdate?: (data: ServerMessage['data']) => void;
}

export function useMetadataSync({ 
  isPlaying, 
  videoRef, 
  markers, 
  isSyncEnabled, 
  onMetadataUpdate 
}: UseMetadataSyncProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (!window.WebSocket) {
      console.warn('WebSocket not supported');
      return;
    }

    try {
      wsRef.current = new WebSocket(WS_URL);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttemptsRef.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ServerMessage;
          if (message.type === 'metadata_sync' && onMetadataUpdate) {
            onMetadataUpdate(message.data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        if (event.code === 1006 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current);
          console.log(`WebSocket disconnected, attempting reconnect in ${delay}ms`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }, [onMetadataUpdate]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendUpdate = useCallback(
    debounce((timestamp: number) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      const message: ClientMessage = {
        timestamp,
        frame_info: {
          markings: markers.map(({ x, y, width, height }) => ({
            x, y, width, height
          })),
          functions: markers.map(m => m.opencvFunction).filter(Boolean),
          parameters: markers.reduce((acc, m) => ({
            ...acc,
            [m.id]: m.opencvParams
          }), {})
        }
      };

      wsRef.current.send(JSON.stringify(message));
    }, 100),
    [markers]
  );

  useEffect(() => {
    if (isPlaying && isSyncEnabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isPlaying, isSyncEnabled, connect, disconnect]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;

    const handleTimeUpdate = () => {
      sendUpdate(video.currentTime * 1000);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [isPlaying, videoRef, sendUpdate]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    reconnectAttempts: reconnectAttemptsRef.current
  };
} 