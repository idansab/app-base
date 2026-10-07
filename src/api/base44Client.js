/**
 * Supabase Direct Client
 * Frontend connects directly to Supabase (no backend needed for MVP)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gsbbtrknnkdihdlojwbd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_anon_key_here'; // Public key, safe in frontend

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Mock auth - in production this would be real Auth
let currentUser = { id: 'user-1', email: 'user@ma-yesh-po.com', role: 'user' };

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
        return { file_uri: `local://uploads/mock-${Date.now()}` };
      },
    },
  },
  entities: {
    Place: {
      filter: async (query = {}, options = {}) => {
        let q = supabase.from('places').select('*');

        // Apply filters
        if (query.status) q = q.eq('status', query.status);
        if (query.category) q = q.eq('category', query.category);
        if (query.city) q = q.eq('city', query.city);
        if (query.created_by_id) q = q.eq('created_by_id', query.created_by_id);

        const { data, error } = await q.limit(100);
        if (error) throw error;

        // Filter by search query if provided
        let results = data || [];
        if (query.q) {
          results = results.filter(p =>
            p.name?.toLowerCase().includes(query.q.toLowerCase()) ||
            p.address?.toLowerCase().includes(query.q.toLowerCase())
          );
        }

        return { data: results };
      },

      create: async (data) => {
        const { data: result, error } = await supabase
          .from('places')
          .insert([{ ...data, created_by_id: currentUser?.id }])
          .select()
          .single();
        if (error) throw error;
        return result;
      },

      update: async (id, data) => {
        const { data: result, error } = await supabase
          .from('places')
          .update(data)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return result;
      },

      delete: async (id) => {
        const { data: result, error } = await supabase
          .from('places')
          .delete()
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return result;
      },

      list: async () => {
        const { data, error } = await supabase
          .from('places')
          .select('*')
          .eq('status', 'approved');
        if (error) throw error;
        return { data };
      },

      get: async (id) => {
        const { data, error } = await supabase
          .from('places')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      },
    },

    Tip: {
      filter: async (query = {}) => {
        let q = supabase.from('tips').select('*');
        if (query.place_id) q = q.eq('place_id', query.place_id);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
      },

      create: async (data) => {
        const { data: result, error } = await supabase
          .from('tips')
          .insert([{ ...data, created_by_id: currentUser?.id }])
          .select()
          .single();
        if (error) throw error;
        return result;
      },

      update: async (id, data) => {
        const { data: result, error } = await supabase
          .from('tips')
          .update(data)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return result;
      },

      delete: async (id) => {
        const { data: result, error } = await supabase
          .from('tips')
          .delete()
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return result;
      },
    },

    FieldReport: {
      filter: async (query = {}) => {
        let q = supabase.from('reports').select('*');
        if (query.place_id) q = q.eq('place_id', query.place_id);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
      },

      create: async (data) => {
        const { data: result, error } = await supabase
          .from('reports')
          .insert([{ ...data, created_by_id: currentUser?.id }])
          .select()
          .single();
        if (error) throw error;
        return result;
      },
    },

    Favorite: {
      filter: async (query = {}) => {
        const userId = currentUser?.id || 'anonymous';
        const { data, error } = await supabase
          .from('favorites')
          .select('*')
          .eq('user_id', userId);
        if (error) throw error;
        return data || [];
      },

      create: async (data) => {
        const { data: result, error } = await supabase
          .from('favorites')
          .insert([{ ...data, user_id: currentUser?.id }])
          .select()
          .single();
        if (error) throw error;
        return result;
      },

      delete: async (id) => {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('id', id);
        if (error) throw error;
      },
    },
  },
};

export default base44;
