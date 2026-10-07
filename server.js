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
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gsbbtrknnkdihdlojwbd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// ---- Auth middleware ----
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  req.user = token ? { id: 'user-1', email: 'demo@ma-yesh-po.com', role: 'admin' } : null;
  next();
};

// ---- Health check ----
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ---- Places CRUD ----
app.get('/api/places', async (req, res) => {
  try {
    const { category, city, q, limit = 30, offset = 0, status } = req.query;

    let query = supabase.from('places').select('*');

    if (status) query = query.eq('status', status);
    else query = query.eq('status', 'approved');
    if (category) query = query.eq('category', category);
    if (city) query = query.eq('city', city);

    const { data, error, count } = await query
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

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
      meta: { total: count || results.length, limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/places/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Place not found' });

    res.json(data);
  } catch (error) {
    console.error('Error fetching place:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/places', auth, async (req, res) => {
  try {
    const place = {
      id: uuidv4(),
      ...req.body,
      status: req.user?.role === 'admin' ? 'approved' : 'pending',
      created_by_id: req.user?.id || 'anonymous',
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
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/places/:id', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('places')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Place not found' });

    res.json(data);
  } catch (error) {
    console.error('Error updating place:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/places/:id', auth, async (req, res) => {
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
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/places/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status required' });

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
    res.status(500).json({ error: error.message });
  }
});

// ---- Tips ----
app.get('/api/tips', async (req, res) => {
  try {
    const { placeId, status } = req.query;

    let query = supabase.from('tips').select('*');
    if (placeId) query = query.eq('place_id', placeId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching tips:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tips', auth, async (req, res) => {
  try {
    const tip = {
      id: uuidv4(),
      ...req.body,
      status: 'approved',
      created_by_id: req.user?.id,
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
    res.status(500).json({ error: error.message });
  }
});

// ---- Favorites ----
app.get('/api/favorites', auth, async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';

    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/favorites', auth, async (req, res) => {
  try {
    const favorite = {
      id: uuidv4(),
      place_id: req.body.place_id,
      user_id: req.user?.id || 'anonymous',
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
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/favorites/:placeId', auth, async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';

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
    res.status(500).json({ error: error.message });
  }
});

// ---- Geocoding (mock) ----
app.post('/api/geocode', express.json(), async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'Address required' });

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Israel')}`
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ API server running on http://localhost:${PORT}`);
  console.log(`📊 Using Supabase: ${SUPABASE_URL}`);
});

export default app;
