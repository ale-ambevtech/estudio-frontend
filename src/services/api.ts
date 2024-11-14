import axios, { AxiosError } from 'axios';
import type { VideoMetadata, ProcessVideoRequest } from '../types/api';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export async function uploadVideo(file: File): Promise<VideoMetadata> {
  try {
    console.log('Uploading video file:', file.name);
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<VideoMetadata>('/video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('Upload successful:', response.data);
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