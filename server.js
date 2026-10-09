/**
 * Standalone Express API Server for "מה יש פה?"
 * Uses Supabase as the database backend
 */
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

let supabase;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (err) {
  console.error('⚠️  Supabase client initialization warning:', err.message);
  console.error('   Ensure SUPABASE_SERVICE_ROLE_KEY is set in Cloudflare Secrets');
}

const app = express();

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(o => o.trim());
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(bodyParser.json({ limit: '100kb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '100kb' }));

// ---- Auth middleware ----
// Verifies the Supabase JWT (never trusts the mere presence of a header) and
// loads the role from public.profiles. The service-role client bypasses RLS,
// so every write route below must check req.user itself.
const auth = async (req, res, next) => {
  req.user = null;
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      req.user = { id: data.user.id, email: data.user.email, role: profile?.role || 'user' };
    }
  }
  next();
};
const requireUser = (req, res, next) =>
  req.user ? next() : res.status(401).json({ error: 'Authentication required' });
const requireAdmin = (req, res, next) =>
  req.user?.role === 'admin' ? next() : res.status(req.user ? 403 : 401).json({ error: 'Admin only' });

const PLACE_FIELDS = ['name', 'description', 'short_description', 'category', 'city', 'address',
  'lat', 'lng', 'image_url', 'images', 'rating', 'price_level', 'opening_hours', 'opening_schedule',
  'kosher', 'kosher_note', 'phone', 'tags'];
const pick = (body, fields) =>
  Object.fromEntries(fields.filter(f => body?.[f] !== undefined).map(f => [f, body[f]]));

// ---- Health check ----
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ---- Places CRUD ----
app.get('/api/places', async (req, res) => {
  try {
    const { category, city, q, status } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    let query = supabase.from('places').select('*', { count: 'exact' });

    const requestedStatus = status && status !== 'approved' ? status : 'approved';
    if (requestedStatus !== 'approved') {
      await auth(req, res, () => {});
      if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    }
    query = query.eq('status', requestedStatus);
    if (category) query = query.eq('category', category);
    if (city) query = query.eq('city', city);

    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Filter by search query
    let results = data || [];
    if (q) {
      results = results.filter(p =>
        p.name?.toLowerCase().includes(q.toLowerCase()) ||
        p.address?.toLowerCase().includes(q.toLowerCase())
      );
    }

    res.json({
      data: results,
      meta: { total: count || results.length, limit, offset }
    });
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/places/:id', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data || (data.status !== 'approved' && req.user?.role !== 'admin')) {
      return res.status(404).json({ error: 'Place not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching place:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/places', auth, requireUser, async (req, res) => {
  try {
    const place = {
      id: uuidv4(),
      ...pick(req.body, PLACE_FIELDS),
      status: req.user.role === 'admin' ? 'approved' : 'pending',
      created_by_id: req.user.id,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('places')
      .insert([place])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating place:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/places/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('places')
      .update({ ...pick(req.body, PLACE_FIELDS), updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Place not found' });

    res.json(data);
  } catch (error) {
    console.error('Error updating place:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/places/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('places')
      .delete()
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Place not found' });

    res.json(data);
  } catch (error) {
    console.error('Error deleting place:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/places/:id/status', auth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data, error } = await supabase
      .from('places')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Place not found' });

    res.json(data);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- Tips ----
app.get('/api/tips', async (req, res) => {
  try {
    const { placeId } = req.query;

    // Public endpoint: approved tips only
    let query = supabase.from('tips').select('*').eq('status', 'approved');
    if (placeId) query = query.eq('place_id', placeId);

    const { data, error } = await query;
    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching tips:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/tips', auth, requireUser, async (req, res) => {
  try {
    const tip = {
      id: uuidv4(),
      place_id: req.body?.place_id,
      content: String(req.body?.content ?? '').slice(0, 2000),
      status: 'pending',
      created_by_id: req.user.id,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('tips')
      .insert([tip])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating tip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- Favorites ----
app.get('/api/favorites', auth, requireUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/favorites', auth, requireUser, async (req, res) => {
  try {
    const favorite = {
      id: uuidv4(),
      place_id: req.body.place_id,
      user_id: req.user.id,
    };

    const { data, error } = await supabase
      .from('favorites')
      .insert([favorite])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/favorites/:placeId', auth, requireUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('favorites')
      .delete()
      .eq('place_id', req.params.placeId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Favorite not found' });

    res.json(data);
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- Geocoding ----
app.post('/api/geocode', auth, requireUser, async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'Address required' });

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Israel')}`,
      { headers: { 'User-Agent': 'ma-yesh-po/1.0' } }
    );
    const data = await response.json();

    if (data.length === 0) return res.status(404).json({ error: 'Address not found' });

    const first = data[0];
    res.json({ lat: parseFloat(first.lat), lng: parseFloat(first.lon) });
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

// Export the Express app for Cloudflare Workers
// Don't call app.listen() - Cloudflare Workers handles the server
export default app;

// For local development only
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  // Only listen in Node.js environment, not in Cloudflare Workers
  if (typeof window === 'undefined' && typeof navigator === 'undefined') {
    app.listen(PORT, () => {
      console.log(`✅ API server running on http://localhost:${PORT}`);
    });
  }
}
