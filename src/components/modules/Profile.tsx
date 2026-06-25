import React, { useState } from 'react';
import { useRoadLab } from '../../context/RoadLabContext';
import { User as UserIcon, Mail, Shield, Building, Key, Sun, Moon, Save, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, updateProfile, authLoading, authError } = useRoadLab();

  // Profile forms state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [company, setCompany] = useState(user?.company || '');
  const [role, setRole] = useState(user?.role || '');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(user?.theme || 'dark');
  const [units, setUnits] = useState<'m' | 'cm'>(user?.units || 'm');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility
  const [showPwd, setShowPwd] = useState(false);

  // Status flags
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    if (!name.trim() || !email.trim()) {
      setErrorMsg('Name and email are required fields.');
      return;
    }
    try {
      await updateProfile({ name, email, company, role, theme, units });
      setSuccessMsg('Profile information updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!currentPassword) {
      setErrorMsg('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    try {
      await updateProfile({ currentPassword, newPassword });
      setSuccessMsg('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password. Please check your current password.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-850 dark:text-gray-100">Profile Management</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Configure your personal details, workspace preferences, and security settings.
            </p>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {successMsg && (
          <div className="p-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 text-xs flex items-center space-x-2 animate-fade-in">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {(errorMsg || authError) && (
          <div className="p-3.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-500 text-xs flex items-center space-x-2 animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">{errorMsg || authError}</span>
          </div>
        )}

        {/* Grid Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left panel: Summary & Preferences */}
          <div className="md:col-span-1 space-y-6">
            
            {/* User Details card */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl p-5 shadow-sm text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-brand-blue to-brand-sky text-white flex items-center justify-center font-bold text-2xl mx-auto shadow-lg mb-4">
                {(() => {
                  if (!user?.name) return 'US';
                  const parts = user.name.trim().split(/\s+/);
                  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
                  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                })()}
              </div>
              <h3 className="font-bold text-gray-850 dark:text-gray-100 text-sm">{user?.name}</h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{user?.email}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue dark:text-brand-sky font-bold text-[9px] uppercase tracking-wider">
                  {user?.role || 'Engineer'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 font-bold text-[9px] uppercase tracking-wider">
                  {user?.company || 'Organization'}
                </span>
              </div>
            </div>

            {/* Quick Preferences card */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl p-5 shadow-sm space-y-4">
              <h4 className="font-bold text-xs uppercase text-gray-400 tracking-wider">Preferences</h4>
              
              {/* Theme Settings */}
              <div>
                <label className="block text-xs text-gray-500 font-semibold mb-2">Interface Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setTheme('dark');
                      updateProfile({ theme: 'dark' });
                    }}
                    className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      theme === 'dark'
                        ? 'border-brand-blue bg-brand-blue/10 text-brand-blue dark:border-brand-sky dark:bg-brand-sky/10 dark:text-brand-sky'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-850 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark</span>
                  </button>
                  <button
                    onClick={() => {
                      setTheme('light');
                      updateProfile({ theme: 'light' });
                    }}
                    className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      theme === 'light'
                        ? 'border-brand-blue bg-brand-blue/10 text-brand-blue dark:border-brand-sky dark:bg-brand-sky/10 dark:text-brand-sky'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-850 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light</span>
                  </button>
                </div>
              </div>

              {/* Units Settings */}
              <div>
                <label className="block text-xs text-gray-500 font-semibold mb-2">Calibration Units</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setUnits('m');
                      updateProfile({ units: 'm' });
                    }}
                    className={`py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      units === 'm'
                        ? 'border-brand-blue bg-brand-blue/10 text-brand-blue dark:border-brand-sky dark:bg-brand-sky/10 dark:text-brand-sky'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-850 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Meters (m)
                  </button>
                  <button
                    onClick={() => {
                      setUnits('cm');
                      updateProfile({ units: 'cm' });
                    }}
                    className={`py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      units === 'cm'
                        ? 'border-brand-blue bg-brand-blue/10 text-brand-blue dark:border-brand-sky dark:bg-brand-sky/10 dark:text-brand-sky'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-850 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Centimeters (cm)
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* Right panels: Editing profile details & Password controls */}
          <div className="md:col-span-2 space-y-6">
            
            {/* General details form */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl p-5 shadow-sm">
              <h4 className="font-bold text-xs uppercase text-gray-400 tracking-wider mb-4">Edit Profile Info</h4>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  <div>
                    <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-bold mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                        <UserIcon className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-bold mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-bold mb-1.5">
                      Company / Organization
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                        <Building className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-bold mb-1.5">
                      Professional Role
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                        <Shield className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all"
                      />
                    </div>
                  </div>

                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-brand-blue/10 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password form */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl p-5 shadow-sm">
              <h4 className="font-bold text-xs uppercase text-gray-400 tracking-wider mb-4">Update Security Password</h4>
              <form onSubmit={handleChangePassword} className="space-y-4">
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-bold mb-1.5">
                      Current Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                        <Key className="w-4 h-4" />
                      </span>
                      <input
                        type={showPwd ? 'text' : 'password'}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-bold mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                          <Key className="w-4 h-4" />
                        </span>
                        <input
                          type={showPwd ? 'text' : 'password'}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-9 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd(!showPwd)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                          {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-bold mb-1.5">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                          <Key className="w-4 h-4" />
                        </span>
                        <input
                          type={showPwd ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-brand-blue/10 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Change Password</span>
                  </button>
                </div>
              </form>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
export default Profile;
