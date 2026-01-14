'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useWebSocket } from '@/lib/useWebSocket';
import AddServerModal from '@/components/ui/AddServerModal';

export default function ServersPage() {
  const { servers, removeServer, updateServer, metrics } = useAppStore();
  const [showAddServer, setShowAddServer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Connect to all servers
  servers.forEach((server) => {
    useWebSocket(
      server.id,
      server.ip,
      server.port,
      server.password,
      true
    );
  });

  const handleEditStart = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const handleEditSave = (id: string) => {
    if (editName.trim()) {
      updateServer(id, { name: editName });
    }
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to remove this server?')) {
      removeServer(id);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Servers</h1>
          <p className="text-gray-400 mt-1">
            Manage {servers.length} server{servers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowAddServer(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Server
        </button>
      </div>

      {/* Servers Table */}
      {servers.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
          <svg
            className="w-16 h-16 text-gray-600 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
            />
          </svg>
          <h3 className="text-xl font-semibold text-white mb-2">
            No servers added yet
          </h3>
          <p className="text-gray-400 mb-6">
            Add your first server to start monitoring
          </p>
          <button
            onClick={() => setShowAddServer(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Your First Server
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800 border-b border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  CPU
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Memory
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {servers.map((server) => {
                const serverMetrics = metrics[server.id];
                const cpuPercent = serverMetrics?.cpu.usage_percent ?? 0;
                const memPercent = serverMetrics?.memory.total
                  ? (serverMetrics.memory.used / serverMetrics.memory.total) * 100
                  : 0;

                return (
                  <tr key={server.id} className="hover:bg-gray-800/50 transition-colors">
                    {/* Status */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            server.online ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                        <span className="text-sm text-gray-400">
                          {server.online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-6 py-4">
                      {editingId === server.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                          autoFocus
                        />
                      ) : (
                        <span className="text-white font-medium">
                          {server.name}
                        </span>
                      )}
                    </td>

                    {/* Address */}
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-400">
                        {server.ip}:{server.port}
                      </span>
                    </td>

                    {/* CPU */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${Math.min(cpuPercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-400 w-10 text-right">
                          {cpuPercent.toFixed(0)}%
                        </span>
                      </div>
                    </td>

                    {/* Memory */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${Math.min(memPercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-400 w-10 text-right">
                          {memPercent.toFixed(0)}%
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {editingId === server.id ? (
                          <>
                            <button
                              onClick={() => handleEditSave(server.id)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                handleEditStart(server.id, server.name)
                              }
                              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm rounded transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(server.id)}
                              className="px-3 py-1 bg-red-900/20 hover:bg-red-900/40 text-red-400 text-sm rounded transition-colors"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Server Modal */}
      {showAddServer && (
        <AddServerModal onClose={() => setShowAddServer(false)} />
      )}
    </div>
  );
}
