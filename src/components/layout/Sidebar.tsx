import React from 'react';
import { useRoadLab, type ActiveView } from '../../context/RoadLabContext';
import {
  LayoutDashboard,
  Video,
  TrendingUp,
  ShieldAlert,
  Grid3X3,
  Ruler,
  Database,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  LogOut
} from 'lucide-react';

interface SidebarItem {
  view: ActiveView;
  label: string;
  icon: React.ComponentType<any>;
}

export const Sidebar: React.FC<{ mobileOpen: boolean; setMobileOpen: (open: boolean) => void }> = ({
  mobileOpen,
  setMobileOpen
}) => {
  const { currentView, setCurrentView, sidebarExpanded, setSidebarExpanded, logout } = useRoadLab();

  const menuItems: SidebarItem[] = [
    { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { view: 'workspace', label: 'Video Workspace', icon: Video },
    { view: 'analytics', label: 'Traffic Analytics', icon: TrendingUp },
    { view: 'distress', label: 'Road Distress', icon: ShieldAlert },
    { view: 'calibration', label: 'Calibration', icon: Grid3X3 },
    { view: 'measurements', label: 'Measurements', icon: Ruler },
    { view: 'models', label: 'Models', icon: Database },
    { view: 'settings', label: 'Settings', icon: SettingsIcon },
    { view: 'profile', label: 'Profile', icon: UserIcon }
  ];

  const handleNav = (view: ActiveView) => {
    setCurrentView(view);
    setMobileOpen(false); // Close mobile drawer on selection
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100 border-r border-gray-800 transition-workspace">
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
        {(sidebarExpanded || mobileOpen) ? (
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-blue to-brand-sky text-white font-bold text-lg shadow-lg shadow-brand-blue/30">
              R
            </div>
            <span className="font-bold text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
              RoadLab
            </span>
          </div>
        ) : (
          <div className="flex justify-center w-full">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-blue to-brand-sky text-white font-bold text-lg shadow-lg shadow-brand-blue/30">
              R
            </div>
          </div>
        )}

        {/* Collapse Button - Desktop Only */}
        {!mobileOpen && (
          <button
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="hidden md:flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            {sidebarExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.view;
          
          return (
            <button
              key={item.view}
              onClick={() => handleNav(item.view)}
              className={`flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-workspace group relative ${
                isActive
                  ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                  : 'text-gray-400 hover:bg-gray-850 hover:text-gray-100'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 transition-transform ${
                isActive ? 'scale-110' : 'group-hover:scale-105'
              }`} />
              
              {(sidebarExpanded || mobileOpen) && (
                <span className="ml-3 transition-opacity duration-200">{item.label}</span>
              )}

              {/* Tooltip for collapsed sidebar */}
              {!sidebarExpanded && !mobileOpen && (
                <div className="absolute left-16 scale-0 group-hover:scale-100 transition-all duration-150 origin-left bg-gray-950 text-gray-200 text-xs rounded px-2 py-1.5 shadow-lg border border-gray-800 whitespace-nowrap z-55 pointer-events-none">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
        
        {/* Logout Button */}
        <button
          onClick={() => {
            if (confirm('Are you sure you want to sign out?')) {
              logout();
            }
          }}
          className="flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-workspace text-red-400 hover:bg-red-500/10 hover:text-red-500 group relative mt-4 border-t border-gray-800"
        >
          <LogOut className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-105" />
          {(sidebarExpanded || mobileOpen) && (
            <span className="ml-3 transition-opacity duration-200">Sign Out</span>
          )}
          {!sidebarExpanded && !mobileOpen && (
            <div className="absolute left-16 scale-0 group-hover:scale-100 transition-all duration-150 origin-left bg-gray-950 text-red-400 text-xs rounded px-2 py-1.5 shadow-lg border border-gray-800 whitespace-nowrap z-55 pointer-events-none">
              Sign Out
            </div>
          )}
        </button>
      </nav>

      {/* Footer */}
      {(sidebarExpanded || mobileOpen) ? (
        <div className="p-4 border-t border-gray-800 text-center text-xs text-gray-500">
          <div>RoadLab v1.0.0</div>
          <div className="mt-0.5">Core & Measurement</div>
        </div>
      ) : (
        <div className="py-4 border-t border-gray-800 text-center text-[10px] text-gray-500 font-mono">
          v1.0
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar view */}
      <div
        className={`hidden md:block h-full flex-shrink-0 ${
          sidebarExpanded ? 'w-60' : 'w-16'
        } transition-workspace`}
      >
        {sidebarContent}
      </div>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer view */}
      <div
        className={`md:hidden fixed top-0 bottom-0 left-0 z-50 w-60 transform ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out`}
      >
        {sidebarContent}
      </div>
    </>
  );
};
export default Sidebar;
