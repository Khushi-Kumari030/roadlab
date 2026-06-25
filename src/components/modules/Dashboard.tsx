import React, { useState } from 'react';
import { useRoadLab } from '../../context/RoadLabContext';
import {
  FolderKanban,
  Video,
  Grid3X3,
  Database,
  Plus,
  ArrowUpRight,
  Clock,
  ChevronRight,
  Sliders
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const {
    projects,
    calibrations,
    models,
    setActiveProject,
    setCurrentView,
    createNewProject
  } = useRoadLab();

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  // Calculate dynamic stats
  const totalProjects = projects.length;
  const uploadedVideosCount = projects.reduce((acc, p) => acc + (p.videos ? p.videos.length : 0), 0);
  const savedCalibrations = calibrations.length;
  const importedModels = models.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createNewProject(name, desc);
    setName('');
    setDesc('');
    setModalOpen(false);
  };

  const handleQuickAction = (action: 'new' | 'video' | 'calibration' | 'model') => {
    if (action === 'new') {
      setModalOpen(true);
    } else if (action === 'video') {
      // Set to workspace view and focus video
      if (projects.length > 0) {
        setActiveProject(projects[0]);
      }
      setCurrentView('workspace');
    } else if (action === 'calibration') {
      if (projects.length > 0) {
        setActiveProject(projects[0]);
      }
      setCurrentView('calibration');
    } else if (action === 'model') {
      setCurrentView('models');
    }
  };

  const stats = [
    { label: 'Total Projects', value: totalProjects, icon: FolderKanban, color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/10' },
    { label: 'Uploaded Videos', value: uploadedVideosCount, icon: Video, color: 'from-brand-sky to-blue-500', shadow: 'shadow-sky-500/10' },
    { label: 'Saved Calibrations', value: savedCalibrations, icon: Grid3X3, color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/10' },
    { label: 'Imported Models', value: importedModels, icon: Database, color: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/10' }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-6 md:p-8 transition-workspace text-gray-800 dark:text-gray-100">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Welcome to RoadLab</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm md:text-base">
            Professional AI-powered road analysis, lane measurements, and perspective calibration platform.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="mt-4 md:mt-0 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold shadow-md shadow-brand-blue/20 hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* 1. Project Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl p-5 flex items-center space-x-4 shadow-sm hover:shadow-md dark:shadow-black/20 transition-all ${stat.shadow}`}
            >
              <div className={`p-3 rounded-lg bg-gradient-to-tr ${stat.color} text-white`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-bold mt-1 tracking-tight">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 2. Recent Projects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-lg flex items-center space-x-2">
              <FolderKanban className="w-5 h-5 text-brand-blue" />
              <span>Recent Projects</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl overflow-hidden shadow-sm hover:shadow-md dark:shadow-black/25 flex flex-col group transition-all"
              >
                {/* Thumbnail */}
                <div className="h-40 overflow-hidden relative bg-gray-200 dark:bg-gray-800">
                  <img
                    src={proj.thumbnail}
                    alt={proj.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-brand-sky flex items-center bg-gray-950/40 px-2 py-0.5 rounded backdrop-blur-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      Modified: {proj.dateModified.split(' ')[0]}
                    </span>
                  </div>
                </div>
                {/* Description */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-gray-850 dark:text-gray-100 group-hover:text-brand-blue dark:group-hover:text-brand-sky transition-colors">
                      {proj.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {proj.description || 'No description provided.'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveProject(proj);
                      setCurrentView('workspace');
                    }}
                    className="mt-4 flex items-center justify-center space-x-1.5 w-full py-2 rounded-lg bg-gray-50 hover:bg-brand-blue dark:bg-gray-850 dark:hover:bg-brand-blue text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-white dark:hover:text-white border border-gray-200 dark:border-gray-750 hover:border-brand-blue dark:hover:border-brand-blue transition-all"
                  >
                    <span>Open Project</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Quick Actions */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-lg flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-brand-blue" />
            <span>Quick Actions</span>
          </h3>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl p-5 space-y-3.5 shadow-sm">
            <button
              onClick={() => handleQuickAction('new')}
              className="flex items-center justify-between w-full p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 hover:bg-brand-blue/5 dark:bg-gray-850 dark:hover:bg-brand-blue/10 hover:border-brand-blue group transition-all text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded bg-blue-100 dark:bg-blue-900/30 text-brand-blue">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">New Project</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Initialize a new roadway study</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-450 group-hover:text-brand-blue transition-colors" />
            </button>
 
            <button
              onClick={() => handleQuickAction('video')}
              className="flex items-center justify-between w-full p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 hover:bg-brand-blue/5 dark:bg-gray-850 dark:hover:bg-brand-blue/10 hover:border-brand-blue group transition-all text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded bg-sky-100 dark:bg-sky-900/30 text-brand-sky">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">Upload Video</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Import MP4/AVI/MOV survey footage</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-450 group-hover:text-brand-sky transition-colors" />
            </button>
 
            <button
              onClick={() => handleQuickAction('calibration')}
              className="flex items-center justify-between w-full p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 hover:bg-brand-blue/5 dark:bg-gray-850 dark:hover:bg-brand-blue/10 hover:border-brand-blue group transition-all text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                  <Grid3X3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">Create Calibration</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Design a perspective measurement grid</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-450 group-hover:text-emerald-600 transition-colors" />
            </button>
 
            <button
              onClick={() => handleQuickAction('model')}
              className="flex items-center justify-between w-full p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 hover:bg-brand-blue/5 dark:bg-gray-850 dark:hover:bg-brand-blue/10 hover:border-brand-blue group transition-all text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">Import Model</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Add weights (.pt, .onnx, .engine)</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-455 group-hover:text-purple-600 transition-colors" />
            </button>
          </div>
        </div>

      </div>

      {/* New Project Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-800 rounded-xl max-w-md w-full shadow-2xl p-6 text-gray-800 dark:text-gray-100">
            <h2 className="text-xl font-bold mb-4">Create New Project</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. US-101 Intersection Speed Study"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-855 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <div className="mb-6">
                <label className="block text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1.5">
                  Description
                </label>
                <textarea
                  placeholder="Enter details about this survey..."
                  value={desc}
                  rows={3}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-855 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 shadow-md shadow-brand-blue/20 transition-all"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Dashboard;
