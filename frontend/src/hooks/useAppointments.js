import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentApi } from '../api/appointment.api';

export function useAppointments(filters) {
  return useQuery({
    queryKey: ['appointments', filters],
    queryFn: () => appointmentApi.list(filters),
    placeholderData: (prev) => prev, // keep showing old page while the next page loads
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: appointmentApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => appointmentApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cancelReason }) => appointmentApi.cancel(id, cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}

export function useMarkArrived() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => appointmentApi.markArrived(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
