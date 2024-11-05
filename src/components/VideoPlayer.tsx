import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Marker } from '../types';
import { FaPlay, FaPause, FaStepForward, FaStepBackward, FaFastForward, FaFastBackward } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid';
import cv from '@techstark/opencv-js';
import {
  initOpenCV,
  colorSegmentation,
  detectShapes,
  templateMatching,
  detectPeople,
  hexToRgb,
  rgbToHsv,
  createOffscreenCanvas,
} from '../utils/opencvUtils';

interface FirefoxVideoElement extends HTMLVideoElement {
  mozPresentedFrames?: number;
  mozPaintedFrames?: number;
  mozFrameDelay?: number;
  webkitDecodedFrameCount?: number;
}

interface VideoPlayerProps {
  markers: Marker[];
  addMarker: (marker: Marker) => void;
  selectedMarkerId: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  onDimensionsChange: (dimensions: { width: number; height: number }) => void;
  selectMarker: (id: string) => void; // Adicione esta linha
  mediaType: 'video' | 'image' | null;
  mediaUrl: string | null;
}

const MAX_WIDTH = 640;
const MAX_HEIGHT = 480;

export function VideoPlayer({
  markers,
  addMarker,
  videoRef,
  selectedMarkerId,
  onDimensionsChange,
  selectMarker,
  mediaType,
  mediaUrl,
}: VideoPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<OffscreenCanvas | HTMLCanvasElement | null>(null);
  const offscreenCtxRef = useRef<OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(30);
  const [markerCount, setMarkerCount] = useState(0);
  const [isOpenCVReady, setIsOpenCVReady] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [openCVError, setOpenCVError] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loadedTemplates, setLoadedTemplates] = useState<{ [key: string]: HTMLImageElement }>({});

  useEffect(() => {
    initOpenCV()
      .then(() => {
        console.log('OpenCV inicializado com sucesso');
        setIsOpenCVReady(true);
      })
      .catch((error) => {
        console.error('Erro ao inicializar OpenCV:', error);
        setOpenCVError('Failed to initialize OpenCV');
      });
  }, []);

  const calculateFps = useCallback(() => {
    const video = videoRef.current as FirefoxVideoElement;
    if (!video) return;

    // Método 1: Firefox
    if (video.mozPresentedFrames && video.mozPaintedFrames && video.mozFrameDelay) {
      const fps = 1000 / video.mozFrameDelay;
      setFps(fps);
      console.log('Firefox FPS:', fps);
      return;
    }

    // Método 2: Chrome/Safari
    if ('webkitDecodedFrameCount' in video) {
      const startTime = video.currentTime;
      const startFrames = video.webkitDecodedFrameCount;

      // Avança um pequeno intervalo para contar os frames
      video.currentTime = startTime + 0.1;

      video.addEventListener(
        'seeked',
        () => {
          const endFrames = video.webkitDecodedFrameCount;
          if (typeof endFrames === 'number' && typeof startFrames === 'number') {
            const framesDiff = endFrames - startFrames;
            const fps = Math.round(framesDiff / 0.1);

            setFps(fps);
            video.currentTime = startTime;
            console.log('Chrome/Safari FPS:', fps);
          }
        },
        { once: true }
      );

      return;
    }

    // Método 3: Fallback - Análise do MediaInfo
    const videoTrack = (video as any).videoTracks?.[0];
    if (videoTrack) {
      const fps = videoTrack.frameRate || 30;
      setFps(fps);
      console.log('MediaInfo FPS:', fps);
      return;
    }

    // Método 4: Último fallback - valor padrão comum
    setFps(29.97);
    console.log('Default FPS:', 29.97);
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      calculateFps();

      const originalWidth = video.videoWidth;
      const originalHeight = video.videoHeight;
      const aspectRatio = originalWidth / originalHeight;

      let scaledWidth = originalWidth;
      let scaledHeight = originalHeight;

      // Redimensiona mantendo a proporção e respeitando os limites máximos
      if (scaledWidth > MAX_WIDTH) {
        scaledWidth = MAX_WIDTH;
        scaledHeight = Math.floor(scaledWidth / aspectRatio);
      }

      if (scaledHeight > MAX_HEIGHT) {
        scaledHeight = MAX_HEIGHT;
        scaledWidth = Math.floor(scaledHeight * aspectRatio);
      }

      const dimensions = {
        width: Math.floor(scaledWidth),
        height: Math.floor(scaledHeight),
      };

      console.log('Video dimensions after scaling:', dimensions);

      setVideoDimensions(dimensions);
      setCanvasSize(dimensions);
      onDimensionsChange(dimensions);
      setIsVideoReady(true);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [calculateFps, onDimensionsChange]);

  useEffect(() => {
    if (mediaType === 'image' && mediaUrl) {
      console.log('Loading image:', mediaUrl);
      const img = new Image();
      img.onload = () => {
        console.log('Image loaded successfully. Dimensions:', img.width, 'x', img.height);
        const dimensions = {
          width: Math.min(img.width, MAX_WIDTH),
          height: Math.min(img.height, MAX_HEIGHT),
        };
        console.log('Calculated dimensions:', dimensions);
        setVideoDimensions(dimensions);
        setCanvasSize(dimensions);
        onDimensionsChange(dimensions);
        setIsVideoReady(true);
        setImage(img);
      };
      img.onerror = (error) => {
        console.error('Error loading image:', error);
      };
      img.src = mediaUrl;
    }
  }, [mediaType, mediaUrl, onDimensionsChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      console.error('Canvas or context is null');
      return;
    }
    if (!isOpenCVReady) {
      console.log('OpenCV is not ready yet');
      return;
    }
    if (!isVideoReady) {
      console.log('Video/Image is not ready yet');
      return;
    }
    if (videoDimensions.width === 0) {
      console.log('Video dimensions are not set yet');
      return;
    }

    console.log('Setting up canvas and offscreen canvas');
    // Initialize offscreen canvas if not already done
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = createOffscreenCanvas(videoDimensions.width, videoDimensions.height);
      const offscreenCtx = offscreenCanvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!offscreenCtx) {
        console.error('Failed to get offscreen canvas context');
        return;
      }
      offscreenCtxRef.current = offscreenCtx as OffscreenCanvasRenderingContext2D;
    }

    const offscreenCtx = offscreenCtxRef.current;
    const offscreenCanvas = offscreenCanvasRef.current;

    if (!offscreenCtx || !offscreenCanvas) {
      console.error('Offscreen canvas or context is null');
      return;
    }

    // Set physical canvas dimensions for processing
    canvas.width = videoDimensions.width;
    canvas.height = videoDimensions.height;

    let animationFrameId: number;

    const renderFrame = () => {
      try {
        console.log('Iniciando renderFrame');
        if (mediaType === 'video' && videoRef.current) {
          if (videoRef.current.readyState >= 2) {
            // Clear the offscreen canvas
            offscreenCtx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw the video frame to offscreen canvas
            offscreenCtx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

            // OpenCV processing
            try {
              // Create src Mat from the offscreen canvas
              let src;
              if (offscreenCanvas instanceof HTMLCanvasElement) {
                src = cv.imread(offscreenCanvas);
              } else {
                // If it's an OffscreenCanvas, we need to get its ImageData
                const imageData = offscreenCtx.getImageData(0, 0, canvas.width, canvas.height);
                src = cv.matFromImageData(imageData);
              }

              // Process markers
              markers.forEach((marker) => {
                if (marker.opencvFunction === 'colorSegmentation' && marker.opencvParams) {
                  const { lowerColor, upperColor, tolerance, minArea, maxArea } = marker.opencvParams;
                  if (lowerColor && upperColor) {
                    const lowerRgb = hexToRgb(lowerColor);
                    const upperRgb = hexToRgb(upperColor);
                    const lowerHsv = rgbToHsv(...lowerRgb);
                    const upperHsv = rgbToHsv(...upperRgb);

                    const toleranceValue = tolerance || 20;
                    lowerHsv[0] = Math.max(0, lowerHsv[0] - toleranceValue);
                    lowerHsv[1] = Math.max(0, lowerHsv[1] - toleranceValue);
                    lowerHsv[2] = Math.max(0, lowerHsv[2] - toleranceValue);
                    upperHsv[0] = Math.min(180, upperHsv[0] + toleranceValue);
                    upperHsv[1] = Math.min(255, upperHsv[1] + toleranceValue);
                    upperHsv[2] = Math.min(255, upperHsv[2] + toleranceValue);

                    const roi = src.roi(new cv.Rect(marker.x, marker.y, marker.width, marker.height));
                    const { resultMat, boundingBoxes } = colorSegmentation(roi, lowerHsv, upperHsv, minArea, maxArea);

                    offscreenCtx.strokeStyle = marker.color;
                    offscreenCtx.lineWidth = 2;
                    boundingBoxes.forEach((box) => {
                      offscreenCtx.strokeRect(marker.x + box.x, marker.y + box.y, box.width, box.height);
                    });

                    roi.delete();
                    resultMat.delete();
                  }
                } else if (marker.opencvFunction === 'detectShapes' && marker.opencvParams) {
                  const { shapes, minArea, maxArea, shapeTolerance } = marker.opencvParams;
                  if (shapes && shapes.length > 0) {
                    const roi = src.roi(new cv.Rect(marker.x, marker.y, marker.width, marker.height));
                    const { resultMat, boundingBoxes } = detectShapes(
                      roi,
                      shapes,
                      minArea ?? 100, // Provide default value of 100 if minArea is undefined
                      maxArea ?? 10000, // Provide default value of 10000 if maxArea is undefined
                      shapeTolerance ?? 0.02 // Provide default value of 0.02 if shapeTolerance is undefined
                    );

                    offscreenCtx.strokeStyle = marker.color;
                    offscreenCtx.lineWidth = 2;
                    boundingBoxes.forEach((box) => {
                      offscreenCtx.strokeRect(marker.x + box.x, marker.y + box.y, box.width, box.height);
                    });

                    roi.delete();
                    resultMat.delete();
                  }
                } else if (marker.opencvFunction === 'templateMatching' && marker.opencvParams) {
                  const { threshold } = marker.opencvParams;
                  const loadedTemplate = loadedTemplates[marker.id];
                  if (loadedTemplate) {
                    const templateMat = cv.imread(loadedTemplate);
                    const roi = src.roi(new cv.Rect(marker.x, marker.y, marker.width, marker.height));
                    const boundingBoxes = templateMatching(roi, templateMat, threshold);

                    offscreenCtx.strokeStyle = marker.color;
                    offscreenCtx.lineWidth = 2;
                    boundingBoxes.forEach((box) => {
                      offscreenCtx.strokeRect(marker.x + box.x, marker.y + box.y, box.width, box.height);
                    });

                    templateMat.delete();
                    roi.delete();
                  }
                } else if (marker.opencvFunction === 'detectPeople' && marker.opencvParams) {
                  console.log('Iniciando detecção de pessoas');
                  const { minArea, maxArea } = marker.opencvParams;
                  const roi = src.roi(new cv.Rect(marker.x, marker.y, marker.width, marker.height));
                  const { resultMat, boundingBoxes } = detectPeople(roi, minArea, maxArea);
                  console.log('Detecção concluída. Pessoas encontradas:', boundingBoxes.length);

                  // Copiar o resultMat de volta para o frame original
                  resultMat.copyTo(src.roi(new cv.Rect(marker.x, marker.y, marker.width, marker.height)));

                  // Liberar memória
                  roi.delete();
                  resultMat.delete();
                }
              });

              // Draw markers on offscreen canvas
              markers.forEach((marker) => {
                offscreenCtx.strokeStyle = marker.color;
                offscreenCtx.lineWidth = marker.isGeneral
                  ? marker.id === selectedMarkerId
                    ? 12
                    : 4
                  : marker.id === selectedMarkerId
                    ? 6
                    : 2;
                offscreenCtx.strokeRect(marker.x, marker.y, marker.width, marker.height);
              });

              if (isDrawing && currentRect) {
                offscreenCtx.strokeStyle = '#ffffff';
                offscreenCtx.lineWidth = 2;
                offscreenCtx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
              }

              // Copy offscreen canvas to main canvas
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(offscreenCanvas, 0, 0);

              src.delete();
            } catch (error) {
              console.error('Error processing frame:', error);
            }
          }
        } else if (mediaType === 'image' && image) {
          console.log('Rendering image frame');
          // Clear the offscreen canvas
          offscreenCtx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw the image to offscreen canvas
          offscreenCtx.drawImage(image, 0, 0, canvas.width, canvas.height);

          // OpenCV processing
          try {
            console.log('Starting OpenCV processing');
            let src;
            if (offscreenCanvas instanceof HTMLCanvasElement) {
              src = cv.imread(offscreenCanvas);
            } else {
              const imageData = offscreenCtx.getImageData(0, 0, canvas.width, canvas.height);
              src = cv.matFromImageData(imageData);
            }
            console.log('OpenCV Mat created from image');

            // Process markers
            markers.forEach((marker) => {
              if (marker.opencvFunction === 'colorSegmentation' && marker.opencvParams) {
                const { lowerColor, upperColor, tolerance, minArea, maxArea } = marker.opencvParams;
                if (lowerColor && upperColor) {
                  const lowerRgb = hexToRgb(lowerColor);
                  const upperRgb = hexToRgb(upperColor);
                  const lowerHsv = rgbToHsv(...lowerRgb);
                  const upperHsv = rgbToHsv(...upperRgb);

                  const toleranceValue = tolerance || 20;
                  lowerHsv[0] = Math.max(0, lowerHsv[0] - toleranceValue);
                  lowerHsv[1] = Math.max(0, lowerHsv[1] - toleranceValue);
                  lowerHsv[2] = Math.max(0, lowerHsv[2] - toleranceValue);
                  upperHsv[0] = Math.min(180, upperHsv[0] + toleranceValue);
                  upperHsv[1] = Math.min(255, upperHsv[1] + toleranceValue);
                  upperHsv[2] = Math.min(255, upperHsv[2] + toleranceValue);

                  const roi = src.roi(new cv.Rect(marker.x, marker.y, marker.width, marker.height));
                  const { resultMat, boundingBoxes } = colorSegmentation(roi, lowerHsv, upperHsv, minArea, maxArea);

                  offscreenCtx.strokeStyle = marker.color;
                  offscreenCtx.lineWidth = 2;
                  boundingBoxes.forEach((box) => {
                    offscreenCtx.strokeRect(marker.x + box.x, marker.y + box.y, box.width, box.height);
                  });

                  roi.delete();
                  resultMat.delete();
                }
              } else if (marker.opencvFunction === 'detectShapes' && marker.opencvParams) {
                const { shapes, minArea, maxArea, shapeTolerance } = marker.opencvParams;
                if (shapes && shapes.length > 0) {
                  const roi = src.roi(new cv.Rect(marker.x, marker.y, marker.width, marker.height));
                  const { resultMat, boundingBoxes } = detectShapes(
                    roi,
                    shapes,
                    minArea ?? 100, // Provide default value of 100 if minArea is undefined
                    maxArea ?? 10000, // Provide default value of 10000 if maxArea is undefined
                    shapeTolerance ?? 0.02 // Provide default value of 0.02 if shapeTolerance is undefined
                  );

                  offscreenCtx.strokeStyle = marker.color;
                  offscreenCtx.lineWidth = 2;
                  boundingBoxes.forEach((box) => {
                    offscreenCtx.strokeRect(marker.x + box.x, marker.y + box.y, box.width, box.height);
                  });

                  roi.delete();
                  resultMat.delete();
                }
              } else if (marker.opencvFunction === 'templateMatching' && marker.opencvParams) {
                const { threshold } = marker.opencvParams;
                const loadedTemplate = loadedTemplates[marker.id];
                if (loadedTemplate) {
                  const templateMat = cv.imread(loadedTemplate);
                  const roi = src.roi(new cv.Rect(marker.x, marker.y, marker.width, marker.height));
                  const boundingBoxes = templateMatching(roi, templateMat, threshold);

                  offscreenCtx.strokeStyle = marker.color;
                  offscreenCtx.lineWidth = 2;
                  boundingBoxes.forEach((box) => {
                    offscreenCtx.strokeRect(marker.x + box.x, marker.y + box.y, box.width, box.height);
                  });

                  templateMat.delete();
                  roi.delete();
                }
              } else if (marker.opencvFunction === 'detectPeople' && marker.opencvParams) {
                const { minArea, maxArea } = marker.opencvParams;
                const roi = src.roi(new cv.Rect(marker.x, marker.y, marker.width, marker.height));
                const { resultMat, boundingBoxes } = detectPeople(roi, minArea, maxArea);

                // Desenhar os boundingBoxes no offscreenCanvas
                offscreenCtx.strokeStyle = marker.color;
                offscreenCtx.lineWidth = 2;
                boundingBoxes.forEach((box) => {
                  offscreenCtx.strokeRect(marker.x + box.x, marker.y + box.y, box.width, box.height);
                });

                // Copiar o resultMat para o offscreenCanvas
                const tempCanvas = document.createElement('canvas');
                cv.imshow(tempCanvas, resultMat);
                offscreenCtx.drawImage(tempCanvas, marker.x, marker.y);

                roi.delete();
                resultMat.delete();
              }
            });

            // Draw markers on offscreen canvas
            markers.forEach((marker) => {
              offscreenCtx.strokeStyle = marker.color;
              offscreenCtx.lineWidth = marker.isGeneral
                ? marker.id === selectedMarkerId
                  ? 12
                  : 4
                : marker.id === selectedMarkerId
                  ? 6
                  : 2;
              offscreenCtx.strokeRect(marker.x, marker.y, marker.width, marker.height);
            });

            if (isDrawing && currentRect) {
              offscreenCtx.strokeStyle = '#ffffff';
              offscreenCtx.lineWidth = 2;
              offscreenCtx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
            }

            // Copy offscreen canvas to main canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(offscreenCanvas, 0, 0);
            console.log('Image rendered on main canvas');

            src.delete();
          } catch (error) {
            console.error('Error processing image:', error);
          }
        }

        console.log('renderFrame concluído com sucesso');
      } catch (error) {
        console.error('Erro em renderFrame:', error);
      }

      requestAnimationFrame(renderFrame);
    };

    renderFrame();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    markers,
    isDrawing,
    currentRect,
    videoRef,
    isOpenCVReady,
    selectedMarkerId,
    isVideoReady,
    videoDimensions,
    videoTime,
    mediaType,
    image,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setVideoTime(video.currentTime);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const getCanvasMousePosition = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    const scaleX = videoDimensions.width / rect.width;
    const scaleY = videoDimensions.height / rect.height;

    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const { x, y } = getCanvasMousePosition(e);
    setStartPoint({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;
    const { x, y } = getCanvasMousePosition(e);
    setCurrentRect({
      x: startPoint.x,
      y: startPoint.y,
      width: x - startPoint.x,
      height: y - startPoint.y,
    });
  };

  const predefinedColors = [
    '#00FF00', // Lime
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFA500', // Orange
    '#800080', // Purple
    '#008000', // Green
    '#FFC0CB', // Pink
    '#A52A2A', // Brown
    '#808080', // Gray
    '#FFD700', // Gold
    '#4B0082', // Indigo
    '#7FFF00', // Chartreuse
    '#FF4500', // OrangeRed
    '#1E90FF', // DodgerBlue
    '#8B4513', // SaddleBrown
    '#FF1493', // DeepPink
    '#00CED1', // DarkTurquoise
    '#8B008B', // DarkMagenta
    '#556B2F', // DarkOliveGreen
    '#FF6347', // Tomato
    '#00FA9A', // MediumSpringGreen
    '#4682B4', // SteelBlue
    '#9932CC', // DarkOrchid
    '#2F4F4F', // DarkSlateGray
    '#D2691E', // Chocolate
    '#DC143C', // Crimson
    '#7B68EE', // MediumSlateBlue
    '#6B8E23', // OliveDrab
    '#48D1CC', // MediumTurquoise
    '#C71585', // MediumVioletRed
    '#191970', // MidnightBlue
    '#F4A460', // SandyBrown
    '#00BFFF', // DeepSkyBlue
    '#CD5C5C', // IndianRed
    '#32CD32', // LimeGreen
    '#DAA520', // GoldenRod
    '#8FBC8F', // DarkSeaGreen
    '#5F9EA0', // CadetBlue
    '#9400D3', // DarkViolet
    '#FF69B4', // HotPink
    '#CD853F', // Peru
    '#708090', // SlateGray
    '#00FF7F', // SpringGreen
    '#4169E1', // RoyalBlue
    '#8A2BE2', // BlueViolet
    '#20B2AA', // LightSeaGreen
    '#B8860B', // DarkGoldenRod
  ];

  const getNextColor = useCallback(() => {
    if (markerCount < predefinedColors.length) {
      return predefinedColors[markerCount];
    }
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  }, [markerCount, predefinedColors]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !startPoint || !currentRect) return;

    const newMarkerCount = markerCount + 1;
    const newMarker: Marker = {
      id: uuidv4(),
      name: `Marker_${newMarkerCount.toString().padStart(3, '0')}`,
      x: currentRect.x,
      y: currentRect.y,
      width: currentRect.width,
      height: currentRect.height,
      color: getNextColor(),
      isGeneral: false,
    };

    addMarker(newMarker);
    selectMarker(newMarker.id);
    setMarkerCount(newMarkerCount);
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentRect(null);
  }, [isDrawing, startPoint, currentRect, markerCount, addMarker, selectMarker, getNextColor]);

  const handlePlayPause = () => {
    const video = videoRef.current!;
    if (video.paused || video.ended) {
      video.play();
    } else {
      video.pause();
    }
  };

  const handleSkipToStart = () => {
    const video = videoRef.current!;
    video.currentTime = 0;
    video.pause();
    // Position will be saved via the pause event listener in App.tsx
  };

  const handleSkipToEnd = () => {
    const video = videoRef.current!;
    video.currentTime = video.duration;
    video.pause();
    // Position will be saved via the pause event listener in App.tsx
  };

  const handleStepForward = () => {
    const video = videoRef.current!;
    if (!fps) return;

    // Obtém o tempo atual do frame
    const currentFrame = Math.floor(video.currentTime * fps);
    // Calcula o tempo do próximo frame
    const nextFrameTime = (currentFrame + 1) / fps;

    if (nextFrameTime <= video.duration) {
      video.currentTime = nextFrameTime;
      console.log(`Stepping to frame ${currentFrame + 1} (${nextFrameTime.toFixed(3)}s) at ${fps} fps`);
    }
  };

  const handleStepBackward = () => {
    const video = videoRef.current!;
    if (!fps) return;

    // Obtém o tempo atual do frame
    const currentFrame = Math.ceil(video.currentTime * fps);
    // Calcula o tempo do frame anterior
    const previousFrameTime = (currentFrame - 1) / fps;

    if (previousFrameTime >= 0) {
      video.currentTime = previousFrameTime;
      console.log(`Stepping to frame ${currentFrame - 1} (${previousFrameTime.toFixed(3)}s) at ${fps} fps`);
    }
  };

  useEffect(() => {
    markers.forEach((marker) => {
      if (marker.opencvFunction === 'templateMatching' && marker.opencvParams?.templateImage) {
        loadTemplateImage(marker.id, marker.opencvParams.templateImage);
      }
    });
  }, [markers]);

  const loadTemplateImage = (markerId: string, templateImageSrc: string) => {
    const img = new Image();
    img.onload = () => {
      setLoadedTemplates((prev) => ({ ...prev, [markerId]: img }));
    };
    img.src = templateImageSrc;
  };

  return (
    <div ref={containerRef} className="video-player-container">
      {openCVError && <div className="error-message">{openCVError}</div>}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className="video-canvas"
        width={canvasSize.width}
        height={canvasSize.height}
      />

      {mediaType === 'video' && (
        <div className="controls">
          <button type="button" onClick={handleSkipToStart} aria-label="Ir para o início">
            <FaFastBackward />
          </button>
          <button type="button" onClick={handleStepBackward} aria-label="Retroceder um quadro">
            <FaStepBackward />
          </button>
          <button type="button" onClick={handlePlayPause} aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}>
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>
          <button type="button" onClick={handleStepForward} aria-label="Avançar um quadro">
            <FaStepForward />
          </button>
          <button type="button" onClick={handleSkipToEnd} aria-label="Ir para o final">
            <FaFastForward />
          </button>
        </div>
      )}

      {mediaType === 'video' && mediaUrl && <video ref={videoRef} src={mediaUrl} className="hidden" />}
    </div>
  );
}

export default VideoPlayer;
