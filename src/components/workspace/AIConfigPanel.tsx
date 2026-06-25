import React from 'react';
import { useRoadLab } from '../../context/RoadLabContext';
import {
  Sliders,
  Cpu,
  Eye,
  EyeOff,
  Paintbrush,
  X
} from 'lucide-react';

interface AIConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIConfigPanel: React.FC<AIConfigPanelProps> = ({ isOpen, onClose }) => {
  const {
    modelConfig,
    updateModelConfig,
    activeInferenceModel,
    inferenceFPS,
    overlayVisibility,
    updateOverlayVisibility,
    overlayOpacity,
    setOverlayOpacity,
    overlayColors,
    updateOverlayColor
  } = useRoadLab();

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 bottom-0 right-0 w-80 bg-white dark:bg-gray-900 border-l border-gray-250 dark:border-gray-800 shadow-2xl z-40 transition-workspace flex flex-col text-sm text-gray-800 dark:text-gray-200">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-brand-blue" />
          <span className="font-extrabold text-base">Inference Engine Config</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* 1. Model Stats */}
        <div className="bg-gray-50 dark:bg-gray-850 p-3 rounded-lg border border-gray-200 dark:border-gray-800">
          <span className="text-[10px] uppercase font-bold text-gray-400">Target Pipeline Status</span>
          <p className="font-bold mt-1 text-xs text-brand-sky truncate">
            {activeInferenceModel ? activeInferenceModel.name : "No Model Selected"}
          </p>
          <div className="flex justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-800">
            <span>Estimated Speed:</span>
            <span className="font-mono font-bold text-success">
              {inferenceFPS > 0 ? `${inferenceFPS} FPS` : "30-45 FPS"}
            </span>
          </div>
        </div>

        {/* 2. Thresholds */}
        <div className="space-y-4">
          <h4 className="font-bold text-xs uppercase tracking-wide text-gray-450 border-b border-gray-150 dark:border-gray-800 pb-1.5">
            Detection Thresholds
          </h4>
          
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Confidence Threshold</span>
              <span className="font-mono text-brand-sky">{modelConfig.confThreshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.0}
              max={1.0}
              step={0.05}
              value={modelConfig.confThreshold}
              onChange={(e) => updateModelConfig({ confThreshold: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-blue"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>IoU NMS Threshold</span>
              <span className="font-mono text-brand-sky">{modelConfig.iouThreshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.0}
              max={1.0}
              step={0.05}
              value={modelConfig.iouThreshold}
              onChange={(e) => updateModelConfig({ iouThreshold: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-blue"
            />
          </div>
        </div>

        {/* 3. Input Shape & Device */}
        <div className="space-y-4">
          <h4 className="font-bold text-xs uppercase tracking-wide text-gray-450 border-b border-gray-150 dark:border-gray-800 pb-1.5">
            hardware & input size
          </h4>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Inference Resolution</label>
            <select
              value={modelConfig.inputResolution}
              onChange={(e) => updateModelConfig({ inputResolution: e.target.value as any })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 text-xs focus:outline-none"
            >
              <option value="640x640">640 x 640 (Fastest)</option>
              <option value="1280x720">1280 x 720 (Balanced)</option>
              <option value="1920x1080">1920 x 1080 (Precise)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Execution Hardware</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[
                { type: 'CPU', label: 'CPU Engine' },
                { type: 'CUDA', label: 'CUDA GPU' }
              ].map(dev => (
                <button
                  key={dev.type}
                  type="button"
                  onClick={() => updateModelConfig({ device: dev.type as any })}
                  className={`py-2 rounded-lg border text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
                    modelConfig.device === dev.type
                      ? 'bg-brand-blue/15 border-brand-blue text-brand-blue dark:text-brand-sky'
                      : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-850 border-gray-250 dark:border-gray-750 text-gray-650'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>{dev.type}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Display Layer Overlays Toggle */}
        <div className="space-y-4 border-t border-gray-150 dark:border-gray-800 pt-4">
          <h4 className="font-bold text-xs uppercase tracking-wide text-gray-450">Layer Overlays</h4>
          
          <div className="space-y-3">
            {[
              { key: 'boundingBoxes', label: 'Bounding Boxes', colorKey: 'boundingBoxes' },
              { key: 'lanes', label: 'Lane Boundaries', colorKey: 'lanes' },
              { key: 'segmentation', label: 'Semantic Masks', colorKey: 'road' }
            ].map(layer => {
              const isVisible = (overlayVisibility as any)[layer.key];
              const color = (overlayColors as any)[layer.colorKey];
              
              return (
                <div key={layer.key} className="flex items-center justify-between">
                  <button
                    onClick={() => updateOverlayVisibility(layer.key as any, !isVisible)}
                    className="flex items-center space-x-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-brand-blue"
                  >
                    {isVisible ? <Eye className="w-4 h-4 text-brand-sky" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
                    <span>{layer.label}</span>
                  </button>
                  
                  {/* Inline Color Select */}
                  <div className="flex items-center space-x-1.5">
                    <Paintbrush className="w-3 h-3 text-gray-500" />
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => updateOverlayColor(layer.colorKey as any, e.target.value)}
                      className="w-5 h-5 rounded border border-gray-300 dark:border-gray-700 cursor-pointer p-0 bg-transparent"
                    />
                  </div>
                </div>
              );
            })}

            {/* Mask Transparency slider */}
            <div className="pt-2 border-t border-gray-150 dark:border-gray-800">
              <div className="flex justify-between text-[11px] font-semibold text-gray-400 mb-1">
                <span>Overlay Opacity (Masks)</span>
                <span className="font-mono">{Math.round(overlayOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={0.9}
                step={0.05}
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-blue"
              />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
export default AIConfigPanel;
