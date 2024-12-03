import axios, { AxiosError } from 'axios';
import type { VideoMetadata, ProcessVideoRequest } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL environment variable is not defined');
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function uploadVideo(file: File): Promise<VideoMetadata> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<VideoMetadata>('/video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Upload failed:', error);
    if (error instanceof AxiosError) {
      console.error('Error details:', error.response?.data);
    }
    throw error;
  }
}

export async function processVideo(request: ProcessVideoRequest): Promise<unknown> {
  try {
    console.log('Processing video with request:', JSON.stringify(request, null, 2));

    const response = await api.post('/process', request);
    console.log('Processing successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Processing failed:', error);
    if (error instanceof AxiosError) {
      console.error('Error details:', error.response?.data);
    }
    throw error;
  }
}

export async function checkVideoMirror(): Promise<VideoMetadata | null> {
  try {
    const response = await api.get<VideoMetadata>('/video', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Upload failed:', error);
    if (error instanceof AxiosError) {
      console.error('Error details:', error.response?.data);
    }
    throw error;
  }
}
