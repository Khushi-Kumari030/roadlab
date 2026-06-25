import React, { useState, useEffect } from 'react';
import { useRoadLab } from '../../context/RoadLabContext';
import {
  Play,
  Pause,
  Square,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ZoomIn,
  Zap,
  Activity
} from 'lucide-react';

export const Timeline: React.FC = () => {
  const {
    currentVideo,
    currentFrame,
    setCurrentFrame,
    isPlaying,
    setIsPlaying,
    models,
    activeInferenceModel,
    setActiveInferenceModel,
    inferenceRunning,
    inferencePaused,
    inferenceFPS,
    inferenceProcessedFrames,
    startInference,
    pauseInference,
    resumeInference,
    stopInference
  } = useRoadLab();

  const [jumpInput, setJumpInput] = useState('');
  const [timelineZoom, setTimelineZoom] = useState(1);

  // Sync input value with currentFrame
  useEffect(() => {
    setJumpInput(currentFrame.toString());
  }, [currentFrame]);

  if (!currentVideo.url) {
    return (
      <div className="h-full bg-gray-900 border-t border-gray-800 flex items-center justify-center text-gray-500 text-sm">
        No active video timeline. Please load a survey video.
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (inferenceRunning) {
      alert("Inference is running. Stop inference to return to standard playback.");
      return;
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    if (inferenceRunning) {
      stopInference();
    }
    setIsPlaying(false);
    setCurrentFrame(0);
    const video = document.querySelector('video');
    if (video) video.currentTime = 0;
  };

  const handleStep = (step: number) => {
    if (inferenceRunning) return;
    setIsPlaying(false);
    const nextFrame = Math.max(0, Math.min(currentVideo.totalFrames, currentFrame + step));
    setCurrentFrame(nextFrame);
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inferenceRunning) return;
    const frameNum = parseInt(jumpInput);
    if (!isNaN(frameNum)) {
      const targetFrame = Math.max(0, Math.min(currentVideo.totalFrames, frameNum));
      setCurrentFrame(targetFrame);
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (inferenceRunning) return;
    setIsPlaying(false);
    const targetFrame = parseInt(e.target.value);
    setCurrentFrame(targetFrame);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = models.find(m => m.id === e.target.value);
    if (selected) {
      setActiveInferenceModel(selected);
    }
  };

  const tickCount = 40;
  const ticks = Array.from({ length: tickCount });

  // Calculate inference progress percentage
  const inferencePct = currentVideo.totalFrames > 0
    ? (inferenceProcessedFrames / currentVideo.totalFrames) * 100
    : 0;

  return (
    <div className="bg-gray-900 border-t border-gray-850 px-4 py-3 text-gray-200 flex flex-col h-full select-none overflow-y-auto">
      
      {/* --- AI INFERENCE CONTROLS TOOLBAR ROW --- */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3 mb-2.5 text-xs">
        
        {/* Model Selector */}
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-gray-400">AI Model:</span>
          <select
            value={activeInferenceModel?.id || ''}
            onChange={handleModelChange}
            disabled={inferenceRunning}
            className="bg-gray-950 border border-gray-800 rounded px-2.5 py-1 text-xs text-brand-sky font-semibold focus:outline-none disabled:opacity-40"
          >
            {models.length === 0 ? (
              <option value="">No models registered</option>
            ) : (
              models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.type})
                </option>
              ))
            )}
          </select>
        </div>

        {/* Inference Action Buttons */}
        <div className="flex items-center space-x-2">
          {!inferenceRunning ? (
            <button
              onClick={startInference}
              title="Run AI model inference on video"
              className="flex items-center space-x-1.5 px-3 py-1 rounded bg-brand-blue hover:bg-brand-blue/90 text-white font-bold transition-all shadow-md shadow-brand-blue/10"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Run Inference</span>
            </button>
          ) : (
            <div className="flex items-center space-x-1.5">
              {inferencePaused ? (
                <button
                  onClick={resumeInference}
                  title="Resume inference"
                  className="flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Resume</span>
                </button>
              ) : (
                <button
                  onClick={pauseInference}
                  title="Pause inference"
                  className="flex items-center space-x-1 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors"
                >
                  <Pause className="w-3 h-3 fill-white" />
                  <span>Pause</span>
                </button>
              )}

              <button
                onClick={stopInference}
                title="Stop inference"
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-red-650 hover:bg-red-700 text-white font-bold transition-colors"
              >
                <Square className="w-3 h-3 fill-white" />
                <span>Stop</span>
              </button>
            </div>
          )}
        </div>

        {/* Inference HUD progress & FPS stats */}
        {inferenceRunning && (
          <div className="flex items-center space-x-4 font-mono text-[11px] bg-gray-950 px-3 py-1 rounded border border-gray-800">
            <div className="flex items-center space-x-1 text-brand-sky">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>Speed: {inferenceFPS.toFixed(1)} FPS</span>
            </div>
            <div className="h-3 w-px bg-gray-800"></div>
            <div>
              Processed: {inferenceProcessedFrames} / {currentVideo.totalFrames} frames
            </div>
            
            {/* HUD Mini progress bar */}
            <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden border border-gray-750">
              <div
                className="h-full bg-brand-sky transition-all duration-100"
                style={{ width: `${inferencePct}%` }}
              />
            </div>
          </div>
        )}

      </div>

      {/* --- STANDARD TIMELINE RULER & SCRUBBER --- */}
      <div className="flex-1 flex flex-col justify-center min-h-[30px] mb-2.5">
        <div className="relative w-full h-4 overflow-hidden mb-1 flex items-end">
          <div
            className="absolute inset-0 flex justify-between px-1 pointer-events-none opacity-20"
            style={{ width: `${100 * timelineZoom}%` }}
          >
            {ticks.map((_, i) => (
              <div
                key={i}
                className={`w-0.5 bg-gray-400 ${i % 5 === 0 ? 'h-3 bg-brand-sky' : 'h-1.5'}`}
              />
            ))}
          </div>
          <div
            className="absolute top-0 transform -translate-x-1/2 text-[10px] text-brand-sky font-mono font-bold bg-gray-950 px-1 py-0.5 rounded border border-brand-sky/20 z-10 pointer-events-none"
            style={{ left: `${(currentFrame / currentVideo.totalFrames) * 100}%` }}
          >
            {inferenceRunning ? `PROCESSED: ${currentFrame}` : `F: ${currentFrame}`}
          </div>
        </div>

        <div className="relative">
          <input
            type="range"
            min={0}
            max={currentVideo.totalFrames}
            value={currentFrame}
            onChange={handleScrub}
            disabled={inferenceRunning}
            className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-sky focus:outline-none disabled:opacity-50"
          />
        </div>
      </div>

      {/* --- PLAYER DETAILS CONTROLS ROW --- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm flex-shrink-0">
        
        {/* Left Side: Frame & Time Info */}
        <div className="flex items-center space-x-4 font-mono">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase font-semibold">Frame</span>
            <span className="text-sm font-bold text-gray-200">
              {currentFrame} <span className="text-gray-600">/</span> {currentVideo.totalFrames}
            </span>
          </div>
          <div className="h-6 w-px bg-gray-800"></div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase font-semibold">Timestamp</span>
            <span className="text-sm font-bold text-brand-sky">
              {formatTime((currentFrame / currentVideo.fps))} <span className="text-gray-600 text-xs">/ {formatTime(currentVideo.duration)}</span>
            </span>
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase font-semibold">Resolution</span>
            <span className="text-xs font-semibold text-gray-400">{currentVideo.resolution}</span>
          </div>
        </div>

        {/* Middle: Player Buttons */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleStep(-10)}
            disabled={inferenceRunning}
            title="Step Back 10 Frames"
            className="p-2 rounded hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-20"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStep(-1)}
            disabled={inferenceRunning}
            title="Step Back 1 Frame"
            className="p-2 rounded hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-20"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <button
            onClick={handlePlayPause}
            disabled={inferenceRunning}
            className={`mx-2 p-3 rounded-full text-white transition-all shadow-lg disabled:opacity-50 ${
              isPlaying
                ? 'bg-brand-sky hover:bg-brand-sky/95 shadow-brand-sky/20'
                : 'bg-brand-blue hover:bg-brand-blue/95 shadow-brand-blue/20'
            }`}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
          </button>

          <button
            onClick={handleStop}
            title="Stop / Reset"
            className="p-2 rounded hover:bg-gray-850 text-gray-400 hover:text-white"
          >
            <Square className="w-4 h-4 fill-gray-400" />
          </button>

          <button
            onClick={() => handleStep(1)}
            disabled={inferenceRunning}
            title="Step Forward 1 Frame"
            className="p-2 rounded hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-20"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStep(10)}
            disabled={inferenceRunning}
            title="Step Forward 10 Frames"
            className="p-2 rounded hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-20"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right Side: Jump to Frame & Timeline Zoom */}
        <div className="flex items-center space-x-3.5">
          <form onSubmit={handleJumpSubmit} className="flex items-center space-x-1.5">
            <span className="text-[10px] text-gray-500 uppercase font-semibold">Jump:</span>
            <input
              type="text"
              value={jumpInput}
              disabled={inferenceRunning}
              onChange={(e) => setJumpInput(e.target.value)}
              className="w-14 bg-gray-950 border border-gray-800 rounded px-1.5 py-1 text-center font-mono text-xs text-brand-sky focus:outline-none focus:border-brand-sky disabled:opacity-40"
            />
          </form>

          <div className="flex items-center space-x-1 text-gray-500">
            <ZoomIn className="w-3.5 h-3.5" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.5}
              value={timelineZoom}
              onChange={(e) => setTimelineZoom(parseFloat(e.target.value))}
              className="w-16 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-sky"
            />
          </div>
        </div>

      </div>

    </div>
  );
};
export default Timeline;
