import axiosClient from './axiosClient';

export const doctorApi = {
  list: (params) => axiosClient.get('/doctors', { params }).then((res) => res.data),
  getSchedule: (doctorId) => axiosClient.get(`/doctors/${doctorId}/schedule`).then((res) => res.data),
  saveSchedule: (doctorId, payload) =>
    axiosClient.put(`/doctors/${doctorId}/schedule`, payload).then((res) => res.data),
};
