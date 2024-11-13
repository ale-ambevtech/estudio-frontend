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

interface VideoDimensions {
  width: number;
  height: number;
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
    if (file) {
      try {
        console.log('File selected:', file.name, 'Type:', file.type);

        // Save file to IndexedDB
        await saveMedia('currentMedia', file);
        console.log('File saved to IndexedDB');

        const url = URL.createObjectURL(file);
        console.log('Created object URL:', url);

        if (file.type.startsWith('video/')) {
          console.log('Setting media type to video');
          setMediaType('video');
          localStorage.setItem('mediaType', 'video');
        } else if (file.type.startsWith('image/')) {
          console.log('Setting media type to image');
          setMediaType('image');
          localStorage.setItem('mediaType', 'image');
        }

        setMediaUrl(url);
        console.log('Media URL set');

        // Update markers as before
        setMarkers((prevMarkers) => {
          const generalMarker = prevMarkers.find((m) => m.isGeneral);
          if (generalMarker) {
            const updatedGeneralMarker = {
              ...generalMarker,
              width: 0,
              height: 0,
            };
            return [updatedGeneralMarker, ...prevMarkers.filter((m) => !m.isGeneral)];
          }
          return prevMarkers;
        });
      } catch (error) {
        console.error('Error during file upload:', error);
      }
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

  return (
    <div className="app-container">
      <Sidebar
        markers={markers}
        selectMarker={selectMarker}
        selectedMarkerId={selectedMarkerId}
        updateMarker={updateMarker}
        resetMarkers={resetMarkers}
        resetAll={resetAll}
      />
      <div className="main-content">
        <label htmlFor="media-upload" className="block mb-2">
          Carregar Vídeo ou Imagem:
        </label>
        <input id="media-upload" type="file" accept="video/*,image/*" onChange={handleFileUpload} className="mb-4" />
        {mediaUrl && (
          <>
            <VideoPlayer
              markers={markers}
              addMarker={addMarker}
              selectedMarkerId={selectedMarkerId}
              videoRef={videoRef}
              onDimensionsChange={handleVideoDimensionsChange}
              selectMarker={selectMarker}
              mediaType={mediaType}
              mediaUrl={mediaUrl}
            />
          </>
        )}
        {mediaType === 'video' && (
          <>
            <Timeline videoRef={videoRef} onSeek={handleSeek} onThumbnailsGenerated={handleThumbnailsGenerated} />
            <VideoControls videoRef={videoRef} fps={fps} isPlaying={isPlaying} />
          </>
        )}
        <button onClick={exportRecipe} className="button-export">
          Exportar Receita
        </button>
      </div>
      <ConfigPanel
        marker={markers.find((m) => m.id === selectedMarkerId) || null}
        updateMarker={updateMarker}
        deleteMarker={deleteMarker}
      />
    </div>
  );
};

export default App;
