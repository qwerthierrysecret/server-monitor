'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAppStore, SystemMetrics } from '@/lib/store';
import { useWebSocket } from '@/lib/useWebSocket';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface HistoryPoint {
  time: string;
  cpu: number;
  memory: number;
  disk: number;
}

export default function ServerDetailPage() {
  const params = useParams();
  const serverId = params.id as string;
  const { servers, metrics, getMetrics } = useAppStore();
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  const server = servers.find((s) => s.id === serverId);
  const serverMetrics = getMetrics(serverId);

  // Connect to server
  if (server) {
    useWebSocket(
      server.id,
      server.ip,
      server.port,
      server.password,
      true
    );
  }

  // Update history
  useEffect(() => {
    if (serverMetrics) {
      const time = new Date(serverMetrics.timestamp * 1000).toLocaleTimeString();
      const cpuPercent = serverMetrics.cpu.usage_percent;
      const memPercent = serverMetrics.memory.total
        ? (serverMetrics.memory.used / serverMetrics.memory.total) * 100
        : 0;
      const diskPercent = serverMetrics.disk.percent;

      setHistory((prev) => {
        const updated = [
          ...prev,
          { time, cpu: cpuPercent, memory: memPercent, disk: diskPercent },
        ];
        // Keep only last 60 data points
        return updated.slice(-60);
      });
    }
  }, [serverMetrics]);

  if (!server) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Server not found</p>
      </div>
    );
  }

  const cpuPercent = serverMetrics?.cpu.usage_percent ?? 0;
  const memPercent = serverMetrics?.memory.total
    ? (serverMetrics.memory.used / serverMetrics.memory.total) * 100
    : 0;
  const diskPercent = serverMetrics?.disk.percent ?? 0;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">{server.name}</h1>
        <p className="text-gray-400 mt-1">
          {server.ip}:{server.port}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CPU */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">CPU Usage</h3>
            <svg
              className="w-6 h-6 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 3v2m6-2v2M9 5h6m-6 4h6m-6 4h6m-6 4h6M5 5h.01M5 9h.01M5 13h.01M5 17h.01"
              />
            </svg>
          </div>
          <p className="text-4xl font-bold text-white mb-2">
            {cpuPercent.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-400">
            {serverMetrics?.cpu.cores} cores
          </p>
        </div>

        {/* Memory */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">Memory Usage</h3>
            <svg
              className="w-6 h-6 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
          </div>
          <p className="text-4xl font-bold text-white mb-2">
            {memPercent.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-400">
            {formatBytes(serverMetrics?.memory.used || 0)} /{' '}
            {formatBytes(serverMetrics?.memory.total || 0)}
          </p>
        </div>

        {/* Disk */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">Disk Usage</h3>
            <svg
              className="w-6 h-6 text-yellow-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 9H5a2 2 0 00-2 2v6a2 2 0 002 2h14a2 2 0 002-2v-6a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2m0 0a2 2 0 012 2v2H7V7a2 2 0 012-2z"
              />
            </svg>
          </div>
          <p className="text-4xl font-bold text-white mb-2">
            {diskPercent.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-400">
            {formatBytes(serverMetrics?.disk.used || 0)} /{' '}
            {formatBytes(serverMetrics?.disk.total || 0)}
          </p>
        </div>
      </div>

      {/* Charts */}
      {history.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU & Memory Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              CPU & Memory Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cpu"
                  stroke="#3b82f6"
                  dot={false}
                  name="CPU %"
                />
                <Line
                  type="monotone"
                  dataKey="memory"
                  stroke="#10b981"
                  dot={false}
                  name="Memory %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Disk Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Disk Usage Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="disk"
                  fill="#f59e0b"
                  stroke="#f59e0b"
                  name="Disk %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* System Information */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          System Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-400 mb-1">Hostname</p>
            <p className="text-white font-medium">
              {serverMetrics?.system.hostname || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Kernel</p>
            <p className="text-white font-medium">
              {serverMetrics?.system.kernel || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Architecture</p>
            <p className="text-white font-medium">
              {serverMetrics?.system.architecture || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Uptime</p>
            <p className="text-white font-medium">
              {serverMetrics
                ? formatUptime(serverMetrics.system.uptime)
                : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Total Processes</p>
            <p className="text-white font-medium">
              {serverMetrics?.processes.total || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Running Processes</p>
            <p className="text-white font-medium">
              {serverMetrics?.processes.running || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Load Average */}
      {serverMetrics && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Load Average
          </h3>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-400 mb-2">1 Minute</p>
              <p className="text-2xl font-bold text-white">
                {serverMetrics.cpu.load_avg_1m.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">5 Minutes</p>
              <p className="text-2xl font-bold text-white">
                {serverMetrics.cpu.load_avg_5m.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">15 Minutes</p>
              <p className="text-2xl font-bold text-white">
                {serverMetrics.cpu.load_avg_15m.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
