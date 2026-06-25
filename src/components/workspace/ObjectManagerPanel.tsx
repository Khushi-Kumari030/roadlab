import React, { useState } from 'react';
import { useRoadLab } from '../../context/RoadLabContext';
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Edit2,
  Copy,
  Trash2,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export const ObjectManagerPanel: React.FC = () => {
  const {
    measurements,
    deleteMeasurement,
    calibrations,
    deleteCalibration,
    trafficLines,
    deleteTrafficLine,
    trafficROIs,
    deleteTrafficROI,
    distressItems,
    deleteDistressItem,
    hiddenObjectIds,
    toggleHideObject,
    lockedObjectIds,
    toggleLockObject,
    duplicateObject,
    renameObject
  } = useRoadLab();

  // Local state for inline renaming
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [editingType, setEditingType] = useState<string>('');

  const handleStartRename = (id: string, name: string, type: string) => {
    setEditingId(id);
    setEditingName(name);
    setEditingType(type);
  };

  const handleSaveRename = () => {
    if (!editingId || !editingName.trim()) return;
    renameObject(editingId, editingType, editingName.trim());
    setEditingId(null);
    setEditingName('');
    setEditingType('');
  };

  const isHidden = (id: string) => hiddenObjectIds.includes(id);
  const isLocked = (id: string) => lockedObjectIds.includes(id);

  interface ManagerItem {
    id: string;
    name: string;
    type: string;
    subtitle: string;
    onDelete: () => void;
    noDuplicate?: boolean;
  }

  // Group items
  const allGroups: Array<{ title: string; items: ManagerItem[] }> = [
    {
      title: 'Survey Measurements',
      items: measurements.map(m => ({
        id: m.id,
        name: m.name,
        type: 'measurement',
        subtitle: `Type: ${m.type.toUpperCase()} | ${m.value}`,
        onDelete: () => deleteMeasurement(m.id)
      }))
    },
    {
      title: 'Perspective Calibrations',
      items: calibrations.map(c => ({
        id: c.id,
        name: c.name,
        type: 'calibration',
        subtitle: `Grid: ${c.gridWidth}m x ${c.gridHeight}m`,
        onDelete: () => deleteCalibration(c.id),
        noDuplicate: true
      }))
    },
    {
      title: 'Traffic Virtual Gates',
      items: [
        ...trafficLines.map(line => ({
          id: line.id,
          name: line.name,
          type: 'line',
          subtitle: `Gate: ${line.type === 'counting' ? 'Bidirectional' : 'Directional'}`,
          onDelete: () => deleteTrafficLine(line.id)
        })),
        ...trafficROIs.map(roi => ({
          id: roi.id,
          name: roi.name,
          type: 'roi',
          subtitle: `ROI Polygon (${roi.points.length} nodes)`,
          onDelete: () => deleteTrafficROI(roi.id)
        }))
      ]
    },
    {
      title: 'Pavement Defects',
      items: distressItems.map(d => ({
        id: String(d.id),
        name: d.type || (d.class === 'pothole' ? 'Pothole Defect' : 'Crack Defect'),
        type: 'distress',
        subtitle: `Distress: ${d.class.toUpperCase()} | ${d.area_sq_m}m²`,
        onDelete: () => deleteDistressItem(d.id)
      }))
    }
  ];

  const totalItemsCount = allGroups.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-150 p-4 overflow-y-auto text-xs select-none">
      
      {/* Title Header */}
      <div className="flex items-center space-x-2 border-b border-gray-200 dark:border-gray-800 pb-3 mb-4 flex-shrink-0">
        <Layers className="w-5 h-5 text-brand-blue" />
        <div>
          <h3 className="font-extrabold text-sm uppercase tracking-wide">Workspace Object Manager</h3>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
            Manage overlay locks, visibilities, renames, and copy templates.
          </p>
        </div>
      </div>

      {totalItemsCount === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400">
          <Layers className="w-10 h-10 text-gray-650 mb-3 animate-pulse" />
          <p className="font-semibold text-xs">No active canvas objects</p>
          <p className="text-[10px] text-gray-500 mt-1 max-w-[180px]">
            Use the floating canvas toolbar to draw measurements or annotations first.
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-5 overflow-y-auto pr-1">
          {allGroups.map((group, gIdx) => {
            if (group.items.length === 0) return null;
            return (
              <div key={gIdx} className="space-y-2">
                <h4 className="font-bold text-[10px] uppercase text-gray-400 tracking-wider flex items-center justify-between border-b border-gray-150 dark:border-gray-850 pb-1">
                  <span>{group.title}</span>
                  <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[8px] font-semibold text-gray-400">
                    {group.items.length}
                  </span>
                </h4>
                
                <div className="space-y-1.5">
                  {group.items.map(item => {
                    const locked = isLocked(item.id);
                    const hidden = isHidden(item.id);
                    const isEditing = editingId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`flex flex-col p-2.5 rounded-lg border transition-all ${
                          hidden
                            ? 'bg-gray-50/50 dark:bg-gray-900/30 border-dashed border-gray-200 dark:border-gray-800 opacity-60'
                            : 'bg-gray-50 dark:bg-gray-850 border-gray-200 dark:border-gray-800'
                        }`}
                      >
                        <div className="flex items-center justify-between min-w-0">
                          {isEditing ? (
                            <div className="flex items-center space-x-1.5 flex-1 min-w-0 mr-2">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename();
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                                className="flex-1 px-1.5 py-0.5 text-[11px] rounded bg-white dark:bg-gray-950 border border-brand-blue text-gray-800 dark:text-white focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={handleSaveRename}
                                className="p-1 text-success hover:bg-success/15 rounded"
                                title="Save name"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="min-w-0 flex-1 mr-2">
                              <span
                                className={`font-bold text-xs truncate block ${
                                  locked ? 'text-gray-400 italic' : 'text-gray-850 dark:text-gray-200'
                                }`}
                                title={item.name}
                              >
                                {item.name}
                              </span>
                            </div>
                          )}

                          {/* Action controls buttons */}
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            {/* Hide toggle */}
                            <button
                              onClick={() => toggleHideObject(item.id)}
                              title={hidden ? 'Unhide item on canvas' : 'Hide item on canvas'}
                              className={`p-1 rounded transition-colors ${
                                hidden
                                  ? 'text-brand-sky hover:bg-brand-sky/10'
                                  : 'text-gray-450 hover:bg-gray-205 dark:hover:bg-gray-800'
                              }`}
                            >
                              {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>

                            {/* Lock toggle */}
                            <button
                              onClick={() => toggleLockObject(item.id)}
                              title={locked ? 'Unlock item actions' : 'Lock item to prevent deletions'}
                              className={`p-1 rounded transition-colors ${
                                locked
                                  ? 'text-amber-500 hover:bg-amber-500/10'
                                  : 'text-gray-455 hover:bg-gray-205 dark:hover:bg-gray-800'
                              }`}
                            >
                              {locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>

                            {/* Rename trigger */}
                            <button
                              onClick={() => handleStartRename(item.id, item.name, item.type)}
                              disabled={locked}
                              title="Rename object"
                              className="p-1 rounded text-gray-450 hover:bg-gray-205 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Duplicate trigger */}
                            {!item.noDuplicate && (
                              <button
                                onClick={() => duplicateObject(item.id, item.type)}
                                disabled={locked}
                                title="Duplicate object"
                                className="p-1 rounded text-gray-455 hover:bg-gray-205 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete trigger */}
                            <button
                              onClick={() => {
                                if (confirm(`Delete ${item.name}?`)) {
                                  item.onDelete();
                                }
                              }}
                              disabled={locked}
                              title="Delete object"
                              className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-450 dark:text-gray-500 font-mono mt-0.5 truncate block">
                          {item.subtitle}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info footer */}
      <div className="mt-4 pt-3 border-t border-gray-150 dark:border-gray-850 flex items-center space-x-2 text-[10px] text-gray-500 font-medium">
        <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Locked items cannot be renamed, duplicated, or deleted.</span>
      </div>

    </div>
  );
};
export default ObjectManagerPanel;
