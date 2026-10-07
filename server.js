/**
 * Standalone Express API Server for "מה יש פה?"
 * Provides independent data layer — no dependency on Base44 runtime.
 */
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const loadData = (filename) => {
  try {
    const data = fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
};

const saveData = (filename, data) => {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
};

// ---- In-memory data stores with persistence ----
const stores = {
  places: loadData('places.json') || [],
  tips: loadData('tips.json') || [],
  fieldReports: loadData('reports.json') || [],
  favorites: loadData('favorites.json') || [],
};

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// ---- Auth middleware (placeholder for future JWT) ----
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  req.user = token ? { id: 'user-1', email: 'demo@ma-yesh-po.com', role: 'admin' } : null;
  next();
};

// ---- Health check ----
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ---- Places CRUD ----
app.get('/api/places', (req, res) => {
  const { category, city, q, limit = 30, offset = 0, status } = req.query;
  let results = [...stores.places];
  
  if (status) results = results.filter(p => p.status === status);
  if (category) results = results.filter(p => p.category === category);
  if (city) results = results.filter(p => p.city === city);
  if (q) results = results.filter(p => 
    p.name?.toLowerCase().includes(q.toLowerCase()) ||
    p.address?.toLowerCase().includes(q.toLowerCase())
  );
  
  return res.json({
    data: results.slice(Number(offset), Number(offset) + Number(limit)),
    meta: { total: results.length, limit: Number(limit), offset: Number(offset) }
  });
});

app.get('/api/places/:id', (req, res) => {
  const place = stores.places.find(p => p.id === req.params.id);
  if (!place) return res.status(404).json({ error: 'Place not found' });
  return res.json(place);
});

app.post('/api/places', auth, (req, res) => {
  const place = {
    ...req.body,
    id: uuidv4(),
    status: 'approved',
    created_by_id: req.user?.id || 'anonymous',
    created_at: new Date().toISOString(),
  };
  stores.places.push(place);
  saveData('places.json', stores.places);
  return res.status(201).json(place);
});

app.patch('/api/places/:id', auth, (req, res) => {
  const idx = stores.places.findIndex(p => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Place not found' });
  stores.places[idx] = { ...stores.places[idx], ...req.body, updated_at: new Date().toISOString() };
  saveData('places.json', stores.places);
  return res.json(stores.places[idx]);
});

app.delete('/api/places/:id', auth, (req, res) => {
  const idx = stores.places.findIndex(p => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Place not found' });
  const deleted = stores.places[idx];
  stores.places.splice(idx, 1);
  saveData('places.json', stores.places);
  return res.json(deleted);
});

app.patch('/api/places/:id/status', auth, (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status required' });
  const idx = stores.places.findIndex(p => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Place not found' });
  stores.places[idx].status = status;
  saveData('places.json', stores.places);
  return res.json(stores.places[idx]);
});

// ---- Tips ----
app.get('/api/tips', (req, res) => {
  const { placeId, status } = req.query;
  let results = [...stores.tips];
  if (placeId) results = results.filter(t => t.place_id === placeId);
  if (status) results = results.filter(t => t.status === status);
  return res.json(results);
});

app.post('/api/tips', auth, (req, res) => {
  const tip = {
    ...req.body,
    id: uuidv4(),
    status: 'approved',
    created_by_id: req.user?.id,
    created_at: new Date().toISOString()
  };
  stores.tips.push(tip);
  saveData('tips.json', stores.tips);
  return res.status(201).json(tip);
});

app.patch('/api/tips/:id', auth, (req, res) => {
  const idx = stores.tips.findIndex(t => t.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Tip not found' });
  stores.tips[idx] = { ...stores.tips[idx], ...req.body };
  saveData('tips.json', stores.tips);
  return res.json(stores.tips[idx]);
});

app.delete('/api/tips/:id', auth, (req, res) => {
  const idx = stores.tips.findIndex(t => t.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Tip not found' });
  const deleted = stores.tips[idx];
  stores.tips.splice(idx, 1);
  saveData('tips.json', stores.tips);
  return res.json(deleted);
});

// ---- Field Reports ----
app.get('/api/reports', (req, res) => {
  const { placeId } = req.query;
  let results = [...stores.fieldReports];
  if (placeId) results = results.filter(r => r.place_id === placeId);
  return res.json(results);
});

app.post('/api/reports', auth, (req, res) => {
  const report = {
    ...req.body,
    id: uuidv4(),
    status: 'approved',
    created_by_id: req.user?.id,
    created_at: new Date().toISOString()
  };
  stores.fieldReports.push(report);
  saveData('reports.json', stores.fieldReports);
  return res.status(201).json(report);
});

app.patch('/api/reports/:id', auth, (req, res) => {
  const idx = stores.fieldReports.findIndex(r => r.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Report not found' });
  stores.fieldReports[idx] = { ...stores.fieldReports[idx], ...req.body };
  saveData('reports.json', stores.fieldReports);
  return res.json(stores.fieldReports[idx]);
});

app.delete('/api/reports/:id', auth, (req, res) => {
  const idx = stores.fieldReports.findIndex(r => r.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Report not found' });
  const deleted = stores.fieldReports[idx];
  stores.fieldReports.splice(idx, 1);
  saveData('reports.json', stores.fieldReports);
  return res.json(deleted);
});

// ---- Favorites ----
app.get('/api/favorites', auth, (req, res) => {
  res.json(stores.favorites.filter(f => f.user_id === (req.user?.id || 'anonymous')));
});

app.post('/api/favorites', auth, (req, res) => {
  const fav = { ...req.body, user_id: req.user?.id || 'anonymous', id: uuidv4() };
  if (!stores.favorites.find(f => f.place_id === fav.place_id && f.user_id === fav.user_id)) {
    stores.favorites.push(fav);
    saveData('favorites.json', stores.favorites);
  }
  return res.status(201).json(fav);
});

app.delete('/api/favorites/:placeId', auth, (req, res) => {
  const userId = req.user?.id || 'anonymous';
  const idx = stores.favorites.findIndex(f => f.place_id === req.params.placeId && f.user_id === userId);
  if (idx < 0) return res.status(404).json({ error: 'Favorite not found' });
  const deleted = stores.favorites[idx];
  stores.favorites.splice(idx, 1);
  saveData('favorites.json', stores.favorites);
  return res.json(deleted);
});

// ---- Geocoding (simple mock - fetch from Nominatim in production) ----
app.post('/api/geocode', express.json(), async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'Address required' });
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Israel')}`);
    const data = await response.json();
    if (data.length === 0) return res.status(404).json({ error: 'Address not found' });
    const first = data[0];
    return res.json({ lat: parseFloat(first.lat), lng: parseFloat(first.lon) });
  } catch (e) {
    return res.status(500).json({ error: 'Geocoding failed' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Independent API server running on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});

export default app;