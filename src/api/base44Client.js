/**
 * Standalone API Client — replaces Base44 SDK with local Express server
 * All existing imports of `base44` from `@/api/base44Client` continue to work
 */

const API_BASE = 'http://localhost:3001/api';

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

// Mock auth - in production this would be real JWT verification
let currentUser = { id: 'user-1', email: 'admin@ma-yesh-po.com', role: 'admin' };

export const base44 = {
  auth: {
    me: async () => currentUser,
    logout: () => { currentUser = null; },
    redirectToLogin: () => { window.location.href = '/login'; },
  },
  app: {
    getPublicSettings: async () => ({ id: '6ab815591e0101e64d1d5236', public_settings: {} }),
  },
  integrations: {
    Core: {
      CreateFileSignedUrl: async ({ file_uri, expires_in }) => ({ signed_url: file_uri }),
      UploadPrivateFile: async ({ file, ...rest }) => {
        // Mock file upload - in production would upload to actual storage
        const formData = new FormData();
        formData.append('file', file);
        return { file_uri: `local://uploads/mock-${Date.now()}` };
      },
    },
  },
  entities: {
    Place: {
      filter: async (query = {}, options = {}) => {
        const params = new URLSearchParams();
        if (query.status) params.set('status', query.status);
        if (query.category) params.set('category', query.category);
        if (query.city) params.set('city', query.city);
        if (query.created_by_id) params.set('created_by_id', query.created_by_id);
        if (query.$in) params.set('id', query.$in.join(','));
        const qs = params.toString() ? `?${params.toString()}` : '';
        return request(`/places${qs}`);
      },
      create: async (data) => request('/places', { method: 'POST', body: JSON.stringify(data) }),
      update: async (id, data) => request(`/places/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: async (id) => request(`/places/${id}`, { method: 'DELETE' }),
      list: async () => request('/places'),
      get: async (id) => request(`/places/${id}`),
    },
    Tip: {
      filter: async (query = {}) => {
        if (query.place_id) return request(`/tips?place_id=${query.place_id}`);
        return request('/tips');
      },
      create: async (data) => request('/tips', { method: 'POST', body: JSON.stringify(data) }),
      update: async (id, data) => request(`/tips/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: async (id) => request(`/tips/${id}`, { method: 'DELETE' }),
    },
    FieldReport: {
      filter: async (query = {}) => {
        if (query.place_id) return request(`/reports?place_id=${query.place_id}`);
        return request('/reports');
      },
      create: async (data) => request('/reports', { method: 'POST', body: JSON.stringify(data) }),
      update: async (id, data) => request(`/reports/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: async (id) => request(`/reports/${id}`, { method: 'DELETE' }),
    },
    Favorite: {
      filter: async (query = {}) => request('/favorites'),
      create: async (data) => request('/favorites', { method: 'POST', body: JSON.stringify(data) }),
      delete: async (id) => request(`/favorites/${id}`, { method: 'DELETE' }),
    },
  },
};

export default base44;

