import axiosClient from './axiosClient';

export const slotApi = {
  getSlots: (doctor, date) => axiosClient.get('/slots', { params: { doctor, date } }).then((res) => res.data),
};
