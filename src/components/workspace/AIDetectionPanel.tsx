import React, { useState } from 'react';
import { useRoadLab } from '../../context/RoadLabContext';
import {
  List,
  Search,
  AlertCircle
} from 'lucide-react';

export const AIDetectionPanel: React.FC = () => {
  const {
    inferenceResults,
    currentFrame
  } = useRoadLab();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');

  const detections = inferenceResults.detections || [];
  
  // Calculate summary metrics for the current frame
  const totalObjects = detections.length;
  
  const uniqueClasses = Array.from(new Set(detections.map(d => d.class)));
  const classesString = uniqueClasses.length > 0 ? uniqueClasses.join(', ') : 'None';
  
  const avgConfidence = totalObjects > 0
    ? (detections.reduce((sum, d) => sum + d.confidence, 0) / totalObjects) * 100
    : 0;

  // Filter detections list
  const filteredDetections = detections.filter(d => {
    const matchesSearch = d.class.toLowerCase().includes(searchTerm.toLowerCase()) || d.id.toString().includes(searchTerm);
    const matchesClass = selectedClass === 'All' || d.class === selectedClass;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-150 p-5 overflow-hidden transition-workspace text-sm">
      
      {/* Title */}
      <div className="flex items-center space-x-2 pb-4 mb-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <List className="w-5 h-5 text-brand-blue" />
        <h3 className="font-extrabold text-base">Inference Readout</h3>
      </div>

      {/* 1. Detection Summary Widgets */}
      <div className="grid grid-cols-3 gap-2.5 mb-5 flex-shrink-0">
        <div className="bg-gray-50 dark:bg-gray-850 p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 text-center">
          <span className="text-[9px] uppercase font-bold text-gray-400">Detections</span>
          <p className="text-base font-extrabold mt-0.5 text-brand-sky">{totalObjects}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-850 p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 text-center">
          <span className="text-[9px] uppercase font-bold text-gray-400">Avg Conf</span>
          <p className="text-base font-extrabold mt-0.5 text-success">{avgConfidence.toFixed(0)}%</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-850 p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 text-center">
          <span className="text-[9px] uppercase font-bold text-gray-400">Class Types</span>
          <p className="text-xs font-bold mt-1 text-gray-300 truncate" title={classesString}>{uniqueClasses.length}</p>
        </div>
      </div>

      {/* Search & Class Filter */}
      <div className="space-y-2 mb-4 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search class or tracking ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 text-xs focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>

        {/* Categories Pills */}
        <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-[10px]">
          {['All', 'car', 'truck', 'motorcycle', 'bus'].map(cls => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              className={`px-2.5 py-0.5 rounded-full border font-bold transition-all ${
                selectedClass === cls
                  ? 'bg-brand-blue border-brand-blue text-white'
                  : 'bg-white dark:bg-gray-850 dark:hover:bg-gray-850 border-gray-200 dark:border-gray-750 text-gray-500 hover:text-gray-300'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Detections Table */}
      <div className="flex-1 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden flex flex-col min-h-0 bg-gray-50/50 dark:bg-gray-950/20">
        <div className="overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-850/60 border-b border-gray-200 dark:border-gray-850 text-[10px] uppercase font-bold text-gray-400">
                <th className="px-3 py-2.5">ID</th>
                <th className="px-3 py-2.5">Class</th>
                <th className="px-3 py-2.5">Confidence</th>
                <th className="px-3 py-2.5">Frame</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-gray-850 text-gray-750 dark:text-gray-250">
              {filteredDetections.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-500 italic">
                    No detections matching filters.
                  </td>
                </tr>
              ) : (
                filteredDetections.map(d => (
                  <tr key={d.id} className="hover:bg-gray-100/30 dark:hover:bg-gray-850/20">
                    <td className="px-3 py-2.5 font-mono font-bold text-brand-sky">#{d.id}</td>
                    <td className="px-3 py-2.5">
                      <span className="capitalize font-semibold">{d.class}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono font-semibold">
                      {(d.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="px-3 py-2.5 font-mono text-gray-500">{currentFrame}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diagnostics info overlay */}
      <div className="mt-4 p-3 rounded-lg border border-dashed border-gray-700 bg-gray-950/20 text-[10px] text-gray-400 flex items-start space-x-1.5 flex-shrink-0 leading-normal">
        <AlertCircle className="w-3.5 h-3.5 text-brand-sky mt-0.5 flex-shrink-0" />
        <span>
          Lanes and segmentation vectors are excluded from this table and rendered directly as canvas overlays.
        </span>
      </div>

    </div>
  );
};
export default AIDetectionPanel;
