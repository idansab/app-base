/**
 * DEPRECATED: Local API Client — no longer used
 * Frontend now uses Supabase SDK directly (base44Client.js)
 * Keeping this file for reference only
 */
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const localApi = {
  places: {
    list: (params = {}) => request('/places', { method: 'GET' }),
    get: (id) => request(`/places/${id}`),
    create: (data) => request('/places', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/places/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => request(`/places/${id}`, { method: 'DELETE' }),
  },
  tips: {
    list: (params = {}) => request('/tips', { method: 'GET' }),
    create: (data) => request('/tips', { method: 'POST', body: JSON.stringify(data) }),
  },
  reports: {
    list: (params = {}) => request('/reports', { method: 'GET' }),
    create: (data) => request('/reports', { method: 'POST', body: JSON.stringify(data) }),
  },
  favorites: {
    list: () => request('/favorites', { method: 'GET' }),
    create: (data) => request('/favorites', { method: 'POST', body: JSON.stringify(data) }),
  },
};

export default localApi;