import React from 'react';
import { useRoadLab } from '../../context/RoadLabContext';
import {
  AlertTriangle,
  Download,
  Activity,
  Sparkles,
  ShieldAlert,
  Clock,
  Wrench,
  FileText
} from 'lucide-react';

// Custom SVG Radial Semi-Circular Gauge Component
const SVCRadialGauge: React.FC<{ score: number; condition: string }> = ({ score, condition }) => {
  const radius = 80;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // Half circle
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = (rci: number) => {
    if (rci >= 90) return '#107C10'; // Green
    if (rci >= 75) return '#8BE9FD'; // Light Blue/Cyan
    if (rci >= 55) return '#F59E0B'; // Orange
    if (rci >= 30) return '#EF4444'; // Red
    return '#7F1D1D'; // Dark Red
  };

  const color = getColor(score);

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-2xl relative overflow-hidden h-[180px]">
      <svg width="200" height="120" className="mt-2">
        {/* Background Gauge Track */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#1F2937"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Active Score Arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        {/* Center Text */}
        <text x="100" y="85" textAnchor="middle" className="fill-white font-extrabold text-3xl font-mono">
          {score.toFixed(0)}
        </text>
        <text x="100" y="105" textAnchor="middle" className="fill-gray-400 font-bold text-xs uppercase tracking-widest">
          RCI INDEX
        </text>
      </svg>
      <div className={`mt-1 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
        score >= 90 ? 'bg-emerald-500/10 text-emerald-400' :
        score >= 75 ? 'bg-cyan-500/10 text-cyan-400' :
        score >= 55 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
      }`}>
        {condition}
      </div>
    </div>
  );
};

// Bird's Eye View Distress Heatmap/Density Overlay
const BEVDistressOverlay: React.FC<{ potholes: any[]; cracks: any[] }> = ({ potholes, cracks }) => {
  const width = 160;
  const height = 280;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-2xl h-[330px]">
      <h5 className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-3 flex items-center">
        <Activity className="w-3.5 h-3.5 mr-1.5 text-brand-sky" />
        <span>BEV Distress Heatmap</span>
      </h5>

      <div className="relative border border-gray-750 bg-gray-950 rounded-lg overflow-hidden" style={{ width, height }}>
        {/* Road lanes lines representation */}
        <div className="absolute top-0 bottom-0 left-[33%] border-r border-dashed border-gray-800" />
        <div className="absolute top-0 bottom-0 left-[66%] border-r border-dashed border-gray-800" />
        
        {/* Road Range markers */}
        <div className="absolute bottom-4 left-2 text-[8px] font-mono text-gray-600">0m</div>
        <div className="absolute bottom-[25%] left-2 text-[8px] font-mono text-gray-600">15m</div>
        <div className="absolute bottom-[50%] left-2 text-[8px] font-mono text-gray-600">30m</div>
        <div className="absolute bottom-[75%] left-2 text-[8px] font-mono text-gray-600">45m</div>

        {/* Plot defects */}
        {potholes.map((p, idx) => {
          // Map distance_m to height. Say range is 0m (bottom) to 50m (top)
          const pctY = Math.min(95, Math.max(5, (p.distance_m / 50.0) * 100));
          const y = height - (pctY * height) / 100;
          // Random lateral placement depending on ID/index for visual variety
          const x = width * 0.15 + ((p.id % 3) * width * 0.35);

          return (
            <div
              key={`p-${idx}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/35 border-2 border-red-500 animate-pulse flex items-center justify-center text-[7px] text-white font-extrabold font-mono"
              style={{
                left: x,
                top: y,
                width: 18,
                height: 18,
                boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)'
              }}
              title={`Pothole Severity: ${p.severity}`}
            >
              P
            </div>
          );
        })}

        {cracks.map((c, idx) => {
          const pctY = Math.min(95, Math.max(5, (c.distance_m || 20.0) / 50.0 * 100));
          const y = height - (pctY * height) / 100;
          const x = width * 0.2 + ((c.id % 3) * width * 0.3);

          return (
            <svg
              key={`c-${idx}`}
              className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 overflow-visible"
              style={{ left: x, top: y, width: 40, height: 40 }}
            >
              <path
                d="M 5 20 Q 15 10 20 25 T 35 15"
                fill="none"
                stroke="#FFB900"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.8"
              />
            </svg>
          );
        })}
      </div>
      <div className="mt-2 text-[9px] text-gray-500 text-center font-mono">
        Active grid: 50m × 11.1m (3 lanes)
      </div>
    </div>
  );
};

// Custom SVG Line Chart plotting RCI progression
const SVCRCIChart: React.FC<{ data: number[] }> = ({ data }) => {
  const width = 360;
  const height = 130;
  const padding = 15;

  if (data.length === 0) {
    return (
      <div className="h-[130px] flex items-center justify-center text-xs text-gray-500 italic bg-gray-950/20 rounded-xl border border-dashed border-gray-800">
        Awaiting telemetry data...
      </div>
    );
  }

  // Cap points to fit chart size
  const points = data.slice(-15);
  const minVal = 0;
  const maxVal = 100;

  const getX = (index: number) => {
    return padding + (index / Math.max(1, points.length - 1)) * (width - 2 * padding);
  };

  const getY = (value: number) => {
    const scale = (value - minVal) / (maxVal - minVal);
    return height - padding - scale * (height - 2 * padding);
  };

  // Build path coordinates
  const pathD = points.reduce((acc, val, idx) => {
    const x = getX(idx);
    const y = getY(val);
    return acc + `${idx === 0 ? 'M' : 'L'} ${x} ${y} `;
  }, '');

  // Fill gradient coordinates
  const areaD = pathD + `L ${getX(points.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;

  return (
    <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-2xl flex-1 min-w-[280px]">
      <h5 className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-2 flex items-center justify-between">
        <span>Road Condition Index (RCI) Trend</span>
        <span className="text-[10px] text-brand-sky font-mono font-bold">15f window</span>
      </h5>
      
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" className="overflow-visible">
        <defs>
          <linearGradient id="rciGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {[0, 25, 50, 75, 100].map((val) => (
          <g key={val}>
            <line
              x1={padding}
              y1={getY(val)}
              x2={width - padding}
              y2={getY(val)}
              stroke="#1f2937"
              strokeWidth="0.8"
              strokeDasharray="3,3"
            />
            <text x="3" y={getY(val) + 3} className="fill-gray-600 font-mono text-[8px]">{val}</text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaD} fill="url(#rciGrad)" />
        {/* Stroke Line */}
        <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

        {/* Interactive glowing nodes */}
        {points.map((val, idx) => (
          <circle
            key={idx}
            cx={getX(idx)}
            cy={getY(val)}
            r="3.5"
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth="1"
            className="hover:scale-150 transition-transform cursor-pointer"
          />
        ))}
      </svg>
    </div>
  );
};

export const RoadDistress: React.FC = () => {
  const {
    inferenceResults,
    distressItems,
    distressSummary,
    distressHistory
  } = useRoadLab();

  // Combine AI live outputs and manually drawn distress annotations
  const aiPotholes = inferenceResults.distress?.potholes || [];
  const aiCracks = inferenceResults.distress?.cracks || [];
  const allPotholes = [...aiPotholes, ...distressItems.filter(d => d.class === 'pothole')];
  const allCracks = [...aiCracks, ...distressItems.filter(d => d.class === 'crack')];

  // Resolve current active summary
  const summary = distressSummary || {
    total_defects: allPotholes.length + allCracks.length,
    total_potholes: allPotholes.length,
    total_cracks: allCracks.length,
    affected_area_sq_m: allPotholes.reduce((acc, curr) => acc + curr.area_sq_m, 0) + allCracks.reduce((acc, curr) => acc + curr.area_sq_m, 0),
    rci: Math.max(0, 100 - allPotholes.reduce((acc, curr) => acc + (curr.severity === 'critical' ? 42 : curr.severity === 'high' ? 28 : curr.severity === 'medium' ? 15 : 5), 0) - allCracks.reduce((acc, curr) => acc + (curr.severity === 'critical' ? 30 : curr.severity === 'severe' ? 20 : curr.severity === 'moderate' ? 10 : 3), 0)),
    condition: 'excellent',
    priority_breakdown: {
      low: allPotholes.filter(p => p.priority === 'low').length + allCracks.filter(c => c.priority === 'low').length,
      medium: allPotholes.filter(p => p.priority === 'medium').length + allCracks.filter(c => c.priority === 'medium').length,
      high: allPotholes.filter(p => p.priority === 'high').length + allCracks.filter(c => c.priority === 'high').length,
      critical: allPotholes.filter(p => p.priority === 'critical').length + allCracks.filter(c => c.priority === 'critical').length
    }
  };

  // Convert condition name to clean display string
  const getConditionLabel = (rci: number) => {
    if (rci >= 90) return 'Excellent';
    if (rci >= 75) return 'Good';
    if (rci >= 55) return 'Fair';
    if (rci >= 30) return 'Poor';
    return 'Critical';
  };

  const conditionDisplay = getConditionLabel(summary.rci);

  // Extract history of RCI for the trend chart
  const rciHistory = distressHistory.length > 0 
    ? distressHistory.map(h => h.rci) 
    : [summary.rci];

  // Exporters
  const downloadReport = async (format: string) => {
    try {
      const formatClean = format.toLowerCase();
      const backendBase = (import.meta.env.VITE_BACKEND_URL as string) || 'http://localhost:8000';
      const res = await fetch(`${backendBase}/api/export/latest/distress_${formatClean}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `roadlab-distress-db.${formatClean === 'json' ? 'json' : formatClean === 'xlsx' ? 'xlsx' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      alert("Unable to reach backend. Creating client fallback export.");
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ potholes: allPotholes, cracks: allCracks, summary }));
      const a = document.createElement('a');
      a.href = dataStr;
      a.download = `roadlab-client-distress-report.json`;
      a.click();
    }
  };

  const downloadPDFReport = async () => {
    try {
      const backendBase = (import.meta.env.VITE_BACKEND_URL as string) || 'http://localhost:8000';
      const res = await fetch(`${backendBase}/api/export/latest/pdf`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `roadlab-pavement-condition-report.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      alert("Distress Report PDF generator offline. Falling back to plain text inspect report.");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-950 p-6 text-gray-100 font-sans">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-800 pb-5 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Road Distress & Pavement Intelligence
          </h2>
          <p className="text-gray-500 text-xs mt-1">
            Calibrated distress measurements, pavement condition index (PCI/RCI), and automated maintenance priority logs.
          </p>
        </div>

        {/* Generate Report Controls */}
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <button
            onClick={downloadPDFReport}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-bold bg-brand-blue hover:bg-brand-blue/80 text-white rounded-lg transition-all shadow-md shadow-brand-blue/20"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Inspection PDF</span>
          </button>
          <button
            onClick={() => downloadReport('CSV')}
            className="flex items-center space-x-1 px-2.5 py-2 text-xs font-semibold bg-gray-900 border border-gray-800 hover:bg-gray-850 rounded-lg transition-colors text-gray-300"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            <span>CSV DB</span>
          </button>
        </div>
      </div>

      {/* Grid: 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Defects', value: summary.total_defects, icon: ShieldAlert, color: 'text-amber-400 bg-amber-400/5 border-amber-400/10' },
          { label: 'Total Potholes', value: summary.total_potholes, icon: AlertTriangle, color: 'text-red-400 bg-red-400/5 border-red-400/10' },
          { label: 'Total Cracks', value: summary.total_cracks, icon: Activity, color: 'text-orange-400 bg-orange-400/5 border-orange-400/10' },
          { label: 'Affected Area', value: `${summary.affected_area_sq_m.toFixed(3)} m²`, icon: Sparkles, color: 'text-cyan-400 bg-cyan-400/5 border-cyan-400/10' }
        ].map((c, idx) => {
          const Icon = c.icon;
          return (
            <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between bg-gray-900/40 backdrop-blur-sm ${c.color}`}>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block mb-1">
                  {c.label}
                </span>
                <span className="text-xl font-extrabold font-mono">{c.value}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/20">
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Layout Row 1: Gauge + BEV Heatmap + Trend Line Chart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <SVCRadialGauge score={summary.rci} condition={conditionDisplay} />
        <SVCRCIChart data={rciHistory} />
        <BEVDistressOverlay potholes={allPotholes} cracks={allCracks} />
      </div>

      {/* Layout Row 2: Detailed Defect List & Recommendation Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Defect Timeline Database log */}
        <div className="lg:col-span-2 bg-gray-900/40 border border-gray-800 rounded-2xl p-5 flex flex-col h-[340px]">
          <h4 className="font-extrabold text-xs uppercase text-gray-400 tracking-wider mb-3.5 flex items-center justify-between">
            <span className="flex items-center">
              <Clock className="w-4 h-4 mr-1.5 text-brand-sky" />
              Condition Scanned Defect Log ({allPotholes.length + allCracks.length})
            </span>
            <span className="px-2 py-0.5 rounded text-[9px] bg-gray-800 text-gray-400 font-bold uppercase font-mono">
              Auto-Measured
            </span>
          </h4>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
            {allPotholes.length === 0 && allCracks.length === 0 ? (
              <div className="text-gray-500 italic py-16 text-center">
                No pavement distress defects detected. Play video or annotate manually.
              </div>
            ) : (
              [...allPotholes, ...allCracks].map((d, idx) => (
                <div key={idx} className="p-3 bg-gray-950/50 border border-gray-850 rounded-xl flex items-center justify-between font-mono">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                        d.class === 'pothole' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {d.class.toUpperCase()}
                      </span>
                      <span className="font-bold text-gray-300 truncate">
                        Defect #{d.id} {d.type ? `(${d.type})` : ''}
                      </span>
                      <span className={`text-[9px] font-bold ${
                        d.severity === 'critical' || d.severity === 'severe' || d.severity === 'high' ? 'text-red-400' :
                        d.severity === 'medium' || d.severity === 'moderate' ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        [{d.severity.toUpperCase()}]
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-1 gap-x-2 text-[10px] text-gray-500">
                      <div>
                        Size: {d.class === 'pothole' ? `${d.length_cm}x${d.width_cm}cm` : `${d.length_m}m × ${d.width_mm}mm`}
                      </div>
                      <div>Area: {d.area_sq_m.toFixed(3)} m²</div>
                      <div>Dist: {d.distance_m} m</div>
                    </div>
                  </div>

                  <div className="text-right ml-4">
                    <div className="text-[10px] text-gray-400 font-bold mb-0.5">{d.recommendation}</div>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                      d.priority === 'critical' || d.priority === 'high' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {d.priority} priority
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Maintenance Recommendations panel */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5 flex flex-col h-[340px]">
          <h4 className="font-extrabold text-xs uppercase text-gray-400 tracking-wider mb-3 flex items-center">
            <Wrench className="w-4 h-4 mr-1.5 text-brand-sky" />
            <span>Maintenance Solver</span>
          </h4>
          <p className="text-gray-500 text-[11px] leading-relaxed mb-4">
            Prescriptive repair programs computed from severity weight distribution and pavement distress classes.
          </p>

          <div className="flex-1 overflow-y-auto space-y-2 text-xs">
            {[
              { action: 'Emergency Pothole Patching', count: allPotholes.filter(p => p.priority === 'critical' || p.priority === 'high').length, priority: 'Critical', desc: 'Direct asphalt injection for major safety hazards.' },
              { action: 'Crack Filling & Sealing', count: allCracks.filter(c => c.priority === 'medium' || c.priority === 'low').length, priority: 'Medium', desc: 'Rubberized sealant to stop water infiltration.' },
              { action: 'Shallow Skin Patching', count: allPotholes.filter(p => p.priority === 'medium').length, priority: 'Medium', desc: 'Infrared pothole repair for superficial defects.' },
              { action: 'Milling & Resurfacing', count: (allPotholes.filter(p => p.priority === 'high').length + allCracks.filter(c => c.priority === 'high').length), priority: 'High', desc: 'Slab structural milling for severe cracking sections.' }
            ].map((rec, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-gray-950/40 border border-gray-850 flex items-start space-x-2.5">
                <div className={`mt-0.5 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                  rec.priority === 'Critical' || rec.priority === 'High' ? 'bg-red-500/10 text-red-400' : 'bg-gray-850 text-gray-400'
                }`}>
                  {rec.priority}
                </div>
                <div>
                  <div className="font-bold text-gray-300 flex items-center justify-between">
                    <span>{rec.action}</span>
                    <span className="font-mono text-brand-sky font-bold text-[10px]">({rec.count} items)</span>
                  </div>
                  <p className="text-gray-500 text-[10px] mt-0.5">{rec.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

export default RoadDistress;
