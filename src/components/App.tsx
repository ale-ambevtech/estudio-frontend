import React, { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import VideoPlayer from './VideoPlayer';
import Timeline from './Timeline';
import ConfigPanel from './ConfigPanel';
import { Marker, ReferenceGuideState } from '../types/marker';
import '../styles/global.css';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { saveMedia, getMedia, deleteMedia } from '../services/mediaStorage';
import { VideoControls } from './VideoControls';
import { checkVideoMirror, processVideo, uploadVideo } from '../services/api';
import { OPENCV_FUNCTIONS, OUTPUT_TYPES, ProcessVideoRequest, ProcessingResult } from '../types/api';
import { Loading } from './Loading';
import { createDefaultMarker } from '../utils/marker-utils';
import { SyncContext } from '../contexts/SyncContext';

interface VideoDimensions {
  width: number;
  height: number;
}

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
          const generalMarker =
            parsedMarkers.find((m) => m.isGeneral) ||
            createDefaultMarker(0, 0, 640, 480, 'Quadro Geral', '#ffc400', true, 'general');

          if (!generalMarker.opencvParams) {
            generalMarker.opencvParams = {
              lowerColor: { r: 0, g: 0, b: 0 },
              upperColor: { r: 255, g: 255, b: 255 },
              tolerance: 10,
              minArea: 100,
              maxArea: 10000,
            };
          }

          const otherMarkers = parsedMarkers.filter((m) => !m.isGeneral);
          return [generalMarker, ...otherMarkers];
        }
      } catch (error) {
        console.error('Error parsing saved markers:', error);
      }
    }
    return [createDefaultMarker(0, 0, 640, 480, 'Quadro Geral', '#ffc400', true, 'general')];
  });

  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isInitializingRef = useRef(true);
  const savedPositionRef = useRef<number | null>(null);

  const [, setVideoDimensions] = useState<VideoDimensions>({ width: 0, height: 0 });

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

  const [processingResults, setProcessingResults] = useState<Map<string, BoundingBoxResult[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const [isSyncEnabled, setIsSyncEnabled] = useState(false);
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);

  const [lastSentMessages] = useState(new Map());

  const [referenceGuide, setReferenceGuide] = useState<ReferenceGuideState>({
    isActive: false,
    type: null,
  });

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
    // Garante que o novo marcador não tenha resultados
    setProcessingResults((prev) => {
      const newMap = new Map(prev);
      newMap.delete(marker.id);
      return newMap;
    });
  }, []);

  const selectMarker = useCallback((id: string) => {
    setSelectedMarkerId(id);
  }, []);

  const updateMarker = useCallback((updatedMarker: Marker) => {
    console.log('Updating marker with:', updatedMarker);
    setMarkers((prevMarkers) => {
      const newMarkers = prevMarkers.map((m) => {
        if (m.id === updatedMarker.id) {
          console.log('Found marker to update:', m);
          console.log('Updated to:', updatedMarker);
          return updatedMarker;
        }
        return m;
      });
      return newMarkers;
    });
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
      // Limpa os resultados do marcador deletado
      setProcessingResults((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      console.log('Deleting marker with id:', id);
    } else {
      console.warn('Attempted to delete general marker, which is not allowed');
    }
  }, []);

  useEffect(() => {
    console.log('Current markers:', markers);
  }, [markers]);

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
    setMarkers(() => {
      // Cria um novo Quadro Geral sem função OpenCV
      const generalMarker = createDefaultMarker(
        0,
        0,
        640,
        480,
        'Quadro Geral',
        '#ffc400',
        true,
        'general',
        false // não incluir defaults
      );
      return [generalMarker];
    });

    // Limpa o marcador selecionado
    setSelectedMarkerId(null);

    // Limpa todos os resultados de processamento
    setProcessingResults(new Map());

    console.log('Reset: removido todos os marcadores e resetado Quadro Geral');
  }, []);

  const handleVideoDimensionsChange = useCallback((dimensions: VideoDimensions) => {
    setVideoDimensions(dimensions);
    setMarkers((prevMarkers) => {
      const updatedGeneralMarker = {
        ...prevMarkers[0],
        width: dimensions.width,
        height: dimensions.height,
      };
      return [updatedGeneralMarker, ...prevMarkers.slice(1)];
    });
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const res = await uploadVideo(file);

      if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl);
      }

      const newUrl = URL.createObjectURL(file);
      setMediaUrl(newUrl);

      const type = file.type.startsWith('video/') ? 'video' : 'image';
      setMediaType(type);

      localStorage.setItem('mediaInfo', JSON.stringify({ type: type, name: file.name, id: res.id }));
      await saveMedia(`currentMedia-${res.id}`, file);
    } catch (error) {
      console.error('Error uploading media:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessVideo = async () => {
    if (!videoRef.current) return;

    const checkedVideo = await checKMirrorAndStorageVideo();
    if (!checkedVideo.isSameVideo) {
      resetAll();
      return;
    }

    // Processa todos os marcadores que têm função OpenCV configurada, incluindo o quadro geral
    const markersToProcess = markers.filter((marker) => marker.opencvFunction && marker.opencvParams);

    for (const marker of markersToProcess) {
      let pdiFunction;

      // Garantir que opencvParams existe
      if (!marker.opencvParams) continue;

      switch (marker.opencvFunction) {
        case 'colorSegmentation':
          pdiFunction = {
            function: OPENCV_FUNCTIONS.COLOR_SEGMENTATION,
            parameters: {
              lower_color: marker.opencvParams?.lowerColor || { r: 0, g: 0, b: 0 },
              upper_color: marker.opencvParams?.upperColor || { r: 255, g: 255, b: 255 },
              tolerance: Number(marker.opencvParams?.tolerance) || 10,
              min_area: Number(marker.opencvParams?.minArea) || 100,
              max_area: Number(marker.opencvParams?.maxArea) || 10000,
            },
            output_type: OUTPUT_TYPES.BOUNDING_BOX,
          };
          break;

        case 'detectShapes':
          pdiFunction = {
            function: OPENCV_FUNCTIONS.SHAPE_DETECTION,
            parameters: {
              shapes: marker.opencvParams?.shapes || ['circle', 'rectangle', 'triangle'],
              shape_tolerance: Number(marker.opencvParams?.shapeTolerance) || 0.1,
            },
            output_type: OUTPUT_TYPES.BOUNDING_BOX,
          };
          break;

        case 'templateMatching':
          pdiFunction = {
            function: OPENCV_FUNCTIONS.TEMPLATE_MATCHING,
            parameters: {
              template_image: marker.opencvParams?.templateImage || '',
              threshold: Number(marker.opencvParams?.threshold) || 0.8,
            },
            output_type: OUTPUT_TYPES.BOUNDING_BOX,
          };
          break;

        case 'detectPeople':
          pdiFunction = {
            function: OPENCV_FUNCTIONS.PEOPLE_DETECTION,
            parameters: {
              min_area: Number(marker.opencvParams?.minArea) || 1000,
              max_area: Number(marker.opencvParams?.maxArea) || 60000,
            },
            output_type: OUTPUT_TYPES.BOUNDING_BOX,
          };
          break;

        default:
          console.error('Invalid OpenCV function selected');
          continue;
      }

      const request: ProcessVideoRequest = {
        pdi_functions: [pdiFunction],
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

      try {
        const result = (await processVideo(request)) as ProcessingResult;

        if (result.results?.[0]) {
          const firstResult = result.results[0];
          if ('bounding_boxes' in firstResult) {
            const formattedResults = [
              {
                function: firstResult.function,
                bounding_boxes: firstResult.bounding_boxes as number[][],
              },
            ];
            setProcessingResults((prev) => new Map(prev).set(marker.id, formattedResults));
          }
        }
      } catch (error) {
        console.error('Error processing marker:', marker.id, error);
      }
    }
  };

  const checKMirrorAndStorageVideo = async () => {
    const savedMediaInfo: { type: string; name: string; id: string } = JSON.parse(
      localStorage.getItem('mediaInfo') ?? '{}'
    );
    const res = await checkVideoMirror();
    const isSameVideo = savedMediaInfo.id !== '' && res !== null && res.id === savedMediaInfo.id;

    return { isSameVideo, videoInfo: savedMediaInfo };
  };

  useEffect(() => {
    const loadSavedMedia = async () => {
      const checkedVideo = await checKMirrorAndStorageVideo();

      if (checkedVideo.isSameVideo) {
        const savedMedia = await getMedia(`currentMedia-${checkedVideo.videoInfo.id}`);
        if (savedMedia) {
          const url = URL.createObjectURL(savedMedia);
          setMediaUrl(url);
          setMediaType(checkedVideo.videoInfo.type as 'video' | 'image');
        } else {
          resetAll();
        }
      } else {
        resetAll();
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
    const idMedia = localStorage.getItem('mediaInfo') ?? '';
    setMediaUrl(null);
    setMediaType(null);
    localStorage.removeItem('mediaInfo');
    await deleteMedia(`currentMedia-${JSON.parse(idMedia).id}`);
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

  const handleReferenceGuideComplete = (area: number) => {
    if (!selectedMarkerId) return;

    const marker = markers.find((m) => m.id === selectedMarkerId);
    if (!marker?.opencvParams) return;

    const updatedMarker = {
      ...marker,
      opencvParams: {
        ...marker.opencvParams,
        [referenceGuide.type!]: Math.round(area),
      },
    };

    updateMarker(updatedMarker);
    setReferenceGuide({ isActive: false, type: null });
  };

  return (
    <SyncContext.Provider value={{ lastSentMessages }}>
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
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label htmlFor="media-upload" className="block text-sm font-medium mb-2">
                    Carregar Vídeo ou Imagem:
                  </label>
                  <input
                    type="file"
                    id="media-upload"
                    accept="video/*,image/*"
                    onChange={handleFileUpload}
                    className=""
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isSyncEnabled}
                        onChange={(e) => setIsSyncEnabled(e.target.checked)}
                      />
                      <div
                        className={`w-10 h-5 rounded-full shadow-inner transition-colors ${
                          isSyncEnabled ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      ></div>
                      <div
                        className={`absolute w-3 h-3 bg-white rounded-full shadow -translate-y-1/2 top-1/2 transition-transform ${
                          isSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm text-gray-600">Sync</span>
                  </label>

                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isDebugEnabled}
                        onChange={(e) => setIsDebugEnabled(e.target.checked)}
                      />
                      <div
                        className={`w-10 h-5 rounded-full shadow-inner transition-colors ${
                          isDebugEnabled ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      ></div>
                      <div
                        className={`absolute w-3 h-3 bg-white rounded-full shadow -translate-y-1/2 top-1/2 transition-transform ${
                          isDebugEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm text-gray-600">Debug</span>
                  </label>
                </div>
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
                  isSyncEnabled={isSyncEnabled}
                  onSyncChange={setIsSyncEnabled}
                  onProcessVideo={handleProcessVideo}
                  fps={fps}
                  onFpsChange={setFps}
                  isDebugEnabled={isDebugEnabled}
                  onDebugChange={setIsDebugEnabled}
                  referenceGuide={{
                    isActive: referenceGuide.isActive,
                    type: referenceGuide.type,
                    onComplete: handleReferenceGuideComplete,
                  }}
                />
              </div>

              {/* Timeline e Controles */}
              {mediaType === 'video' && (
                <div className="w-full">
                  <Timeline videoRef={videoRef} onSeek={handleSeek} onThumbnailsGenerated={handleThumbnailsGenerated} />
                  <VideoControls videoRef={videoRef} fps={fps} isPlaying={isPlaying} onPlayPauseChange={setIsPlaying} />
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
            onReferenceGuideChange={setReferenceGuide}
          />
        </div>
        {isLoading && <Loading />}
      </div>
    </SyncContext.Provider>
  );
};

export default App;
