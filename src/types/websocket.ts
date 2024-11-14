export interface FrameInfo {
  markings: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  functions: Array<string>;
  parameters: Record<string, any>;
}

export interface ClientMessage {
  timestamp: number;
  frame_info: FrameInfo;
}

export interface ServerMessage {
  type: 'metadata_sync';
  data: {
    timestamp: number;
    video_id: string;
    frame_info: FrameInfo;
  };
} 