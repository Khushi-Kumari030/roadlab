import React, { useRef, useState, useEffect } from 'react';
import { useRoadLab } from '../../context/RoadLabContext';
import { Upload, HelpCircle, Move, RotateCcw, ZoomIn, ZoomOut, MousePointer, MapPin, Ruler, Hexagon, Square, CornerDownRight, Grid3X3, Compass, Maximize2 } from 'lucide-react';
import { type Point2D } from '../../utils/calibrationMath';
import { HomographyService } from '../../services/HomographyService';
import { CoordinateTransformService } from '../../services/CoordinateTransformService';
import { CalibrationService } from '../../services/CalibrationService';
import { MeasurementService } from '../../services/MeasurementService';

export const VideoCanvas: React.FC = () => {
  const {
    currentVideo,
    setVideoFile,
    currentFrame,
    setCurrentFrame,
    isPlaying,
    setIsPlaying,
    activeTool,
    setActiveTool,
    zoomScale,
    setZoomScale,
    panOffset,
    setPanOffset,
    activeCalibration,
    setActiveCalibration,
    homographyMatrix,
    measurements,
    addMeasurement,
    settings,
    inferenceResults,
    overlayVisibility,
    overlayOpacity,
    overlayColors,
    selectedTrackId,
    setSelectedTrackId,
    speedUnit,
    distanceUnit,
    trailLength,
    trafficLines,
    addTrafficLine,
    trafficROIs,
    addTrafficROI,
    distressItems,
    addDistressItem,
    hiddenObjectIds,
    visualizationConfig,
    leftRoadBoundary,
    setLeftRoadBoundary,
    rightRoadBoundary,
    setRightRoadBoundary,
    roadPolygon,
    setRoadPolygon,
    activeVisualizationLayers
  } = useRoadLab();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Interaction States
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point2D>({ x: 0, y: 0 });
  const [draggedGridPoint, setDraggedGridPoint] = useState<number | null>(null);
  
  // Custom drawing accumulation
  const [tempPoints, setTempPoints] = useState<Point2D[]>([]);
  const [hoverPos, setHoverPos] = useState<Point2D | null>(null);

  // Effect: Sync context play/pause to video element
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.muted = true;
      videoRef.current.play().catch((err) => {
        console.error("Playback failed:", err);
        setIsPlaying(false);
      });
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, setIsPlaying]);

  // Effect: Sync context scrubbing frame back to video player (only when paused)
  useEffect(() => {
    if (!videoRef.current || isPlaying) return;
    const targetTime = currentFrame / currentVideo.fps;
    if (Math.abs(videoRef.current.currentTime - targetTime) > 0.05) {
      videoRef.current.currentTime = targetTime;
    }
  }, [currentFrame, currentVideo.fps, isPlaying]);

  // Handler for video time progression
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const frame = Math.round(videoRef.current.currentTime * currentVideo.fps);
    if (frame !== currentFrame) {
      setCurrentFrame(frame);
    }
  };

  // Load sample video URL
  const loadSampleVideo = () => {
    const trafficUrl = 'http://localhost:8000/api/videos/sample';
    setVideoFile(trafficUrl);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.name.endsWith('.avi')) {
        alert("Note: AVI format is supported by the AI backend, but web browsers (Chrome/Edge/Firefox) cannot render AVI video files natively. Please convert it to MP4 (H.264) for visual playback, or use 'Load Sample Video'.");
      }
      if (file.type.includes('video/mp4') || file.type.includes('video/quicktime') || file.name.endsWith('.avi')) {
        setVideoFile(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.avi')) {
        alert("Note: AVI format is supported by the AI backend, but web browsers (Chrome/Edge/Firefox) cannot render AVI video files natively. Please convert it to MP4 (H.264) for visual playback, or use 'Load Sample Video'.");
      }
      setVideoFile(file);
    }
  };

  const getCanvasCoords = (clientX: number, clientY: number): Point2D => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvasRef.current.width / rect.width);
    const y = (clientY - rect.top) * (canvasRef.current.height / rect.height);
    return { x: Math.round(x), y: Math.round(y) };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!currentVideo.url) return;

    if (e.button === 1 || (activeTool === 'select' && e.shiftKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (e.button !== 0) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);

    if (activeTool === 'select') {
      const tracks = inferenceResults.tracks || [];
      let foundTrackId: number | null = null;
      for (let i = tracks.length - 1; i >= 0; i--) {
        const track = tracks[i];
        if (track.box && track.box.length === 4) {
          const [x1, y1, x2, y2] = track.box;
          if (coords.x >= x1 && coords.x <= x2 && coords.y >= y1 && coords.y <= y2) {
            foundTrackId = track.id;
            break;
          }
        }
      }
      if (foundTrackId === null && (!tracks || tracks.length === 0)) {
        const dets = inferenceResults.detections || [];
        for (let i = dets.length - 1; i >= 0; i--) {
          const det = dets[i];
          if (det.box && det.box.length === 4) {
            const [x1, y1, x2, y2] = det.box;
            if (coords.x >= x1 && coords.x <= x2 && coords.y >= y1 && coords.y <= y2) {
              foundTrackId = det.id;
              break;
            }
          }
        }
      }

      if (foundTrackId !== null) {
        setSelectedTrackId(foundTrackId);
        return;
      }
    }

    if (activeTool === 'grid' && activeCalibration) {
      let foundIndex: number | null = null;
      activeCalibration.image_points.forEach((pt, idx) => {
        const dist = Math.sqrt(Math.pow(pt.x - coords.x, 2) + Math.pow(pt.y - coords.y, 2));
        if (dist < 20) {
          foundIndex = idx;
        }
      });

      if (foundIndex !== null) {
        setDraggedGridPoint(foundIndex);
        return;
      }
    }

    if (activeTool === 'counting_line') {
      if (tempPoints.length === 0) {
        setTempPoints([coords]);
      } else {
        addTrafficLine({
          name: `Counting Line ${trafficLines.filter(l => l.type === 'counting').length + 1}`,
          type: 'counting',
          points: [tempPoints[0], coords]
        });
        setTempPoints([]);
        setActiveTool('select');
      }
      return;
    }

    if (activeTool === 'direction_line') {
      if (tempPoints.length === 0) {
        setTempPoints([coords]);
      } else {
        addTrafficLine({
          name: `Direction Line ${trafficLines.filter(l => l.type === 'direction').length + 1}`,
          type: 'direction',
          points: [tempPoints[0], coords]
        });
        setTempPoints([]);
        setActiveTool('select');
      }
      return;
    }

    if (activeTool === 'left_boundary') {
      if (tempPoints.length > 1) {
        const startPt = tempPoints[0];
        const distToStart = Math.sqrt(Math.pow(coords.x - startPt.x, 2) + Math.pow(coords.y - startPt.y, 2));
        if (distToStart < 20) {
          setLeftRoadBoundary(tempPoints);
          setTempPoints([]);
          setActiveTool('select');
          return;
        }
      }
      setTempPoints([...tempPoints, coords]);
      return;
    }

    if (activeTool === 'right_boundary') {
      if (tempPoints.length > 1) {
        const startPt = tempPoints[0];
        const distToStart = Math.sqrt(Math.pow(coords.x - startPt.x, 2) + Math.pow(coords.y - startPt.y, 2));
        if (distToStart < 20) {
          setRightRoadBoundary(tempPoints);
          setTempPoints([]);
          setActiveTool('select');
          return;
        }
      }
      setTempPoints([...tempPoints, coords]);
      return;
    }

    if (activeTool === 'road_poly') {
      if (tempPoints.length > 2) {
        const startPt = tempPoints[0];
        const distToStart = Math.sqrt(Math.pow(coords.x - startPt.x, 2) + Math.pow(coords.y - startPt.y, 2));
        if (distToStart < 20) {
          setRoadPolygon(tempPoints);
          setTempPoints([]);
          setActiveTool('select');
          return;
        }
      }
      setTempPoints([...tempPoints, coords]);
      return;
    }

    if (activeTool === 'roi') {
      if (tempPoints.length > 2) {
        const startPt = tempPoints[0];
        const distToStart = Math.sqrt(Math.pow(coords.x - startPt.x, 2) + Math.pow(coords.y - startPt.y, 2));
        if (distToStart < 20) {
          addTrafficROI({
            name: `ROI Area ${trafficROIs.length + 1}`,
            points: tempPoints
          });
          setTempPoints([]);
          setActiveTool('select');
          return;
        }
      }
      setTempPoints([...tempPoints, coords]);
      return;
    }

    if (activeTool === 'pothole_poly') {
      if (tempPoints.length > 2) {
        const startPt = tempPoints[0];
        const distToStart = Math.sqrt(Math.pow(coords.x - startPt.x, 2) + Math.pow(coords.y - startPt.y, 2));
        if (distToStart < 20) {
          addDistressItem({
            class: 'pothole',
            pixels: tempPoints
          });
          setTempPoints([]);
          setActiveTool('select');
          return;
        }
      }
      setTempPoints([...tempPoints, coords]);
      return;
    }

    if (activeTool === 'crack_line') {
      if (tempPoints.length > 2) {
        const startPt = tempPoints[0];
        const distToStart = Math.sqrt(Math.pow(coords.x - startPt.x, 2) + Math.pow(coords.y - startPt.y, 2));
        if (distToStart < 20) {
          addDistressItem({
            class: 'crack',
            pixels: tempPoints
          });
          setTempPoints([]);
          setActiveTool('select');
          return;
        }
      }
      setTempPoints([...tempPoints, coords]);
      return;
    }

    if (activeTool === 'point') {
      const displayVal = `X: ${coords.x}px, Y: ${coords.y}px`;
      addMeasurement({
        name: `Point ${measurements.filter(m => m.type === 'point').length + 1}`,
        type: 'point',
        points: [coords],
        value: displayVal
      });
      setActiveTool('select');
      return;
    }

    if (activeTool === 'coordinate') {
      const worldPt = CoordinateTransformService.pixelToWorld(coords, homographyMatrix);
      const confidence = CalibrationService.getSpatialResolutionDecay(worldPt.y);
      const formattedU = CoordinateTransformService.formatValue(worldPt.x, settings.units);
      const formattedV = CoordinateTransformService.formatValue(worldPt.y, settings.units);
      const displayVal = `U: ${formattedU}, V: ${formattedV} (Conf: ${confidence}%)`;
      addMeasurement({
        name: `Coordinate ${measurements.filter(m => m.type === 'coordinate').length + 1}`,
        type: 'coordinate',
        points: [coords],
        value: displayVal
      });
      setActiveTool('select');
      return;
    }

    if (activeTool === 'rectangle') {
      if (tempPoints.length === 0) {
        setTempPoints([coords]);
      } else {
        const p1 = tempPoints[0];
        const p2 = coords;
        const rectMetrics = MeasurementService.getRectangleDimensions(p1, p2, homographyMatrix);
        const confidence = MeasurementService.getMeasurementConfidence([p1, p2], homographyMatrix);
        const displayVal = `W: ${rectMetrics.width.toFixed(2)}m, H: ${rectMetrics.height.toFixed(2)}m | Area: ${rectMetrics.area.toFixed(2)}m² (Conf: ${confidence}%)`;

        addMeasurement({
          name: `Rectangle ${measurements.filter(m => m.type === 'rectangle').length + 1}`,
          type: 'rectangle',
          points: [p1, p2],
          value: displayVal
        });
        setTempPoints([]);
        setActiveTool('select');
      }
      return;
    }

    if (activeTool === 'line') {
      if (tempPoints.length === 0) {
        setTempPoints([coords]);
      } else {
        const p1 = tempPoints[0];
        const dist = MeasurementService.getLineDistance(p1, coords, homographyMatrix);
        const confidence = MeasurementService.getMeasurementConfidence([p1, coords], homographyMatrix);
        const formattedDist = CoordinateTransformService.formatValue(dist, settings.units);

        addMeasurement({
          name: `Line ${measurements.filter(m => m.type === 'line').length + 1}`,
          type: 'line',
          points: [p1, coords],
          value: `${formattedDist} (Conf: ${confidence}%)`
        });
        setTempPoints([]);
        setActiveTool('select');
      }
      return;
    }

    if (activeTool === 'polygon') {
      if (tempPoints.length > 2) {
        const startPt = tempPoints[0];
        const distToStart = Math.sqrt(Math.pow(coords.x - startPt.x, 2) + Math.pow(coords.y - startPt.y, 2));
        if (distToStart < 20) {
          const metrics = MeasurementService.getPolygonAreaAndPerimeter(tempPoints, homographyMatrix);
          const confidence = MeasurementService.getMeasurementConfidence(tempPoints, homographyMatrix);
          const formattedArea = CoordinateTransformService.formatValue(metrics.area, settings.units === 'cm' ? 'cm' : 'm', 3) + '²';
          const formattedPerim = CoordinateTransformService.formatValue(metrics.perimeter, settings.units);
          const displayVal = `Area: ${formattedArea}, Peri: ${formattedPerim} (Conf: ${confidence}%)`;

          addMeasurement({
            name: `Polygon ${measurements.filter(m => m.type === 'polygon').length + 1}`,
            type: 'polygon',
            points: tempPoints,
            value: displayVal
          });
          setTempPoints([]);
          setActiveTool('select');
          return;
        }
      }
      setTempPoints([...tempPoints, coords]);
      return;
    }

    if (activeTool === 'angle') {
      const nextPoints = [...tempPoints, coords];
      if (nextPoints.length === 3) {
        const angle = MeasurementService.getAngle(nextPoints[0], nextPoints[1], nextPoints[2]);
        addMeasurement({
          name: `Angle ${measurements.filter(m => m.type === 'angle').length + 1}`,
          type: 'angle',
          points: nextPoints,
          value: `${angle.toFixed(1)}°`
        });
        setTempPoints([]);
        setActiveTool('select');
      } else {
        setTempPoints(nextPoints);
      }
      return;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!currentVideo.url) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);
    setHoverPos(coords);

    if (isPanning) {
      const nx = e.clientX - panStart.x;
      const ny = e.clientY - panStart.y;
      setPanOffset({ x: nx, y: ny });
      return;
    }

    if (draggedGridPoint !== null && activeCalibration) {
      const updatedPts = [...activeCalibration.image_points];
      updatedPts[draggedGridPoint] = coords;
      setActiveCalibration({
        ...activeCalibration,
        image_points: updatedPts
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedGridPoint(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!currentVideo.url) return;
    e.preventDefault();
    const zoomIntensity = 0.1;
    let newScale = zoomScale;
    if (e.deltaY < 0) {
      newScale += zoomIntensity;
    } else {
      newScale -= zoomIntensity;
    }
    newScale = Math.max(0.5, Math.min(5.0, newScale));
    setZoomScale(newScale);
  };

  useEffect(() => {
    if (!canvasRef.current || !currentVideo.url) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    const getCanvasFontSize = (minScreenSize: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return minScreenSize;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return minScreenSize;
      const scale = canvas.width / rect.width;
      return Math.max(minScreenSize, minScreenSize * scale);
    };

    const drawTextWithOutline = (
      text: string,
      x: number,
      y: number,
      color: string,
      minFontSize: number,
      isBold: boolean = true,
      align: CanvasTextAlign = 'left'
    ) => {
      const fontSize = getCanvasFontSize(minFontSize);
      ctx.save();
      ctx.font = `${isBold ? 'bold' : 'normal'} ${fontSize}px Inter, sans-serif`;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeText(text, x, y);
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
      ctx.restore();
    };

    const drawBadge = (
      text: string,
      x: number,
      y: number,
      textColor: string,
      bgColor: string,
      minFontSize: number,
      isBold: boolean = true
    ) => {
      const fontSize = getCanvasFontSize(minFontSize);
      ctx.save();
      ctx.font = `${isBold ? 'bold' : 'normal'} ${fontSize}px Inter, sans-serif`;
      
      const textWidth = ctx.measureText(text).width;
      const paddingX = 8;
      const paddingY = 4;
      const rectWidth = textWidth + paddingX * 2;
      const rectHeight = fontSize + paddingY * 2;
      
      const rx = x - rectWidth / 2;
      const ry = y - rectHeight / 2;
      
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(rx, ry, rectWidth, rectHeight, 4);
      } else {
        ctx.rect(rx, ry, rectWidth, rectHeight);
      }
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 2;
      ctx.fillText(text, x, y);
      ctx.restore();
    };

    if (activeCalibration) {
      const pts = activeCalibration.image_points;
      
      if (activeVisualizationLayers.calibrationROI) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.lineTo(pts[2].x, pts[2].y);
        ctx.lineTo(pts[3].x, pts[3].y);
        ctx.closePath();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#0078D4';
        ctx.fillStyle = 'rgba(0, 120, 212, 0.12)';
        ctx.fill();
        ctx.stroke();
      }

      if (activeVisualizationLayers.homographyGrid) {
        const divisions = 5;
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0, 188, 242, 0.4)';

        for (let i = 1; i < divisions; i++) {
          const ratio = i / divisions;
          const topX = pts[0].x + (pts[1].x - pts[0].x) * ratio;
          const topY = pts[0].y + (pts[1].y - pts[0].y) * ratio;
          const botX = pts[3].x + (pts[2].x - pts[3].x) * ratio;
          const botY = pts[3].y + (pts[2].y - pts[3].y) * ratio;

          ctx.beginPath();
          ctx.moveTo(topX, topY);
          ctx.lineTo(botX, botY);
          ctx.stroke();
        }

        for (let i = 1; i < divisions; i++) {
          const ratio = i / divisions;
          const leftX = pts[0].x + (pts[3].x - pts[0].x) * ratio;
          const leftY = pts[0].y + (pts[3].y - pts[0].y) * ratio;
          const rightX = pts[1].x + (pts[2].x - pts[1].x) * ratio;
          const rightY = pts[1].y + (pts[2].y - pts[1].y) * ratio;

          ctx.beginPath();
          ctx.moveTo(leftX, leftY);
          ctx.lineTo(rightX, rightY);
          ctx.stroke();
        }
      }

      if (activeTool === 'grid') {
        const handleLabels = ['TL (0,0)', `TR (${activeCalibration.gridWidth}m, 0)`, `BR (${activeCalibration.gridWidth}m, ${activeCalibration.gridHeight}m)`, `BL (0, ${activeCalibration.gridHeight}m)`];
        pts.forEach((pt, idx) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 8, 0, 2 * Math.PI);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#0078D4';
          ctx.stroke();

          drawTextWithOutline(handleLabels[idx], pt.x + 12, pt.y + 4, '#FFFFFF', 12);
        });
      }
    }

    measurements.forEach(m => {
      if (hiddenObjectIds && hiddenObjectIds.includes(String(m.id))) return;
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';

      if (m.type === 'point' && m.points.length > 0) {
        const pt = m.points[0];
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#D13438';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();

        drawBadge(m.name, pt.x, pt.y - 14, '#FFFFFF', '#D13438', 14);
      }

      if (m.type === 'line' && m.points.length === 2) {
        const [p1, p2] = m.points;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineWidth = visualizationConfig?.boxThickness || 3;
        ctx.strokeStyle = '#00BCF2';
        ctx.stroke();

        [p1, p2].forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = '#00BCF2';
          ctx.lineWidth = 2;
          ctx.stroke();
        });

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        drawBadge(m.value, midX, midY, '#FFFFFF', '#00BCF2', 14);
      }

      if (m.type === 'polygon' && m.points.length > 2) {
        ctx.beginPath();
        ctx.moveTo(m.points[0].x, m.points[0].y);
        for (let i = 1; i < m.points.length; i++) {
          ctx.lineTo(m.points[i].x, m.points[i].y);
        }
        ctx.closePath();
        ctx.lineWidth = visualizationConfig?.boxThickness || 2.5;
        ctx.strokeStyle = '#107C10';
        ctx.fillStyle = 'rgba(16, 124, 16, 0.15)';
        ctx.fill();
        ctx.stroke();

        m.points.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = '#107C10';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

        let sumX = 0, sumY = 0;
        m.points.forEach(p => { sumX += p.x; sumY += p.y; });
        const cx = sumX / m.points.length;
        const cy = sumY / m.points.length;
        drawBadge(`${m.name}: ${m.value}`, cx, cy, '#FFFFFF', '#107C10', 14);
      }

      if (m.type === 'rectangle' && m.points.length === 2) {
        const [p1, p2] = m.points;
        ctx.save();
        ctx.beginPath();
        ctx.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
        ctx.lineWidth = visualizationConfig?.boxThickness || 2.5;
        ctx.strokeStyle = '#107C10';
        ctx.fillStyle = 'rgba(16, 124, 16, 0.15)';
        ctx.fill();
        ctx.stroke();

        [p1, p2, { x: p2.x, y: p1.y }, { x: p1.x, y: p2.y }].forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = '#107C10';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

        const midX = (p1.x + p2.x) / 2;
        const topY = Math.min(p1.y, p2.y);
        drawBadge(`${m.name}: ${m.value}`, midX, topY - 14, '#FFFFFF', '#107C10', 14);
        ctx.restore();
      }

      if (m.type === 'coordinate' && m.points.length > 0) {
        const pt = m.points[0];
        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#8B5CF6';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(pt.x - 10, pt.y); ctx.lineTo(pt.x + 10, pt.y);
        ctx.moveTo(pt.x, pt.y - 10); ctx.lineTo(pt.x, pt.y + 10);
        ctx.strokeStyle = '#8B5CF6';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        drawBadge(`${m.name}: ${m.value}`, pt.x, pt.y - 14, '#FFFFFF', '#8B5CF6', 14);
        ctx.restore();
      }

      if (m.type === 'angle' && m.points.length === 3) {
        const [p1, p2, p3] = m.points;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineWidth = visualizationConfig?.boxThickness || 2.5;
        ctx.strokeStyle = '#FFB900';
        ctx.stroke();

        [p1, p2, p3].forEach((p, i) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, i === 1 ? 6 : 4, 0, 2 * Math.PI);
          ctx.fillStyle = i === 1 ? '#FFB900' : '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = '#FFB900';
          ctx.lineWidth = 2;
          ctx.stroke();
        });

        drawBadge(m.value, p2.x, p2.y - 14, '#FFFFFF', '#FFB900', 14);
      }
      ctx.shadowBlur = 0;
    });

    // --- DRAW MANUAL ROAD BOUNDARIES ---
    if (leftRoadBoundary && leftRoadBoundary.length >= 2) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(leftRoadBoundary[0].x, leftRoadBoundary[0].y);
      for (let i = 1; i < leftRoadBoundary.length; i++) {
        ctx.lineTo(leftRoadBoundary[i].x, leftRoadBoundary[i].y);
      }
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#00BCF2'; // Light blue
      ctx.stroke();
      
      // Draw Label Badge
      const midIdx = Math.floor(leftRoadBoundary.length / 2);
      drawBadge('LEFT ROAD BOUNDARY', leftRoadBoundary[midIdx].x, leftRoadBoundary[midIdx].y - 12, '#FFFFFF', '#00BCF2', 12);
      ctx.restore();
    }

    if (rightRoadBoundary && rightRoadBoundary.length >= 2) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(rightRoadBoundary[0].x, rightRoadBoundary[0].y);
      for (let i = 1; i < rightRoadBoundary.length; i++) {
        ctx.lineTo(rightRoadBoundary[i].x, rightRoadBoundary[i].y);
      }
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#107C10'; // Light green
      ctx.stroke();

      const midIdx = Math.floor(rightRoadBoundary.length / 2);
      drawBadge('RIGHT ROAD BOUNDARY', rightRoadBoundary[midIdx].x, rightRoadBoundary[midIdx].y - 12, '#FFFFFF', '#107C10', 12);
      ctx.restore();
    }

    if (roadPolygon && roadPolygon.length >= 3) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(roadPolygon[0].x, roadPolygon[0].y);
      for (let i = 1; i < roadPolygon.length; i++) {
        ctx.lineTo(roadPolygon[i].x, roadPolygon[i].y);
      }
      ctx.closePath();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#8B5CF6'; // Purple
      ctx.fillStyle = 'rgba(139, 92, 246, 0.15)'; // Translucent Purple
      ctx.fill();
      ctx.stroke();

      let sumX = 0, sumY = 0;
      roadPolygon.forEach(p => { sumX += p.x; sumY += p.y; });
      const cx = sumX / roadPolygon.length;
      const cy = sumY / roadPolygon.length;
      drawBadge('ROAD POLYGON MASK', cx, cy, '#FFFFFF', '#8B5CF6', 12);
      ctx.restore();
    }

    // --- DRAW TRAFFIC VIRTUAL SETUP ITEMS (Phase 4) ---
    if (trafficLines) {
      trafficLines.forEach(line => {
        if (line.points.length !== 2) return;
        const [p1, p2] = line.points;
        ctx.save();
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineWidth = line.type === 'counting' ? 3 : 2;
        ctx.strokeStyle = line.type === 'counting' ? '#F43F5E' : '#FF7A00'; // Magenta for counting, orange for direction
        if (line.type === 'direction') {
          ctx.setLineDash([4, 4]);
        }
        ctx.stroke();

        // Draw circles on ends
        [p1, p2].forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = line.type === 'counting' ? '#F43F5E' : '#FF7A00';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

        // Draw statistics text for counting line
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px monospace';
        
        if (line.type === 'counting') {
          const txt = `${line.name} [Up: ${line.upstreamCount} | Dn: ${line.downstreamCount}]`;
          const txtW = ctx.measureText(txt).width;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
          ctx.fillRect(midX - txtW / 2 - 4, midY - 14, txtW + 8, 12);
          ctx.fillStyle = '#F43F5E';
          ctx.fillText(txt, midX - txtW / 2, midY - 5);
        } else {
          // Draw Direction Arrow
          ctx.fillStyle = '#FF7A00';
          ctx.fillText('Direction', midX + 6, midY - 4);
        }
        ctx.restore();
      });
    }

    if (trafficROIs) {
      trafficROIs.forEach(roi => {
        if (roi.points.length < 3) return;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(roi.points[0].x, roi.points[0].y);
        for (let i = 1; i < roi.points.length; i++) {
          ctx.lineTo(roi.points[i].x, roi.points[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = '#8B5CF6';
        ctx.fillStyle = 'rgba(139, 92, 246, 0.12)';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // Draw label in center
        let sumX = 0, sumY = 0;
        roi.points.forEach(p => { sumX += p.x; sumY += p.y; });
        const cx = sumX / roi.points.length;
        const cy = sumY / roi.points.length;
        ctx.fillStyle = '#C084FC';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(roi.name, cx - 20, cy);
        ctx.restore();
      });
    }

    if (tempPoints.length > 0) {
      if (activeTool === 'line' && hoverPos) {
        const p1 = tempPoints[0];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(hoverPos.x, hoverPos.y);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(16, 124, 16, 0.6)';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#107C10';
        ctx.fill();

        // Real-time HUD readout
        const pxDist = MeasurementService.getPixelDistance(p1, hoverPos);
        const worldDist = MeasurementService.getLineDistance(p1, hoverPos, homographyMatrix);
        const confidence = MeasurementService.getMeasurementConfidence([p1, hoverPos], homographyMatrix);
        const dispLabel = `${Math.round(pxDist)}px (${CoordinateTransformService.formatValue(worldDist, settings.units)}) [Conf: ${confidence}%]`;
        
        const midX = (p1.x + hoverPos.x) / 2;
        const midY = (p1.y + hoverPos.y) / 2;
        ctx.save();
        ctx.font = 'bold 10px monospace';
        const txtW = ctx.measureText(dispLabel).width;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(midX - txtW/2 - 4, midY - 12, txtW + 8, 16);
        ctx.fillStyle = '#107C10';
        ctx.fillText(dispLabel, midX - txtW/2, midY);
        ctx.restore();
      }

      if (activeTool === 'polygon') {
        ctx.beginPath();
        ctx.moveTo(tempPoints[0].x, tempPoints[0].y);
        for (let i = 1; i < tempPoints.length; i++) {
          ctx.lineTo(tempPoints[i].x, tempPoints[i].y);
        }
        if (hoverPos) {
          ctx.lineTo(hoverPos.x, hoverPos.y);
        }
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 185, 0, 0.6)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        if (hoverPos) {
          const startPt = tempPoints[0];
          const distToStart = Math.sqrt(Math.pow(hoverPos.x - startPt.x, 2) + Math.pow(hoverPos.y - startPt.y, 2));
          if (distToStart < 20) {
            ctx.beginPath();
            ctx.arc(startPt.x, startPt.y, 12, 0, 2 * Math.PI);
            ctx.strokeStyle = '#FFB900';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Real-time HUD readout
          const ptsForMetric = [...tempPoints, hoverPos];
          const metrics = MeasurementService.getPolygonAreaAndPerimeter(ptsForMetric, homographyMatrix);
          const confidence = MeasurementService.getMeasurementConfidence(ptsForMetric, homographyMatrix);
          const formattedArea = CoordinateTransformService.formatValue(metrics.area, settings.units === 'cm' ? 'cm' : 'm', 3) + '²';
          const formattedPerim = CoordinateTransformService.formatValue(metrics.perimeter, settings.units);
          const dispLabel = `Area: ${formattedArea} | Peri: ${formattedPerim} [Conf: ${confidence}%]`;

          ctx.save();
          ctx.font = 'bold 10px monospace';
          const txtW = ctx.measureText(dispLabel).width;
          ctx.fillStyle = 'rgba(0,0,0,0.75)';
          ctx.fillRect(hoverPos.x + 10, hoverPos.y - 12, txtW + 8, 16);
          ctx.fillStyle = '#FFB900';
          ctx.fillText(dispLabel, hoverPos.x + 14, hoverPos.y);
          ctx.restore();
        }

        tempPoints.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#FFB900';
          ctx.fill();
        });
      }

      if (activeTool === 'angle') {
        ctx.beginPath();
        ctx.moveTo(tempPoints[0].x, tempPoints[0].y);
        if (tempPoints.length === 1 && hoverPos) {
          ctx.lineTo(hoverPos.x, hoverPos.y);
        } else if (tempPoints.length === 2) {
          ctx.lineTo(tempPoints[1].x, tempPoints[1].y);
          if (hoverPos) ctx.lineTo(hoverPos.x, hoverPos.y);
        }
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
        ctx.stroke();

        tempPoints.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#8B5CF6';
          ctx.fill();
        });
      }

      if (activeTool === 'counting_line' && hoverPos) {
        const p1 = tempPoints[0];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(hoverPos.x, hoverPos.y);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.6)';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#F43F5E';
        ctx.fill();
      }

      if (activeTool === 'direction_line' && hoverPos) {
        const p1 = tempPoints[0];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(hoverPos.x, hoverPos.y);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 122, 0, 0.6)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#FF7A00';
        ctx.fill();
      }

      if (activeTool === 'roi') {
        ctx.beginPath();
        ctx.moveTo(tempPoints[0].x, tempPoints[0].y);
        for (let i = 1; i < tempPoints.length; i++) {
          ctx.lineTo(tempPoints[i].x, tempPoints[i].y);
        }
        if (hoverPos) {
          ctx.lineTo(hoverPos.x, hoverPos.y);
        }
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        if (hoverPos) {
          const startPt = tempPoints[0];
          const distToStart = Math.sqrt(Math.pow(hoverPos.x - startPt.x, 2) + Math.pow(hoverPos.y - startPt.y, 2));
          if (distToStart < 20) {
            ctx.beginPath();
            ctx.arc(startPt.x, startPt.y, 12, 0, 2 * Math.PI);
            ctx.strokeStyle = '#8B5CF6';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }

        tempPoints.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#8B5CF6';
          ctx.fill();
        });
      }

      if ((activeTool === 'left_boundary' || activeTool === 'right_boundary') && tempPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(tempPoints[0].x, tempPoints[0].y);
        for (let i = 1; i < tempPoints.length; i++) {
          ctx.lineTo(tempPoints[i].x, tempPoints[i].y);
        }
        if (hoverPos) {
          ctx.lineTo(hoverPos.x, hoverPos.y);
        }
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = activeTool === 'left_boundary' ? 'rgba(0, 188, 242, 0.7)' : 'rgba(16, 124, 16, 0.7)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        if (hoverPos) {
          const startPt = tempPoints[0];
          const distToStart = Math.sqrt(Math.pow(hoverPos.x - startPt.x, 2) + Math.pow(hoverPos.y - startPt.y, 2));
          if (distToStart < 20) {
            ctx.beginPath();
            ctx.arc(startPt.x, startPt.y, 12, 0, 2 * Math.PI);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
        tempPoints.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
        });
      }

      if (activeTool === 'road_poly' && tempPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(tempPoints[0].x, tempPoints[0].y);
        for (let i = 1; i < tempPoints.length; i++) {
          ctx.lineTo(tempPoints[i].x, tempPoints[i].y);
        }
        if (hoverPos) {
          ctx.lineTo(hoverPos.x, hoverPos.y);
        }
        ctx.closePath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.7)';
        ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
        ctx.setLineDash([4, 4]);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        if (hoverPos) {
          const startPt = tempPoints[0];
          const distToStart = Math.sqrt(Math.pow(hoverPos.x - startPt.x, 2) + Math.pow(hoverPos.y - startPt.y, 2));
          if (distToStart < 20) {
            ctx.beginPath();
            ctx.arc(startPt.x, startPt.y, 12, 0, 2 * Math.PI);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
        tempPoints.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
        });
      }

      if ((activeTool === 'pothole_poly' || activeTool === 'crack_line') && tempPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(tempPoints[0].x, tempPoints[0].y);
        for (let i = 1; i < tempPoints.length; i++) {
          ctx.lineTo(tempPoints[i].x, tempPoints[i].y);
        }
        if (hoverPos) {
          ctx.lineTo(hoverPos.x, hoverPos.y);
        }
        ctx.lineWidth = 2;
        ctx.strokeStyle = activeTool === 'pothole_poly' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 185, 0, 0.6)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        if (hoverPos) {
          const startPt = tempPoints[0];
          const distToStart = Math.sqrt(Math.pow(hoverPos.x - startPt.x, 2) + Math.pow(hoverPos.y - startPt.y, 2));
          if (distToStart < 20) {
            ctx.beginPath();
            ctx.arc(startPt.x, startPt.y, 12, 0, 2 * Math.PI);
            ctx.strokeStyle = activeTool === 'pothole_poly' ? '#EF4444' : '#FFB900';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }

        tempPoints.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = activeTool === 'pothole_poly' ? '#EF4444' : '#FFB900';
          ctx.fill();
        });
      }

      if (activeTool === 'rectangle' && tempPoints.length === 1 && hoverPos) {
        const p1 = tempPoints[0];
        const p2 = hoverPos;
        ctx.save();
        ctx.beginPath();
        ctx.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 185, 0, 0.6)';
        ctx.fillStyle = 'rgba(255, 185, 0, 0.1)';
        ctx.setLineDash([5, 5]);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Real-time HUD readout
        const rectMetrics = MeasurementService.getRectangleDimensions(p1, p2, homographyMatrix);
        const confidence = MeasurementService.getMeasurementConfidence([p1, p2], homographyMatrix);
        const dispLabel = `W: ${rectMetrics.width.toFixed(2)}m, H: ${rectMetrics.height.toFixed(2)}m | Area: ${rectMetrics.area.toFixed(2)}m² [Conf: ${confidence}%]`;

        const midX = (p1.x + p2.x) / 2;
        const topY = Math.min(p1.y, p2.y);
        ctx.save();
        ctx.font = 'bold 10px monospace';
        const txtW = ctx.measureText(dispLabel).width;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(midX - txtW/2 - 4, topY - 20, txtW + 8, 16);
        ctx.fillStyle = '#FFB900';
        ctx.fillText(dispLabel, midX - txtW/2, topY - 8);
        ctx.restore();
      }
    }

    // --- AI INFERENCE OVERLAY RENDERING ---
    
    // 1. Draw Segmentation Masks
    if (overlayVisibility.segmentation && inferenceResults.segmentation) {
      Object.values(inferenceResults.segmentation).forEach((mask: any) => {
        if (!mask.polygons) return;
        
        ctx.save();
        // Determine fill color
        let color = mask.color || '#0078D4';
        if (mask.class === 'road' && overlayColors.road) color = overlayColors.road;
        if (mask.class === 'pothole' && overlayColors.pothole) color = overlayColors.pothole;
        if (mask.class === 'crack' && overlayColors.crack) color = overlayColors.crack;
        
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        
        mask.polygons.forEach((poly: any) => {
          if (poly.length < 2) return;
          
          ctx.beginPath();
          ctx.moveTo(poly[0][0], poly[0][1]);
          for (let i = 1; i < poly.length; i++) {
            ctx.lineTo(poly[i][0], poly[i][1]);
          }
          ctx.closePath();
          
          // Fill with transparency
          ctx.globalAlpha = overlayOpacity * (mask.opacity || 0.5);
          ctx.fill();
          
          // Crack lines drawn as stroke
          if (mask.class === 'crack') {
            ctx.globalAlpha = overlayOpacity * 1.5;
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }
        });
        ctx.restore();
      });
    }

    // --- DRAW MANUAL DISTRESS OVERLAYS (Phase 5) ---
    if (overlayVisibility.segmentation && distressItems) {
      distressItems.forEach((d) => {
        if (!d.pixels || d.pixels.length < 2) return;
        ctx.save();
        const color = d.class === 'pothole' ? '#D13438' : '#FFB900';
        ctx.strokeStyle = color;
        ctx.fillStyle = d.class === 'pothole' ? 'rgba(209, 52, 56, 0.25)' : 'rgba(255, 185, 0, 0.15)';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(d.pixels[0].x, d.pixels[0].y);
        for (let i = 1; i < d.pixels.length; i++) {
          ctx.lineTo(d.pixels[i].x, d.pixels[i].y);
        }
        if (d.class === 'pothole') {
          ctx.closePath();
          ctx.fill();
        }
        ctx.stroke();

        // Render Label Badge
        let sumX = 0, sumY = 0;
        d.pixels.forEach(p => { sumX += p.x; sumY += p.y; });
        const cx = sumX / d.pixels.length;
        const cy = sumY / d.pixels.length;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px monospace';
        
        let label = '';
        if (d.class === 'pothole') {
          label = `[POTHOLE] Area: ${d.area_sq_m}m² | Dist: ${d.distance_m}m`;
        } else {
          label = `[CRACK] Len: ${d.length_m}m | Width: ${d.width_mm}mm`;
        }

        const txtW = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(cx - txtW / 2 - 4, cy - 14, txtW + 8, 12);
        ctx.fillStyle = color;
        ctx.fillText(label, cx - txtW / 2, cy - 5);
        ctx.restore();
      });
    }

    // --- DRAW AI DISTRESS ANNOTATION TAGS (Phase 5) ---
    if (overlayVisibility.segmentation && inferenceResults.distress) {
      const { potholes, cracks } = inferenceResults.distress;
      
      potholes.forEach((p) => {
        if (!p.pixels || p.pixels.length < 2) return;
        ctx.save();
        const color = p.severity === 'critical' || p.severity === 'high' ? '#EF4444' : '#F59E0B';
        
        let sumX = 0, sumY = 0;
        p.pixels.forEach((pt: any) => { sumX += pt[0]; sumY += pt[1]; });
        const cx = sumX / p.pixels.length;
        const cy = sumY / p.pixels.length;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px monospace';
        const label = `[POTHOLE] ${p.severity.toUpperCase()} | Area: ${p.area_sq_m}m² | Dist: ${p.distance_m}m`;
        const txtW = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(cx - txtW / 2 - 4, cy - 14, txtW + 8, 12);
        ctx.fillStyle = color;
        ctx.fillText(label, cx - txtW / 2, cy - 5);
        ctx.restore();
      });

      cracks.forEach((c) => {
        if (!c.pixels || c.pixels.length < 2) return;
        ctx.save();
        const color = '#FFB900';
        
        let sumX = 0, sumY = 0;
        c.pixels.forEach((pt: any) => { sumX += pt[0]; sumY += pt[1]; });
        const cx = sumX / c.pixels.length;
        const cy = sumY / c.pixels.length;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px monospace';
        const label = `[CRACK] ${(c.type || 'crack').toUpperCase()} | Len: ${c.length_m}m | Width: ${c.width_mm}mm`;
        const txtW = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(cx - txtW / 2 - 4, cy - 14, txtW + 8, 12);
        ctx.fillStyle = color;
        ctx.fillText(label, cx - txtW / 2, cy - 5);
        ctx.restore();
      });
    }

    // 2. Draw Lane Lines
    if (overlayVisibility.lanes && (inferenceResults.lanes || (inferenceResults as any).rejected_lanes)) {
      const allLanes = inferenceResults.lanes || [];
      const rejectedLanes = (inferenceResults as any).rejected_lanes || [];
      const horizonY = canvasRef.current ? Math.round(canvasRef.current.height * 0.38) : 273;

      // Helpers for validation
      const isPointInPolygon = (x: number, y: number, poly: Point2D[]) => {
        if (!poly || poly.length < 3) return true;
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

      const isPointOutsideBoundaries = (x: number, y: number) => {
        if (leftRoadBoundary && leftRoadBoundary.length >= 2) {
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
        if (rightRoadBoundary && rightRoadBoundary.length >= 2) {
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

      const isPointValid = (pt: Point2D) => {
        // Horizon Check
        if (pt.y < horizonY) return false;
        // Calibration ROI Check
        if (activeCalibration && activeCalibration.image_points.length === 4) {
          if (!isPointInPolygon(pt.x, pt.y, activeCalibration.image_points)) {
            return false;
          }
        }
        // Road boundary lines check
        if (isPointOutsideBoundaries(pt.x, pt.y)) return false;
        // Road mask polygon check
        if (roadPolygon && roadPolygon.length >= 3 && !isPointInPolygon(pt.x, pt.y, roadPolygon)) {
          return false;
        }
        return true;
      };

      // Draw rejected lanes from backend
      rejectedLanes.forEach((lane: any) => {
        const rawPoints = (lane.points || []).map((pt: any) =>
          Array.isArray(pt) ? { x: pt[0], y: pt[1] } : pt
        );
        if (rawPoints.length < 2) return;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(rawPoints[0].x, rawPoints[0].y);
        for (let i = 1; i < rawPoints.length; i++) {
          ctx.lineTo(rawPoints[i].x, rawPoints[i].y);
        }
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#EF4444'; // Red
        ctx.setLineDash([4, 4]);
        ctx.stroke();

        const midPt = rawPoints[Math.floor(rawPoints.length / 2)];
        drawTextWithOutline('REJECTED: ' + (lane.reason || 'Geometry Out of ROI'), midPt.x + 8, midPt.y, '#EF4444', 10);
        ctx.restore();
      });

      // Process accepted/model lanes
      allLanes.forEach((lane: any) => {
        const rawPoints = (lane.points || []).map((pt: any) =>
          Array.isArray(pt) ? { x: pt[0], y: pt[1] } : pt
        );
        if (rawPoints.length < 2) return;

        // 1. Raw Model Output
        if (activeVisualizationLayers.rawModelOutput) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(rawPoints[0].x, rawPoints[0].y);
          for (let i = 1; i < rawPoints.length; i++) {
            ctx.lineTo(rawPoints[i].x, rawPoints[i].y);
          }
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = 'rgba(0, 188, 242, 0.45)'; // Semi-transparent blue
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.restore();
        }

        // Split points into chunks based on validity
        const segments: { isValid: boolean; points: Point2D[] }[] = [];
        let currentSegment: { isValid: boolean; points: Point2D[] } | null = null;

        rawPoints.forEach((pt: Point2D) => {
          const valid = isPointValid(pt);
          if (!currentSegment || currentSegment.isValid !== valid) {
            currentSegment = { isValid: valid, points: [pt] };
            segments.push(currentSegment);
          } else {
            currentSegment.points.push(pt);
          }
        });

        // Draw segments
        segments.forEach((seg) => {
          if (seg.points.length < 2) return;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(seg.points[0].x, seg.points[0].y);
          for (let i = 1; i < seg.points.length; i++) {
            ctx.lineTo(seg.points[i].x, seg.points[i].y);
          }
          ctx.lineWidth = lane.is_ego ? 4.5 : 2.5;

          if (seg.isValid) {
            // Draw accepted segments
            if (activeVisualizationLayers.postprocessedLane || activeVisualizationLayers.finalProjectedLane) {
              ctx.strokeStyle = overlayColors.lanes || '#107C10';
              if (!lane.is_ego) {
                ctx.setLineDash([8, 8]);
              }
              ctx.stroke();
            }
          } else {
            // Draw rejected segments in RED (Debug Mode / Warnings visualization)
            ctx.strokeStyle = '#EF4444';
            ctx.setLineDash([2, 4]);
            ctx.stroke();

            const midPt = seg.points[Math.floor(seg.points.length / 2)];
            drawTextWithOutline('REJECTED POINT', midPt.x + 6, midPt.y, '#EF4444', 9);
          }
          ctx.restore();
        });

        // Label/Confidence drawing on bottom of lane
        if (lane.is_ego && rawPoints.length > 5 && (activeVisualizationLayers.postprocessedLane || activeVisualizationLayers.finalProjectedLane)) {
          const lblPt = rawPoints[rawPoints.length - 2];
          drawTextWithOutline(`Ego (${Math.round(lane.confidence * 100)}%)`, lblPt.x - 15, lblPt.y - 8, '#FFFFFF', 10);
        }
      });
    }

    // 3. Draw Vehicle Bounding Boxes & Tracking overlays
    if (overlayVisibility.boundingBoxes) {
      const tracks = inferenceResults.tracks || [];
      const hasTracks = tracks.length > 0;
      const H_inv = HomographyService.invert(homographyMatrix);

      if (hasTracks) {
        // Draw track trails first (underneath the boxes)
        tracks.forEach((track) => {
          if (track.history && track.history.length > 1 && H_inv) {
            ctx.save();
            ctx.beginPath();
            
            // Limit trail to configured length
            const trailSlice = track.history.slice(-trailLength);
            const firstPt = CoordinateTransformService.worldToPixel({ x: trailSlice[0][0], y: trailSlice[0][1] }, H_inv);
            ctx.moveTo(firstPt.x, firstPt.y);
            
            for (let i = 1; i < trailSlice.length; i++) {
              const pt = CoordinateTransformService.worldToPixel({ x: trailSlice[i][0], y: trailSlice[i][1] }, H_inv);
              ctx.lineTo(pt.x, pt.y);
            }
            
            const isSelected = track.id === selectedTrackId;
            const strokeColor = isSelected ? '#FFB900' : overlayColors.boundingBoxes;
            ctx.strokeStyle = strokeColor;
            ctx.globalAlpha = 0.65;
            ctx.lineWidth = isSelected ? 3.5 : 2.0;
            ctx.setLineDash([2, 4]); // Cool dashed path
            ctx.stroke();
            ctx.restore();
          }
        });

        // Draw distance lines from bottom of screen (Ego) to vehicles
        tracks.forEach((track) => {
          if (track.box && track.box.length === 4) {
            const [x1, , x2, y2] = track.box;
            const bottomCenterX = (x1 + x2) / 2;
            const bottomCenterY = y2;
            const egoX = canvasRef.current!.width / 2;
            const egoY = canvasRef.current!.height;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(egoX, egoY);
            ctx.lineTo(bottomCenterX, bottomCenterY);
            ctx.strokeStyle = 'rgba(0, 188, 242, 0.22)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);
            ctx.stroke();

            // Draw distance label
            const midX = (egoX + bottomCenterX) / 2;
            const midY = (egoY + bottomCenterY) / 2;
            ctx.fillStyle = '#00BCF2';
            ctx.font = 'bold 9px monospace';
            const distVal = distanceUnit === 'cm' ? `${(track.distance_to_ego * 100).toFixed(0)} cm` : `${track.distance_to_ego.toFixed(1)} m`;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 3;
            ctx.fillText(distVal, midX + 6, midY);
            ctx.restore();
          }
        });

        // Draw gap lines between vehicles in same lane
        tracks.forEach((track) => {
          if (track.gap_front && track.box && track.box.length === 4) {
            const laneTracks = tracks.filter(t => t.lane_index === track.lane_index && t.id !== track.id);
            const frontTrack = laneTracks
              .filter(t => t.world_pos[1] > track.world_pos[1])
              .sort((a, b) => a.world_pos[1] - b.world_pos[1])[0];

            if (frontTrack && frontTrack.box && frontTrack.box.length === 4) {
              const [x1, y1, x2] = track.box;
              const [fx1, , fx2, fy2] = frontTrack.box;
              
              const tx = (x1 + x2) / 2;
              const ty = y1;
              const fx = (fx1 + fx2) / 2;
              const fy = fy2;

              ctx.save();
              ctx.beginPath();
              ctx.moveTo(tx, ty);
              ctx.lineTo(fx, fy);
              ctx.strokeStyle = track.gap_front < 15 ? 'rgba(209, 52, 56, 0.65)' : 'rgba(16, 124, 16, 0.5)';
              ctx.lineWidth = 2;
              ctx.stroke();

              const midX = (tx + fx) / 2;
              const midY = (ty + fy) / 2;
              ctx.fillStyle = track.gap_front < 15 ? '#D13438' : '#107C10';
              ctx.font = 'extrabold 9px monospace';
              const gapVal = distanceUnit === 'cm' ? `${(track.gap_front * 100).toFixed(0)} cm` : `${track.gap_front.toFixed(1)} m`;
              ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
              ctx.shadowBlur = 3;
              ctx.fillText(`Gap: ${gapVal}`, midX + 8, midY);
              ctx.restore();
            }
          }
        });

        // Draw bounding boxes
        tracks.forEach((track) => {
          if (!track.box || track.box.length !== 4) return;
          
          const [x1, y1, x2, y2] = track.box;
          const w = x2 - x1;
          const h = y2 - y1;
          
          const isSelected = track.id === selectedTrackId;
          const boxColor = isSelected ? '#FFB900' : (overlayColors.boundingBoxes || '#00BCF2');

          ctx.save();
          ctx.lineWidth = isSelected ? 4 : 2.5;
          ctx.strokeStyle = boxColor;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 6;
          ctx.strokeRect(x1, y1, w, h);
          ctx.restore();
          
          const dispSpeed = speedUnit === 'm/s' ? `${Math.round(track.speed / 3.6)} m/s` : `${Math.round(track.speed)} km/h`;
          const label = `[#${track.id}] ${track.class} • ${dispSpeed}`;
          
          const minSize = isSelected ? 16 : 12;
          const fontSize = getCanvasFontSize(minSize);
          
          ctx.save();
          ctx.font = `bold ${fontSize}px Inter, sans-serif`;
          const textWidth = ctx.measureText(label).width;
          const paddingX = 8;
          const paddingY = 4;
          const rectW = textWidth + paddingX * 2;
          const rectH = fontSize + paddingY * 2;
          
          const rx = x1;
          const ry = y1 - rectH;
          
          ctx.fillStyle = boxColor;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(rx, ry, rectW, rectH, 4);
          } else {
            ctx.rect(rx, ry, rectW, rectH);
          }
          ctx.fill();
          
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 1;
          ctx.stroke();
          
          ctx.fillStyle = isSelected ? '#000000' : '#FFFFFF';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, rx + paddingX, ry + rectH / 2);
          ctx.restore();
        });

      } else {
        // Fallback: Basic detections
        inferenceResults.detections.forEach((det: any) => {
          if (!det.box || det.box.length !== 4) return;
          
          const [x1, y1, x2, y2] = det.box;
          const w = x2 - x1;
          const h = y2 - y1;
          
          ctx.save();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = overlayColors.boundingBoxes || '#00BCF2';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 4;
          ctx.strokeRect(x1, y1, w, h);
          ctx.restore();
          
          const label = `[${det.id}] ${det.class} ${Math.round(det.confidence * 100)}%`;
          const fontSize = getCanvasFontSize(12);
          
          ctx.save();
          ctx.font = `bold ${fontSize}px Inter, sans-serif`;
          const textWidth = ctx.measureText(label).width;
          const paddingX = 8;
          const paddingY = 4;
          const rectW = textWidth + paddingX * 2;
          const rectH = fontSize + paddingY * 2;
          
          const rx = x1;
          const ry = y1 - rectH;
          
          ctx.fillStyle = overlayColors.boundingBoxes || '#00BCF2';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(rx, ry, rectW, rectH, 4);
          } else {
            ctx.rect(rx, ry, rectW, rectH);
          }
          ctx.fill();
          
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 1;
          ctx.stroke();
          
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, rx + paddingX, ry + rectH / 2);
          ctx.restore();
        });
      }
    }

    ctx.shadowBlur = 0;
  }, [
    tempPoints,
    hoverPos,
    activeTool,
    activeCalibration,
    measurements,
    currentVideo.url,
    settings.units,
    homographyMatrix,
    inferenceResults,
    overlayVisibility,
    overlayOpacity,
    overlayColors,
    selectedTrackId,
    speedUnit,
    distanceUnit,
    trailLength,
    trafficLines,
    trafficROIs,
    leftRoadBoundary,
    rightRoadBoundary,
    roadPolygon,
    activeVisualizationLayers
  ]);

  const handleVideoLoaded = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    canvasRef.current.width = v.videoWidth || 800;
    canvasRef.current.height = v.videoHeight || 600;
    resetZoom();
  };

  const resetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex-1 relative overflow-hidden bg-gray-950 canvas-bg-pattern flex flex-col items-center justify-center border-b border-gray-250 dark:border-gray-800"
    >
      {!currentVideo.url ? (
        <div className="flex flex-col items-center justify-center p-8 max-w-lg w-full text-center">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-brand-blue to-brand-sky text-white flex items-center justify-center shadow-2xl shadow-brand-blue/30 animate-pulse mb-6">
            <Upload className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-extrabold text-white">Upload Survey Video</h3>
          <p className="text-gray-400 mt-2 text-xs md:text-sm leading-relaxed max-w-sm">
            Drag and drop your video file here, or browse from local directories. Supports MP4, AVI, and MOV files.
          </p>
          
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            <label className="cursor-pointer px-4 py-2.5 rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold text-sm shadow-md shadow-brand-blue/20 transition-all flex items-center justify-center space-x-1.5 w-full sm:w-auto">
              <span>Browse Files</span>
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/avi"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
            <button
              onClick={loadSampleVideo}
              className="px-4 py-2.5 rounded-lg border border-gray-700 bg-gray-900/60 hover:bg-gray-800 text-gray-300 font-semibold text-sm transition-all flex items-center justify-center space-x-1.5 w-full sm:w-auto"
            >
              <span>Load Sample Video</span>
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center text-xs text-gray-500 space-x-2">
            <HelpCircle className="w-4 h-4 text-gray-600" />
            <span>Files are processed locally on your system.</span>
          </div>
        </div>
      ) : (
        <>
          <div
            className="relative select-none"
            style={{
              transform: `scale(${zoomScale}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.1s ease-out'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <video
              ref={videoRef}
              src={currentVideo.url}
              loop
              muted
              onLoadedMetadata={handleVideoLoaded}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              className="max-h-[65vh] object-contain shadow-2xl block bg-black rounded"
              style={{ pointerEvents: 'none' }}
            />

            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full cursor-crosshair rounded"
            />
          </div>

          {/* Floating Measurement Toolbar */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-lg p-1.5 space-x-1 z-10 text-gray-300 shadow-xl">
            {[
              { type: 'select', icon: MousePointer, label: 'Select (V)' },
              { type: 'point', icon: MapPin, label: 'Point Marker' },
              { type: 'line', icon: Ruler, label: 'Line / Distance (L)' },
              { type: 'polygon', icon: Hexagon, label: 'Polygon / Area (P)' },
              { type: 'rectangle', icon: Square, label: 'Rectangle Area' },
              { type: 'angle', icon: CornerDownRight, label: 'Angle Tool (A)' },
              { type: 'grid', icon: Grid3X3, label: 'Perspective Grid (G)' },
              { type: 'coordinate', icon: Compass, label: 'Coordinate Marker' }
            ].map(tool => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.type;
              return (
                <button
                  key={tool.type}
                  onClick={() => {
                    setTempPoints([]);
                    setActiveTool(tool.type as any);
                  }}
                  type="button"
                  title={tool.label}
                  className={`p-1.5 rounded transition-all flex items-center justify-center ${
                    isActive
                      ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/30 scale-105'
                      : 'hover:bg-gray-800 hover:text-white text-gray-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>

          <div className="absolute top-4 right-4 flex items-center bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-lg p-1.5 space-x-1.5 z-10 text-gray-300 shadow-xl">
            <button
              onClick={() => setZoomScale(Math.min(5.0, zoomScale + 0.1))}
              title="Zoom In"
              className="p-1.5 rounded hover:bg-gray-800 hover:text-white transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomScale(Math.max(0.5, zoomScale - 0.1))}
              title="Zoom Out"
              className="p-1.5 rounded hover:bg-gray-800 hover:text-white transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={resetZoom}
              title="Reset View"
              className="p-1.5 rounded hover:bg-gray-800 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const el = containerRef.current;
                if (el) {
                  if (!document.fullscreenElement) {
                    el.requestFullscreen().catch(err => console.error(err));
                  } else {
                    document.exitFullscreen();
                  }
                }
              }}
              title="Fullscreen Mode"
              className="p-1.5 rounded hover:bg-gray-800 hover:text-white transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-gray-800 mx-1"></div>
            <div className="text-[10px] font-mono font-bold px-2 uppercase text-gray-500 tracking-wider">
              Scale: {Math.round(zoomScale * 100)}%
            </div>
          </div>

          {activeTool !== 'select' && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-brand-blue/95 border border-brand-sky/30 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xl z-10 backdrop-blur-md flex items-center space-x-2 animate-bounce">
              <Move className="w-4 h-4 animate-pulse" />
              <span>
                {activeTool === 'grid' && 'Drag the blue corners to adjust the perspective grid.'}
                {activeTool === 'point' && 'Click anywhere to mark a point coordinate.'}
                {activeTool === 'line' && 'Click two points to measure distance.'}
                {activeTool === 'polygon' && `Click points to draw area. Click start point (circle) to complete.`}
                {activeTool === 'rectangle' && 'Click two corners to draw a rectangle area.'}
                {activeTool === 'angle' && `Click 3 points. The 2nd point is the angle vertex.`}
                {activeTool === 'coordinate' && 'Click anywhere to resolve calibration world coordinates.'}
                {activeTool === 'left_boundary' && 'Click points to draw left boundary. Click start point (circle) to complete.'}
                {activeTool === 'right_boundary' && 'Click points to draw right boundary. Click start point (circle) to complete.'}
                {activeTool === 'road_poly' && 'Click points to draw road polygon mask. Click start point (circle) to complete.'}
              </span>
              <button
                onClick={() => {
                  setTempPoints([]);
                  setActiveTool('select');
                }}
                className="ml-2 bg-white/20 hover:bg-white/30 text-white rounded px-1.5 py-0.5 font-bold transition-colors text-[10px]"
              >
                Cancel
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
export default VideoCanvas;
