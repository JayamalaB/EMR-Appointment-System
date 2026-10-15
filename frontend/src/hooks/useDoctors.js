import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '../api/doctor.api';

export function useDoctors(params = {}) {
  return useQuery({
    queryKey: ['doctors', params],
    queryFn: () => doctorApi.list(params).then((res) => res.data),
    staleTime: 5 * 60 * 1000, // doctor roster changes rarely - avoid refetch churn
  });
}
