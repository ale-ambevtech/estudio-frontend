import { useEffect, useRef, useCallback } from 'react';
import { PDIFunctionType } from '../types/api';
import { Marker } from '../types/marker';
import type { ClientMessage, ServerMessage } from '../types/websocket';
import { createPDIFunction } from '../utils/pdi';

const WS_URL = 'ws://localhost:8000/api/v1/ws/metadata';

interface UseMetadataSyncProps {
  isPlaying: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  markers: Array<any>;
  isSyncEnabled: boolean;
  onMetadataUpdate: (data: ServerMessage['data']) => void;
  selectedMarkerId: string | null;
}

interface WSRequest {
  timestamp: number;
  roi: {
    position: {
      x: number;
      y: number;
    };
    size: {
      width: number;
      height: number;
    };
  };
  pdi_functions: Array<{
    function: string;
    parameters: Record<string, any>;
    output_type: string;
  }>;
}

interface WSResponse {
  timestamp: number;
  video_id: string;
  frame_info: {
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
    functions?: PDIFunctionType[];
    parameters?: {
      color_segmentation?: {
        lower_color: { r: number; g: number; b: number };
        upper_color: { r: number; g: number; b: number };
        tolerance: number;
        min_area: number;
        max_area: number;
      };
      shape_detection?: {
        shapes: string[];
        shape_tolerance: number;
      };
      template_matching?: {
        template_image: string;
        threshold: number;
      };
      people_detection?: {
        min_area: number;
        max_area: number;
      };
    };
  };
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
  const lastProcessedTimeRef = useRef<number>(0);

  const sendVideoTime = useCallback(() => {
    if (!wsRef.current || 
        wsRef.current.readyState !== WebSocket.OPEN || 
        !videoRef.current || 
        !selectedMarkerId) {
      return;
    }

    const currentTime = videoRef.current.currentTime;
    if (Math.abs(currentTime - lastProcessedTimeRef.current) < 0.033) {
      return;
    }

    const selectedMarker = markers.find(m => m.id === selectedMarkerId);
    if (!selectedMarker) return;

    const pdiFunction = createPDIFunction(selectedMarker);
    if (!pdiFunction) return;

    const message: WSRequest = {
      timestamp: Math.round(currentTime * 1000),
      roi: {
        position: {
          x: Math.round(selectedMarker.x),
          y: Math.round(selectedMarker.y),
        },
        size: {
          width: Math.round(selectedMarker.width),
          height: Math.round(selectedMarker.height),
        }
      },
      pdi_functions: [pdiFunction],
    };

    lastProcessedTimeRef.current = currentTime;
    wsRef.current.send(JSON.stringify(message));
  }, [markers, selectedMarkerId, videoRef]);

  const connect = useCallback(() => {
    if (isConnectingRef.current || !isSyncEnabled) {
      console.log('Skipping connection - already connecting or sync disabled');
      return;
    }

    try {
      console.log('Initializing WebSocket connection...');
      isConnectingRef.current = true;
      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected successfully');
        isConnectingRef.current = false;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSResponse;
          
          if (data.frame_info?.detections) {
            onMetadataUpdate({
              timestamp: data.timestamp,
              video_id: data.video_id,
              frame_info: data.frame_info
            });
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected, attempting reconnect...');
        wsRef.current = null;
        isConnectingRef.current = false;
        if (isSyncEnabled) {
          reconnectTimeoutRef.current = setTimeout(connect, 1000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        wsRef.current?.close();
      };

    } catch (error) {
      console.error('Error in WebSocket setup:', error);
      isConnectingRef.current = false;
      wsRef.current = null;
    }
  }, [isSyncEnabled, onMetadataUpdate]);

  useEffect(() => {
    if (isSyncEnabled) {
      console.log('Sync enabled, connecting WebSocket...');
      connect();
    } else {
      console.log('Sync disabled, closing WebSocket...');
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    }

    return () => {
      console.log('Cleaning up WebSocket...');
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isSyncEnabled, connect]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isPlaying && isSyncEnabled && selectedMarkerId && wsRef.current?.readyState === WebSocket.OPEN) {
      // Ajusta a frequência de envio para aproximadamente 30fps
      intervalId = setInterval(sendVideoTime, 33);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPlaying, isSyncEnabled, sendVideoTime, selectedMarkerId]);

  // Adiciona um efeito para processar quando há mudança manual de frame
  useEffect(() => {
    if (!isPlaying && isSyncEnabled && selectedMarkerId) {
      sendVideoTime();
    }
  }, [isSyncEnabled, selectedMarkerId, videoRef.current?.currentTime]);

  return null;
} 