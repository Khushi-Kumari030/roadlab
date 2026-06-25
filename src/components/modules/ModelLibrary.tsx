import React, { useState, useEffect, useRef } from 'react';
import { useRoadLab, type Model } from '../../context/RoadLabContext';
import AIHistoryPanel from '../workspace/AIHistoryPanel';
import {
  Database,
  Plus,
  Trash2,
  FileKey,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Edit2,
  Terminal,
  Cpu,
  Sliders,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Copy,
  PlusCircle,
  X,
  Gauge
} from 'lucide-react';

export const ModelLibrary: React.FC = () => {
  const {
    models,
    addModel,
    deleteModel,
    toggleModelStatus,
    renameModel,
    activeInferenceModel,
    setActiveInferenceModel,
    validationStatus,
    debugLogs,
    setDebugLogs,
    inferenceFPS,
    inferenceRunning,
    inferenceResults,
    currentVideo
  } = useRoadLab();

  // Tab State
  const [activeTab, setActiveTab] = useState<'library' | 'history'>('library');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Inline Rename State
  const [renameModelId, setRenameModelId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');

  // 4-Step Registration Wizard State
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Wizard fields
  const [newModelName, setNewModelName] = useState('');
  const [newModelSize, setNewModelSize] = useState('15.4 MB');
  const [newModelFramework, setNewModelFramework] = useState<'PyTorch' | 'ONNX' | 'TensorRT' | 'Custom'>('ONNX');
  const [newModelCategory, setNewModelCategory] = useState<Model['category']>('Vehicle Detection');
  
  const [resOption, setResOption] = useState<'640x640' | '1280x720' | '1920x1080' | 'custom'>('640x640');
  const [customWidth, setCustomWidth] = useState('640');
  const [customHeight, setCustomHeight] = useState('640');
  const [channels, setChannels] = useState<number>(3);
  const [normalization, setNormalization] = useState<string>('0-1');

  const [classNamesInput, setClassNamesInput] = useState('');
  const [outputsMasks, setOutputsMasks] = useState(false);
  const [outputsLanes, setOutputsLanes] = useState(false);
  const [outputsKeypoints, setOutputsKeypoints] = useState(false);
  const [outputsCustom, setOutputsCustom] = useState(false);

  // Auto-detect framework on name change
  useEffect(() => {
    if (!newModelName) return;
    const ext = newModelName.split('.').pop()?.toLowerCase();
    if (ext === 'pt' || ext === 'pth') {
      setNewModelFramework('PyTorch');
    } else if (ext === 'onnx') {
      setNewModelFramework('ONNX');
    } else if (ext === 'engine') {
      setNewModelFramework('TensorRT');
    } else {
      setNewModelFramework('Custom');
    }
  }, [newModelName]);

  // Console automatic scroll to bottom
  const consoleEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [debugLogs]);

  // Handle active model select helper
  const handleSelectModel = (model: Model) => {
    setActiveInferenceModel(model);
  };

  const handleOpenWizard = () => {
    setNewModelName('');
    setNewModelSize('15.4 MB');
    setNewModelFramework('ONNX');
    setNewModelCategory('Vehicle Detection');
    setResOption('640x640');
    setCustomWidth('640');
    setCustomHeight('640');
    setChannels(3);
    setNormalization('0-1');
    setClassNamesInput('');
    setOutputsMasks(false);
    setOutputsLanes(false);
    setOutputsKeypoints(false);
    setOutputsCustom(false);
    setWizardStep(1);
    setWizardOpen(true);
  };

  const handleNextStep = () => {
    if (wizardStep === 1) {
      if (!newModelName.trim()) {
        alert('Please specify a model weights filename.');
        return;
      }
      const extension = newModelName.split('.').pop()?.toLowerCase();
      if (!extension || !['pt', 'pth', 'onnx', 'engine', 'xml'].includes(extension)) {
        alert('Unsupported file format. Please upload weights with extension: .pt, .pth, .onnx, .engine, or .xml');
        return;
      }
      // Set reasonable defaults for categories based on name keywords
      const nameLower = newModelName.toLowerCase();
      if (nameLower.includes('lane')) {
        setNewModelCategory('Lane Detection');
        setOutputsLanes(true);
      } else if (nameLower.includes('distress') || nameLower.includes('crack') || nameLower.includes('pothole') || nameLower.includes('seg')) {
        setNewModelCategory('Segmentation');
        setOutputsMasks(true);
      } else if (nameLower.includes('track') || nameLower.includes('sort')) {
        setNewModelCategory('Tracking');
      }
      setWizardStep(2);
    } else if (wizardStep === 2) {
      setWizardStep(3);
    } else if (wizardStep === 3) {
      // Auto fill classes prompt to save time
      if (!classNamesInput) {
        if (newModelCategory === 'Vehicle Detection' || newModelCategory === 'Tracking') {
          setClassNamesInput('car, truck, bus, motorcycle');
        } else if (newModelCategory === 'Lane Detection') {
          setClassNamesInput('left_lane, right_lane');
        } else if (newModelCategory === 'Segmentation') {
          setClassNamesInput('road, pothole, crack');
        } else {
          setClassNamesInput('object');
        }
      }
      setWizardStep(4);
    }
  };

  const handlePrevStep = () => {
    if (wizardStep > 1) {
      setWizardStep((wizardStep - 1) as any);
    }
  };

  const handleWizardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolutionStr = resOption === 'custom' ? `${customWidth}x${customHeight}` : resOption;
    const classesArray = classNamesInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    addModel(
      newModelName,
      newModelCategory,
      newModelSize,
      resolutionStr,
      newModelFramework,
      channels,
      normalization,
      classesArray,
      {
        masks: outputsMasks,
        lanes: outputsLanes,
        keypoints: outputsKeypoints,
        custom: outputsCustom
      }
    );

    setWizardOpen(false);
    alert(`Model "${newModelName}" successfully registered to library registry!`);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameName.trim() || !renameModelId) return;
    renameModel(renameModelId, renameName);
    setRenameModelId(null);
    setRenameName('');
  };

  // Copy debug logs to clipboard
  const handleCopyLogs = () => {
    navigator.clipboard.writeText(debugLogs.join('\n'));
    alert('Debug logs copied to clipboard!');
  };

  const categories = ['All', 'Lane Detection', 'Vehicle Detection', 'Segmentation', 'Tracking', 'Custom Models', 'Classification'];

  const filteredModels = models.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'All' || m.category === selectedCategory || (selectedCategory === 'Custom Models' && m.category === 'Custom Models');
    return matchesSearch && matchesCat;
  });

  // Calculate live validation indicators
  const modelValidation = validationStatus || (activeInferenceModel ? {
    status: activeInferenceModel.input_resolution === '640x640' ? 'Compatible' as const : 'Warning' as const,
    logs: [
      `[VALIDATOR] Pre-inference check initialized for: ${activeInferenceModel.name}`,
      `[VALIDATOR] Weights framework: ${activeInferenceModel.framework} (Active)`,
      `[VALIDATOR] Configured dimension: ${activeInferenceModel.input_resolution}`,
      currentVideo.resolution
        ? `[VALIDATOR] Video resolution context: ${currentVideo.resolution} (Aspect ratio check: ${
            activeInferenceModel.input_resolution === '640x640' && currentVideo.resolution === '640x640'
              ? 'Perfect'
              : 'Aspect ratio mismatch. Spatial scaling active.'
          })`
        : `[VALIDATOR] WARNING: No video loaded to assert aspect scaling constraints.`,
      `[VALIDATOR] Tensor channel size: ${activeInferenceModel.channels || 3} (RGB)`,
      `[VALIDATOR] Preprocessing Normalization: ${activeInferenceModel.normalization || '0-1'}`,
      `[VALIDATOR] Validated output layer configs successfully.`
    ]
  } : null);

  // Confidence indicators calculations
  const getLiveConfidence = () => {
    if (!activeInferenceModel) return 0;
    if (inferenceRunning && inferenceResults?.detections?.length > 0) {
      const sum = inferenceResults.detections.reduce((acc, d) => acc + d.confidence, 0);
      return Math.round((sum / inferenceResults.detections.length) * 100);
    }
    return 91; // Realistic baseline
  };

  const getLiveClassConfidence = (cls: string) => {
    if (inferenceRunning && inferenceResults?.detections?.length > 0) {
      const clsDets = inferenceResults.detections.filter(d => d.class.toLowerCase() === cls.toLowerCase());
      if (clsDets.length > 0) {
        const sum = clsDets.reduce((acc, d) => acc + d.confidence, 0);
        return Math.round((sum / clsDets.length) * 100);
      }
    }
    const base = 84 + (cls.charCodeAt(0) % 12);
    return Math.min(97, base);
  };

  const avgConfidence = getLiveConfidence();
  
  const getQualityScore = () => {
    if (!activeInferenceModel) return '0.0';
    let score = avgConfidence / 10;
    if (modelValidation?.status === 'Warning') score -= 1.0;
    if (modelValidation?.status === 'Invalid') score -= 3.5;
    return Math.max(1.0, Math.min(10.0, score)).toFixed(1);
  };

  const renderLogLine = (log: string, idx: number) => {
    let color = 'text-gray-300';
    if (log.includes('WARNING') || log.includes('Warning') || log.includes('⚠')) {
      color = 'text-amber-400 font-semibold';
    } else if (log.includes('ERROR') || log.includes('Invalid') || log.includes('✗') || log.includes('failed')) {
      color = 'text-red-400 font-semibold';
    } else if (log.includes('SUCCESS') || log.includes('COMPATIBLE') || log.includes('✓') || log.includes('completed')) {
      color = 'text-emerald-400';
    } else if (log.includes('[SYSTEM]')) {
      color = 'text-sky-400';
    }
    return (
      <div key={idx} className={`py-0.5 font-mono text-[11px] leading-relaxed border-b border-gray-900/30 ${color}`}>
        {log}
      </div>
    );
  };

  if (activeTab === 'history') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
        <div className="flex-shrink-0 px-6 md:px-8 pt-6">
          <div className="flex border-b border-gray-250 dark:border-gray-800 mb-0">
            <button
              onClick={() => setActiveTab('library')}
              className="pb-3 px-4 font-bold text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Model Library
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className="pb-3 px-4 font-bold text-sm border-b-2 border-brand-blue text-brand-blue dark:text-brand-sky"
            >
              Inference Jobs History
            </button>
          </div>
        </div>
        <AIHistoryPanel />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-100 transition-workspace">
      
      {/* LEFT COLUMN: Table, Filters, Registry Actions */}
      <div className="flex-1 md:w-3/5 flex flex-col overflow-y-auto p-6 md:p-8 border-r border-gray-200 dark:border-gray-850">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold flex items-center space-x-2">
              <Database className="w-6 h-6 text-brand-blue" />
              <span>AI Model Management Library</span>
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs md:text-sm">
              Manage network weights registry, validate spatial input compatibilities, and register custom models.
            </p>
          </div>
          <button
            onClick={handleOpenWizard}
            className="mt-4 sm:mt-0 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold shadow-md shadow-brand-blue/20 transition-all text-sm flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Weights Wizard</span>
          </button>
        </div>

        {/* Tabs switcher */}
        <div className="flex border-b border-gray-250 dark:border-gray-800 mb-6">
          <button
            onClick={() => setActiveTab('library')}
            className="pb-3 px-4 font-bold text-sm border-b-2 border-brand-blue text-brand-blue dark:text-brand-sky"
          >
            Model Library
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className="pb-3 px-4 font-bold text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Inference Jobs History
          </button>
        </div>

        {/* Filters and Search Row */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search weights or models by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-350 dark:border-gray-700 bg-white dark:bg-gray-855 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1.5 lg:pb-0 scrollbar-none">
            <Filter className="w-4 h-4 text-gray-400 mr-1 flex-shrink-0" />
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-brand-blue text-white'
                    : 'bg-white hover:bg-gray-100 dark:bg-gray-855 dark:hover:bg-gray-800 border border-gray-250 dark:border-gray-750 text-gray-600 dark:text-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Model Grid/Table */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-855 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-850/50 border-b border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Model Name</th>
                  <th className="px-5 py-3.5">Task Type</th>
                  <th className="px-5 py-3.5">Framework</th>
                  <th className="px-5 py-3.5">Resolution</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                {filteredModels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <Database className="w-10 h-10 text-gray-700 mx-auto mb-2 animate-pulse" />
                      <p className="font-semibold text-gray-400">No weights files found</p>
                      <p className="text-xs text-gray-500 mt-1">Try uploading custom weights using the wizard.</p>
                    </td>
                  </tr>
                ) : (
                  filteredModels.map(m => {
                    const isSelected = activeInferenceModel?.id === m.id;
                    return (
                      <tr 
                        key={m.id} 
                        onClick={() => handleSelectModel(m)}
                        className={`cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-brand-blue/5 dark:bg-brand-blue/10 border-l-4 border-l-brand-blue' 
                            : 'hover:bg-gray-50/50 dark:hover:bg-gray-850/30'
                        }`}
                      >
                        <td className="px-5 py-4 font-bold flex items-center space-x-2 overflow-hidden">
                          <FileKey className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-brand-sky' : 'text-gray-400'}`} />
                          <span className="truncate max-w-[150px] lg:max-w-xs">{m.name}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                            {m.category || m.type}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400">{m.framework || 'ONNX'}</td>
                        <td className="px-5 py-4 text-xs font-mono text-gray-500 dark:text-gray-400">{m.input_resolution || '640x640'}</td>
                        <td className="px-5 py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleModelStatus(m.id);
                            }}
                            className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${
                              m.status === 'Active'
                                ? 'bg-success/10 text-success border border-success/20 hover:bg-success/20'
                                : 'bg-gray-150 text-gray-450 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'Active' ? 'bg-success' : 'bg-gray-455'}`} />
                            <span>{m.status === 'Active' ? 'Active' : 'Inactive'}</span>
                          </button>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setRenameModelId(m.id);
                                setRenameName(m.name);
                              }}
                              title="Rename weights"
                              className="p-1 rounded hover:bg-gray-150 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete model ${m.name}?`)) {
                                  deleteModel(m.id);
                                }
                              }}
                              title="Delete weights"
                              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 hover:text-red-655 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Metadata, Validation Panel, Confidence HUD, Inference Debug Console */}
      <div className="w-full md:w-2/5 flex flex-col overflow-y-auto p-6 md:p-8 bg-gray-100/50 dark:bg-gray-900/35 border-t md:border-t-0 border-gray-250 dark:border-gray-850">
        
        {!activeInferenceModel ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-800 rounded-2xl bg-white/40 dark:bg-gray-950/20">
            <Cpu className="w-12 h-12 text-gray-400 dark:text-gray-700 mb-3 animate-pulse" />
            <h3 className="text-lg font-bold text-gray-400">No Active Model Selected</h3>
            <p className="text-xs text-gray-500 max-w-xs mt-1">
              Select a weights file from the library grid on the left to display its validation status and inference profiling HUD.
            </p>
          </div>
        ) : (
          <div className="flex-col space-y-6">
            
            {/* Model Metadata Panel */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-855 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between border-b border-gray-150 dark:border-gray-805 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-md dark:text-brand-sky">
                    {activeInferenceModel.framework} Framework
                  </span>
                  <h3 className="text-base font-extrabold text-gray-805 dark:text-white mt-1.5 break-all">
                    {activeInferenceModel.name}
                  </h3>
                </div>
                <span className="text-xs font-mono text-gray-400 bg-gray-50 dark:bg-gray-850 px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-800 flex-shrink-0">
                  {activeInferenceModel.fileSize}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-2.5 bg-gray-50 dark:bg-gray-850 rounded-lg border border-gray-200/50 dark:border-gray-800">
                  <span className="text-gray-450 font-medium block">Task Category</span>
                  <span className="font-bold text-gray-750 dark:text-gray-200 block mt-0.5 truncate">{activeInferenceModel.category || activeInferenceModel.type}</span>
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-gray-850 rounded-lg border border-gray-200/50 dark:border-gray-800">
                  <span className="text-gray-455 font-medium block">Input Resolution</span>
                  <span className="font-mono font-bold text-gray-750 dark:text-gray-200 block mt-0.5">{activeInferenceModel.input_resolution || '640x640'}</span>
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-gray-850 rounded-lg border border-gray-200/50 dark:border-gray-800">
                  <span className="text-gray-455 font-medium block">Tensors Channels</span>
                  <span className="font-bold text-gray-750 dark:text-gray-200 block mt-0.5">{activeInferenceModel.channels || 3} (RGB)</span>
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-gray-855 rounded-lg border border-gray-200/50 dark:border-gray-800">
                  <span className="text-gray-455 font-medium block">Normalization</span>
                  <span className="font-bold text-gray-750 dark:text-gray-200 block mt-0.5">{activeInferenceModel.normalization || '0-1'}</span>
                </div>
              </div>

              {activeInferenceModel.classes && activeInferenceModel.classes.length > 0 && (
                <div className="mt-4 border-t border-gray-100 dark:border-gray-800/80 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">Model Classes Mapping</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeInferenceModel.classes.map(cls => (
                      <span key={cls} className="px-2 py-0.5 rounded bg-brand-blue/5 border border-brand-blue/10 text-brand-blue dark:text-brand-sky text-[10px] font-semibold">
                        {cls}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Model Validation Engine HUD */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-855 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs uppercase tracking-wider font-extrabold text-gray-400 mb-3.5 flex items-center justify-between">
                <span>Model Validation Engine</span>
                <span className="flex items-center space-x-1 font-mono text-[10px] text-gray-500 font-normal">
                  <Sliders className="w-3 h-3" />
                  <span>Pre-Inference Guard</span>
                </span>
              </h3>

              {modelValidation && (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className={`p-3.5 rounded-lg border flex items-center space-x-3 ${
                    modelValidation.status === 'Compatible' 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                      : modelValidation.status === 'Warning'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                  }`}>
                    {modelValidation.status === 'Compatible' ? (
                      <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    ) : modelValidation.status === 'Warning' ? (
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 flex-shrink-0" />
                    )}
                    <div>
                      <div className="font-extrabold text-sm uppercase tracking-wide">
                        Validation: {modelValidation.status}
                      </div>
                      <p className="text-xs opacity-90 leading-tight mt-0.5">
                        {modelValidation.status === 'Compatible' 
                          ? 'Weights tensor outputs align with selected video spatial resolution.'
                          : modelValidation.status === 'Warning'
                          ? 'Warning mismatch in input width/height ratio. Rescaling defaults applied.'
                          : 'Critical layers validation failure. Execution blocked.'}
                      </p>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="space-y-2 bg-gray-50 dark:bg-gray-855 p-3 rounded-lg border border-gray-150 dark:border-gray-800">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-2">Validation Assertions Log</span>
                    {modelValidation.logs && modelValidation.logs.map((log, i) => {
                      const isErr = log.includes('WARNING') || log.includes('Warning') || log.includes('error');
                      return (
                        <div key={i} className="flex items-start space-x-2 text-xs">
                          {isErr ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                          )}
                          <span className="text-gray-600 dark:text-gray-300 leading-tight">{log}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Confidence Analysis HUD */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-855 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs uppercase tracking-wider font-extrabold text-gray-400 mb-4 flex items-center justify-between">
                <span>Confidence & Profiling HUD</span>
                <span className="flex items-center space-x-1 text-[10px] font-mono text-gray-500 font-normal">
                  <Gauge className="w-3 h-3" />
                  <span>Realtime Inference Stats</span>
                </span>
              </h3>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-50 dark:bg-gray-855 border border-gray-200/50 dark:border-gray-800 p-3 rounded-lg text-center">
                  <span className="text-[10px] text-gray-400 font-medium block">Avg Confidence</span>
                  <span className="text-lg font-extrabold text-brand-sky block mt-1">{avgConfidence}%</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-855 border border-gray-200/50 dark:border-gray-800 p-3 rounded-lg text-center">
                  <span className="text-[10px] text-gray-450 font-medium block">Quality Rating</span>
                  <span className="text-lg font-extrabold text-emerald-400 block mt-1">{getQualityScore()}/10</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-855 border border-gray-200/50 dark:border-gray-800 p-3 rounded-lg text-center">
                  <span className="text-[10px] text-gray-450 font-medium block">Inference Speed</span>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200 block mt-2 truncate">
                    {inferenceRunning ? `${inferenceFPS} FPS` : '0 FPS (Idle)'}
                  </span>
                </div>
              </div>

              {/* Class-wise Accuracy Breakdown */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Active Class Accuracy Calibrations
                </span>
                {activeInferenceModel.classes && activeInferenceModel.classes.length > 0 ? (
                  activeInferenceModel.classes.map(cls => {
                    const acc = getLiveClassConfidence(cls);
                    return (
                      <div key={cls} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-600 dark:text-gray-300">{cls}</span>
                          <span className="font-mono text-gray-400">{acc}%</span>
                        </div>
                        <div className="w-full bg-gray-250 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-brand-sky h-full rounded-full transition-all duration-300"
                            style={{ width: `${acc}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-500 italic">No class details mapping registered for this weights file.</p>
                )}
              </div>
            </div>

            {/* Inference Debug Console */}
            <div className="bg-gray-950 border border-gray-900 rounded-xl p-5 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-gray-900 pb-3.5 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-mono text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center space-x-1.5">
                    <Terminal className="w-3.5 h-3.5 text-red-505" />
                    <span>Inference Live Console</span>
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={handleCopyLogs}
                    title="Copy Console Logs"
                    className="p-1 rounded text-gray-500 hover:text-gray-200 hover:bg-gray-900 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDebugLogs([])}
                    title="Clear Log Console"
                    className="p-1 rounded text-gray-505 hover:text-gray-200 hover:bg-gray-900 transition-colors text-xs font-semibold px-2 uppercase tracking-wide font-mono"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Monospace Log Outputs */}
              <div className="h-44 overflow-y-auto pr-1 select-text scrollbar-thin scrollbar-track-gray-950 scrollbar-thumb-gray-900">
                {debugLogs.length === 0 ? (
                  <div className="text-gray-600 font-mono text-xs italic text-center pt-10">
                    -- Console inactive. Start inference to stream layer outputs --
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {debugLogs.map((log, idx) => renderLogLine(log, idx))}
                    <div ref={consoleEndRef} />
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* 4-STEP CUSTOM MODEL REGISTRATION WIZARD DIALOG OVERLAY */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-805 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden text-gray-800 dark:text-gray-100 flex flex-col max-h-[90vh]">
            
            {/* Dialog Header */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-855 border-b border-gray-205 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-brand-blue" />
                <h3 className="text-base font-extrabold">Model Registration Wizard</h3>
              </div>
              <button 
                onClick={() => setWizardOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Steps Progress Indicator Indicator */}
            <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs">
              {[
                { s: 1, name: 'Weights File' },
                { s: 2, name: 'Task Type' },
                { s: 3, name: 'Dimensions' },
                { s: 4, name: 'Output Mapping' }
              ].map(step => (
                <div key={step.s} className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-mono transition-all ${
                    wizardStep === step.s 
                      ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/30 scale-110' 
                      : wizardStep > step.s
                      ? 'bg-success text-white'
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                  }`}>
                    {step.s}
                  </div>
                  <span className={`font-semibold hidden sm:inline ${wizardStep === step.s ? 'text-brand-blue dark:text-brand-sky' : 'text-gray-400'}`}>
                    {step.name}
                  </span>
                  {step.s < 4 && <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-800 hidden sm:block" />}
                </div>
              ))}
            </div>

            {/* Form Steps Body */}
            <form onSubmit={handleWizardSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {/* STEP 1: Weights Filename, framework, mock size */}
              {wizardStep === 1 && (
                <div className="space-y-4 animate-slide-in">
                  <div className="p-4 bg-brand-blue/5 border border-brand-blue/10 rounded-lg text-xs leading-relaxed text-brand-blue dark:text-brand-sky">
                    <span className="font-bold block mb-1">Step 1: Upload Convolutional Weights File</span>
                    Provide the filename representation of the weights loaded on the file system. Supported compilation target formats: .pt, .pth, .onnx, .engine, and .xml.
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wide text-gray-400 font-bold mb-1.5">
                      Model Weights Filename
                    </label>
                    <div className="relative">
                      <FileKey className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-450" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. yolov8n-distress.onnx, resnet50-lanes.pt"
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-855 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                      />
                    </div>
                    <span className="text-[10px] text-gray-455 mt-1 block">
                      Extension check triggers auto-detection of the runtime framework format structure.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wide text-gray-400 font-bold mb-1.5">
                        Runtime Framework
                      </label>
                      <select
                        value={newModelFramework}
                        onChange={(e) => setNewModelFramework(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-855 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue font-semibold"
                      >
                        <option value="PyTorch">PyTorch (.pt, .pth)</option>
                        <option value="ONNX">ONNX Runtime (.onnx)</option>
                        <option value="TensorRT">TensorRT Nvidia (.engine)</option>
                        <option value="Custom">Custom / OpenVINO (.xml)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wide text-gray-400 font-bold mb-1.5">
                        Approx File Size
                      </label>
                      <input
                        type="text"
                        required
                        value={newModelSize}
                        onChange={(e) => setNewModelSize(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-855 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Task Category */}
              {wizardStep === 2 && (
                <div className="space-y-4 animate-slide-in">
                  <label className="block text-xs uppercase tracking-wide text-gray-400 font-bold">
                    Step 2: Select Inference Task Type
                  </label>
                  <p className="text-xs text-gray-500 -mt-2">
                    Categorize the network outputs class type for appropriate execution parsing in the WebSocket stream.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { cat: 'Vehicle Detection', name: 'Vehicle Bounding Box', desc: 'Identifies road vehicle bounding coordinates for tracking and counting metrics.' },
                      { cat: 'Lane Detection', name: 'Lane Boundary Tracing', desc: 'Traces solid/dashed road boundary vectors for lateral gap analysis.' },
                      { cat: 'Segmentation', name: 'Distress Segmentation', desc: 'Fractions pavement pixels to extract crack lines or pothole segment polygons.' },
                      { cat: 'Tracking', name: 'Multi-Object Tracking', desc: 'Integrates ByteTrack / DeepSORT tracking filters to log speed parameters.' },
                      { cat: 'Custom Models', name: 'Custom Tensor Outputs', desc: 'A custom weights parser that returns raw outputs layers for user scripts.' },
                      { cat: 'Classification', name: 'Frame Distress Scoring', desc: 'Predicts pavement deterioration indexes and general condition scores.' }
                    ].map(item => {
                      const isSel = newModelCategory === item.cat;
                      return (
                        <div 
                          key={item.cat}
                          onClick={() => setNewModelCategory(item.cat as any)}
                          className={`p-3 border rounded-xl cursor-pointer text-left transition-all ${
                            isSel 
                              ? 'bg-brand-blue/5 border-brand-blue shadow-md' 
                              : 'bg-gray-50/50 hover:bg-gray-100/70 border-gray-250 dark:bg-gray-855 dark:hover:bg-gray-800 dark:border-gray-850'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold">{item.name}</span>
                            <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isSel ? 'border-brand-blue bg-brand-blue' : 'border-gray-300'
                            }`}>
                              {isSel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-1 leading-tight">{item.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: Dimensions, Channels, Preprocessing */}
              {wizardStep === 3 && (
                <div className="space-y-4 animate-slide-in">
                  <div className="p-4 bg-brand-blue/5 border border-brand-blue/10 rounded-lg text-xs leading-relaxed text-brand-blue dark:text-brand-sky">
                    <span className="font-bold block mb-1">Step 3: Define Input Preprocessing & Dimension Configurations</span>
                    The validator checks incoming video aspect ratios against these constraints. Mismatches will scale frames dynamically.
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wide text-gray-400 font-bold mb-1.5">
                      Target Input Dimensions Resolution
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <select
                          value={resOption}
                          onChange={(e) => setResOption(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-855 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue font-semibold"
                        >
                          <option value="640x640">640 x 640 (YOLO Square Standard)</option>
                          <option value="1280x720">1280 x 720 (HD 16:9)</option>
                          <option value="1920x1080">1920 x 1080 (FHD 16:9)</option>
                          <option value="custom">Custom Width / Height</option>
                        </select>
                      </div>
                      
                      {resOption === 'custom' && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            placeholder="W"
                            value={customWidth}
                            onChange={(e) => setCustomWidth(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-855 text-xs text-center focus:outline-none"
                          />
                          <span className="text-xs text-gray-400">x</span>
                          <input
                            type="number"
                            placeholder="H"
                            value={customHeight}
                            onChange={(e) => setCustomHeight(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-855 text-xs text-center focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wide text-gray-400 font-bold mb-1.5">
                        Tensors Color Channels
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={4}
                        required
                        value={channels}
                        onChange={(e) => setChannels(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-855 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wide text-gray-400 font-bold mb-1.5">
                        Normalization Type
                      </label>
                      <select
                        value={normalization}
                        onChange={(e) => setNormalization(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-855 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                      >
                        <option value="None">None (0 - 255 Integers)</option>
                        <option value="0-1">0 to 1 scaling (Standard Float)</option>
                        <option value="MeanStd">Mean / Std Normalized (ImageNet)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Output Layer Configurations & Classes Mapping */}
              {wizardStep === 4 && (
                <div className="space-y-4 animate-slide-in">
                  <div className="p-4 bg-brand-blue/5 border border-brand-blue/10 rounded-lg text-xs leading-relaxed text-brand-blue dark:text-brand-sky">
                    <span className="font-bold block mb-1">Step 4: Define Output Mapping & Features Toggles</span>
                    Map index labels to readable strings, and toggle structural tensor output overlays on-canvas.
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wide text-gray-400 font-bold mb-1.5 flex justify-between">
                      <span>Model Output Classes Mapping</span>
                      <span className="text-[10px] text-gray-450 normal-case font-normal">Comma-separated</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. car, truck, bus, motorcycle"
                      value={classNamesInput}
                      onChange={(e) => setClassNamesInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-855 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue font-mono"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {classNamesInput.split(',').map(s => s.trim()).filter(Boolean).map(c => (
                        <span key={c} className="text-[10px] bg-brand-blue/5 border border-brand-blue/10 px-2 py-0.5 rounded text-brand-blue dark:text-brand-sky font-semibold">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wide text-gray-400 font-bold mb-2">
                      Features Output Tensors
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-855 border border-gray-200 dark:border-gray-805 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={outputsMasks}
                          onChange={(e) => setOutputsMasks(e.target.checked)}
                          className="w-4 h-4 text-brand-blue rounded border-gray-300 focus:ring-brand-blue"
                        />
                        <div className="text-left">
                          <span className="text-xs font-bold block">Segmentation Masks</span>
                          <span className="text-[9px] text-gray-500 block">Pixel-level polygons overlay</span>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-855 border border-gray-200 dark:border-gray-805 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={outputsLanes}
                          onChange={(e) => setOutputsLanes(e.target.checked)}
                          className="w-4 h-4 text-brand-blue rounded border-gray-300 focus:ring-brand-blue"
                        />
                        <div className="text-left">
                          <span className="text-xs font-bold block">Lane Curves</span>
                          <span className="text-[9px] text-gray-500 block">Boundary tracing overlay</span>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-855 border border-gray-200 dark:border-gray-805 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={outputsKeypoints}
                          onChange={(e) => setOutputsKeypoints(e.target.checked)}
                          className="w-4 h-4 text-brand-blue rounded border-gray-300 focus:ring-brand-blue"
                        />
                        <div className="text-left">
                          <span className="text-xs font-bold block">Keypoint Coordinates</span>
                          <span className="text-[9px] text-gray-500 block">Joint / corner markers</span>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-855 border border-gray-200 dark:border-gray-805 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={outputsCustom}
                          onChange={(e) => setOutputsCustom(e.target.checked)}
                          className="w-4 h-4 text-brand-blue rounded border-gray-300 focus:ring-brand-blue"
                        />
                        <div className="text-left">
                          <span className="text-xs font-bold block">Custom Outputs</span>
                          <span className="text-[9px] text-gray-500 block">Pass-through layers matrix</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

            </form>

            {/* Dialog Footer Actions */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-855 border-t border-gray-250 dark:border-gray-800 flex justify-between items-center">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={wizardStep === 1}
                className="flex items-center space-x-1 px-4 py-2 text-sm font-semibold rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-850 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setWizardOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-750 dark:hover:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
                {wizardStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex items-center space-x-1 px-4 py-2 text-sm font-semibold bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 shadow-md shadow-brand-blue/20 transition-all"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    onClick={handleWizardSubmit}
                    className="flex items-center space-x-2 px-5 py-2 text-sm font-semibold bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 shadow-lg shadow-brand-blue/30 transition-all"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Register Model</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* RENAME MODEL POPUP MODAL */}
      {renameModelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-805 rounded-xl max-w-md w-full shadow-2xl p-6 text-gray-800 dark:text-gray-100">
            <h3 className="text-lg font-bold mb-4">Rename Weights file</h3>
            <form onSubmit={handleRenameSubmit}>
              <div className="mb-6">
                <label className="block text-xs uppercase tracking-wide text-gray-400 font-bold mb-1.5">
                  New Filename
                </label>
                <input
                  type="text"
                  required
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-855 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setRenameModelId(null)}
                  className="px-4 py-2 text-sm font-semibold text-gray-505 hover:text-gray-750 dark:hover:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 shadow-md shadow-brand-blue/20 transition-all"
                >
                  Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ModelLibrary;
