import axiosClient from './axiosClient';

export const patientApi = {
  search: (params) => axiosClient.get('/patients', { params }).then((res) => res.data),
};
