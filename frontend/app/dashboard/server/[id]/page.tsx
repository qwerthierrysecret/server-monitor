'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
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
  timestamp: number;
}

type TimeRange = '1h' | '6h' | '12h' | '24h' | '2d' | '7d';

export default function ServerDetailPage() {
  const params = useParams();
  const serverId = params.id as string;
  const { servers, getMetrics } = useAppStore();
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [range, setRange] = useState<TimeRange>('1h');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const server = servers.find((s) => s.id === serverId);
  const serverMetrics = getMetrics(serverId);

  // Connect to server
  const { ws } = useWebSocket(
    server?.id || '',
    server?.ip || '',
    server?.port || 8765,
    server?.password || '',
    !!server
  );

  const requestHistory = useCallback((timeRange: TimeRange) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      setIsLoadingHistory(true);
      ws.send(JSON.stringify({
        type: 'history',
        range: timeRange
      }));
    }
  }, [ws]);

  // Handle history data from WebSocket
  useEffect(() => {
    const handleHistory = (event: any) => {
      const data = event.detail;
      if (data.range === range && data.points) {
        const formattedPoints = data.points.map((p: any) => ({
          timestamp: p.timestamp,
          time: new Date(p.timestamp * 1000).toLocaleString([], { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          cpu: p.cpu,
          memory: p.memory,
          disk: p.disk
        }));
        setHistory(formattedPoints);
        setIsLoadingHistory(false);
      }
    };

    window.addEventListener(`server-history-${serverId}` as any, handleHistory);
    return () => {
      window.removeEventListener(`server-history-${serverId}` as any, handleHistory);
    };
  }, [serverId, range]);

  // Request history when range changes or connection opens
  useEffect(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      requestHistory(range);
    }
  }, [ws?.readyState, range, requestHistory]);

  // Update history with real-time metrics
  useEffect(() => {
    if (serverMetrics && !isLoadingHistory) {
      const time = new Date(serverMetrics.timestamp * 1000).toLocaleString([], { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      const newPoint: HistoryPoint = {
        timestamp: serverMetrics.timestamp,
        time,
        cpu: serverMetrics.cpu.usage_percent,
        memory: serverMetrics.memory.total ? (serverMetrics.memory.used / serverMetrics.memory.total) * 100 : 0,
        disk: serverMetrics.disk.percent
      };

      setHistory((prev) => {
        // Avoid duplicate timestamps
        if (prev.length > 0 && prev[prev.length - 1].timestamp === newPoint.timestamp) {
          return prev;
        }
        const updated = [...prev, newPoint];
        // Limit points based on range to keep UI responsive
        const maxPoints = range === '1h' ? 720 : 1000;
        return updated.slice(-maxPoints);
      });
    }
  }, [serverMetrics, isLoadingHistory, range]);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{server.name}</h1>
          <p className="text-gray-400 mt-1">
            {server.ip}:{server.port}
          </p>
        </div>
        
        {/* Range Selector */}
        <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg p-1">
          {(['1h', '6h', '12h', '24h', '2d', '7d'] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                range === r
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CPU */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">CPU Usage</h3>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 5h6m-6 4h6m-6 4h6m-6 4h6M5 5h.01M5 9h.01M5 13h.01M5 17h.01" />
              </svg>
            </div>
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
            <div className="p-2 bg-green-500/10 rounded-lg">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-bold text-white mb-2">
            {memPercent.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-400">
            {formatBytes(serverMetrics?.memory.used || 0)} / {formatBytes(serverMetrics?.memory.total || 0)}
          </p>
        </div>

        {/* Disk */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">Disk Usage</h3>
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 9H5a2 2 0 00-2 2v6a2 2 0 002 2h14a2 2 0 002-2v-6a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2m0 0a2 2 0 012 2v2H7V7a2 2 0 012-2z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-bold text-white mb-2">
            {diskPercent.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-400">
            {formatBytes(serverMetrics?.disk.used || 0)} / {formatBytes(serverMetrics?.disk.total || 0)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU & Memory Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">CPU & Memory Trend</h3>
            {isLoadingHistory && <span className="text-xs text-blue-400 animate-pulse">Loading history...</span>}
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#9ca3af" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  minTickGap={30}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend iconType="circle" />
                <Line
                  type="monotone"
                  dataKey="cpu"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="CPU %"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="memory"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Memory %"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Disk Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Disk Usage Trend</h3>
            {isLoadingHistory && <span className="text-xs text-blue-400 animate-pulse">Loading history...</span>}
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorDisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#9ca3af" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  minTickGap={30}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="disk"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDisk)"
                  name="Disk %"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-6">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div>
            <p className="text-sm text-gray-400 mb-1">Hostname</p>
            <p className="text-white font-medium">{serverMetrics?.system.hostname || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Kernel</p>
            <p className="text-white font-medium">{serverMetrics?.system.kernel || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Architecture</p>
            <p className="text-white font-medium">{serverMetrics?.system.architecture || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Uptime</p>
            <p className="text-white font-medium">
              {serverMetrics ? formatUptime(serverMetrics.system.uptime) : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Total Processes</p>
            <p className="text-white font-medium">{serverMetrics?.processes.total || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Running Processes</p>
            <p className="text-white font-medium">{serverMetrics?.processes.running || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Load Average */}
      {serverMetrics && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Load Average</h3>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-400 mb-2">1 Minute</p>
              <p className="text-2xl font-bold text-white">{serverMetrics.cpu.load_avg_1m.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">5 Minutes</p>
              <p className="text-2xl font-bold text-white">{serverMetrics.cpu.load_avg_5m.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">15 Minutes</p>
              <p className="text-2xl font-bold text-white">{serverMetrics.cpu.load_avg_15m.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
