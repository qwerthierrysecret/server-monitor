'use client';

import { Server, SystemMetrics } from '@/lib/store';
import Link from 'next/link';

interface ServerCardProps {
  server: Server;
  metrics?: SystemMetrics;
}

export default function ServerCard({ server, metrics }: ServerCardProps) {
  const cpuPercent = metrics?.cpu.usage_percent ?? 0;
  const memPercent = metrics?.memory.total
    ? (metrics.memory.used / metrics.memory.total) * 100
    : 0;
  const diskPercent = metrics?.disk.percent ?? 0;

  const getStatusColor = (percent: number) => {
    if (percent < 50) return 'text-green-400';
    if (percent < 80) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusBg = (percent: number) => {
    if (percent < 50) return 'bg-green-900/20';
    if (percent < 80) return 'bg-yellow-900/20';
    return 'bg-red-900/20';
  };

  return (
    <Link href={`/dashboard/server/${server.id}`}>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-all hover:shadow-lg cursor-pointer group">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
              {server.name}
            </h3>
            <p className="text-sm text-gray-400">
              {server.ip}:{server.port}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                server.online ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-gray-400">
              {server.online ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* CPU */}
          <div className={`p-3 rounded-lg ${getStatusBg(cpuPercent)}`}>
            <p className="text-xs text-gray-400 mb-1">CPU</p>
            <p className={`text-lg font-bold ${getStatusColor(cpuPercent)}`}>
              {cpuPercent.toFixed(1)}%
            </p>
          </div>

          {/* Memory */}
          <div className={`p-3 rounded-lg ${getStatusBg(memPercent)}`}>
            <p className="text-xs text-gray-400 mb-1">Memory</p>
            <p className={`text-lg font-bold ${getStatusColor(memPercent)}`}>
              {memPercent.toFixed(1)}%
            </p>
          </div>

          {/* Disk */}
          <div className={`p-3 rounded-lg ${getStatusBg(diskPercent)}`}>
            <p className="text-xs text-gray-400 mb-1">Disk</p>
            <p className={`text-lg font-bold ${getStatusColor(diskPercent)}`}>
              {diskPercent.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500">
            {metrics
              ? `Last update: ${new Date(metrics.timestamp * 1000).toLocaleTimeString()}`
              : 'No data available'}
          </p>
        </div>
      </div>
    </Link>
  );
}
