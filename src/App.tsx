import React, { useState } from 'react';
import { RoadLabProvider, useRoadLab } from './context/RoadLabContext';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import VideoCanvas from './components/workspace/VideoCanvas';
import Timeline from './components/workspace/Timeline';
import ResizablePanel from './components/workspace/ResizablePanel';
import Dashboard from './components/modules/Dashboard';
import Calibration from './components/modules/Calibration';
import Measurements from './components/modules/Measurements';
import ModelLibrary from './components/modules/ModelLibrary';
import Settings from './components/modules/Settings';
import AIDetectionPanel from './components/workspace/AIDetectionPanel';
import AIConfigPanel from './components/workspace/AIConfigPanel';
import BEVCanvas from './components/workspace/BEVCanvas';
import TelemetryDashboard from './components/workspace/TelemetryDashboard';
import TrafficAnalytics from './components/modules/TrafficAnalytics';
import RoadDistress from './components/modules/RoadDistress';
import ObjectManagerPanel from './components/workspace/ObjectManagerPanel';
import LaneDiagnosticsPanel from './components/workspace/LaneDiagnosticsPanel';
import Profile from './components/modules/Profile';
import AuthScreen from './components/auth/AuthScreen';

import {
  FileVideo,
  Layers,
  Zap,
  Sliders,
  Trash2,
  Plus
} from 'lucide-react';

const WorkspaceRightPanel: React.FC = () => {
  const {
    currentVideo,
    measurements,
    deleteMeasurement,
    videos,
    activeVideo,
    setActiveVideo,
    addVideoToProject,
    removeVideoFromProject
  } = useRoadLab();

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 text-gray-805 dark:text-gray-150 p-4 overflow-y-auto text-xs">
      
      {/* Video Manager Card */}
      <div className="bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 mb-5 shadow-sm">
        <div className="flex items-center justify-between mb-3 border-b border-gray-200 dark:border-gray-800 pb-2">
          <h4 className="font-bold text-xs uppercase text-gray-400 tracking-wider flex items-center">
            <FileVideo className="w-4 h-4 mr-1.5 text-brand-sky" />
            <span>Project Videos</span>
          </h4>
          <button
            onClick={() => {
              const fileInput = document.createElement('input');
              fileInput.type = 'file';
              fileInput.accept = 'video/mp4,video/quicktime,video/avi';
              fileInput.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const name = file.name;
                  addVideoToProject(name, file);
                }
              };
              fileInput.click();
            }}
            title="Add Video to Project"
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-brand-blue hover:bg-brand-blue/90 text-white font-bold text-[10px] transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Video</span>
          </button>
        </div>

        {videos.length === 0 ? (
          <div className="text-gray-400 dark:text-gray-500 py-4 italic text-center text-[11px]">
            No videos in this project. Click 'Add Video' or drag a file to the viewport to upload.
          </div>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {videos.map((vid) => {
              const isActive = activeVideo?.id === vid.id;
              return (
                <div
                  key={vid.id}
                  onClick={() => setActiveVideo(vid)}
                  className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                    isActive
                      ? 'border-brand-blue bg-brand-blue/5 text-brand-blue dark:text-brand-sky dark:border-brand-sky/60 dark:bg-brand-sky/5 font-semibold'
                      : 'border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-850 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs truncate font-bold" title={vid.name}>
                      {vid.name}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                      {vid.resolution || '1280x720'} • {vid.duration}s
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Remove ${vid.name} from project?`)) {
                        removeVideoFromProject(vid.id);
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors ml-2"
                    title="Remove Video"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Video Details Card */}
      <div className="bg-gray-50 dark:bg-gray-850 border border-gray-250/60 dark:border-gray-800 rounded-xl p-3.5 mb-5">
        <h4 className="font-bold text-xs uppercase text-gray-400 tracking-wider mb-2.5 flex items-center">
          <FileVideo className="w-4 h-4 mr-1.5 text-brand-sky" />
          <span>Active Video Info</span>
        </h4>
        
        {currentVideo.url ? (
          <div className="space-y-2 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-gray-500">File:</span>
              <span className="text-gray-300 font-bold truncate max-w-[130px]" title={currentVideo.name || ''}>{currentVideo.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Resolution:</span>
              <span className="text-gray-300">{currentVideo.resolution}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Length:</span>
              <span className="text-gray-300">{currentVideo.duration.toFixed(1)}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Frame Rate:</span>
              <span className="text-gray-300">{currentVideo.fps} FPS</span>
            </div>
          </div>
        ) : (
          <div className="text-gray-400 dark:text-gray-500 py-2 italic text-center">
            No video active. Select or add a video above.
          </div>
        )}
      </div>

      {/* Active Annotations list */}
      <div className="mb-5 flex-1 flex flex-col min-h-[140px]">
        <h4 className="font-bold text-xs uppercase text-gray-400 tracking-wider mb-2">
          Active Annotation Overlays ({measurements.length})
        </h4>
        
        <div className="flex-1 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-800 rounded-lg p-2 max-h-[160px]">
          {measurements.length === 0 ? (
            <div className="text-gray-500 italic py-6 text-center">
              No canvas drawings created.
            </div>
          ) : (
            measurements.map(m => (
              <div key={m.id} className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-850">
                <span className="font-bold text-gray-700 dark:text-gray-350 truncate max-w-[110px]">{m.name}</span>
                <button
                  onClick={() => deleteMeasurement(m.id)}
                  className="text-red-500 hover:text-red-650 transition-colors font-semibold"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Phase 2 Future Integrations HUD */}
      <div className="border-t border-gray-150 dark:border-gray-800 pt-4 space-y-3">
        <h4 className="font-bold text-xs uppercase text-gray-400 tracking-wider flex items-center">
          <Layers className="w-4 h-4 mr-1.5 text-brand-sky" />
          <span>Phase 2 Model Plugs</span>
        </h4>
        <p className="text-gray-400 leading-normal text-[11px]">
          These slots will connect computer vision and segmentation pipelines during Phase 2.
        </p>

        <div className="space-y-1.5">
          {[
            { name: 'EgoLanes Line Tracker', tag: 'Lane Detection' },
            { name: 'AutoSpeed Velocity Solver', tag: 'Vehicle Tracking' },
            { name: 'Distress Segmenter', tag: 'Crack/Pothole Scan' }
          ].map((plug, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-lg border border-dashed border-gray-750 bg-gray-950/20 text-[10px]"
            >
              <div className="flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-brand-sky flex-shrink-0" />
                <span className="font-bold text-gray-400">{plug.name}</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-brand-sky/10 text-brand-sky font-bold uppercase text-[8px] tracking-wider">
                {plug.tag}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

const CountingSetupDashboard: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    trafficLines,
    deleteTrafficLine,
    trafficROIs,
    deleteTrafficROI
  } = useRoadLab();

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 text-gray-805 dark:text-gray-150 p-4 overflow-y-auto text-xs">
      
      {/* Configuration Header */}
      <div className="mb-4">
        <h4 className="font-bold text-xs uppercase text-gray-400 tracking-wider mb-2">
          Setup Traffic Analytics Overlays
        </h4>
        <p className="text-gray-500 text-[11px] leading-relaxed">
          Draw virtual counting lines or regions of interest directly on the video canvas to log traffic metrics.
        </p>
      </div>

      {/* Drawing Actions Grid */}
      <div className="grid grid-cols-1 gap-2 mb-5">
        <button
          onClick={() => setActiveTool(activeTool === 'counting_line' ? 'select' : 'counting_line')}
          className={`flex items-center justify-between p-3 rounded-lg border transition-all font-semibold ${
            activeTool === 'counting_line'
              ? 'border-brand-blue bg-brand-blue/10 text-brand-blue dark:text-brand-sky dark:border-brand-sky'
              : 'border-gray-250 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-850'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
            <span>Counting Line</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400">
            {activeTool === 'counting_line' ? 'Active' : 'Draw'}
          </span>
        </button>

        <button
          onClick={() => setActiveTool(activeTool === 'direction_line' ? 'select' : 'direction_line')}
          className={`flex items-center justify-between p-3 rounded-lg border transition-all font-semibold ${
            activeTool === 'direction_line'
              ? 'border-brand-blue bg-brand-blue/10 text-brand-blue dark:text-brand-sky dark:border-brand-sky'
              : 'border-gray-250 dark:border-gray-800 hover:bg-gray-55 dark:hover:bg-gray-850'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
            <span>Direction Line</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400">
            {activeTool === 'direction_line' ? 'Active' : 'Draw'}
          </span>
        </button>

        <button
          onClick={() => setActiveTool(activeTool === 'roi' ? 'select' : 'roi')}
          className={`flex items-center justify-between p-3 rounded-lg border transition-all font-semibold ${
            activeTool === 'roi'
              ? 'border-brand-blue bg-brand-blue/10 text-brand-blue dark:text-brand-sky dark:border-brand-sky'
              : 'border-gray-250 dark:border-gray-800 hover:bg-gray-55 dark:hover:bg-gray-850'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
            <span>Region of Interest (ROI)</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400">
            {activeTool === 'roi' ? 'Active' : 'Draw'}
          </span>
        </button>
      </div>

      {/* Active Counting Lines */}
      <div className="mb-5 flex flex-col flex-1 min-h-[140px]">
        <h4 className="font-bold text-xs uppercase text-gray-400 tracking-wider mb-2">
          Counting Lines ({trafficLines.length})
        </h4>
        
        <div className="flex-1 overflow-y-auto space-y-2 border border-gray-205 dark:border-gray-800 rounded-lg p-2 max-h-[160px]">
          {trafficLines.length === 0 ? (
            <div className="text-gray-500 italic py-6 text-center">
              No counting lines drawn.
            </div>
          ) : (
            trafficLines.map(line => (
              <div key={line.id} className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-850">
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                    {line.name}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {line.type === 'counting' ? 'Bidirectional' : 'Directional'}
                    {' | '}
                    Up: {line.upstreamCount} / Dn: {line.downstreamCount}
                  </span>
                </div>
                <button
                  onClick={() => deleteTrafficLine(line.id)}
                  className="text-red-500 hover:text-red-655 transition-colors font-semibold p-1"
                  title="Delete Line"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Active ROIs */}
      <div className="mb-4 flex flex-col flex-1 min-h-[120px]">
        <h4 className="font-bold text-xs uppercase text-gray-400 tracking-wider mb-2">
          Regions of Interest ({trafficROIs.length})
        </h4>
        
        <div className="flex-1 overflow-y-auto space-y-2 border border-gray-205 dark:border-gray-800 rounded-lg p-2 max-h-[140px]">
          {trafficROIs.length === 0 ? (
            <div className="text-gray-500 italic py-6 text-center">
              No ROI regions defined.
            </div>
          ) : (
            trafficROIs.map(roi => (
              <div key={roi.id} className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-850">
                <span className="font-bold text-gray-700 dark:text-gray-350 truncate max-w-[150px]">
                  {roi.name}
                </span>
                <button
                  onClick={() => deleteTrafficROI(roi.id)}
                  className="text-red-500 hover:text-red-655 transition-colors font-semibold p-1"
                  title="Delete ROI"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};

const DistressSetupDashboard: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    distressItems,
    deleteDistressItem
  } = useRoadLab();

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 text-gray-850 dark:text-gray-150 p-4 overflow-y-auto text-xs">
      <div className="mb-4">
        <h4 className="font-bold text-xs uppercase text-gray-400 tracking-wider mb-2">
          Pavement Distress Editor
        </h4>
        <p className="text-gray-500 text-[11px] leading-relaxed">
          Draw manual defects on the canvas. Real-world dimensions, distance, and severity are automatically computed based on calibration.
        </p>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 gap-2 mb-5">
        <button
          onClick={() => setActiveTool(activeTool === 'pothole_poly' ? 'select' : 'pothole_poly')}
          className={`flex items-center justify-between p-3 rounded-lg border transition-all font-semibold ${
            activeTool === 'pothole_poly'
              ? 'border-red-500 bg-red-500/10 text-red-500 dark:text-red-400 dark:border-red-500'
              : 'border-gray-250 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-850'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span>Annotate Pothole (Polygon)</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400">
            {activeTool === 'pothole_poly' ? 'Active' : 'Draw'}
          </span>
        </button>

        <button
          onClick={() => setActiveTool(activeTool === 'crack_line' ? 'select' : 'crack_line')}
          className={`flex items-center justify-between p-3 rounded-lg border transition-all font-semibold ${
            activeTool === 'crack_line'
              ? 'border-amber-500 bg-amber-500/10 text-amber-500 dark:text-amber-400 dark:border-amber-500'
              : 'border-gray-250 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-850'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Annotate Crack (Polyline)</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400">
            {activeTool === 'crack_line' ? 'Active' : 'Draw'}
          </span>
        </button>
      </div>

      {/* Manual Defects Database list */}
      <div className="mb-4 flex flex-col flex-1 min-h-[180px]">
        <h4 className="font-bold text-xs uppercase text-gray-400 tracking-wider mb-2">
          Manual Defects Database ({distressItems.length})
        </h4>
        
        <div className="flex-1 overflow-y-auto space-y-2 border border-gray-205 dark:border-gray-800 rounded-lg p-2 max-h-[220px]">
          {distressItems.length === 0 ? (
            <div className="text-gray-500 italic py-10 text-center">
              No manually annotated defects. Use drawing tools above.
            </div>
          ) : (
            distressItems.map(d => (
              <div key={d.id} className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-850">
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-gray-700 dark:text-gray-300 truncate max-w-[155px]">
                    {d.class.toUpperCase()} #{String(d.id).replace('manual-defect-', '').slice(-4)}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {d.severity.toUpperCase()} | {d.class === 'pothole' ? `${d.area_sq_m}m²` : `${d.length_m}m`}
                  </span>
                </div>
                <button
                  onClick={() => deleteDistressItem(d.id)}
                  className="text-red-500 hover:text-red-655 transition-colors font-semibold p-1"
                  title="Delete Defect"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const WorkspaceRightTabWrapper: React.FC<{ onConfigure: () => void }> = ({ onConfigure }) => {
  const { inferenceRunning, selectedTrackId } = useRoadLab();
  const [activeTab, setActiveTab] = useState<'summary' | 'detections' | 'telemetry' | 'setup' | 'distress_setup' | 'objects' | 'lane_debug'>('summary');

  // Auto-switch to detections tab when inference runs
  React.useEffect(() => {
    if (inferenceRunning) {
      setActiveTab('detections');
    }
  }, [inferenceRunning]);

  // Auto-switch to telemetry tab when a vehicle is selected
  React.useEffect(() => {
    if (selectedTrackId !== null) {
      setActiveTab('telemetry');
    }
  }, [selectedTrackId]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900 text-gray-805 dark:text-gray-150">
      
      {/* Tabs Header Row */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 pt-3 border-b border-gray-250 dark:border-gray-800">
        <div className="flex space-x-1.5 text-xs font-bold overflow-x-auto whitespace-nowrap scrollbar-none pr-1">
          <button
            onClick={() => setActiveTab('summary')}
            className={`pb-2.5 px-2 border-b-2 transition-all ${
              activeTab === 'summary'
                ? 'border-brand-blue text-brand-blue dark:text-brand-sky'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('detections')}
            className={`pb-2.5 px-2 border-b-2 transition-all ${
              activeTab === 'detections'
                ? 'border-brand-blue text-brand-blue dark:text-brand-sky'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            AI Detections
          </button>
          <button
            onClick={() => setActiveTab('lane_debug')}
            className={`pb-2.5 px-2 border-b-2 transition-all ${
              activeTab === 'lane_debug'
                ? 'border-brand-blue text-brand-blue dark:text-brand-sky'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Lane Debug
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`pb-2.5 px-2 border-b-2 transition-all ${
              activeTab === 'telemetry'
                ? 'border-brand-blue text-brand-blue dark:text-brand-sky'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Telemetry
          </button>
          <button
            onClick={() => setActiveTab('objects')}
            className={`pb-2.5 px-2 border-b-2 transition-all ${
              activeTab === 'objects'
                ? 'border-brand-blue text-brand-blue dark:text-brand-sky'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Objects
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`pb-2.5 px-2 border-b-2 transition-all ${
              activeTab === 'setup'
                ? 'border-brand-blue text-brand-blue dark:text-brand-sky'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Counting Setup
          </button>
          <button
            onClick={() => setActiveTab('distress_setup')}
            className={`pb-2.5 px-2 border-b-2 transition-all ${
              activeTab === 'distress_setup'
                ? 'border-brand-blue text-brand-blue dark:text-brand-sky'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Distress Setup
          </button>
        </div>

        {/* Configure Sliders cog icon */}
        <button
          onClick={onConfigure}
          title="Configure AI Parameters"
          className="pb-2.5 flex items-center space-x-1 text-xs font-bold text-gray-400 hover:text-brand-blue transition-colors flex-shrink-0 ml-2"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Config</span>
        </button>
      </div>

      {/* Renders Active Tab */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'summary' && <WorkspaceRightPanel />}
        {activeTab === 'detections' && <AIDetectionPanel />}
        {activeTab === 'lane_debug' && <LaneDiagnosticsPanel />}
        {activeTab === 'telemetry' && <TelemetryDashboard />}
        {activeTab === 'setup' && <CountingSetupDashboard />}
        {activeTab === 'distress_setup' && <DistressSetupDashboard />}
        {activeTab === 'objects' && <ObjectManagerPanel />}
      </div>
    </div>
  );
};

const EventTicker: React.FC = () => {
  const { eventLog } = useRoadLab();
  
  if (!eventLog || eventLog.length === 0) {
    return (
      <div className="h-8 bg-gray-900 border-t border-gray-850 px-4 flex items-center text-[10px] text-gray-500 font-medium select-none">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-650 mr-2" />
        No traffic telemetry events logged.
      </div>
    );
  }

  // Get the last 3 events
  const latestEvents = [...eventLog].reverse().slice(0, 3);

  return (
    <div className="h-8 bg-gray-950 border-t border-gray-850 px-4 flex items-center justify-between text-[10px] font-mono text-gray-305 overflow-hidden select-none">
      <div className="flex items-center space-x-4 overflow-hidden">
        <div className="flex items-center text-brand-sky font-bold flex-shrink-0">
          <span className="h-2 w-2 rounded-full bg-brand-sky animate-ping mr-1.5" />
          TRAFFIC ALERTS:
        </div>
        <div className="flex items-center space-x-6 overflow-hidden truncate">
          {latestEvents.map((evt, idx) => (
            <div key={idx} className="flex items-center space-x-1.5 flex-shrink-0">
              <span className="text-gray-500">[{evt.frame}f]</span>
              <span className={`font-bold ${
                evt.type === 'lane_change' ? 'text-amber-400' : evt.type === 'speed_alert' || evt.type === 'sudden_braking' ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {evt.type.toUpperCase()}:
              </span>
              <span className="text-gray-300">{evt.message}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="text-gray-500 text-[9px] flex-shrink-0">
        Total events: {eventLog.length}
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const {
    currentView,
    activeProject,
    projects,
    setActiveProject,
    bevSplitEnabled,
    activeTool,
    setActiveTool,
    undoLastAction,
    redoLastAction,
    selectedMeasurementId,
    deleteMeasurement,
    isPlaying,
    setIsPlaying,
    isAuthenticated
  } = useRoadLab();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  // Global Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.ctrlKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          undoLastAction();
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          redoLastAction();
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setActiveTool('select');
          break;
        case 'v':
        case 'V':
          e.preventDefault();
          setActiveTool('select');
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          setActiveTool('line');
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          setActiveTool('polygon');
          break;
        case 'a':
        case 'A':
          e.preventDefault();
          setActiveTool('angle');
          break;
        case 'g':
        case 'G':
          e.preventDefault();
          setActiveTool('grid');
          break;
        case 'Delete':
          e.preventDefault();
          if (selectedMeasurementId) {
            deleteMeasurement(selectedMeasurementId);
          }
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, undoLastAction, redoLastAction, selectedMeasurementId, isPlaying, setIsPlaying, setActiveTool, deleteMeasurement]);

  // If no project is selected but we have projects, auto-assign first project
  React.useEffect(() => {
    if (!activeProject && projects.length > 0) {
      setActiveProject(projects[0]);
    }
  }, [activeProject, projects, setActiveProject]);

  const renderMainContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'models':
        return <ModelLibrary />;
      case 'settings':
        return <Settings />;
      case 'analytics':
        return <TrafficAnalytics />;
      case 'distress':
        return <RoadDistress />;
      case 'profile':
        return <Profile />;
      
      // Video Workspace Viewport
      case 'workspace':
      case 'calibration':
      case 'measurements':
        return (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            
            {/* Left: Video Canvas & Timeline Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 flex flex-row overflow-hidden relative">
                <div className="flex-1 flex flex-col overflow-hidden relative">
                  <VideoCanvas />
                </div>
                {bevSplitEnabled && (
                  <ResizablePanel
                    direction="horizontal"
                    initialSize={300}
                    minSize={200}
                    maxSize={500}
                    sidebarPosition="right"
                    className="bg-gray-950 border-l border-gray-250 dark:border-gray-800"
                  >
                    <BEVCanvas />
                  </ResizablePanel>
                )}
              </div>

              {/* Event Log Ticker Bar */}
              <EventTicker />

              {/* Timeline Resizable Height Panel */}
              <ResizablePanel
                direction="vertical"
                initialSize={150}
                minSize={120}
                maxSize={220}
                sidebarPosition="bottom"
                className="bg-gray-900 border-t border-gray-800"
              >
                <Timeline />
              </ResizablePanel>
            </div>

            {/* Right: Resizable Sidebar module controls */}
            <ResizablePanel
              direction="horizontal"
              initialSize={290}
              minSize={250}
              maxSize={400}
              sidebarPosition="right"
              className="bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800"
            >
              {currentView === 'workspace' && (
                <WorkspaceRightTabWrapper onConfigure={() => setConfigOpen(true)} />
              )}
              {currentView === 'calibration' && <Calibration />}
              {currentView === 'measurements' && <Measurements />}
            </ResizablePanel>

            {/* Sliding Drawer Config Panel overlay */}
            <AIConfigPanel isOpen={configOpen} onClose={() => setConfigOpen(false)} />

          </div>
        );
      
      default:
        return <Dashboard />;
    }
  };

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 font-sans text-gray-850 dark:text-gray-100">
      
      {/* Left Sidebar */}
      <Sidebar mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        
        {/* Top Navbar */}
        <Navbar setMobileOpen={setMobileSidebarOpen} />

        {/* View Layout Renderer */}
        {renderMainContent()}

      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <RoadLabProvider>
      <AppContent />
    </RoadLabProvider>
  );
};

export default App;
