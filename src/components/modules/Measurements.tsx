import React from 'react';
import { useRoadLab, type ToolType } from '../../context/RoadLabContext';
import {
  Ruler,
  MousePointer,
  MapPin,
  Hexagon,
  CornerDownRight,
  Trash2,
  Sparkles,
  Info
} from 'lucide-react';

interface ToolItem {
  type: ToolType;
  label: string;
  desc: string;
  icon: React.ComponentType<any>;
  color: string;
}

export const Measurements: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    measurements,
    deleteMeasurement,
    clearMeasurements,
    activeCalibration
  } = useRoadLab();

  const tools: ToolItem[] = [
    { type: 'select', label: 'Select / Move', desc: 'Default viewport navigation', icon: MousePointer, color: 'text-gray-400' },
    { type: 'point', label: 'Point Marker', desc: 'Create coordinates point', icon: MapPin, color: 'text-error' },
    { type: 'line', label: 'Line / Distance', desc: 'Measure linear distance', icon: Ruler, color: 'text-success' },
    { type: 'polygon', label: 'Polygon / Area', desc: 'Calculate perimeter & area', icon: Hexagon, color: 'text-warning' },
    { type: 'angle', label: 'Angle Tool', desc: 'Measure angles between lines', icon: CornerDownRight, color: 'text-violet-500' }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-150 p-5 overflow-y-auto transition-workspace text-sm">
      
      {/* Module Title */}
      <div className="flex items-center space-x-2 pb-4 mb-4 border-b border-gray-200 dark:border-gray-800">
        <Ruler className="w-5 h-5 text-brand-blue" />
        <h3 className="font-extrabold text-base">Measurement Panel</h3>
      </div>

      {/* Calibration context warning */}
      {!activeCalibration && (
        <div className="mb-5 p-3 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning flex items-start space-x-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Warning:</strong> No active perspective calibration. Measurements will fallback to standard pixel-to-meter ratio.
          </p>
        </div>
      )}

      {/* 1. Tools Grid */}
      <div className="mb-6">
        <label className="block text-xs uppercase tracking-wide text-gray-400 font-bold mb-3">
          Select Measurement Tool
        </label>
        
        <div className="grid grid-cols-1 gap-2">
          {tools.map(tool => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.type;
            
            return (
              <button
                key={tool.type}
                onClick={() => setActiveTool(tool.type)}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'bg-brand-blue border-brand-blue text-white shadow-md shadow-brand-blue/15'
                    : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-850 dark:hover:bg-gray-800 border-gray-250 dark:border-gray-800'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded bg-white dark:bg-gray-900 shadow-sm ${isActive ? 'text-brand-blue' : tool.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">{tool.label}</h4>
                    <p className={`text-[10px] mt-0.5 ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                      {tool.desc}
                    </p>
                  </div>
                </div>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Measurements List Section */}
      <div className="flex-1 flex flex-col border-t border-gray-200 dark:border-gray-800 pt-4">
        <div className="flex items-center justify-between mb-3.5">
          <label className="block text-xs uppercase tracking-wide text-gray-400 font-bold">
            Active Measurements ({measurements.length})
          </label>
          {measurements.length > 0 && (
            <button
              onClick={clearMeasurements}
              className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[350px] pr-1">
          {measurements.length === 0 ? (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-8 bg-gray-50 dark:bg-gray-850 rounded-xl border border-dashed border-gray-700/60 flex flex-col items-center justify-center p-4">
              <Sparkles className="w-8 h-8 text-gray-700 mb-2" />
              <span>No measurements created yet.</span>
              <span className="text-[10px] text-gray-600 mt-1">Select a tool above and draw on the canvas.</span>
            </div>
          ) : (
            measurements.map(m => {
              let typeColor = 'bg-brand-blue';
              if (m.type === 'point') typeColor = 'bg-red-500';
              if (m.type === 'line') typeColor = 'bg-emerald-600';
              if (m.type === 'polygon') typeColor = 'bg-amber-500';
              if (m.type === 'angle') typeColor = 'bg-purple-500';

              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-800 shadow-sm"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${typeColor}`} />
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate text-gray-800 dark:text-gray-150">{m.name}</p>
                      <p className="text-[11px] font-mono text-brand-sky font-semibold mt-0.5 truncate">{m.value}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMeasurement(m.id)}
                    className="p-1 rounded text-gray-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};
export default Measurements;
