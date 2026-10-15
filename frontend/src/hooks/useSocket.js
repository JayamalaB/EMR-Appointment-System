import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/**
 * Subscribes the current scheduler view (a doctor + a department) to live
 * appointment events. On created/updated/cancelled, it simply invalidates
 * the relevant React Query caches - letting React Query refetch is
 * simpler and less error-prone than hand-patching the cache for every
 * possible event shape, and the refetch is cheap (indexed queries).
 */
export function useSchedulerSocket({ doctorId, departmentId }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!accessToken) return undefined;

    const socket = io(SOCKET_URL, { auth: { token: accessToken } });
    socketRef.current = socket;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    };

    socket.on('appointment:created', invalidate);
    socket.on('appointment:updated', invalidate);
    socket.on('appointment:cancelled', invalidate);

    socket.on('connect', () => {
      if (doctorId || departmentId) {
        socket.emit('scheduler:subscribe', { doctorId, departmentId });
      }
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, doctorId, departmentId]);
}
