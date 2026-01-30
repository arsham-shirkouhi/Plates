-- RLS Policy for exercises_list table
-- This allows all users (authenticated and anonymous) to read exercises
-- Run this in your Supabase SQL Editor

-- First, check if RLS is enabled and disable it if needed, or create a policy
-- Option 1: Disable RLS (if exercises_list should be publicly readable)
ALTER TABLE exercises_list DISABLE ROW LEVEL SECURITY;

-- OR Option 2: Keep RLS enabled but allow public read access
-- Uncomment the lines below if you prefer to keep RLS enabled:

-- ALTER TABLE exercises_list ENABLE ROW LEVEL SECURITY;
-- 
-- DROP POLICY IF EXISTS "Public can view exercises" ON exercises_list;
-- 
-- CREATE POLICY "Public can view exercises" ON exercises_list
--     FOR SELECT 
--     USING (true);

