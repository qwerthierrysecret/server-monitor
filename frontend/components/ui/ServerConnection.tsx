'use client';

import { useWebSocket } from '@/lib/useWebSocket';

interface ServerConnectionProps {
  serverId: string;
  ip: string;
  port: number;
  password: string;
}

export default function ServerConnection({
  serverId,
  ip,
  port,
  password,
}: ServerConnectionProps) {
  useWebSocket(serverId, ip, port, password, true);
  return null;
}
