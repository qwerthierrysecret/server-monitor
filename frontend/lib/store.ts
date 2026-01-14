import { create } from 'zustand';

export interface Server {
  id: string;
  name: string;
  ip: string;
  port: number;
  password: string;
  online: boolean;
  lastUpdate: number;
}

export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage_percent: number;
    load_avg_1m: number;
    load_avg_5m: number;
    load_avg_15m: number;
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    available: number;
    buffers: number;
    cached: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percent: number;
    mountpoint: Record<string, {
      total: number;
      used: number;
      free: number;
      percent: number;
    }>;
  };
  processes: {
    total: number;
    running: number;
  };
  system: {
    uptime: number;
    hostname: string;
    kernel: string;
    architecture: string;
  };
  network: {
    bytes_sent: number;
    bytes_received: number;
  };
}

export interface ServerMetrics {
  [serverId: string]: SystemMetrics;
}

interface AppStore {
  // Auth
  isAuthenticated: boolean;
  adminPassword: string;
  setAuthenticated: (value: boolean) => void;
  setAdminPassword: (password: string) => void;

  // Servers
  servers: Server[];
  addServer: (server: Server) => void;
  removeServer: (id: string) => void;
  updateServer: (id: string, server: Partial<Server>) => void;
  getServers: () => Server[];

  // Metrics
  metrics: ServerMetrics;
  setMetrics: (serverId: string, metrics: SystemMetrics) => void;
  getMetrics: (serverId: string) => SystemMetrics | undefined;

  // Server status
  setServerOnline: (serverId: string, online: boolean) => void;
  isServerOnline: (serverId: string) => boolean;

  // Storage
  loadFromLocalStorage: () => void;
  saveToLocalStorage: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  isAuthenticated: false,
  adminPassword: 'admin',
  servers: [],
  metrics: {},

  setAuthenticated: (value: boolean) => set({ isAuthenticated: value }),
  setAdminPassword: (password: string) => set({ adminPassword: password }),

  addServer: (server: Server) => {
    const servers = get().servers;
    if (!servers.find(s => s.id === server.id)) {
      set({ servers: [...servers, server] });
      get().saveToLocalStorage();
    }
  },

  removeServer: (id: string) => {
    set({ servers: get().servers.filter(s => s.id !== id) });
    get().saveToLocalStorage();
  },

  updateServer: (id: string, updates: Partial<Server>) => {
    set({
      servers: get().servers.map(s =>
        s.id === id ? { ...s, ...updates } : s
      ),
    });
    get().saveToLocalStorage();
  },

  getServers: () => get().servers,

  setMetrics: (serverId: string, metrics: SystemMetrics) => {
    set({
      metrics: {
        ...get().metrics,
        [serverId]: metrics,
      },
    });
  },

  getMetrics: (serverId: string) => get().metrics[serverId],

  setServerOnline: (serverId: string, online: boolean) => {
    set({
      servers: get().servers.map(s =>
        s.id === serverId ? { ...s, online, lastUpdate: Date.now() } : s
      ),
    });
  },

  isServerOnline: (serverId: string) => {
    const server = get().servers.find(s => s.id === serverId);
    return server?.online || false;
  },

  loadFromLocalStorage: () => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem('server-monitor-store');
    if (stored) {
      const data = JSON.parse(stored);
      set({
        isAuthenticated: data.isAuthenticated || false,
        adminPassword: data.adminPassword || 'admin',
        servers: data.servers || [],
      });
    } else {
      // First time - set default password
      set({ adminPassword: 'admin' });
      get().saveToLocalStorage();
    }
  },

  saveToLocalStorage: () => {
    if (typeof window === 'undefined') return;

    const state = get();
    localStorage.setItem(
      'server-monitor-store',
      JSON.stringify({
        isAuthenticated: state.isAuthenticated,
        adminPassword: state.adminPassword,
        servers: state.servers,
      })
    );
  },
}));
