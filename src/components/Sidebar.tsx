import { Marker } from '../types';

interface SidebarProps {
  markers: Marker[];
  selectMarker: (id: string) => void;
  selectedMarkerId: string | null;
  updateMarker: (updatedMarker: Marker) => void;
  resetMarkers: () => void;
  resetAll: () => void;
  className?: string;
}

function Sidebar({
  markers,
  selectMarker,
  selectedMarkerId,
  updateMarker,
  resetMarkers,
  resetAll,
  className,
}: SidebarProps) {
  const handleMarkerClick = (marker: Marker) => {
    selectMarker(marker.id);
    updateMarker({ ...marker, lastSelected: new Date().toISOString() } as Marker);
    console.log(`Marker selected: ${marker.id}`);
  };

  return (
    <aside className={className}>
      <h2 className="text-lg font-semibold mb-4">Marcadores</h2>
      <ul className="space-y-2 mb-4">
        {markers.map((marker) => (
          <li
            key={marker.id}
            onClick={() => handleMarkerClick(marker)}
            className={`
              flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors
              ${marker.id === selectedMarkerId ? 'bg-gray-100' : 'hover:bg-gray-50'}
            `}
          >
            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: marker.color }} />
            <span className={marker.isGeneral ? 'font-semibold' : ''}>
              {marker.name || 'Marker'}
              {marker.isGeneral && ' (Geral)'}
            </span>
          </li>
        ))}
      </ul>
      <div className="space-y-2">
        <button
          onClick={resetMarkers}
          className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
        >
          Resetar Marcadores
        </button>
        <button
          onClick={resetAll}
          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
        >
          Resetar Tudo
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
