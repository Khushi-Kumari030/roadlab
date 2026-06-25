import React from 'react';
import { useRoadLab } from '../../context/RoadLabContext';
import type { JobHistoryItem } from '../../context/RoadLabContext';
import {
  History,
  FileDown,
  Trash2,
  ExternalLink,
  CheckCircle,
  Database
} from 'lucide-react';

export const AIHistoryPanel: React.FC = () => {
  const {
    historyJobs,
    deleteHistoryJob,
    setCurrentView
  } = useRoadLab();

  const handleExport = (jobId: string, format: 'csv' | 'json' | 'mp4') => {
    // Directly download from backend API
    const downloadUrl = `http://localhost:8000/api/export/${jobId}/${format}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `roadlab-results-${jobId}.${format === 'mp4' ? 'mp4' : format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenJob = (job: JobHistoryItem) => {
    // Open in video workspace view
    setCurrentView('workspace');
    alert(`Loaded Workspace details for Job: ${job.name}. Select a model and play to review overlays.`);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-6 md:p-8 text-gray-800 dark:text-gray-150 transition-workspace">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-6 border-b border-gray-250 dark:border-gray-800">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold flex items-center space-x-2">
            <History className="w-6 h-6 text-brand-blue" />
            <span>Inference Jobs History</span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs md:text-sm">
            Review past video processing jobs, clear caches, and download annotated logs.
          </p>
        </div>
      </div>

      {/* Grid Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 p-5 rounded-xl flex items-center space-x-4 shadow-sm">
          <div className="p-3 rounded bg-blue-100 dark:bg-blue-900/20 text-brand-blue">
            <History className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400">Total Run Jobs</span>
            <h4 className="text-xl font-bold mt-0.5">{historyJobs.length}</h4>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 p-5 rounded-xl flex items-center space-x-4 shadow-sm">
          <div className="p-3 rounded bg-emerald-100 dark:bg-emerald-900/20 text-success">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400">Success Rate</span>
            <h4 className="text-xl font-bold mt-0.5">100%</h4>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 p-5 rounded-xl flex items-center space-x-4 shadow-sm">
          <div className="p-3 rounded bg-purple-100 dark:bg-purple-900/20 text-purple-600">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400">Data Track Logged</span>
            <h4 className="text-xl font-bold mt-0.5">{historyJobs.reduce((sum, j) => sum + j.total_frames, 0)} Frames</h4>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-850/50 border-b border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Job Name</th>
                <th className="px-6 py-4">AI Model Used</th>
                <th className="px-6 py-4">Video Footage</th>
                <th className="px-6 py-4">Run Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-250 dark:divide-gray-800 text-xs md:text-sm">
              {historyJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <History className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                    <p className="font-bold">No inference history logs found</p>
                    <p className="text-xs text-gray-450 mt-1">Run video inference inside the Video Workspace view first.</p>
                  </td>
                </tr>
              ) : (
                historyJobs.map(job => (
                  <tr key={job.id} className="hover:bg-gray-55/30 dark:hover:bg-gray-850/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-850 dark:text-gray-100">{job.name}</td>
                    <td className="px-6 py-4 font-semibold text-brand-sky">{job.model_name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">{job.video_name}</td>
                    <td className="px-6 py-4 text-xs text-gray-500">{job.date}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success">
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Open */}
                        <button
                          onClick={() => handleOpenJob(job)}
                          title="Open workspace review"
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-850 text-gray-500 hover:text-gray-850 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        
                        {/* Export Menu */}
                        <div className="relative group">
                          <button
                            title="Export results"
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-855 text-gray-500 hover:text-brand-blue transition-colors"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                          
                          {/* Hover Dropdown menu */}
                          <div className="absolute right-0 bottom-full mb-1 scale-0 group-hover:scale-100 origin-bottom-right transition-all duration-150 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-750 shadow-xl rounded-lg py-1 text-left min-w-[100px] z-20">
                            <button
                              onClick={() => handleExport(job.id, 'csv')}
                              className="block w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              CSV Log
                            </button>
                            <button
                              onClick={() => handleExport(job.id, 'json')}
                              className="block w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              JSON Log
                            </button>
                            <button
                              onClick={() => handleExport(job.id, 'mp4')}
                              className="block w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              MP4 Video
                            </button>
                          </div>
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => {
                            if (confirm(`Delete job log: ${job.name}?`)) {
                              deleteHistoryJob(job.id);
                            }
                          }}
                          title="Delete job run"
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 hover:text-red-650 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
export default AIHistoryPanel;
