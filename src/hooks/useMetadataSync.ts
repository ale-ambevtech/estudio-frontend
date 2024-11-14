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
  onMetadataUpdate: (data: any) => void;
  selectedMarkerId?: string | null;
}

export function useMetadataSync({ 
  isPlaying, 
  videoRef, 
  markers, 
  isSyncEnabled, 
  onMetadataUpdate, 
  selectedMarkerId 
}: UseMetadataSyncProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const isConnectingRef = useRef(false);

  const sendVideoTime = useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN && 
      videoRef.current && 
      selectedMarkerId
    ) {
      const message = {
        type: 'sync_request',
        marker_id: selectedMarkerId,
        timestamp: Math.round(videoRef.current.currentTime * 1000)
      };
      
      console.log('Sending sync request:', JSON.stringify(message, null, 2));
      wsRef.current.send(JSON.stringify(message));
    }
  }, [selectedMarkerId]);

  const connect = useCallback(() => {
    if (isConnectingRef.current || !isSyncEnabled) return;
    
    try {
      isConnectingRef.current = true;
      console.log('Connecting to WebSocket...');
      
      wsRef.current = new WebSocket(WS_URL);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected successfully');
        isConnectingRef.current = false;
        
        if (wsRef.current && selectedMarkerId) {
          const initMessage = {
            type: 'init',
            marker_id: selectedMarkerId,
            client_type: 'web_player'
          };
          console.log('Sending init message:', JSON.stringify(initMessage, null, 2));
          wsRef.current.send(JSON.stringify(initMessage));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received WebSocket message:', message);
          
          if (message.type === 'error') {
            console.error('WebSocket error:', message.message);
            return;
          }
          
          if (message.type === 'metadata_sync' && onMetadataUpdate) {
            onMetadataUpdate(message.data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket connection closed, attempting reconnect...');
        isConnectingRef.current = false;
        if (isSyncEnabled) {
          reconnectTimeoutRef.current = setTimeout(connect, 1000);
        }
      };

    } catch (error) {
      console.error('Error in WebSocket setup:', error);
      isConnectingRef.current = false;
    }
  }, [isSyncEnabled, selectedMarkerId, onMetadataUpdate]);

  // Enviar atualizações de tempo quando o vídeo estiver em reprodução
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isPlaying && isSyncEnabled && selectedMarkerId) {
      intervalId = setInterval(sendVideoTime, 500); // 2fps
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPlaying, isSyncEnabled, sendVideoTime, selectedMarkerId]);

  useEffect(() => {
    if (isSyncEnabled) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isSyncEnabled, connect]);

  return null;
} 