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
  const lastProcessedTimeRef = useRef<number>(0);

  // Função para limpar completamente o WebSocket
  const cleanupWebSocket = useCallback(() => {
    if (wsRef.current) {
      // Remove todos os listeners antes de fechar
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
      cleanupWebSocket(); // Garante que não há conexão anterior
      
      wsRef.current = new WebSocket(WS_URL);
      
      wsRef.current.onopen = () => {
        console.log('Sync WebSocket connected');
      };

      wsRef.current.onclose = (event) => {
        // Só reconecta se o sync ainda estiver ativo
        if (isSyncEnabled && !event.wasClean) {
          wsRef.current = null;
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        } else {
          cleanupWebSocket();
        }
      };

      wsRef.current.onmessage = (event) => {
        if (onMetadataUpdate) {
          const data = JSON.parse(event.data);
          onMetadataUpdate(data);
        }
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      cleanupWebSocket();
    }
  }, [isSyncEnabled, onMetadataUpdate, cleanupWebSocket]);

  // Effect para gerenciar o ciclo de vida do WebSocket
  useEffect(() => {
    if (isSyncEnabled) {
      connect();
    } else {
      cleanupWebSocket();
    }

    return cleanupWebSocket;
  }, [isSyncEnabled, connect, cleanupWebSocket]);

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