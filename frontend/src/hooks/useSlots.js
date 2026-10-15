import { useQuery, useQueryClient } from '@tanstack/react-query';
import { slotApi } from '../api/slot.api';

export function useSlots(doctorId, date) {
  return useQuery({
    queryKey: ['slots', doctorId, date],
    queryFn: () => slotApi.getSlots(doctorId, date).then((res) => res.data),
    enabled: Boolean(doctorId && date),
    staleTime: 10 * 1000,
  });
}

/** Lets socket events invalidate the currently-viewed slot grid instantly. */
export function useInvalidateSlots() {
  const queryClient = useQueryClient();
  return (doctorId) => queryClient.invalidateQueries({ queryKey: ['slots', doctorId] });
}
