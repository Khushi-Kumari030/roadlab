import React, { useState, useEffect } from 'react';
import { useRoadLab } from '../../context/RoadLabContext';
import {
  Grid3X3,
  Save,
  Trash2,
  Share2,
  CheckCircle,
  FileCode,
  Gauge,
  Info
} from 'lucide-react';

export const Calibration: React.FC = () => {
  const {
    calibrations,
    activeCalibration,
    setActiveCalibration,
    saveCalibration,
    deleteCalibration,
    activeTool,
    setActiveTool,
    calibrationDiagnostics
  } = useRoadLab();

  const [gridW, setGridW] = useState(3.7);
  const [gridH, setGridH] = useState(10.0);
  const [calName, setCalName] = useState('New Grid Calibration');
  const [showJsonDump, setShowJsonDump] = useState(false);

  // Sync width/height input fields with active item
  useEffect(() => {
    if (activeCalibration) {
      setGridW(activeCalibration.gridWidth);
      setGridH(activeCalibration.gridHeight);
      setCalName(activeCalibration.name);
    }
  }, [activeCalibration]);

  const handleToggleGridTool = () => {
    if (activeTool === 'grid') {
      setActiveTool('select');
    } else {
      setActiveTool('grid');
    }
  };

  const handleSave = () => {
    if (!calName.trim()) return;
    
    // Default image points if no active calibration exists, else use current
    const imgPoints = activeCalibration 
      ? activeCalibration.image_points 
      : [
          { x: 300, y: 250 },
          { x: 500, y: 250 },
          { x: 650, y: 500 },
          { x: 150, y: 500 }
        ];

    saveCalibration(calName, imgPoints, gridW, gridH);
    alert('Calibration saved successfully!');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this calibration grid?')) {
      deleteCalibration(id);
    }
  };

  const handleExportCal = () => {
    if (!activeCalibration) return;
    setShowJsonDump(!showJsonDump);
  };

  const getCalJsonString = () => {
    if (!activeCalibration) return '';
    const exportObj = {
      id: activeCalibration.id,
      name: activeCalibration.name,
      created_at: activeCalibration.created_at,
      image_points: activeCalibration.image_points,
      world_points: activeCalibration.world_points
    };
    return JSON.stringify(exportObj, null, 2);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-150 p-5 overflow-y-auto transition-workspace text-sm">
      
      {/* Module Title */}
      <div className="flex items-center space-x-2 pb-4 mb-4 border-b border-gray-200 dark:border-gray-800">
        <Grid3X3 className="w-5 h-5 text-brand-blue" />
        <h3 className="font-extrabold text-base">Calibration Panel</h3>
      </div>

      {/* Info Card */}
      <div className="mb-5 p-3 rounded-lg bg-brand-blue/5 border border-brand-blue/15 text-xs text-gray-500 dark:text-gray-400 flex items-start space-x-2">
        <Info className="w-4 h-4 text-brand-blue flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Calibrate pixel positions to physical sizes. Align the 4 corners of the grid to real road lines or marks of known dimensions.
        </p>
      </div>

      {/* 1. Selector */}
      <div className="mb-5">
        <label className="block text-xs uppercase tracking-wide text-gray-400 font-bold mb-1.5">
          Select Calibration Grid
        </label>
        <select
          value={activeCalibration?.id || ''}
          onChange={(e) => {
            const cal = calibrations.find(c => c.id === e.target.value);
            setActiveCalibration(cal || null);
          }}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue"
        >
          <option value="">-- No Grid Active --</option>
          {calibrations.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
 
      {/* 2. Grid Toggle Tool */}
      <div className="mb-5">
        <button
          onClick={handleToggleGridTool}
          className={`w-full py-2.5 rounded-lg font-bold transition-all border flex items-center justify-center space-x-2 ${
            activeTool === 'grid'
              ? 'bg-brand-blue border-brand-blue text-white shadow-md shadow-brand-blue/20'
              : 'bg-white hover:bg-gray-50 dark:bg-gray-850 dark:hover:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <Grid3X3 className="w-4 h-4" />
          <span>{activeTool === 'grid' ? 'Grid Adjuster Active' : 'Adjust Grid Corners'}</span>
        </button>
      </div>
 
      {/* 3. Physical Parameters */}
      <div className="space-y-4 mb-5 border-t border-gray-150 dark:border-gray-800 pt-4">
        <h4 className="font-bold text-xs uppercase text-gray-400 tracking-wide">Grid Dimensions (Meters)</h4>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Width (X-Axis)</label>
            <input
              type="number"
              step={0.1}
              value={gridW}
              onChange={(e) => setGridW(Math.max(0.1, parseFloat(e.target.value) || 0))}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 font-mono text-gray-800 dark:text-gray-100 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Height (Y-Axis)</label>
            <input
              type="number"
              step={0.1}
              value={gridH}
              onChange={(e) => setGridH(Math.max(0.1, parseFloat(e.target.value) || 0))}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 font-mono text-gray-800 dark:text-gray-100 focus:outline-none"
            />
          </div>
        </div>
 
        <div>
          <label className="block text-[11px] text-gray-400 mb-1">Calibration Name</label>
          <input
            type="text"
            value={calName}
            onChange={(e) => setCalName(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 font-semibold text-gray-800 dark:text-gray-100 focus:outline-none"
          />
        </div>
      </div>

      {/* 4. Actions */}
      <div className="flex gap-2 mb-6 border-b border-gray-150 dark:border-gray-800 pb-4">
        <button
          onClick={handleSave}
          title="Save Grid Calibration"
          className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center space-x-1 shadow-md shadow-emerald-500/10 transition-all text-xs"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save</span>
        </button>

        <button
          onClick={handleExportCal}
          title="Show / Export JSON Calibration Object"
          disabled={!activeCalibration}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
        >
          <Share2 className="w-4 h-4 text-gray-500" />
        </button>

        <button
          onClick={() => activeCalibration && handleDelete(activeCalibration.id)}
          title="Delete Active Grid"
          disabled={!activeCalibration}
          className="p-2 rounded-lg border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-40 transition-colors"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>

      {/* JSON Dump Overlay Area */}
      {showJsonDump && activeCalibration && (
        <div className="mb-5 p-3 rounded-lg bg-gray-950 border border-gray-800 text-[11px] font-mono text-brand-sky relative">
          <div className="flex items-center justify-between text-gray-500 mb-1 pb-1 border-b border-gray-900">
            <span className="flex items-center"><FileCode className="w-3.5 h-3.5 mr-1" /> JSON Calibration Dump</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(getCalJsonString());
                alert('Copied to clipboard!');
              }}
              className="hover:text-white transition-colors"
            >
              Copy
            </button>
          </div>
          <pre className="overflow-x-auto max-h-36">{getCalJsonString()}</pre>
        </div>
      )}

      {/* 5. Validation Section */}
      <div className="space-y-4">
        <h4 className="font-bold text-xs uppercase text-gray-400 tracking-wide flex items-center">
          <Gauge className="w-4 h-4 mr-1 text-brand-sky" />
          <span>Calibration Validation</span>
        </h4>

        {activeCalibration && calibrationDiagnostics ? (
          <div className="space-y-3 bg-gray-50 dark:bg-gray-850 p-3 rounded-xl border border-gray-250/50 dark:border-gray-800 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Reprojection Error:</span>
              <span className={`font-mono font-bold flex items-center ${
                calibrationDiagnostics.homographyError < 0.1 ? 'text-success' : 'text-amber-500'
              }`}>
                <CheckCircle className="w-3 h-3 mr-1" /> {calibrationDiagnostics.homographyError} px
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Orthogonality index:</span>
              <span className="font-mono font-bold text-success flex items-center">
                <CheckCircle className="w-3 h-3 mr-1" /> {calibrationDiagnostics.accuracy}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Scale Consistency:</span>
              <span className="font-mono font-bold text-success flex items-center">
                <CheckCircle className="w-3 h-3 mr-1" /> {calibrationDiagnostics.scaleConsistency}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Measurement Confidence:</span>
              <span className={`font-mono font-bold flex items-center ${
                calibrationDiagnostics.confidence === 'High' ? 'text-success' : 'text-amber-550'
              }`}>
                <CheckCircle className="w-3 h-3 mr-1" /> {calibrationDiagnostics.confidence}
              </span>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-750 pt-2.5 mt-2 flex flex-col space-y-1">
              <span className="font-semibold text-gray-400">Grid Validation Quality:</span>
              <div className="flex items-center justify-between mt-1 text-[11px]">
                <span className="px-1.5 py-0.5 rounded bg-success/15 text-success font-bold">Accuracy: {calibrationDiagnostics.accuracy}%</span>
                <span className="px-1.5 py-0.5 rounded bg-success/15 text-success font-bold">Grid: {calibrationDiagnostics.gridQuality}</span>
                <span className="px-1.5 py-0.5 rounded bg-brand-blue/15 text-brand-blue dark:text-brand-sky font-bold">Score: {calibrationDiagnostics.score}%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-500 text-center py-4 bg-gray-50 dark:bg-gray-855 rounded-xl border border-dashed border-gray-700">
            Activate a perspective grid calibration to compute validation diagnostics.
          </div>
        )}
      </div>

    </div>
  );
};
export default Calibration;
