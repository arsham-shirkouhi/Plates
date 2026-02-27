-- Create user_exercise_favorites table
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_exercise_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL, -- References exercises.id
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, exercise_id) -- Prevent duplicate favorites
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_exercise_favorites_user_id ON user_exercise_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_exercise_favorites_exercise_id ON user_exercise_favorites(exercise_id);

-- Enable Row Level Security
ALTER TABLE user_exercise_favorites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
    ON user_exercise_favorites
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own favorites
CREATE POLICY "Users can insert their own favorites"
    ON user_exercise_favorites
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own favorites
CREATE POLICY "Users can delete their own favorites"
    ON user_exercise_favorites
    FOR DELETE
    USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_exercise_favorites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_exercise_favorites_updated_at
    BEFORE UPDATE ON user_exercise_favorites
    FOR EACH ROW
    EXECUTE FUNCTION update_user_exercise_favorites_updated_at();

