-- Create places table
CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  category TEXT NOT NULL,
  city TEXT,
  address TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  image_url TEXT,
  rating DECIMAL(3, 1),
  price_level TEXT DEFAULT 'moderate',
  opening_hours TEXT DEFAULT '24/7',
  phone TEXT,
  tags TEXT[],
  status TEXT DEFAULT 'approved',
  created_by_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
CREATE INDEX IF NOT EXISTS idx_places_status ON places(status);
CREATE INDEX IF NOT EXISTS idx_places_city ON places(city);

-- Create tips table
CREATE TABLE IF NOT EXISTS tips (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'approved',
  created_by_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'approved',
  created_by_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(place_id, user_id)
);

-- Enable RLS (Row Level Security)
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Allow public read access to approved places
CREATE POLICY "Public can read approved places"
ON places FOR SELECT
USING (status = 'approved' OR status IS NULL);

-- Allow public read access to approved tips
CREATE POLICY "Public can read approved tips"
ON tips FOR SELECT
USING (status = 'approved' OR status IS NULL);

-- Allow public read access to approved reports
CREATE POLICY "Public can read approved reports"
ON reports FOR SELECT
USING (status = 'approved' OR status IS NULL);

-- Allow read own favorites
CREATE POLICY "Users can read own favorites"
ON favorites FOR SELECT
USING (auth.uid()::text = user_id OR user_id = 'anonymous');

-- Allow insert own favorites
CREATE POLICY "Users can insert own favorites"
ON favorites FOR INSERT
WITH CHECK (auth.uid()::text = user_id OR user_id = 'anonymous');

-- Allow delete own favorites
CREATE POLICY "Users can delete own favorites"
ON favorites FOR DELETE
USING (auth.uid()::text = user_id OR user_id = 'anonymous');
