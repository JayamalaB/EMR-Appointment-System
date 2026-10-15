import axiosClient from './axiosClient';

export const authApi = {
  login: (payload) => axiosClient.post('/auth/login', payload).then((res) => res.data),
  logout: () => axiosClient.post('/auth/logout').then((res) => res.data),
  createStaff: (role, payload) => axiosClient.post(`/auth/staff/${role}`, payload).then((res) => res.data),
};
