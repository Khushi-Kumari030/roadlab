import React, { useRef, useEffect } from 'react';
import { useRoadLab } from '../../context/RoadLabContext';
import { Info } from 'lucide-react';
import { CoordinateTransformService } from '../../services/CoordinateTransformService';

export const BEVCanvas: React.FC = () => {
  const {
    inferenceResults,
    selectedTrackId,
    setSelectedTrackId,
    speedUnit,
    distanceUnit,
    overlayColors,
    homographyMatrix,
    measurements,
    distressItems
  } = useRoadLab();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution matching CSS size for high DPI displays
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const w = canvas.width;
    const h = canvas.height;

    // Clear background (dark grid theme)
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, w, h);

    // Draw grid background dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let x = 0; x < w; x += 20) {
      for (let y = 0; y < h; y += 20) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // --- PROJECTION PARAMS ---
    // Scale: 1 meter = 8.5 pixels
    const scale = 8.5;
    
    // Center of Ego Lane (u = 1.85m) maps to the center of the canvas
    const uToX = (u: number) => {
      const uOffset = u - 1.85; // relative to Ego Lane center
      return w / 2 + uOffset * scale;
    };

    // v = 0m maps to 30px above the bottom of the canvas
    const vToY = (v: number) => {
      return h - 30 - v * scale;
    };

    // --- DRAW BACKGROUND ROAD LAYOUT ---
    const lanes = [-3.7, 0.0, 3.7, 7.4];
    ctx.lineWidth = 1.5;
    
    lanes.forEach((laneU, idx) => {
      const x = uToX(laneU);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      
      if (idx === 0 || idx === lanes.length - 1) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.setLineDash([10, 15]);
      }
      ctx.stroke();
    });
    ctx.setLineDash([]); // Reset

    // Highlight Ego Lane area
    const egoX1 = uToX(0);
    const egoX2 = uToX(3.7);
    ctx.fillStyle = 'rgba(0, 188, 242, 0.02)';
    ctx.fillRect(egoX1, 0, egoX2 - egoX1, h);

    // --- DRAW PREDICTED LANES ON BEV ---
    if (inferenceResults.lanes && inferenceResults.lanes.length > 0) {
      inferenceResults.lanes.forEach((lane) => {
        const pts = lane.points || [];
        if (pts.length < 2) return;

        ctx.save();
        ctx.beginPath();
        
        const p0 = pts[0];
        const w0 = CoordinateTransformService.pixelToWorld(p0, homographyMatrix);
        ctx.moveTo(uToX(w0.x), vToY(w0.y));

        for (let i = 1; i < pts.length; i++) {
          const pi = pts[i];
          const wi = CoordinateTransformService.pixelToWorld(pi, homographyMatrix);
          ctx.lineTo(uToX(wi.x), vToY(wi.y));
        }

        ctx.strokeStyle = lane.is_ego ? 'rgba(0, 188, 242, 0.65)' : 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = lane.is_ego ? 3 : 1.5;
        ctx.setLineDash(lane.is_ego ? [] : [5, 10]);
        ctx.stroke();
        ctx.restore();
      });
    }

    // --- DRAW DETECTED DISTRESS (POTHOLES & CRACKS) ON BEV ---
    const activePotholes = [
      ...(inferenceResults.distress?.potholes || []),
      ...distressItems.filter(d => d.class === 'pothole')
    ];
    activePotholes.forEach((p) => {
      const pxs = p.pixels || [];
      if (pxs.length < 3) return;
      ctx.save();
      ctx.beginPath();
      const p0 = pxs[0];
      const w0 = CoordinateTransformService.pixelToWorld(p0, homographyMatrix);
      ctx.moveTo(uToX(w0.x), vToY(w0.y));
      for (let i = 1; i < pxs.length; i++) {
        const pi = pxs[i];
        const wi = CoordinateTransformService.pixelToWorld(pi, homographyMatrix);
        ctx.lineTo(uToX(wi.x), vToY(wi.y));
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(209, 52, 56, 0.4)';
      ctx.strokeStyle = '#D13438';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    const activeCracks = [
      ...(inferenceResults.distress?.cracks || []),
      ...distressItems.filter(d => d.class === 'crack')
    ];
    activeCracks.forEach((c) => {
      const pxs = c.pixels || [];
      if (pxs.length < 2) return;
      ctx.save();
      ctx.beginPath();
      const p0 = pxs[0];
      const w0 = CoordinateTransformService.pixelToWorld(p0, homographyMatrix);
      ctx.moveTo(uToX(w0.x), vToY(w0.y));
      for (let i = 1; i < pxs.length; i++) {
        const pi = pxs[i];
        const wi = CoordinateTransformService.pixelToWorld(pi, homographyMatrix);
        ctx.lineTo(uToX(wi.x), vToY(wi.y));
      }
      ctx.strokeStyle = '#FFB900';
      ctx.lineWidth = 2.0;
      ctx.stroke();
      ctx.restore();
    });

    // --- DRAW USER MEASUREMENTS ON BEV ---
    if (measurements && measurements.length > 0) {
      measurements.forEach((m) => {
        const worldPts = m.points.map(p => CoordinateTransformService.pixelToWorld(p, homographyMatrix));
        if (worldPts.length === 0) return;

        ctx.save();
        if (m.type === 'line' && worldPts.length === 2) {
          ctx.beginPath();
          ctx.moveTo(uToX(worldPts[0].x), vToY(worldPts[0].y));
          ctx.lineTo(uToX(worldPts[1].x), vToY(worldPts[1].y));
          ctx.strokeStyle = '#107C10';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        } else if (m.type === 'polygon' && worldPts.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(uToX(worldPts[0].x), vToY(worldPts[0].y));
          for (let i = 1; i < worldPts.length; i++) {
            ctx.lineTo(uToX(worldPts[i].x), vToY(worldPts[i].y));
          }
          ctx.closePath();
          ctx.fillStyle = 'rgba(255, 185, 0, 0.15)';
          ctx.strokeStyle = '#FFB900';
          ctx.lineWidth = 1.5;
          ctx.fill();
          ctx.stroke();
        } else if (m.type === 'rectangle' && worldPts.length === 2) {
          const p1 = worldPts[0];
          const p2 = worldPts[1];
          const tl = { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y) };
          const tr = { x: Math.max(p1.x, p2.x), y: Math.min(p1.y, p2.y) };
          const br = { x: Math.max(p1.x, p2.x), y: Math.max(p1.y, p2.y) };
          const bl = { x: Math.min(p1.x, p2.x), y: Math.max(p1.y, p2.y) };

          ctx.beginPath();
          ctx.moveTo(uToX(tl.x), vToY(tl.y));
          ctx.lineTo(uToX(tr.x), vToY(tr.y));
          ctx.lineTo(uToX(br.x), vToY(br.y));
          ctx.lineTo(uToX(bl.x), vToY(bl.y));
          ctx.closePath();
          ctx.fillStyle = 'rgba(255, 185, 0, 0.15)';
          ctx.strokeStyle = '#FFB900';
          ctx.lineWidth = 1.5;
          ctx.fill();
          ctx.stroke();
        } else if (m.type === 'coordinate' && worldPts.length > 0) {
          const pt = worldPts[0];
          ctx.beginPath();
          ctx.arc(uToX(pt.x), vToY(pt.y), 5, 0, 2 * Math.PI);
          ctx.fillStyle = '#8B5CF6';
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.restore();
      });
    }

    // --- DRAW DISTANCE MEASUREMENT GRID ---
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    
    for (let meters = 10; meters <= 50; meters += 10) {
      const y = vToY(meters);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      
      ctx.fillText(`${meters}m`, 8, y - 4);
      ctx.fillText(`${meters}m`, w - 32, y - 4);
    }

    // --- DRAW EGO VEHICLE ---
    const egoX = uToX(1.85);
    const egoY = vToY(0);
    
    ctx.save();
    ctx.translate(egoX, egoY);
    ctx.fillStyle = '#00BCF2';
    ctx.shadowColor = '#00BCF2';
    ctx.shadowBlur = 8;
    
    ctx.beginPath();
    ctx.moveTo(-7, 10);
    ctx.lineTo(7, 10);
    ctx.lineTo(7, -8);
    ctx.lineTo(4, -12);
    ctx.lineTo(-4, -12);
    ctx.lineTo(-7, -8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // --- DRAW VEHICLES & TRAILS ---
    const tracks = inferenceResults.tracks || [];
    
    tracks.forEach((track) => {
      const [u, v] = track.world_pos;
      const tx = uToX(u);
      const ty = vToY(v);

      if (v < 0 || v > 50) return;

      // 1. Draw Trajectory Trail
      if (track.history && track.history.length > 1) {
        ctx.beginPath();
        const startPt = track.history[0];
        ctx.moveTo(uToX(startPt[0]), vToY(startPt[1]));
        for (let i = 1; i < track.history.length; i++) {
          const pt = track.history[i];
          ctx.lineTo(uToX(pt[0]), vToY(pt[1]));
        }
        ctx.strokeStyle = overlayColors.boundingBoxes + '55';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // 2. Draw vehicle box
      const boxW = 1.8 * scale;
      const boxH = 4.5 * scale;
      
      const isSelected = track.id === selectedTrackId;
      const color = isSelected ? '#FFB900' : overlayColors.boundingBoxes;
      
      ctx.save();
      ctx.translate(tx, ty);
      
      if (isSelected) {
        ctx.strokeStyle = 'rgba(255, 185, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, boxH * 0.7, 0, 2 * Math.PI);
        ctx.stroke();
      }

      ctx.fillStyle = color + '44';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
      ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);
      
      ctx.beginPath();
      ctx.moveTo(0, -boxH / 2 - 2);
      ctx.lineTo(-4, -boxH / 2 + 4);
      ctx.lineTo(4, -boxH / 2 + 4);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px sans-serif';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 3;
      
      const dispSpeed = CoordinateTransformService.formatSpeed(track.speed, speedUnit);
      ctx.fillText(`#${track.id}`, boxW / 2 + 5, -5);
      ctx.fillText(dispSpeed, boxW / 2 + 5, 5);
      
      ctx.restore();
    });

  }, [inferenceResults, selectedTrackId, speedUnit, distanceUnit, overlayColors, homographyMatrix, measurements, distressItems]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scale = 8.5;
    const xToU = (cx: number) => (cx - rect.width / 2) / scale + 1.85;
    const yToV = (cy: number) => (rect.height - 30 - cy) / scale;

    const clickedU = xToU(x);
    const clickedV = yToV(y);

    const tracks = inferenceResults.tracks || [];
    let closestTrackId: number | null = null;
    let minDistance = 3.5;

    tracks.forEach((track) => {
      const [u, v] = track.world_pos;
      const dist = Math.sqrt(Math.pow(u - clickedU, 2) + Math.pow(v - clickedV, 2));
      if (dist < minDistance) {
        minDistance = dist;
        closestTrackId = track.id;
      }
    });

    setSelectedTrackId(closestTrackId);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-950 border-l border-gray-250 dark:border-gray-800 relative overflow-hidden select-none">
      
      <div className="flex-shrink-0 bg-gray-900 border-b border-gray-850 px-3.5 py-2.5 flex items-center justify-between text-xs text-gray-200">
        <div className="flex items-center space-x-1.5">
          <span className="h-2 w-2 rounded-full bg-brand-sky animate-ping" />
          <span className="font-bold tracking-wide uppercase text-gray-300">Bird's Eye View (BEV)</span>
        </div>
        <div className="flex items-center text-[10px] text-gray-400 space-x-1">
          <Info className="w-3.5 h-3.5" />
          <span>Click vehicle to inspect telemetry</span>
        </div>
      </div>

      <div className="flex-1 w-full relative min-h-0">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="absolute top-0 left-0 w-full h-full cursor-pointer"
        />
      </div>

      <div className="flex-shrink-0 bg-gray-900/60 border-t border-gray-850 p-2 text-[9px] font-mono text-gray-400 flex justify-around text-center select-none">
        <div>
          <span className="inline-block w-2.5 h-2 rounded bg-brand-sky/20 border border-brand-sky mr-1 font-mono"></span>
          <span>Ego Lane (Lane 1)</span>
        </div>
        <div>
          <span className="inline-block w-2.5 h-2 rounded bg-brand-blue/30 border border-brand-blue mr-1"></span>
          <span>Adjacent Lanes</span>
        </div>
      </div>
    </div>
  );
};

export default BEVCanvas;
