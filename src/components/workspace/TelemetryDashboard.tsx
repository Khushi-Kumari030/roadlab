import React from 'react';
import { useRoadLab } from '../../context/RoadLabContext';
import { 
  Gauge, 
  ArrowRightLeft, 
  Compass, 
  AlertTriangle, 
  CheckCircle2,
  XCircle
} from 'lucide-react';

export const TelemetryDashboard: React.FC = () => {
  const {
    inferenceResults,
    selectedTrackId,
    setSelectedTrackId,
    speedUnit,
    distanceUnit
  } = useRoadLab();

  const tracks = inferenceResults.tracks || [];
  const selectedTrack = tracks.find(t => t.id === selectedTrackId);

  // Helper: Format distance
  const formatDist = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'N/A';
    const isCm = distanceUnit === 'cm';
    const num = isCm ? val * 100 : val;
    const unit = isCm ? 'cm' : 'm';
    return `${num.toFixed(1)} ${unit}`;
  };

  // Helper: Format speed
  const formatSpeedVal = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'N/A';
    const isMs = speedUnit === 'm/s';
    const num = isMs ? val / 3.6 : val;
    const unit = isMs ? 'm/s' : 'km/h';
    return `${num.toFixed(1)} ${unit}`;
  };

  // Render empty state
  if (!selectedTrack) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full bg-white dark:bg-gray-900 select-none">
        <div className="h-14 w-14 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-150 dark:border-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-600 mb-4 shadow-sm">
          <Gauge className="w-7 h-7" />
        </div>
        <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">No Vehicle Selected</h4>
        <p className="text-gray-400 dark:text-gray-500 mt-1.5 text-[11px] leading-relaxed max-w-xs">
          Click on any vehicle bounding box in the Camera Viewport or the Bird's Eye View grid to inspect real-time physics telemetry.
        </p>
      </div>
    );
  }

  // Calculate headway safety
  const lead = inferenceResults.lead_vehicle;
  const isLeadVehicle = lead && lead.id === selectedTrack.id;
  const unsafeHeadway = isLeadVehicle && lead.headway < 1.5;

  // Lane Index display name
  const getLaneName = (idx: number) => {
    if (idx === 1) return 'Lane 1 (Ego)';
    if (idx === 2) return 'Lane 2 (Left)';
    if (idx === 3) return 'Lane 3 (Right)';
    return 'Lane Transition';
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 select-none overflow-y-auto p-4 text-xs">
      
      {/* Target Badge Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-gray-150 dark:border-gray-800 mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-md bg-brand-blue/10 dark:bg-brand-sky/10 text-brand-blue dark:text-brand-sky font-extrabold uppercase text-[10px] tracking-wider">
              {selectedTrack.class}
            </span>
            <span className="font-bold text-gray-500 dark:text-gray-400">
              Vehicle #{selectedTrack.id}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Confidence: {Math.round(selectedTrack.confidence * 100)}% • Age: {selectedTrack.track_age} frames
          </p>
        </div>
        <button
          onClick={() => setSelectedTrackId(null)}
          className="px-2 py-1 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-400 hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded transition-colors text-[10px]"
        >
          Deselect
        </button>
      </div>

      {/* Speed Dial Card */}
      <div className="bg-gray-50 dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl p-3.5 mb-4 relative overflow-hidden">
        <h4 className="font-bold text-[10px] uppercase text-gray-400 tracking-wider mb-2.5 flex items-center">
          <Gauge className="w-3.5 h-3.5 mr-1.5 text-brand-sky" />
          <span>Velocity Analysis</span>
        </h4>

        {/* Big Speed Value readout */}
        <div className="flex items-baseline space-x-1.5 my-1">
          <span className="text-3xl font-extrabold font-mono tracking-tight text-gray-900 dark:text-white">
            {speedUnit === 'm/s' ? (selectedTrack.speed / 3.6).toFixed(1) : selectedTrack.speed.toFixed(0)}
          </span>
          <span className="text-xs font-bold text-gray-400 uppercase">
            {speedUnit}
          </span>
        </div>

        {/* Speed Gauge slider bar indicator */}
        <div className="w-full bg-gray-250 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden my-3">
          <div 
            className="bg-gradient-to-r from-brand-sky to-brand-blue h-full transition-all duration-350"
            style={{ width: `${Math.min(100, (selectedTrack.speed / 120.0) * 100)}%` }}
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-gray-200 dark:border-gray-800/60 font-mono text-gray-400">
          <div>Avg Speed: <span className="text-gray-700 dark:text-gray-200 font-bold">{formatSpeedVal(selectedTrack.average_speed)}</span></div>
          <div>Max Speed: <span className="text-gray-700 dark:text-gray-200 font-bold">{formatSpeedVal(selectedTrack.max_speed)}</span></div>
        </div>
      </div>

      {/* Physical State Card */}
      <div className="bg-gray-50 dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl p-3.5 mb-4">
        <h4 className="font-bold text-[10px] uppercase text-gray-400 tracking-wider mb-3 flex items-center">
          <Compass className="w-3.5 h-3.5 mr-1.5 text-brand-sky" />
          <span>Position & Telemetry</span>
        </h4>

        <div className="space-y-2 text-[11px]">
          <div className="flex justify-between">
            <span className="text-gray-400">Road Coordinate (U, V):</span>
            <span className="font-bold font-mono text-gray-700 dark:text-gray-200">
              {selectedTrack.world_pos[0].toFixed(2)}m, {selectedTrack.world_pos[1].toFixed(1)}m
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">Ego Distance:</span>
            <span className="font-bold font-mono text-gray-700 dark:text-gray-200">
              {formatDist(selectedTrack.distance_to_ego)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">Active Lane Location:</span>
            <span className="font-bold text-brand-sky">
              {getLaneName(selectedTrack.lane_index)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">Acceleration:</span>
            <span className={`font-bold font-mono ${
              selectedTrack.acceleration > 0.2 ? 'text-green-500' : selectedTrack.acceleration < -0.5 ? 'text-red-500' : 'text-gray-200'
            }`}>
              {selectedTrack.acceleration > 0 ? '+' : ''}{selectedTrack.acceleration.toFixed(1)} m/s²
            </span>
          </div>
        </div>
      </div>

      {/* Safety & Gap Analysis Card */}
      <div className="bg-gray-50 dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl p-3.5 mb-4">
        <h4 className="font-bold text-[10px] uppercase text-gray-400 tracking-wider mb-3 flex items-center">
          <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5 text-brand-sky" />
          <span>Safety Gap Metrics</span>
        </h4>

        <div className="space-y-2.5">
          {/* Front Gap */}
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-gray-400">Longitudinal Front Gap:</span>
            <div className="text-right">
              <span className="font-bold font-mono text-gray-750 dark:text-gray-200">
                {formatDist(selectedTrack.gap_front)}
              </span>
              {selectedTrack.gap_front && selectedTrack.gap_front < 15 && (
                <span className="block text-[8px] font-bold text-red-500 uppercase mt-0.5 flex items-center justify-end">
                  <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> Short Gap
                </span>
              )}
            </div>
          </div>

          {/* Rear Gap */}
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-gray-400">Longitudinal Rear Gap:</span>
            <span className="font-bold font-mono text-gray-750 dark:text-gray-200">
              {formatDist(selectedTrack.gap_rear)}
            </span>
          </div>

          {/* Lateral Gap */}
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-gray-400">Lateral Side Offset Gap:</span>
            <div className="text-right">
              <span className="font-bold font-mono text-gray-750 dark:text-gray-200">
                {formatDist(selectedTrack.gap_lateral)}
              </span>
              {selectedTrack.gap_lateral && selectedTrack.gap_lateral < 2.5 && (
                <span className="block text-[8px] font-bold text-orange-500 uppercase mt-0.5 flex items-center justify-end">
                  <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> Adjacent Proximity
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lead Vehicle Headway alert */}
      {isLeadVehicle && (
        <div className={`p-3 rounded-lg border flex items-start space-x-2 ${
          unsafeHeadway 
            ? 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400' 
            : 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400'
        }`}>
          {unsafeHeadway ? <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          <div>
            <h5 className="font-bold text-[10px] uppercase">
              {unsafeHeadway ? 'Unsafe Following Headway' : 'Safe Headway Distance'}
            </h5>
            <p className="text-[10px] text-gray-400 leading-normal mt-0.5">
              This vehicle is the **Lead Vehicle** in your lane. Time Headway is **{lead?.headway.toFixed(2)} seconds** (minimum recommended: 1.5s).
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

export default TelemetryDashboard;
