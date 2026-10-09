-- Create trips table
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  places_order TEXT NOT NULL,
  duration_hours DECIMAL(5, 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own trips
CREATE POLICY "Users can read own trips"
ON trips FOR SELECT
USING (user_id = auth.uid()::text);

-- Allow users to insert their own trips
CREATE POLICY "Users can insert own trips"
ON trips FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

-- Allow users to update their own trips
CREATE POLICY "Users can update own trips"
ON trips FOR UPDATE
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- Allow users to delete their own trips
CREATE POLICY "Users can delete own trips"
ON trips FOR DELETE
USING (user_id = auth.uid()::text);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at);
