import React from 'react';
import { Marker } from '../types/marker';
import { Slider } from 'primereact/slider';
import { InputNumber } from 'primereact/inputnumber';
import { rgbToHex, hexToRgb } from '../utils/colors';
import type { RGBColor } from '../types/api';

export interface ConfigPanelProps {
  marker: Marker | null;
  updateMarker: (updatedMarker: Marker) => void;
  deleteMarker: (id: string) => void;
  className?: string;
}

interface OpenCVParams {
  lowerColor?: RGBColor;
  upperColor?: RGBColor;
  tolerance?: number;
  minArea?: number;
  maxArea?: number;
  shapes?: string[];
  shapeTolerance?: number;
  templateImage?: string;
  threshold?: number;
}

type OpenCVParamKey = keyof OpenCVParams;

const ConfigPanel: React.FC<ConfigPanelProps> = ({ marker, updateMarker, deleteMarker, className }) => {
  if (!marker) {
    return (
      <div className="config-panel">
        <p className="text-center text-gray-500 mt-4">Selecione um marcador para configurar.</p>
      </div>
    );
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateMarker({ ...marker, name: e.target.value });
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateMarker({ ...marker, color: e.target.value });
  };

  const handleFunctionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateMarker({
      ...marker,
      opencvFunction: e.target.value as Marker['opencvFunction'],
    });
  };

  const handleDelete = () => {
    deleteMarker(marker.id);
  };

  const handleParamChange = (param: OpenCVParamKey, value: string | number | string[]) => {
    if (!marker) return;

    const updatedParams = { ...marker.opencvParams };

    switch (param) {
      case 'lowerColor':
      case 'upperColor':
        updatedParams[param] = hexToRgb(value as string);
        break;
      case 'shapes':
        updatedParams.shapes = value as string[];
        break;
      case 'tolerance':
        updatedParams.tolerance = Number(value);
        break;
      case 'minArea':
        updatedParams.minArea = Number(value);
        break;
      case 'maxArea':
        updatedParams.maxArea = Number(value);
        break;
      case 'shapeTolerance':
        updatedParams.shapeTolerance = Number(value);
        break;
      case 'threshold':
        updatedParams.threshold = Number(value);
        break;
      default:
        updatedParams[param] = value as string;
    }

    console.log('Updated color params:', updatedParams);

    updateMarker({
      ...marker,
      opencvParams: updatedParams,
    });
  };

  const renderColorSegmentationParams = () => {
    return (
      <div className="color-segmentation-params space-y-4">
        <h3 className="text-lg font-semibold mb-2">Parâmetros de Segmentação de Cor</h3>
        <div className="space-y-2">
          <label htmlFor="lowerColor" className="block text-sm font-medium">
            Cor Inferior:
          </label>
          <input
            type="color"
            id="lowerColor"
            value={rgbToHex(marker.opencvParams?.lowerColor || { r: 0, g: 0, b: 0 })}
            onChange={(e) => handleParamChange('lowerColor', e.target.value)}
            className="w-full h-10 rounded-md"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="upperColor" className="block text-sm font-medium">
            Cor Superior:
          </label>
          <input
            type="color"
            id="upperColor"
            value={rgbToHex(marker.opencvParams?.upperColor || { r: 255, g: 255, b: 255 })}
            onChange={(e) => handleParamChange('upperColor', e.target.value)}
            className="w-full h-10 rounded-md"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="tolerance" className="block text-sm font-medium text-gray-700">
            Tolerância:
          </label>
          <input
            type="number"
            id="tolerance"
            value={(marker.opencvParams?.tolerance || 10).toString()}
            onChange={(e) => handleParamChange('tolerance', e.target.value)}
            className="w-full rounded-md"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="minArea" className="block text-sm font-medium text-gray-700">
            Área Mínima:
          </label>
          <input
            type="number"
            id="minArea"
            value={(marker.opencvParams?.minArea || 100).toString()}
            onChange={(e) => handleParamChange('minArea', e.target.value)}
            className="w-full rounded-md"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="maxArea" className="block text-sm font-medium text-gray-700">
            Área Máxima:
          </label>
          <input
            type="number"
            id="maxArea"
            value={(marker.opencvParams?.maxArea || 10000).toString()}
            onChange={(e) => handleParamChange('maxArea', e.target.value)}
            className="w-full rounded-md"
          />
        </div>
      </div>
    );
  };

  const renderShapeDetectionParams = () => {
    const shapeOptions = [
      { label: 'Círculo', value: 'circle' },
      { label: 'Triângulo', value: 'triangle' },
      { label: 'Retângulo', value: 'rectangle' },
    ];

    return (
      <div className="shape-detection-params space-y-4">
        <h3 className="text-lg font-semibold mb-2">Parâmetros de Detecção de Formas</h3>
        <div className="space-y-2">
          <label htmlFor="shapes" className="block text-sm font-medium">
            Forma:
          </label>
          <select
            multiple
            aria-label="Selecione as formas"
            value={marker.opencvParams?.shapes || []}
            onChange={(e) => {
              const shapes = Array.from(e.target.selectedOptions, (option) => option.value);
              handleParamChange('shapes', shapes);
            }}
            className="w-full rounded-md"
          >
            {shapeOptions.map((shape) => (
              <option key={shape.value} value={shape.value}>
                {shape.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="shapeTolerance" className="block text-sm font-medium text-gray-700">
            Tolerância de Forma:
          </label>
          <input
            type="number"
            id="shapeTolerance"
            value={(marker.opencvParams?.shapeTolerance || 0.1).toString()}
            onChange={(e) => handleParamChange('shapeTolerance', e.target.value)}
            className="w-full rounded-md"
          />
        </div>
      </div>
    );
  };

  const renderTemplateMatchingParams = () => {
    return (
      <div className="template-matching-params space-y-4">
        <h3 className="text-lg font-semibold mb-2">Template Matching Parameters</h3>
        <div className="space-y-2">
          <label htmlFor="templateImage" className="block text-sm font-medium">
            Template Image:
          </label>
          <input
            type="file"
            id="templateImage"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  handleParamChange('templateImage', event.target?.result as string);
                };
                reader.readAsDataURL(file);
              }
            }}
            className="w-full"
          />
          {marker.opencvParams?.templateImage && (
            <div className="mt-2">
              <img
                src={marker.opencvParams.templateImage}
                alt="Template"
                className="max-w-full h-auto max-h-32 object-contain"
              />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="threshold" className="block text-sm font-medium">
            Threshold:
          </label>
          <div className="flex items-center space-x-2">
            <Slider
              id="threshold"
              min={0.5}
              max={0.95}
              step={0.01}
              value={marker.opencvParams?.threshold || 0.8}
              onChange={(e) => handleParamChange('threshold', e.value as number)}
              className="flex-grow"
            />
            <InputNumber
              value={marker.opencvParams?.threshold || 0.8}
              onChange={(e) => handleParamChange('threshold', e.value || 0)}
              className="w-full"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderPeopleDetectionParams = () => {
    return (
      <div className="people-detection-params space-y-4">
        <h3 className="text-lg font-semibold mb-2">People Detection Parameters</h3>
        <div className="space-y-2">
          <label htmlFor="minArea" className="block text-sm font-medium">
            Minimum Area:
          </label>
          <div className="flex items-center space-x-2">
            <Slider
              id="minArea"
              min={500}
              max={10000}
              value={marker.opencvParams?.minArea || 1000}
              onChange={(e) => handleParamChange('minArea', e.value as number)}
              className="flex-grow"
            />
            <InputNumber
              value={marker.opencvParams?.minArea || 1000}
              onValueChange={(e) => handleParamChange('minArea', e.value as number)}
              min={500}
              max={10000}
              className="w-20"
              locale="pt-BR"
              minFractionDigits={0}
              maxFractionDigits={0}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="maxArea" className="block text-sm font-medium">
            Maximum Area:
          </label>
          <div className="flex items-center space-x-2">
            <Slider
              id="maxArea"
              min={1000}
              max={60000}
              value={marker.opencvParams?.maxArea || 60000}
              onChange={(e) => handleParamChange('maxArea', e.value as number)}
              className="flex-grow"
            />
            <InputNumber
              value={marker.opencvParams?.maxArea || 60000}
              onValueChange={(e) => handleParamChange('maxArea', e.value as number)}
              min={1000}
              max={60000}
              className="w-20"
              locale="pt-BR"
              minFractionDigits={0}
              maxFractionDigits={0}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`config-panel p-4 space-y-4 ${className}`}>
      <h2 className="text-lg font-semibold mb-4">
        Configurações para {marker.isGeneral ? 'Quadro Geral' : 'Marcador'}
      </h2>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="markerName" className="block text-sm font-medium text-gray-700">
            Nome:
          </label>
          <input
            id="markerName"
            type="text"
            value={marker.name || ''}
            onChange={handleNameChange}
            disabled={marker.isGeneral}
            className="w-full p-2 rounded-md disabled:bg-gray-300"
            aria-label="Nome do marcador"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="markerColor" className="block text-sm font-medium text-gray-700">
            Cor:
          </label>
          <input
            id="markerColor"
            type="color"
            value={marker.color}
            onChange={handleColorChange}
            className="w-full h-10 rounded-md"
            aria-label="Cor do marcador"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="opencvFunction" className="block text-sm font-medium text-gray-700">
            Função OpenCV:
          </label>
          <div className="relative">
            <select
              id="opencvFunction"
              value={marker.opencvFunction || ''}
              onChange={handleFunctionChange}
              className="w-full p-2 rounded-md border border-gray-300 bg-white appearance-none cursor-pointer pr-8 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
              aria-label="Função OpenCV"
            >
              <option value="">Selecionar</option>
              {/* <option value="detectShapes">Detecção de Formas</option> */}
              <option value="colorSegmentation">Segmentação de Cor</option>
              {/* <option value="templateMatching">Correspondência de Modelo</option> */}
              {/* <option value="detectPeople">Detecção de Pessoas</option> */}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {marker.opencvFunction === 'colorSegmentation' && renderColorSegmentationParams()}
      {marker.opencvFunction === 'detectShapes' && renderShapeDetectionParams()}
      {marker.opencvFunction === 'templateMatching' && renderTemplateMatchingParams()}
      {marker.opencvFunction === 'detectPeople' && renderPeopleDetectionParams()}

      {!marker.isGeneral && (
        <button
          onClick={handleDelete}
          className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
        >
          Excluir Marcador
        </button>
      )}
    </div>
  );
};

export default ConfigPanel;
