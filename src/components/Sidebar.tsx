import { Marker } from '../types/marker';
import { FaPlus } from 'react-icons/fa6';

interface SidebarProps {
  markers: Marker[];
  selectMarker: (id: string) => void;
  selectedMarkerId: string | null;
  updateMarker: (updatedMarker: Marker) => void;
  resetMarkers: () => void;
  resetAll: () => void;
  className?: string;
  onAddMarker: (bol: boolean) => void;
}

function Sidebar({
  markers,
  selectMarker,
  selectedMarkerId,
  updateMarker,
  resetMarkers,
  resetAll,
  className,
  onAddMarker,
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
              flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all
              ${marker.id === selectedMarkerId ? 'bg-slate-100 ring-2 ring-slate-500 shadow-sm' : 'hover:bg-slate-50'}
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
          onClick={() => onAddMarker(true)}
          className="w-full 
          text-black 
          font-semibold 
          bg-transparent 
          rounded-md 
          border-black 
          border-solid 
          border-2 
          rounded-lg 
          px-4 
          py-1
          transition-colors 
          duration-300 
          ease-in-out 
          hover:bg-yellow-100 hover:border-transparent
          flex 
          items-center 
          justify-center 
          gap-2
          "
        >
          <FaPlus />
          Adicionar marcador
        </button>
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
