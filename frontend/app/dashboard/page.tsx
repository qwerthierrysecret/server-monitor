'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import ServerCard from '@/components/ui/ServerCard';
import AddServerModal from '@/components/ui/AddServerModal';
import ServerConnection from '@/components/ui/ServerConnection';

export default function DashboardPage() {
  const { servers, metrics } = useAppStore();
  const [showAddServer, setShowAddServer] = useState(false);

  return (
    <div className="space-y-8">
      {/* WebSocket Connections */}
      {servers.map((server) => (
        <ServerConnection
          key={server.id}
          serverId={server.id}
          ip={server.ip}
          port={server.port}
          password={server.password}
        />
      ))}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Monitor {servers.length} server{servers.length !== 1 ? 's' : ''}
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

      {/* Servers Grid */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              metrics={metrics[server.id]}
            />
          ))}
        </div>
      )}

      {/* Add Server Modal */}
      {showAddServer && (
        <AddServerModal onClose={() => setShowAddServer(false)} />
      )}
    </div>
  );
}
