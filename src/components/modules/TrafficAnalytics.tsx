import React from 'react';
import { useRoadLab } from '../../context/RoadLabContext';
import { 
  TrendingUp, 
  Download, 
  BarChart2, 
  Activity, 
  Gauge, 
  Users, 
  Map, 
  Layers 
} from 'lucide-react';

// Custom SVG Line Chart Component
interface SVGLineChartProps {
  data: number[];
  label: string;
  color: string;
  unit: string;
}

const SVGLineChart: React.FC<SVGLineChartProps> = ({ data, label, color, unit }) => {
  const width = 360;
  const height = 150;
  const padding = 20;

  if (data.length === 0) {
    return (
      <div className="h-[150px] flex items-center justify-center text-xs text-gray-500 italic bg-gray-950/20 rounded-xl border border-dashed border-gray-800">
        No Results Available
      </div>
    );
  }

  const maxVal = Math.max(...data, 10);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal || 1;

  const points = data.map((val, idx) => {
    const x = padding + (idx / Math.max(1, data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${padding + (data.length - 1) / Math.max(1, data.length - 1) * (width - 2 * padding)},${height - padding} L ${padding},${height - padding} Z`;

  return (
    <div className="flex flex-col bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-3.5 shadow-md">
      <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono mb-2 px-1">
        <span>{label}</span>
        <span className="font-bold" style={{ color }}>
          Latest: {data[data.length - 1].toFixed(1)} {unit}
        </span>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible select-none">
        <defs>
          <linearGradient id={`grad-${label.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grids */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" />

        {/* Area */}
        {data.length > 1 && <path d={areaD} fill={`url(#grad-${label.replace(/\s+/g, '-')})`} />}

        {/* Path */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round" />

        {/* Labels */}
        <text x={padding - 5} y={padding + 3} fill="rgba(255,255,255,0.3)" fontSize="7" textAnchor="end" fontFamily="monospace">
          {maxVal.toFixed(0)}
        </text>
        <text x={padding - 5} y={height - padding + 3} fill="rgba(255,255,255,0.3)" fontSize="7" textAnchor="end" fontFamily="monospace">
          {minVal.toFixed(0)}
        </text>
      </svg>
    </div>
  );
};

// Custom Donut Component
interface DonutProps {
  distribution: Record<string, number>;
}

const SVGDonutChart: React.FC<DonutProps> = ({ distribution }) => {
  const categories = Object.keys(distribution);
  const values = Object.values(distribution);
  const total = values.reduce((a, b) => a + b, 0);
  const colors = ['#00BCF2', '#8B5CF6', '#FFB900', '#D13438', '#107C10'];

  if (total === 0) {
    return (
      <div className="h-[140px] flex items-center justify-center text-xs text-gray-500 italic bg-gray-950/20 rounded-xl border border-dashed border-gray-800">
        No Results Available
      </div>
    );
  }

  let accumulatedPercent = 0;
  const segments = categories.map((cat, idx) => {
    const val = distribution[cat];
    const pct = total > 0 ? (val / total) * 100 : 0;
    const strokeDash = pct;
    const strokeOffset = 100 - accumulatedPercent;
    accumulatedPercent += pct;
    return {
      cat,
      val,
      pct,
      color: colors[idx % colors.length],
      strokeDash,
      strokeOffset
    };
  });

  return (
    <div className="flex items-center justify-between p-3 select-none bg-gray-900/60 border border-gray-800 rounded-xl">
      <svg width="110" height="110" viewBox="0 0 42 42" className="overflow-visible">
        {segments.map((seg, idx) => (
          <circle
            key={idx}
            cx="21"
            cy="21"
            r="15.915"
            fill="transparent"
            stroke={seg.color}
            strokeWidth="3.2"
            strokeDasharray={`${seg.strokeDash} ${100 - seg.strokeDash}`}
            strokeDashoffset={seg.strokeOffset}
          />
        ))}
        <circle cx="21" cy="21" r="12" fill="#0d111c" />
        <text x="21" y="23" textAnchor="middle" fill="#ffffff" fontSize="5" fontWeight="bold" fontFamily="sans-serif">
          {total}
        </text>
      </svg>

      <div className="flex-1 ml-5 space-y-1.5 text-[9px] font-mono">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: seg.color }} />
              <span className="capitalize text-gray-400">{seg.cat}:</span>
            </div>
            <span className="font-bold text-gray-200">
              {seg.val} ({seg.pct.toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TrafficAnalytics: React.FC = () => {
  const { 
    currentAnalytics, 
    analyticsHistory, 
    trafficLines, 
    inferenceRunning, 
    speedUnit,
    distanceUnit
  } = useRoadLab();

  // Aggregate values over run history
  const densities = analyticsHistory.map(h => h.density.area_density_km);
  const flows = analyticsHistory.map(h => h.flow.vehicles_per_hour);
  const occupancies = analyticsHistory.map(h => h.occupancy.overall_occupancy);
  const speeds = analyticsHistory.map(h => {
    const l1 = h.lane_level.find(l => l.lane_id === 1)?.speed || 80;
    return l1;
  });

  // Safe formatting
  const formatSpeed = (val: number) => {
    return speedUnit === 'm/s' ? `${(val / 3.6).toFixed(0)} m/s` : `${val.toFixed(0)} km/h`;
  };

  const formatDist = (val: number) => {
    return distanceUnit === 'cm' ? `${(val * 100).toFixed(0)} cm` : `${val.toFixed(1)} m`;
  };

  // Client-side report builders
  const handleExport = (format: 'csv' | 'json' | 'xlsx') => {
    if (analyticsHistory.length === 0) {
      alert("No active inference run logs found. Run inference to gather traffic metrics first!");
      return;
    }

    const job_id = `job-${Date.now()}`;

    if (format === 'csv' || format === 'xlsx') {
      let content = "frame,total_vehicles,car_count,truck_count,motorcycle_count,density_km,flow_rate_hour,occupancy_pct,queue_len_meters\n";
      analyticsHistory.forEach((h, idx) => {
        content += `${idx},${h.counts.total},${h.counts.class_wise.car || 0},${h.counts.class_wise.truck || 0},${h.counts.class_wise.motorcycle || 0},${h.density.area_density_km},${h.flow.vehicles_per_hour},${h.occupancy.overall_occupancy},${h.queue.current_queue_len_meters}\n`;
      });
      
      const blobType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const blob = new Blob([content], { type: blobType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roadlab-traffic-report-${job_id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const jsonContent = JSON.stringify(analyticsHistory, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roadlab-traffic-report-${job_id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-950 text-gray-150 p-6 overflow-y-auto">
      
      {/* Header bar */}
      <div className="flex-shrink-0 flex justify-between items-center pb-4 border-b border-gray-800 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-brand-sky" />
            Traffic Analytics Dashboard
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Real-time transportation engineering metrics derived from homography & vehicle tracking.
          </p>
        </div>

        {/* Live Indicator */}
        <div className="flex items-center space-x-2">
          {inferenceRunning ? (
            <span className="flex items-center space-x-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-[10px] font-bold tracking-wider uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-ping mr-1" />
              Live Telemetry Stream
            </span>
          ) : (
            <span className="flex items-center space-x-1.5 px-2.5 py-1 bg-gray-900 border border-gray-800 text-gray-500 rounded-full text-[10px] font-bold tracking-wider uppercase">
              Pipeline Standby
            </span>
          )}
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { 
            label: 'Total Flow Rate', 
            val: currentAnalytics ? `${currentAnalytics.flow.vehicles_per_hour} veh/h` : 'No Results Available', 
            desc: currentAnalytics ? `Peak: ${currentAnalytics.flow.peak_flow} veh/h` : 'No Results Available', 
            icon: Activity, 
            color: 'text-brand-sky' 
          },
          { 
            label: 'Calibrated Density', 
            val: currentAnalytics ? `${currentAnalytics.density.area_density_km} veh/km` : 'No Results Available', 
            desc: currentAnalytics ? `${currentAnalytics.density.area_density_lane_km} veh/km/lane` : 'No Results Available', 
            icon: Users, 
            color: 'text-violet-400' 
          },
          { 
            label: 'Road Occupancy', 
            val: currentAnalytics ? `${currentAnalytics.occupancy.overall_occupancy}%` : 'No Results Available', 
            desc: currentAnalytics ? `Utilization: ${currentAnalytics.occupancy.utilization}` : 'No Results Available', 
            icon: Gauge, 
            color: 'text-amber-400' 
          },
          { 
            label: 'Queue Estimate', 
            val: currentAnalytics ? `${currentAnalytics.queue.current_queue_len_vehicles} veh` : 'No Results Available', 
            desc: currentAnalytics ? `Queue Length: ${formatDist(currentAnalytics.queue.current_queue_len_meters)}` : 'No Results Available', 
            icon: Layers, 
            color: currentAnalytics?.queue.is_congested ? 'text-red-500 animate-pulse' : 'text-emerald-400' 
          }
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-gray-900/40 border border-gray-800/80 rounded-xl p-4 flex justify-between items-center shadow-sm relative overflow-hidden backdrop-blur-sm">
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{card.label}</span>
                <h3 className="text-xl font-extrabold text-white mt-1 font-mono">{card.val}</h3>
                <span className="text-[9px] text-gray-400 mt-1 block font-mono">{card.desc}</span>
              </div>
              <div className={`p-2.5 rounded-lg bg-gray-950/40 border border-gray-850 ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Charts & Statistics */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        
        {/* Trend graphs left */}
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <SVGLineChart data={densities} label="Road Density Timeline" color="#8B5CF6" unit="veh/km" />
          <SVGLineChart data={flows} label="Traffic Flow Velocity" color="#00BCF2" unit="veh/h" />
          <SVGLineChart data={speeds} label="Lane 1 Speed Trends" color="#107C10" unit="km/h" />
          <SVGLineChart data={occupancies} label="Longitudinal Occupancy Grid" color="#FFB900" unit="%" />
        </div>

        {/* Donut and parameters right */}
        <div className="flex flex-col space-y-4">
          <h4 className="font-bold text-xs uppercase text-gray-400 tracking-wider mb-1">Vehicle Classification</h4>
          <SVGDonutChart distribution={currentAnalytics?.counts.class_wise || { car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0 }} />

          {/* Virtual Crossing counts details */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex-1">
            <h4 className="font-bold text-[10px] uppercase text-gray-400 tracking-wider mb-3 flex items-center">
              <Map className="w-3.5 h-3.5 mr-1.5 text-brand-sky" />
              Virtual Counting Line Crossings ({trafficLines.length})
            </h4>

            {trafficLines.length === 0 ? (
              <div className="text-center py-6 text-[10px] text-gray-500 italic">
                No virtual counting lines drawn. Create counting lines in the Counting Setup workspace tab.
              </div>
            ) : (
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {trafficLines.map(line => (
                  <div key={line.id} className="flex justify-between items-center p-2 rounded bg-gray-950/40 border border-gray-850 text-[10px] font-mono">
                    <span className="font-bold text-gray-300">{line.name}</span>
                    <div className="flex space-x-3 text-gray-400">
                      <span>Upstream: <span className="text-brand-sky font-bold">{line.upstreamCount}</span></span>
                      <span>Downstream: <span className="text-amber-400 font-bold">{line.downstreamCount}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lane level diagnostics & Congestion Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lane diagnostics Table */}
        <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <h4 className="font-bold text-xs uppercase text-gray-400 tracking-wider mb-3.5">Lane-Level Transport Diagnostics</h4>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] font-mono text-gray-400">
              <thead>
                <tr className="border-b border-gray-800 pb-2 text-gray-500 text-[10px] uppercase font-bold">
                  <th className="py-2">Lane ID</th>
                  <th>Occupancy</th>
                  <th>Density (veh/km)</th>
                  <th>Speed (km/h)</th>
                  <th>Flow Output</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850">
                {currentAnalytics?.lane_level ? (
                  currentAnalytics.lane_level.map(lane => (
                    <tr key={lane.lane_id}>
                      <td className="py-2.5 font-bold text-gray-200">Lane {lane.lane_id} {lane.lane_id === 1 ? '(Ego)' : ''}</td>
                      <td className="text-gray-100">{lane.occupancy}%</td>
                      <td>{lane.density}</td>
                      <td>{formatSpeed(lane.speed)}</td>
                      <td className="text-brand-sky font-bold">{lane.flow} veh/h</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-550 italic">
                      No Results Available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Exports & Reports Control */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-xs uppercase text-gray-400 tracking-wider mb-2.5">Traffic Intelligence Exports</h4>
            <p className="text-[10px] text-gray-500 leading-normal">
              Extract and download comprehensive analytics reports containing vehicle counts, speed logs, queue estimates, and headway safeties.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <button 
              onClick={() => handleExport('csv')}
              className="py-2 bg-gray-800 hover:bg-gray-750 text-[10px] font-bold text-gray-300 rounded border border-gray-700 flex flex-col items-center justify-center space-y-1 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV Log</span>
            </button>
            
            <button 
              onClick={() => handleExport('json')}
              className="py-2 bg-gray-800 hover:bg-gray-750 text-[10px] font-bold text-gray-300 rounded border border-gray-700 flex flex-col items-center justify-center space-y-1 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON Payload</span>
            </button>
            
            <button 
              onClick={() => handleExport('xlsx')}
              className="py-2 bg-brand-blue hover:bg-brand-blue/90 text-[10px] font-bold text-white rounded shadow flex flex-col items-center justify-center space-y-1 transition-all"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>XLSX Sheet</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default TrafficAnalytics;
