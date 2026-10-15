import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Zustand holds only client/UI state: the current user and the short-lived
 * access token (kept in memory + sessionStorage so a page refresh doesn't
 * force a re-login while still avoiding localStorage's broader XSS
 * exposure window). All server data (appointments, doctors, slots) is
 * deliberately NOT duplicated here - that belongs to React Query's cache,
 * which already handles caching, invalidation, and refetching. Mixing the
 * two would mean keeping two sources of truth in sync by hand.
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: ({ user, accessToken }) => set({ user, accessToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clearAuth: () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'emr-auth',
      storage: {
        getItem: (name) => {
          const value = sessionStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => sessionStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => sessionStorage.removeItem(name),
      },
    }
  )
);
