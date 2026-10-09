-- Create tips table for user-generated content
CREATE TABLE IF NOT EXISTS user_tips (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id TEXT REFERENCES places(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'tip', -- 'tip', 'report', 'review'
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_tips ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read approved tips" ON user_tips FOR SELECT
USING (status = 'approved' OR auth.uid()::text = user_id);

CREATE POLICY "Users can create tips" ON user_tips FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tips" ON user_tips FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tips" ON user_tips FOR DELETE
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tips_user_id ON user_tips(user_id);
CREATE INDEX IF NOT EXISTS idx_tips_place_id ON user_tips(place_id);
CREATE INDEX IF NOT EXISTS idx_tips_status ON user_tips(status);
CREATE INDEX IF NOT EXISTS idx_tips_created_at ON user_tips(created_at);
