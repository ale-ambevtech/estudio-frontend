import { Marker } from '../types';

interface SidebarProps {
  markers: Marker[];
  selectMarker: (id: string) => void;
  selectedMarkerId: string | null;
  updateMarker: (updatedMarker: Marker) => void;
  resetMarkers: () => void;
  resetAll: () => void;
}

function Sidebar({ markers, selectMarker, selectedMarkerId, updateMarker, resetMarkers, resetAll }: SidebarProps) {
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
      <div className="space-y-2">
        <button
          onClick={resetMarkers}
          className="reset-button w-full"
          style={{
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
        <button
          onClick={resetAll}
          className="reset-button w-full"
          style={{
            padding: '10px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Resetar Tudo
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
