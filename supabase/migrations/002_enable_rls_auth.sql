-- Enable Row Level Security for authenticated users
-- This ensures only logged-in users can create places/tips/favorites

-- Places: Only authenticated users can create; anyone can view approved
CREATE POLICY "Users can create places" ON places
  FOR INSERT WITH CHECK (auth.uid()::text IS NOT NULL);

CREATE POLICY "Users can update own places" ON places
  FOR UPDATE USING (auth.uid()::text = created_by_id)
  WITH CHECK (auth.uid()::text = created_by_id);

-- Tips: Only authenticated users can create
CREATE POLICY "Users can create tips" ON tips
  FOR INSERT WITH CHECK (auth.uid()::text IS NOT NULL);

-- Favorites: Only authenticated users, privacy-protected
CREATE POLICY "Users can view own favorites" ON favorites
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create favorites" ON favorites
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own favorites" ON favorites
  FOR DELETE USING (auth.uid()::text = user_id);

-- Reports: Only authenticated users
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (auth.uid()::text IS NOT NULL);
