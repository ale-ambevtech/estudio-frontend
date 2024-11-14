import React, { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import VideoPlayer from './VideoPlayer';
import Timeline from './Timeline';
import ConfigPanel from './ConfigPanel';
import { Marker } from '../types';
import '../styles/global.css';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { saveMedia, getMedia, deleteMedia } from '../services/mediaStorage';
import { VideoControls } from './VideoControls';
import { uploadVideo, processVideo } from '../services/api';
import { OPENCV_FUNCTIONS, OUTPUT_TYPES, ProcessVideoRequest, ProcessingResult, RGBColor } from '../types/api';
import { validateProcessRequest, logProcessingResult } from '../utils/debug';
import { v4 as uuidv4 } from 'uuid';
import { hexToRgb } from '../utils/colors';
import axios from 'axios';
import { Loading } from './Loading';

interface VideoDimensions {
  width: number;
  height: number;
}

interface ColorRange {
  lower: RGBColor;
  upper: RGBColor;
}

// Definir interface para o formato específico dos resultados
interface BoundingBoxResult {
  function: string;
  bounding_boxes: number[][];
}

const App: React.FC = () => {
  const [markers, setMarkers] = useState<Marker[]>(() => {
    const savedMarkers = localStorage.getItem('markers');
    if (savedMarkers) {
      try {
        const parsedMarkers = JSON.parse(savedMarkers);
        if (Array.isArray(parsedMarkers) && parsedMarkers.length > 0) {
          console.log('Loaded markers from localStorage:', parsedMarkers);
          // Ensure the general marker is always the first one
          const generalMarker = parsedMarkers.find((m) => m.isGeneral) || {
            id: 'general',
            name: 'Quadro Geral',
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            color: '#ffc400',
            isGeneral: true,
          };
          const otherMarkers = parsedMarkers.filter((m) => !m.isGeneral);
          return [generalMarker, ...otherMarkers];
        }
      } catch (error) {
        console.error('Error parsing saved markers:', error);
      }
    }
    console.log('No markers found in localStorage, starting with default general marker');
    return [
      {
        id: 'general',
        name: 'Quadro Geral',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#ffc400',
        isGeneral: true,
      },
    ];
  });

  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isInitializingRef = useRef(true);
  const savedPositionRef = useRef<number | null>(null);

  const [videoDimensions, setVideoDimensions] = useState<VideoDimensions>({ width: 0, height: 0 });

  const [mediaUrl, setMediaUrl] = useState<string | null>(() => {
    const savedMedia = localStorage.getItem('mediaUrl');
    if (savedMedia) {
      try {
        return savedMedia;
      } catch (error) {
        console.error('Error loading saved media URL:', error);
      }
    }
    return null;
  });

  const [mediaType, setMediaType] = useState<'video' | 'image' | null>(() => {
    const savedType = localStorage.getItem('mediaType');
    if (savedType === 'video' || savedType === 'image') {
      return savedType;
    }
    return null;
  });

  const [fps, setFps] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);

  const [selectedColors, setSelectedColors] = useState<ColorRange>({
    lower: { r: 0, g: 0, b: 0 },
    upper: { r: 255, g: 255, b: 255 },
  });

  const [processingResults, setProcessingResults] = useState<BoundingBoxResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedPosition = localStorage.getItem('videoPosition');
    if (savedPosition) {
      savedPositionRef.current = parseFloat(savedPosition);
      console.log('Loaded video position:', savedPositionRef.current);
    }
  }, []);

  useEffect(() => {
    try {
      console.log('Saving markers to localStorage:', markers);
      localStorage.setItem('markers', JSON.stringify(markers));
    } catch (error) {
      console.error('Error saving markers to localStorage:', error);
    }
  }, [markers]);

  const saveVideoPosition = useCallback(() => {
    if (videoRef.current && !isInitializingRef.current) {
      const currentTime = videoRef.current.currentTime;
      localStorage.setItem('videoPosition', currentTime.toString());
      console.log('Saved video position:', currentTime);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handlePause = () => {
        if (!isInitializingRef.current) {
          saveVideoPosition();
        }
      };

      video.addEventListener('pause', handlePause);
      return () => {
        video.removeEventListener('pause', handlePause);
      };
    }
  }, [saveVideoPosition]);

  const addMarker = useCallback((marker: Marker) => {
    setMarkers((prevMarkers) => {
      const generalMarker = prevMarkers[0];
      const newMarkers = [...prevMarkers.slice(1), marker];
      console.log('Adding new marker:', marker);
      return [generalMarker, ...newMarkers];
    });
    // Seleciona automaticamente o novo marcador
    setSelectedMarkerId(marker.id);
  }, []);

  const selectMarker = useCallback((id: string) => {
    setSelectedMarkerId(id);
  }, []);

  const updateMarker = useCallback((updatedMarker: Marker) => {
    setMarkers((prevMarkers) => {
      const newMarkers = prevMarkers.map((m) => (m.id === updatedMarker.id ? updatedMarker : m));
      // Ensure the general marker is always the first one
      const generalMarker = newMarkers.find((m) => m.isGeneral) || {
        id: 'general',
        name: 'Quadro Geral',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#ffc400',
        isGeneral: true,
      };
      const otherMarkers = newMarkers.filter((m) => !m.isGeneral);
      return [generalMarker, ...otherMarkers];
    });
    console.log('Updating marker:', updatedMarker);
  }, []);

  const deleteMarker = useCallback((id: string) => {
    if (id !== 'general') {
      setMarkers((prevMarkers) => {
        const generalMarker = prevMarkers[0];
        const remainingMarkers = prevMarkers.slice(1).filter((marker) => marker.id !== id);

        // Seleciona o marcador anterior após a exclusão
        if (remainingMarkers.length > 0) {
          const indexToSelect = remainingMarkers.findIndex((marker) => marker.id === id) - 1;
          const markerToSelect = remainingMarkers[indexToSelect >= 0 ? indexToSelect : 0];
          setSelectedMarkerId(markerToSelect.id);
        } else {
          setSelectedMarkerId(generalMarker.id);
        }

        return [generalMarker, ...remainingMarkers];
      });
      console.log('Deleting marker with id:', id);
    } else {
      console.warn('Attempted to delete general marker, which is not allowed');
    }
  }, []);

  useEffect(() => {
    console.log('Current markers:', markers);
  }, [markers]);

  const exportRecipe = () => {
    const recipe = {
      markers: markers.map(({ id, x, y, width, height, color, opencvFunction, opencvParams }) => ({
        id,
        x,
        y,
        width,
        height,
        color,
        opencvFunction,
        opencvParams,
      })),
    };

    const json = JSON.stringify(recipe, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'recipe.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      saveVideoPosition(); // Save position after manual seek
    }
  };

  const handleThumbnailsGenerated = useCallback(() => {
    isInitializingRef.current = false;
    if (savedPositionRef.current !== null && videoRef.current) {
      videoRef.current.currentTime = savedPositionRef.current;
      console.log('Restored video position after thumbnails generation:', savedPositionRef.current);
    }
  }, []);

  const resetMarkers = useCallback(() => {
    setMarkers((prevMarkers) => {
      // Preserve the current general marker, but reset its OpenCV function and parameters
      const generalMarker = prevMarkers.find((m) => m.isGeneral);
      if (!generalMarker) {
        // Fallback if somehow there's no general marker
        return [
          {
            id: 'general',
            name: 'Quadro Geral',
            x: 0,
            y: 0,
            width: videoDimensions.width,
            height: videoDimensions.height,
            color: '#ffc400',
            isGeneral: true,
            opencvFunction: undefined, // Reset OpenCV function
            opencvParams: undefined, // Reset OpenCV parameters
          },
        ];
      }
      // Return array with only the general marker, resetting its OpenCV properties
      return [
        {
          ...generalMarker,
          opencvFunction: undefined, // Reset OpenCV function
          opencvParams: undefined, // Reset OpenCV parameters
        },
      ];
    });
    setSelectedMarkerId(null);
    console.log('Reset markers while preserving general marker and resetting its OpenCV properties');
  }, [videoDimensions]);

  const handleVideoDimensionsChange = useCallback((dimensions: VideoDimensions) => {
    // Adicione um log aqui também
    console.log('Received dimensions in App:', dimensions);

    setVideoDimensions(dimensions);
    setMarkers((prevMarkers) => {
      const updatedGeneralMarker = {
        ...prevMarkers[0],
        width: dimensions.width,
        height: dimensions.height,
      };
      // Log do marcador atualizado
      console.log('Updated general marker:', updatedGeneralMarker);

      return [updatedGeneralMarker, ...prevMarkers.slice(1)];
    });
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      // Upload para o backend
      const metadata = await uploadVideo(file);
      console.log('Video uploaded successfully:', metadata);

      // Criar URL local para preview
      if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl);
      }

      const newUrl = URL.createObjectURL(file);
      setMediaUrl(newUrl);

      const type = file.type.startsWith('video/') ? 'video' : 'image';
      setMediaType(type);

      localStorage.setItem('mediaType', type);
      await saveMedia('currentMedia', file);
    } catch (error) {
      console.error('Error uploading video:', error);
      // Adicione aqui tratamento de erro adequado
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessVideo = async () => {
    if (!selectedMarkerId) return;
    const marker = markers.find((m) => m.id === selectedMarkerId);
    if (!marker || !marker.opencvParams) return;

    const request: ProcessVideoRequest = {
      pdi_functions: [
        {
          function: OPENCV_FUNCTIONS.COLOR_SEGMENTATION,
          parameters: {
            lower_color: marker.opencvParams.lowerColor || { r: 0, g: 0, b: 0 },
            upper_color: marker.opencvParams.upperColor || { r: 255, g: 255, b: 255 },
            tolerance: Number(marker.opencvParams.tolerance) || 10,
            min_area: Number(marker.opencvParams.minArea) || 100,
            max_area: Number(marker.opencvParams.maxArea) || 10000,
          },
          output_type: OUTPUT_TYPES.BOUNDING_BOX,
        },
      ],
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
      timestamp: Math.round((videoRef.current?.currentTime || 0) * 1000),
    };

    console.log('Processing request with colors:', {
      lower: request.pdi_functions[0].parameters.lower_color,
      upper: request.pdi_functions[0].parameters.upper_color,
    });

    try {
      console.log('1. Sending request:', request);
      const result = (await processVideo(request)) as ProcessingResult;
      console.log('2. Raw API result:', result);
      console.log('2.1 Result structure:', {
        hasResults: !!result.results,
        resultsLength: result.results?.length,
        firstResult: result.results?.[0],
      });

      if (result.results?.[0]) {
        const firstResult = result.results[0];
        console.log('3. First result:', firstResult);

        // Verificar se temos bounding_boxes
        if ('bounding_boxes' in firstResult) {
          console.log('3.1 Bounding boxes found:', firstResult.bounding_boxes);

          const formattedResults = [
            {
              function: firstResult.function,
              bounding_boxes: firstResult.bounding_boxes as number[][],
            },
          ];

          console.log('4. About to set formatted results:', formattedResults);
          setProcessingResults(formattedResults);
          console.log('5. State update triggered');
        } else {
          console.log('No bounding_boxes found in result');
          setProcessingResults([]);
        }
      } else {
        console.log('No valid results found in response');
        setProcessingResults([]);
      }
    } catch (error) {
      console.error('Error in handleProcessVideo:', error);
      setProcessingResults([]);
    }
  };

  useEffect(() => {
    const loadSavedMedia = async () => {
      try {
        const savedType = localStorage.getItem('mediaType');
        if (savedType) {
          const savedMedia = await getMedia('currentMedia');
          if (savedMedia) {
            const url = URL.createObjectURL(savedMedia);
            setMediaUrl(url);
            setMediaType(savedType as 'video' | 'image');
          }
        }
      } catch (error) {
        console.error('Error loading saved media:', error);
      }
    };

    loadSavedMedia();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl);
      }
    };
  }, [mediaUrl]);

  const resetAll = useCallback(async () => {
    if (mediaUrl) {
      URL.revokeObjectURL(mediaUrl);
    }
    setMediaUrl(null);
    setMediaType(null);
    localStorage.removeItem('mediaType');
    await deleteMedia('currentMedia');
    resetMarkers();

    // Clear the file input
    const fileInput = document.getElementById('media-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, [resetMarkers, mediaUrl]);

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

  // Adicionar este seletor para obter o marcador selecionado
  const selectedMarker = markers.find((marker) => marker.id === selectedMarkerId) || markers[0];

  useEffect(() => {
    console.log('6. Processing results state updated:', processingResults);
  }, [processingResults]);

  // Adicionar useEffect para monitorar mudanças nos resultados
  useEffect(() => {
    console.log('Processing results changed:', processingResults);
  }, [processingResults]);

  return (
    <div className="min-h-screen bg-gray-800">
      <div className="container mx-auto p-4 grid grid-cols-[280px_1fr_280px] gap-6">
        {/* Sidebar Esquerda */}
        <Sidebar
          markers={markers}
          selectMarker={selectMarker}
          selectedMarkerId={selectedMarkerId}
          updateMarker={updateMarker}
          resetMarkers={resetMarkers}
          resetAll={resetAll}
          className="panel rounded-lg shadow-sm p-4 h-[calc(100vh-2rem)] overflow-y-auto"
        />

        {/* Área Principal */}
        <main className="panel rounded-lg shadow-sm p-6 flex flex-col gap-4">
          <div className="space-y-4">
            {/* Input de arquivo */}
            <div className="mb-6">
              <label htmlFor="media-upload" className="block text-sm font-medium mb-2">
                Carregar Vídeo ou Imagem:
              </label>
              <input type="file" id="media-upload" accept="video/*,image/*" onChange={handleFileUpload} className="" />
            </div>

            {/* Player de Vídeo/Imagem */}
            <div className="relative">
              <VideoPlayer
                markers={markers}
                addMarker={addMarker}
                selectedMarkerId={selectedMarkerId}
                videoRef={videoRef}
                onDimensionsChange={handleVideoDimensionsChange}
                selectMarker={selectMarker}
                mediaType={mediaType}
                mediaUrl={mediaUrl}
                processingResults={processingResults}
              />
              {selectedMarkerId && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={handleProcessVideo}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Processar Região Selecionada
                  </button>
                </div>
              )}
            </div>

            {/* Timeline e Controles */}
            {mediaType === 'video' && (
              <div className="w-full">
                <Timeline videoRef={videoRef} onSeek={handleSeek} onThumbnailsGenerated={handleThumbnailsGenerated} />
                <VideoControls videoRef={videoRef} fps={fps} isPlaying={isPlaying} />
              </div>
            )}
          </div>
        </main>

        {/* Sidebar Direita */}
        <ConfigPanel
          marker={selectedMarker}
          updateMarker={updateMarker}
          deleteMarker={deleteMarker}
          className="panel rounded-lg shadow-sm p-4 h-[calc(100vh-2rem)] overflow-y-auto"
        />
      </div>
      {isLoading && <Loading />}
    </div>
  );
};

export default App;
