import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from './store';

export interface WebSocketMessage {
  type: string;
  data?: any;
  error?: string;
  status?: string;
}

export const useWebSocket = (
  serverId: string,
  ip: string,
  port: number,
  password: string,
  enabled: boolean = true
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const { setMetrics, setServerOnline } = useAppStore();

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${ip}:${port}/ws`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log(`Connected to ${serverId}`);
        setServerOnline(serverId, true);

        // Send authentication
        const authMsg: WebSocketMessage = {
          type: 'auth',
          data: { password },
        };
        wsRef.current?.send(JSON.stringify(authMsg));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === 'metrics' && message.data) {
            setMetrics(serverId, message.data);
          } else if (message.type === 'auth') {
            if (message.error) {
              console.error(`Auth failed for ${serverId}: ${message.error}`);
              setServerOnline(serverId, false);
              wsRef.current?.close();
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error(`WebSocket error for ${serverId}:`, error);
        setServerOnline(serverId, false);
      };

      wsRef.current.onclose = () => {
        console.log(`Disconnected from ${serverId}`);
        setServerOnline(serverId, false);

        // Attempt to reconnect after 5 seconds
        if (enabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      };
    } catch (error) {
      console.error(`Failed to connect to ${serverId}:`, error);
      setServerOnline(serverId, false);
    }
  }, [serverId, ip, port, password, enabled, setMetrics, setServerOnline]);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [enabled, connect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    ws: wsRef.current,
  };
};
