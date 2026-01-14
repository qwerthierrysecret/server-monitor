'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';

export default function SettingsPage() {
  const { adminPassword, setAdminPassword, saveToLocalStorage } = useAppStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate current password
    if (currentPassword !== adminPassword) {
      setError('Current password is incorrect');
      return;
    }

    // Validate new password
    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters');
      return;
    }

    // Validate confirmation
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    // Update password
    setAdminPassword(newPassword);
    saveToLocalStorage();

    // Clear form
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSuccess('Password changed successfully!');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">
          Manage your dashboard preferences
        </p>
      </div>

      {/* Change Password Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Change Admin Password
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Update your admin password for dashboard access
        </p>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg">
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          <div>
            <label htmlFor="current" className="block text-sm font-medium text-gray-300 mb-2">
              Current Password
            </label>
            <input
              id="current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="new" className="block text-sm font-medium text-gray-300 mb-2">
              New Password
            </label>
            <input
              id="new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-300 mb-2">
              Confirm New Password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Change Password
          </button>
        </form>
      </div>

      {/* Info Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Dashboard Information
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Version</span>
            <span className="text-white font-mono">1.0.1</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Default Password</span>
            <span className="text-white font-mono">admin</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Storage</span>
            <span className="text-white">Local Storage</span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-900/10 border border-red-800/50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-red-400 mb-4">
          Danger Zone
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          Reset all data and return to default settings
        </p>
        <button
          onClick={() => {
            if (confirm('Are you sure? This will delete all servers and reset your password to "admin".')) {
              localStorage.clear();
              window.location.href = '/login';
            }
          }}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
        >
          Reset All Data
        </button>
      </div>
    </div>
  );
}
