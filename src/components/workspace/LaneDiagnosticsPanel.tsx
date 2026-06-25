import React from 'react';
import { useRoadLab } from '../../context/RoadLabContext';
import {
  Eye,
  Activity,
  AlertTriangle,
  Grid3X3,
  Eraser,
  PenTool,
  HelpCircle
} from 'lucide-react';
import { type Point2D } from '../../utils/calibrationMath';

export const LaneDiagnosticsPanel: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    activeCalibration,
    homographyMatrix,
    activeVisualizationLayers,
    setActiveVisualizationLayers,
    leftRoadBoundary,
    rightRoadBoundary,
    roadPolygon,
    clearManualRoadBoundaries
  } = useRoadLab();

  // 1. Calculate diagnostics metrics dynamically by sampling
  const width = 1280;
  const height = 720;
  const horizonY = Math.round(height * 0.38);

  const getPolygonArea = (pts: Point2D[]) => {
    if (pts.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      area += pts[i].x * pts[j].y;
      area -= pts[j].x * pts[i].y;
    }
    return Math.abs(area) / 2.0;
  };

  const isPointInPolygon = (x: number, y: number, poly: Point2D[]) => {
    if (!poly || poly.length < 3) return false;
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Check if point is inside a line boundary margin
  const isPointOutsideBoundaries = (x: number, y: number) => {
    // If left boundary exists and point is to the left of it
    if (leftRoadBoundary.length >= 2) {
      // Find segment matching y
      let isLeft = false;
      for (let i = 0; i < leftRoadBoundary.length - 1; i++) {
        const p1 = leftRoadBoundary[i];
        const p2 = leftRoadBoundary[i+1];
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        if (y >= minY && y <= maxY) {
          const t = (y - p1.y) / (p2.y - p1.y + 1e-9);
          const borderX = p1.x + t * (p2.x - p1.x);
          if (x < borderX) {
            isLeft = true;
            break;
          }
        }
      }
      if (isLeft) return true;
    }
    // If right boundary exists and point is to the right of it
    if (rightRoadBoundary.length >= 2) {
      let isRight = false;
      for (let i = 0; i < rightRoadBoundary.length - 1; i++) {
        const p1 = rightRoadBoundary[i];
        const p2 = rightRoadBoundary[i+1];
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        if (y >= minY && y <= maxY) {
          const t = (y - p1.y) / (p2.y - p1.y + 1e-9);
          const borderX = p1.x + t * (p2.x - p1.x);
          if (x > borderX) {
            isRight = true;
            break;
          }
        }
      }
      if (isRight) return true;
    }
    return false;
  };

  // Perform grid sampling to determine overlaps
  let totalSamples = 0;
  let skyOverlap = 0;
  let vegOverlap = 0;
  let bldOverlap = 0;
  let boundaryOverlap = 0;
  let maskOverlap = 0;

  if (activeCalibration && activeCalibration.image_points.length === 4) {
    const pts = activeCalibration.image_points;
    // Generate grid points inside the quadrilateral using bilinear interpolation
    const steps = 8;
    for (let u = 0; u <= steps; u++) {
      const ru = u / steps;
      const topX = pts[0].x + ru * (pts[1].x - pts[0].x);
      const topY = pts[0].y + ru * (pts[1].y - pts[0].y);
      const botX = pts[3].x + ru * (pts[2].x - pts[3].x);
      const botY = pts[3].y + ru * (pts[2].y - pts[3].y);

      for (let v = 0; v <= steps; v++) {
        const rv = v / steps;
        const x = topX + rv * (botX - topX);
        const y = topY + rv * (botY - topY);
        totalSamples++;

        // 1. Sky check (above horizon)
        if (y < horizonY) {
          skyOverlap++;
          continue;
        }

        // 2. Trees / Vegetation check
        if (y < height * 0.65 && (x < width * 0.22 || x > width * 0.78)) {
          vegOverlap++;
          continue;
        }

        // 3. Buildings / Sidewalks check
        if (y < height * 0.85 && (x < width * 0.12 || x > width * 0.88)) {
          bldOverlap++;
          continue;
        }

        // 4. Manual road boundary check
        if (isPointOutsideBoundaries(x, y)) {
          boundaryOverlap++;
          continue;
        }

        // 5. Manual road mask check
        if (roadPolygon.length >= 3 && !isPointInPolygon(x, y, roadPolygon)) {
          maskOverlap++;
          continue;
        }
      }
    }
  }

  // Calculate percentages
  const invalidSamples = skyOverlap + vegOverlap + bldOverlap + boundaryOverlap + maskOverlap;
  const invalidCoveragePct = totalSamples > 0 ? Math.round((invalidSamples / totalSamples) * 100) : 0;
  const roadCoveragePct = totalSamples > 0 ? 100 - invalidCoveragePct : 100;
  const roiCoveragePct = activeCalibration
    ? Math.min(100, Math.round((getPolygonArea(activeCalibration.image_points) / (width * height)) * 100 * 2.2))
    : 0;

  // Determine warnings
  const overlapsSky = skyOverlap > 0;
  const overlapsVeg = vegOverlap > 0;
  const overlapsBld = bldOverlap > 0;
  const overlapsBoundary = boundaryOverlap > 0;
  const overlapsMask = maskOverlap > 0;

  const isInvalid = overlapsSky || overlapsVeg || overlapsBld || overlapsBoundary || overlapsMask;
  const calibrationQuality = totalSamples === 0 
    ? 'N/A' 
    : invalidCoveragePct > 35 
      ? 'POOR' 
      : invalidCoveragePct > 10 
        ? 'WARNING' 
        : 'EXCELLENT';

  // Toggle helpers
  const toggleLayer = (layerKey: keyof typeof activeVisualizationLayers) => {
    setActiveVisualizationLayers(prev => ({
      ...prev,
      [layerKey]: !prev[layerKey]
    }));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-205 dark:border-gray-800 text-gray-800 dark:text-gray-150 p-5 overflow-y-auto text-xs">
      
      {/* Title */}
      <div className="flex items-center space-x-2 pb-4 mb-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <Activity className="w-5 h-5 text-brand-blue" />
        <h3 className="font-extrabold text-base">Lane & Grid Diagnostics</h3>
      </div>

      {/* Prominent WARNING banner if overlap occurs */}
      {isInvalid && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start space-x-2 text-red-500 animate-pulse">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
          <div className="leading-relaxed">
            <p className="font-bold text-[11px]">Calibration may be invalid. Projected geometry exceeds road boundaries.</p>
            <ul className="list-disc pl-4 mt-1 text-[10px] opacity-90 space-y-0.5 font-mono">
              {overlapsSky && <li>ROI overlaps Sky region (above horizon)</li>}
              {overlapsVeg && <li>ROI overlaps Vegetation/Trees region</li>}
              {overlapsBld && <li>ROI overlaps Buildings/Shoulder region</li>}
              {overlapsBoundary && <li>ROI exceeds Manual Road Boundaries</li>}
              {overlapsMask && <li>ROI exceeds Manual Road Polygon Mask</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Grid Diagnostics Section */}
      <div className="bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 mb-5">
        <h4 className="font-bold text-[11px] uppercase text-gray-400 tracking-wider mb-3 flex items-center">
          <Grid3X3 className="w-4 h-4 mr-1.5 text-brand-sky" />
          <span>Calibration Diagnostics</span>
        </h4>

        <div className="grid grid-cols-2 gap-3 mb-4 font-mono text-[11px]">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-2.5">
            <span className="text-[9px] uppercase font-bold text-gray-500 block">Quality</span>
            <span className={`font-extrabold text-sm ${
              calibrationQuality === 'EXCELLENT' ? 'text-success' : calibrationQuality === 'WARNING' ? 'text-amber-500' : 'text-red-500'
            }`}>
              {calibrationQuality}
            </span>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-2.5">
            <span className="text-[9px] uppercase font-bold text-gray-500 block">ROI Coverage</span>
            <span className="font-extrabold text-sm text-brand-sky">
              {roiCoveragePct}%
            </span>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-2.5">
            <span className="text-[9px] uppercase font-bold text-gray-500 block">Road Coverage</span>
            <span className="font-extrabold text-sm text-success">
              {roadCoveragePct}%
            </span>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-2.5">
            <span className="text-[9px] uppercase font-bold text-gray-500 block">Invalid Area</span>
            <span className={`font-extrabold text-sm ${invalidCoveragePct > 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {invalidCoveragePct}%
            </span>
          </div>
        </div>

        {/* Matrix display */}
        <div>
          <span className="text-[9px] uppercase font-bold text-gray-500 block mb-1">Homography Matrix (3x3)</span>
          {homographyMatrix ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-2 font-mono text-[9px] leading-relaxed text-gray-300 grid grid-cols-3 gap-1 text-center">
              {homographyMatrix.map((row, rIdx) => 
                row.map((val, cIdx) => (
                  <span key={`${rIdx}-${cIdx}`} className="bg-gray-50 dark:bg-gray-950 rounded py-0.5" title={`H[${rIdx}][${cIdx}]`}>
                    {val.toExponential(3)}
                  </span>
                ))
              )}
            </div>
          ) : (
            <div className="text-gray-500 italic text-[10px] py-1 text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
              No active perspective calibration
            </div>
          )}
        </div>
      </div>

      {/* Manual Road Boundary Drawing Tools */}
      <div className="bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 mb-5">
        <h4 className="font-bold text-[11px] uppercase text-gray-400 tracking-wider mb-2.5 flex items-center">
          <PenTool className="w-4 h-4 mr-1.5 text-brand-sky" />
          <span>Manual Road boundaries</span>
        </h4>
        <p className="text-gray-400 text-[10px] mb-3 leading-relaxed">
          Draw boundary constraints. Projected lane lines will be truncated or rejected outside of these regions.
        </p>

        <div className="space-y-2 mb-3.5">
          <button
            onClick={() => setActiveTool(activeTool === 'left_boundary' ? 'select' : 'left_boundary')}
            className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all font-semibold ${
              activeTool === 'left_boundary'
                ? 'border-brand-blue bg-brand-blue/10 text-brand-blue dark:text-brand-sky'
                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <span>Left Road Boundary</span>
            <span className="text-[10px] font-mono opacity-80">
              {leftRoadBoundary.length > 0 ? `${leftRoadBoundary.length} pts` : 'Draw'}
            </span>
          </button>

          <button
            onClick={() => setActiveTool(activeTool === 'right_boundary' ? 'select' : 'right_boundary')}
            className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all font-semibold ${
              activeTool === 'right_boundary'
                ? 'border-brand-blue bg-brand-blue/10 text-brand-blue dark:text-brand-sky'
                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <span>Right Road Boundary</span>
            <span className="text-[10px] font-mono opacity-80">
              {rightRoadBoundary.length > 0 ? `${rightRoadBoundary.length} pts` : 'Draw'}
            </span>
          </button>

          <button
            onClick={() => setActiveTool(activeTool === 'road_poly' ? 'select' : 'road_poly')}
            className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all font-semibold ${
              activeTool === 'road_poly'
                ? 'border-brand-blue bg-brand-blue/10 text-brand-blue dark:text-brand-sky'
                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <span>Road Polygon Mask</span>
            <span className="text-[10px] font-mono opacity-80">
              {roadPolygon.length > 0 ? `${roadPolygon.length} pts` : 'Draw'}
            </span>
          </button>
        </div>

        {(leftRoadBoundary.length > 0 || rightRoadBoundary.length > 0 || roadPolygon.length > 0) && (
          <button
            onClick={clearManualRoadBoundaries}
            className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded-lg border border-red-500/30 hover:bg-red-500/10 text-red-500 font-bold transition-all"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Clear Custom Boundaries</span>
          </button>
        )}
      </div>

      {/* Layer Toggles Section */}
      <div className="bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 mb-4">
        <h4 className="font-bold text-[11px] uppercase text-gray-400 tracking-wider mb-3 flex items-center">
          <Eye className="w-4 h-4 mr-1.5 text-brand-sky" />
          <span>Visualization Layers</span>
        </h4>

        <div className="space-y-2.5">
          {[
            { key: 'rawModelOutput', label: '1. Raw Model Output', desc: 'Pre-validated model logits/points' },
            { key: 'postprocessedLane', label: '2. Postprocessed Lane Output', desc: 'Clustered and smoothed lanes' },
            { key: 'calibrationROI', label: '3. Calibration ROI', desc: 'Grid bounding perspective area' },
            { key: 'homographyGrid', label: '4. Homography Grid', desc: '3D spatial projection helper' },
            { key: 'finalProjectedLane', label: '5. Final Projected Lane', desc: 'Accepted lanes solver projection' }
          ].map((layer) => {
            const isChecked = activeVisualizationLayers[layer.key as keyof typeof activeVisualizationLayers];
            return (
              <label
                key={layer.key}
                className="flex items-start space-x-2.5 cursor-pointer select-none group"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleLayer(layer.key as any)}
                  className="mt-0.5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                />
                <div>
                  <span className="font-bold text-gray-300 group-hover:text-white transition-colors">{layer.label}</span>
                  <p className="text-[10px] text-gray-500">{layer.desc}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Help info overlay */}
      <div className="mt-auto p-3 rounded-lg border border-dashed border-gray-700 bg-gray-950/20 text-[10px] text-gray-400 flex items-start space-x-1.5 leading-normal">
        <HelpCircle className="w-3.5 h-3.5 text-brand-sky mt-0.5 flex-shrink-0" />
        <span>
          Lanes extending above the horizon, outside the calibration grid boundaries, or violating manual boundaries will automatically be rejected and highlighted in red on the canvas.
        </span>
      </div>

    </div>
  );
};
export default LaneDiagnosticsPanel;
