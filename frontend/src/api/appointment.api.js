import axiosClient from './axiosClient';

export const appointmentApi = {
  list: (params) => axiosClient.get('/appointments', { params }).then((res) => res.data),
  getById: (id) => axiosClient.get(`/appointments/${id}`).then((res) => res.data),
  create: (payload) => axiosClient.post('/appointments', payload).then((res) => res.data),
  update: (id, payload) => axiosClient.put(`/appointments/${id}`, payload).then((res) => res.data),
  cancel: (id, cancelReason) =>
    axiosClient.delete(`/appointments/${id}`, { data: { cancelReason } }).then((res) => res.data),
  markArrived: (id) => axiosClient.post(`/appointments/${id}/arrive`).then((res) => res.data),
};
