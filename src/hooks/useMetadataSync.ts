import { useEffect, useRef, useCallback } from 'react';
import { PDIFunctionType } from '../types/api';
import type { ClientMessage, ServerMessage } from '../types/websocket';

const WS_URL = 'ws://localhost:8000/api/v1/ws/metadata';

interface UseMetadataSyncProps {
  isPlaying: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  markers: Array<any>;
  isSyncEnabled: boolean;
  onMetadataUpdate: (data: ServerMessage['data']) => void;
  selectedMarkerId: string | null;
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
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !videoRef.current || !selectedMarkerId) {
      return;
    }

    const selectedMarker = markers.find(m => m.id === selectedMarkerId);
    if (!selectedMarker) return;

    const selectedFunction = selectedMarker.functions?.[0] || 'color_segmentation';
    const parameters: Record<string, string> = {};

    if (selectedFunction === 'color_segmentation') {
      parameters[selectedFunction] = JSON.stringify({
        lower_color: selectedMarker.opencvParams?.lowerColor || { r: 0, g: 0, b: 0 },
        upper_color: selectedMarker.opencvParams?.upperColor || { r: 255, g: 255, b: 255 },
        tolerance: selectedMarker.opencvParams?.tolerance || 10,
        min_area: String(selectedMarker.opencvParams?.minArea || 100),
        max_area: String(selectedMarker.opencvParams?.maxArea || 10000)
      });
    } else {
      parameters[selectedFunction] = JSON.stringify({
        min_area: String(selectedMarker.opencvParams?.minArea || 1000),
        max_area: String(selectedMarker.opencvParams?.maxArea || 60000)
      });
    }

    const message = {
      timestamp: Math.round(videoRef.current.currentTime * 1000),
      frame_info: {
        markings: [{
          x: Math.round(selectedMarker.x),
          y: Math.round(selectedMarker.y),
          width: Math.round(selectedMarker.width),
          height: Math.round(selectedMarker.height)
        }],
        functions: [selectedFunction],
        parameters
      }
    };

    console.log('Sending sync message:', JSON.stringify(message, null, 2));
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
        console.log('Raw WebSocket message:', event.data);
        try {
          const message = JSON.parse(event.data);
          console.log('Parsed WebSocket message:', JSON.stringify(message, null, 2));
          onMetadataUpdate(message.data);
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
      console.log('Starting sync interval...');
      intervalId = setInterval(sendVideoTime, 1000 / 30);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPlaying, isSyncEnabled, sendVideoTime, selectedMarkerId, wsRef.current?.readyState]);

  return null;
} 