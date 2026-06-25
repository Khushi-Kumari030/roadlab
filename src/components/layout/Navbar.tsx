import React, { useRef, useState } from 'react';
import { useRoadLab } from '../../context/RoadLabContext';
import {
  Menu,
  Download,
  Upload,
  Bell,
  ChevronDown,
  Plus,
  LogOut,
  User as UserIcon
} from 'lucide-react';

export const Navbar: React.FC<{ setMobileOpen: (open: boolean) => void }> = ({ setMobileOpen }) => {
  const {
    currentView,
    projects,
    activeProject,
    setActiveProject,
    setCurrentView,
    createNewProject,
    exportWorkspaceData,
    importWorkspaceData,
    user,
    logout,
    notifications,
    clearNotifications,
    markNotificationsAsRead
  } = useRoadLab();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [bellDropdownOpen, setBellDropdownOpen] = useState(false);
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  
  // New project inputs
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Dashboard';
      case 'workspace': return 'Video Workspace';
      case 'calibration': return 'Calibration Grid';
      case 'measurements': return 'Measurement Panel';
      case 'models': return 'Model Library';
      case 'settings': return 'Settings';
      case 'profile': return 'User Profile';
      default: return 'RoadLab';
    }
  };

  const handleExport = () => {
    const dataStr = exportWorkspaceData();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `roadlab-workspace-${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importWorkspaceData(content);
      if (success) {
        alert('Workspace successfully imported!');
      } else {
        alert('Failed to parse workspace JSON. Please upload a valid exported file.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    createNewProject(newProjName, newProjDesc);
    setNewProjName('');
    setNewProjDesc('');
    setNewProjectModalOpen(false);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="h-16 flex items-center justify-between px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-workspace relative z-30 shadow-sm">
      
      {/* Left side: Hamburger & Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <h1 className="text-lg font-bold text-gray-850 dark:text-gray-100 min-w-[120px] transition-colors">
          {getViewTitle()}
        </h1>
      </div>

      {/* Middle: Project Selector */}
      <div className="hidden sm:flex items-center space-x-2">
        <div className="relative">
          <button
            onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-gray-350 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <span>{activeProject ? activeProject.name : 'Select Project'}</span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>
          
          {projectDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setProjectDropdownOpen(false)} />
              <div className="absolute left-0 mt-1.5 w-64 rounded-lg bg-white dark:bg-gray-850 shadow-xl border border-gray-200 dark:border-gray-750 py-1 z-20">
                <div className="px-3 py-1.5 text-xs text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-100 dark:border-gray-750">
                  Projects
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {projects.map((proj) => (
                    <button
                      key={proj.id}
                      onClick={() => {
                        setActiveProject(proj);
                        setCurrentView('workspace');
                        setProjectDropdownOpen(false);
                      }}
                      className={`flex flex-col items-start w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                        activeProject?.id === proj.id ? 'bg-brand-blue/10 dark:bg-brand-blue/20' : ''
                      }`}
                    >
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{proj.name}</span>
                      <span className="text-xs text-gray-400 mt-0.5">{proj.dateModified}</span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-gray-150 dark:border-gray-750 pt-1 mt-1">
                  <button
                    onClick={() => {
                      setNewProjectModalOpen(true);
                      setProjectDropdownOpen(false);
                    }}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm font-semibold text-brand-blue dark:text-brand-sky hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Project</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right side: Import, Export, Notifications, User */}
      <div className="flex items-center space-x-2 md:space-x-3">
        {/* Import */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />
        <button
          onClick={handleImportClick}
          title="Import Workspace JSON"
          className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all"
        >
          <Upload className="w-5 h-5" />
        </button>

        {/* Export */}
        <button
          onClick={handleExport}
          title="Export Workspace JSON"
          className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all"
        >
          <Download className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              const opening = !bellDropdownOpen;
              setBellDropdownOpen(opening);
              if (opening && unreadCount > 0) markNotificationsAsRead();
            }}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-brand-sky border-2 border-white dark:border-gray-900 rounded-full flex items-center justify-center text-[8px] text-white font-bold px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {bellDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setBellDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 rounded-lg bg-white dark:bg-gray-850 shadow-xl border border-gray-250 dark:border-gray-750 py-1.5 z-20">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-750 flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-800 dark:text-gray-200">
                    Notifications
                    {notifications.length > 0 && (
                      <span className="ml-1.5 text-gray-400 font-normal text-xs">({notifications.length})</span>
                    )}
                  </span>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-[11px] text-gray-400 hover:text-red-500 dark:hover:text-red-400 font-semibold transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto text-xs">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div key={n.id} className={`px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-750 last:border-b-0 transition-colors ${!n.read ? 'bg-brand-blue/5 dark:bg-brand-blue/10' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className={`font-semibold truncate ${!n.read ? 'text-gray-800 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>{n.title}</p>
                            <p className="text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>
                          </div>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-brand-sky flex-shrink-0 mt-1" />}
                        </div>
                        <p className="text-gray-400 dark:text-gray-600 mt-1 font-mono">{n.timestamp}</p>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-gray-400 italic">No notifications yet</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile */}
        <div className="h-8 w-px bg-gray-200 dark:bg-gray-800 mx-1"></div>
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center space-x-2 pl-1 cursor-pointer focus:outline-none hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 border border-brand-blue/30 flex items-center justify-center text-brand-blue dark:text-brand-sky font-semibold text-sm">
              {(() => {
                if (!user?.name) return 'RL';
                const parts = user.name.trim().split(/\s+/);
                if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
              })()}
            </div>
            <span className="hidden lg:inline text-sm font-semibold text-gray-700 dark:text-gray-200">
              {user?.name || 'User'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
          </button>

          {userDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white dark:bg-gray-850 shadow-xl border border-gray-200 dark:border-gray-750 py-1.5 z-20">
                <div className="px-3.5 py-2 border-b border-gray-100 dark:border-gray-750">
                  <p className="font-bold text-xs text-gray-800 dark:text-gray-200 truncate">{user?.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setCurrentView('profile');
                    setUserDropdownOpen(false);
                  }}
                  className="flex items-center space-x-2 w-full px-3.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <UserIcon className="w-3.5 h-3.5 text-gray-450" />
                  <span>My Profile</span>
                </button>
                <button
                  onClick={() => {
                    logout();
                    setUserDropdownOpen(false);
                  }}
                  className="flex items-center space-x-2 w-full px-3.5 py-2 text-left text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border-t border-gray-100 dark:border-gray-750"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Project Modal */}
      {newProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl max-w-md w-full shadow-2xl p-6 transition-workspace text-gray-800 dark:text-gray-100">
            <h2 className="text-xl font-bold mb-4">Create New Project</h2>
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label className="block text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Highway 101 Scan"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <div className="mb-6">
                <label className="block text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1.5">
                  Description
                </label>
                <textarea
                  placeholder="Enter details about this survey..."
                  value={newProjDesc}
                  rows={3}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setNewProjectModalOpen(false)}
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
    </header>
  );
};
export default Navbar;
