import { FC } from 'react';
import { Marker } from '../types';

interface SidebarProps {
  markers: Marker[];
  selectMarker: (id: string) => void;
  selectedMarkerId: string | null;
  updateMarker: (updatedMarker: Marker) => void;
  resetMarkers: () => void;
}

function Sidebar({ markers, selectMarker, selectedMarkerId, updateMarker, resetMarkers }: SidebarProps) {
  const handleMarkerClick = (marker: Marker) => {
    selectMarker(marker.id);
    updateMarker({ ...marker, lastSelected: new Date().toISOString() } as Marker);
    console.log(`Marker selected: ${marker.id}`);
  };

  return (
    <aside className="sidebar">
      <h2>Marcadores</h2>
      <ul>
        {markers.map((marker) => (
          <li
            key={marker.id}
            onClick={() => handleMarkerClick(marker)}
            style={{
              backgroundColor: marker.id === selectedMarkerId ? marker.color : 'transparent',
              fontWeight: marker.isGeneral ? 'bold' : 'normal',
              color: marker.isGeneral ? '#000' : 'inherit',
            }}
          >
            <span
              className="marker-color"
              style={{
                backgroundColor: marker.color,
                border: marker.isGeneral ? '1px solid #000' : 'none',
              }}
            />
            {marker.name || 'Marker'}
            {marker.isGeneral && ' (Geral)'}
          </li>
        ))}
      </ul>
      <button
        onClick={resetMarkers}
        className="reset-button"
        style={{
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#ff4d4d',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        Resetar Marcadores
      </button>
    </aside>
  );
}

export default Sidebar;
