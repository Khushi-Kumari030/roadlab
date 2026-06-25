import React from 'react';
import { useRoadLab } from '../../context/RoadLabContext';
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  Monitor,
  Ruler,
  FileDown,
  HardDrive,
  CheckCircle
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useRoadLab();

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    updateSettings({ theme });
  };

  const handleUnitChange = (units: 'm' | 'cm') => {
    updateSettings({ units });
  };

  const handleFormatChange = (exportFormat: 'PNG' | 'JPG' | 'CSV') => {
    updateSettings({ exportFormat });
  };

  const handleClearCache = () => {
    if (confirm('Clear workspace temporary storage cache? This does not delete projects.')) {
      alert('Local storage cache successfully cleared.');
    }
  };

  // Mock percentage calculation
  // "2.4 GB / 25 GB"
  const used = 2.4;
  const total = 25.0;
  const pct = Math.round((used / total) * 100);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-6 md:p-8 text-gray-800 dark:text-gray-100 transition-workspace max-w-4xl mx-auto w-full">
      
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-gray-250 dark:border-gray-800">
        <SettingsIcon className="w-6 h-6 text-brand-blue" />
        <h2 className="text-xl md:text-2xl font-extrabold">Application Settings</h2>
      </div>

      <div className="space-y-6">

        {/* 1. Theme Selection */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm flex items-center space-x-2">
            <Monitor className="w-4 h-4 text-brand-blue" />
            <span>Appearance Theme</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">Select the window appearance of the RoadLab engineering workspace.</p>
          
          <div className="grid grid-cols-3 gap-3">
            {[
              { type: 'light', label: 'Light Mode', icon: Sun },
              { type: 'dark', label: 'Dark Mode', icon: Moon },
              { type: 'system', label: 'System Default', icon: Monitor }
            ].map(themeOpt => {
              const Icon = themeOpt.icon;
              const isSelected = settings.theme === themeOpt.type;
              
              return (
                <button
                  key={themeOpt.type}
                  onClick={() => handleThemeChange(themeOpt.type as any)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all space-y-2 ${
                    isSelected
                      ? 'bg-brand-blue/10 border-brand-blue text-brand-blue dark:text-brand-sky dark:bg-brand-blue/20'
                      : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-850 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-750 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-bold">{themeOpt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Measurement Units */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm flex items-center space-x-2">
            <Ruler className="w-4 h-4 text-brand-blue" />
            <span>Measurement Units</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">Define units used for linear measurements, grids, and polygon readouts.</p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { type: 'm', label: 'Meters (m)', desc: 'Standard road scale' },
              { type: 'cm', label: 'Centimeters (cm)', desc: 'Detailed distress crack scale' }
            ].map(unitOpt => {
              const isSelected = settings.units === unitOpt.type;
              
              return (
                <button
                  key={unitOpt.type}
                  onClick={() => handleUnitChange(unitOpt.type as any)}
                  className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-brand-blue/10 border-brand-blue text-brand-blue dark:text-brand-sky dark:bg-brand-blue/20'
                      : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-850 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-750 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-xs">{unitOpt.label}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">{unitOpt.desc}</p>
                  </div>
                  {isSelected && <CheckCircle className="w-4 h-4 text-brand-blue dark:text-brand-sky" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Export Preferences */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm flex items-center space-x-2">
            <FileDown className="w-4 h-4 text-brand-blue" />
            <span>Default Export Preferences</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">Select file format for reports, workspace data, and snapshot actions.</p>

          <div className="grid grid-cols-3 gap-3">
            {['CSV', 'PNG', 'JPG'].map(fmt => {
              const isSelected = settings.exportFormat === fmt;
              
              return (
                <button
                  key={fmt}
                  onClick={() => handleFormatChange(fmt as any)}
                  className={`py-2 px-4 rounded-lg border text-center font-bold text-xs transition-all ${
                    isSelected
                      ? 'bg-brand-blue border-brand-blue text-white shadow-md shadow-brand-blue/15'
                      : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-850 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-750 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {fmt} File
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Project Storage Statistics */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-brand-blue" />
            <span>Local Database Storage</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">Monitor caching allocations for local weights, loaded frames, and reports.</p>

          <div className="space-y-3">
            {/* Storage Progress bar */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Indexed Cache Space</span>
                <span className="text-brand-sky">{settings.storageUsed} ({pct}%)</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-850 rounded-full overflow-hidden border border-gray-300 dark:border-gray-750">
                <div
                  className="h-full bg-gradient-to-r from-brand-blue to-brand-sky"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Clear Storage actions */}
            <div className="flex items-center justify-between border-t border-gray-150 dark:border-gray-800 pt-3.5 mt-4">
              <span className="text-xs text-gray-500 dark:text-gray-400">Clear frames and model caching to free up memory.</span>
              <button
                onClick={handleClearCache}
                className="px-3.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold text-xs transition-colors"
              >
                Clear Temp Cache
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
export default Settings;
