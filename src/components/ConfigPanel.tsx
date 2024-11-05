import React from 'react';
import { Marker } from '../types';
import { Slider } from 'primereact/slider';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';

export interface ConfigPanelProps {
  marker: Marker | null;
  updateMarker: (updatedMarker: Marker) => void;
  deleteMarker: (id: string) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ marker, updateMarker, deleteMarker }) => {
  if (!marker) {
    return (
      <div className="config-panel">
        <p className="text-center text-gray-500 mt-4">Selecione um marcador para configurar.</p>
      </div>
    );
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!marker.isGeneral) {
      updateMarker({ ...marker, name: e.target.value });
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateMarker({ ...marker, color: e.target.value });
  };

  const handleFunctionChange = (e: { value: string }) => {
    const newFunction = e.value as
      | 'colorSegmentation'
      | 'detectShapes'
      | 'templateMatching'
      | 'detectPeople'
      | undefined;
    let newParams = marker.opencvParams || {};

    if (newFunction === 'colorSegmentation') {
      newParams = {
        ...newParams,
        lowerColor: '#000000',
        upperColor: '#FFFFFF',
        tolerance: 20,
        minArea: 100,
        maxArea: 10000,
      };
    } else if (newFunction === 'detectShapes') {
      newParams = {
        ...newParams,
        shapes: ['circle'],
        minArea: 100,
        maxArea: 10000,
        shapeTolerance: 0.02,
      };
    } else if (newFunction === 'templateMatching') {
      newParams = {
        ...newParams,
        templateImage: undefined,
        threshold: 0.8,
      };
    } else if (newFunction === 'detectPeople') {
      newParams = {
        ...newParams,
        minArea: 1000,
        maxArea: 100000,
      };
    }

    updateMarker({ ...marker, opencvFunction: newFunction, opencvParams: newParams });
  };

  const handleDelete = () => {
    deleteMarker(marker.id);
  };

  const handleParamChange = (param: string, value: string | number | string[]) => {
    updateMarker({
      ...marker,
      opencvParams: {
        ...marker.opencvParams,
        [param]: value,
      },
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
            value={marker.opencvParams?.lowerColor || '#000000'}
            onChange={(e) => handleParamChange('lowerColor', e.target.value)}
            className="w-full h-10"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="upperColor" className="block text-sm font-medium">
            Cor Superior:
          </label>
          <input
            type="color"
            id="upperColor"
            value={marker.opencvParams?.upperColor || '#FFFFFF'}
            onChange={(e) => handleParamChange('upperColor', e.target.value)}
            className="w-full h-10"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="tolerance" className="block text-sm font-medium">
            Tolerância:
          </label>
          <div className="flex items-center space-x-2">
            <Slider
              id="tolerance"
              min={0}
              max={100}
              value={marker.opencvParams?.tolerance || 20}
              onChange={(e) => handleParamChange('tolerance', e.value as number)}
              className="flex-grow"
            />
            <InputNumber
              value={marker.opencvParams?.tolerance || 20}
              onValueChange={(e) => handleParamChange('tolerance', e.value as number)}
              min={0}
              max={100}
              className="w-20"
              locale="pt-BR"
              minFractionDigits={0}
              maxFractionDigits={0}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="minArea" className="block text-sm font-medium">
            Área Mínima:
          </label>
          <div className="flex items-center space-x-2">
            <Slider
              id="minArea"
              min={50}
              max={20000}
              value={marker.opencvParams?.minArea || 100}
              onChange={(e) => handleParamChange('minArea', e.value as number)}
              className="flex-grow"
            />
            <InputNumber
              value={marker.opencvParams?.minArea || 100}
              onValueChange={(e) => handleParamChange('minArea', e.value as number)}
              min={50}
              max={20000}
              className="w-20"
              locale="pt-BR"
              minFractionDigits={0}
              maxFractionDigits={0}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="maxArea" className="block text-sm font-medium">
            Área Máxima:
          </label>
          <div className="flex items-center space-x-2">
            <Slider
              id="maxArea"
              min={50}
              max={20000}
              value={marker.opencvParams?.maxArea || 10000}
              onChange={(e) => handleParamChange('maxArea', e.value as number)}
              className="flex-grow"
            />
            <InputNumber
              value={marker.opencvParams?.maxArea || 10000}
              onValueChange={(e) => handleParamChange('maxArea', e.value as number)}
              min={50}
              max={20000}
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
          <Dropdown
            id="shapes"
            value={marker.opencvParams?.shapes?.[0] || ''}
            options={shapeOptions}
            onChange={(e) => handleParamChange('shapes', [e.value])}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="minArea" className="block text-sm font-medium">
            Área Mínima:
          </label>
          <div className="flex items-center space-x-2">
            <Slider
              id="minArea"
              min={50}
              max={20000}
              value={marker.opencvParams?.minArea || 100}
              onChange={(e) => handleParamChange('minArea', e.value as number)}
              className="flex-grow"
            />
            <InputNumber
              value={marker.opencvParams?.minArea || 100}
              onValueChange={(e) => handleParamChange('minArea', e.value as number)}
              min={50}
              max={20000}
              className="w-20"
              locale="pt-BR"
              minFractionDigits={0}
              maxFractionDigits={0}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="maxArea" className="block text-sm font-medium">
            Área Máxima:
          </label>
          <div className="flex items-center space-x-2">
            <Slider
              id="maxArea"
              min={50}
              max={20000}
              value={marker.opencvParams?.maxArea || 10000}
              onChange={(e) => handleParamChange('maxArea', e.value as number)}
              className="flex-grow"
            />
            <InputNumber
              value={marker.opencvParams?.maxArea || 10000}
              onValueChange={(e) => handleParamChange('maxArea', e.value as number)}
              min={50}
              max={20000}
              className="w-20"
              locale="pt-BR"
              minFractionDigits={0}
              maxFractionDigits={0}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="shapeTolerance" className="block text-sm font-medium">
            Tolerância de Forma:
          </label>
          <div className="flex items-center space-x-2">
            <Slider
              id="shapeTolerance"
              min={0}
              max={0.1}
              step={0.001}
              value={marker.opencvParams?.shapeTolerance || 0.02}
              onChange={(e) => handleParamChange('shapeTolerance', e.value as number)}
              className="flex-grow"
            />
            <InputNumber
              value={marker.opencvParams?.shapeTolerance || 0.02}
              onValueChange={(e) => handleParamChange('shapeTolerance', e.value as number)}
              min={0}
              max={0.1}
              step={0.001}
              className="w-20"
              locale="pt-BR"
              minFractionDigits={3}
              maxFractionDigits={3}
            />
          </div>
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
              onValueChange={(e) => handleParamChange('threshold', e.value as number)}
              min={0.5}
              max={0.95}
              step={0.01}
              className="w-20"
              locale="pt-BR"
              minFractionDigits={2}
              maxFractionDigits={2}
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
    <div className="config-panel p-4 space-y-4">
      <h2 className="text-xl font-bold mb-4">Configurações para {marker.isGeneral ? 'Quadro Geral' : 'Marcador'}</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="markerName" className="block text-sm font-medium">
            Nome:
          </label>
          <input
            id="markerName"
            type="text"
            value={marker.name || ''}
            onChange={handleNameChange}
            disabled={marker.isGeneral}
            className={`w-full p-2 border rounded ${marker.isGeneral ? 'bg-gray-100' : ''}`}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="markerColor" className="block text-sm font-medium">
            Cor:
          </label>
          <input
            type="color"
            id="markerColor"
            value={marker.color}
            onChange={handleColorChange}
            className="w-full h-10"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="opencvFunction" className="block text-sm font-medium">
            Função OpenCV:
          </label>
          <Dropdown
            id="opencvFunction"
            value={marker.opencvFunction || ''}
            options={[
              { label: 'Selecionar', value: '' },
              { label: 'Detecção de Formas', value: 'detectShapes' },
              { label: 'Segmentação de Cor', value: 'colorSegmentation' },
              { label: 'Correspondência de Modelo', value: 'templateMatching' },
              { label: 'Detecção de Pessoas', value: 'detectPeople' },
            ]}
            onChange={handleFunctionChange}
            className="w-full"
          />
        </div>
      </div>

      {marker.opencvFunction === 'colorSegmentation' && renderColorSegmentationParams()}
      {marker.opencvFunction === 'detectShapes' && renderShapeDetectionParams()}
      {marker.opencvFunction === 'templateMatching' && renderTemplateMatchingParams()}
      {marker.opencvFunction === 'detectPeople' && renderPeopleDetectionParams()}

      {!marker.isGeneral && (
        <Button
          label="Excluir Marcador"
          icon="pi pi-trash"
          className="p-button-danger w-full mt-4"
          onClick={handleDelete}
        />
      )}
    </div>
  );
};

export default ConfigPanel;
