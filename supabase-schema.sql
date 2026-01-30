-- Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop user_settings table if it exists (removed as redundant - target_macros is used instead)
DROP TABLE IF EXISTS user_settings CASCADE;

-- Users table (replaces Firestore users collection)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    streak INTEGER DEFAULT 0,
    last_meal_log_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Onboarding data table (separated from users table)
CREATE TABLE IF NOT EXISTS onboarding_data (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    sex TEXT CHECK (sex IN ('male', 'female', 'other', '')),
    height NUMERIC NOT NULL,
    height_unit TEXT CHECK (height_unit IN ('cm', 'ft')),
    weight NUMERIC NOT NULL,
    weight_unit TEXT CHECK (weight_unit IN ('kg', 'lbs')),
    goal TEXT CHECK (goal IN ('lose', 'maintain', 'build', '')),
    activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly', 'moderate', 'very', '')),
    diet_preference TEXT CHECK (diet_preference IN ('regular', 'high-protein', 'vegetarian', 'vegan', 'keto', 'halal', '')),
    allergies TEXT[] DEFAULT '{}',
    goal_intensity TEXT CHECK (goal_intensity IN ('mild', 'moderate', 'aggressive', '')),
    unit_preference JSONB, -- { weight: 'kg' | 'lbs', height: 'cm' | 'ft' }
    purpose TEXT CHECK (purpose IN ('meals', 'workouts', 'both', 'discipline', '')),
    macros_setup TEXT CHECK (macros_setup IN ('auto', 'manual', '')),
    custom_macros JSONB, -- { protein: number, carbs: number, fats: number }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Target macros table (separated from users table)
CREATE TABLE IF NOT EXISTS target_macros (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    calories NUMERIC NOT NULL,
    protein NUMERIC NOT NULL, -- in grams
    carbs NUMERIC NOT NULL, -- in grams
    fats NUMERIC NOT NULL, -- in grams
    base_tdee NUMERIC, -- Maintenance calories before goal adjustment
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usernames table (replaces Firestore usernames collection)
CREATE TABLE IF NOT EXISTS usernames (
    username TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily logs table (replaces Firestore dailyLogs subcollection)
CREATE TABLE IF NOT EXISTS daily_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    calories NUMERIC DEFAULT 0,
    protein NUMERIC DEFAULT 0,
    carbs NUMERIC DEFAULT 0,
    fats NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Daily tasks table (todo list items for each day)
CREATE TABLE IF NOT EXISTS daily_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, log_date, title)
);

-- Daily summaries table (read-optimized snapshot for past days)
CREATE TABLE IF NOT EXISTS daily_summaries (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    tasks_total INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    completion_rate NUMERIC DEFAULT 0,
    streak_value INTEGER,
    notes TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, log_date)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_id ON daily_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_usernames_user_id ON usernames(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_data_user_id ON onboarding_data(user_id);
CREATE INDEX IF NOT EXISTS idx_target_macros_user_id ON target_macros(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date ON daily_tasks(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_user_date ON daily_summaries(user_id, log_date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
-- Drop existing triggers if they exist (to allow re-running this script)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_usernames_updated_at ON usernames;
DROP TRIGGER IF EXISTS update_daily_logs_updated_at ON daily_logs;
DROP TRIGGER IF EXISTS update_onboarding_data_updated_at ON onboarding_data;
DROP TRIGGER IF EXISTS update_target_macros_updated_at ON target_macros;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usernames_updated_at BEFORE UPDATE ON usernames
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_logs_updated_at BEFORE UPDATE ON daily_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_data_updated_at BEFORE UPDATE ON onboarding_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_target_macros_updated_at BEFORE UPDATE ON target_macros
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION: Move data from JSONB columns to separate tables (if they exist)
-- ============================================================================
-- This section migrates existing data from the old JSONB columns in the users table
-- to the new separate tables. It's safe to run even if the columns don't exist.

-- Check if old JSONB columns exist and migrate onboarding_data
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'onboarding_data'
    ) THEN
        INSERT INTO onboarding_data (
            user_id, name, age, sex, height, height_unit, weight, weight_unit,
            goal, activity_level, diet_preference, allergies, goal_intensity,
            unit_preference, purpose, macros_setup, custom_macros, created_at, updated_at
        )
        SELECT 
            id as user_id,
            (onboarding_data->>'name')::TEXT as name,
            (onboarding_data->>'age')::INTEGER as age,
            (onboarding_data->>'sex')::TEXT as sex,
            (onboarding_data->>'height')::NUMERIC as height,
            (onboarding_data->>'heightUnit')::TEXT as height_unit,
            (onboarding_data->>'weight')::NUMERIC as weight,
            (onboarding_data->>'weightUnit')::TEXT as weight_unit,
            (onboarding_data->>'goal')::TEXT as goal,
            (onboarding_data->>'activityLevel')::TEXT as activity_level,
            (onboarding_data->>'dietPreference')::TEXT as diet_preference,
            COALESCE((onboarding_data->'allergies')::TEXT[], '{}') as allergies,
            (onboarding_data->>'goalIntensity')::TEXT as goal_intensity,
            (onboarding_data->'unitPreference')::JSONB as unit_preference,
            (onboarding_data->>'purpose')::TEXT as purpose,
            (onboarding_data->>'macrosSetup')::TEXT as macros_setup,
            (onboarding_data->'customMacros')::JSONB as custom_macros,
            created_at,
            updated_at
        FROM users
        WHERE onboarding_data IS NOT NULL
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END $$;

-- Migrate target_macros
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'target_macros'
    ) THEN
        INSERT INTO target_macros (
            user_id, calories, protein, carbs, fats, base_tdee, created_at, updated_at
        )
        SELECT 
            id as user_id,
            (target_macros->>'calories')::NUMERIC as calories,
            (target_macros->>'protein')::NUMERIC as protein,
            (target_macros->>'carbs')::NUMERIC as carbs,
            (target_macros->>'fats')::NUMERIC as fats,
            (target_macros->>'baseTDEE')::NUMERIC as base_tdee,
            created_at,
            updated_at
        FROM users
        WHERE target_macros IS NOT NULL
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END $$;


-- Optionally drop old JSONB columns (uncomment when ready after verifying migration)
-- DO $$
-- BEGIN
--     IF EXISTS (
--         SELECT 1 FROM information_schema.columns 
--         WHERE table_name = 'users' AND column_name = 'onboarding_data'
--     ) THEN
--         ALTER TABLE users DROP COLUMN onboarding_data;
--     END IF;
--     IF EXISTS (
--         SELECT 1 FROM information_schema.columns 
--         WHERE table_name = 'users' AND column_name = 'target_macros'
--     ) THEN
--         ALTER TABLE users DROP COLUMN target_macros;
--     END IF;
-- END $$;

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE usernames ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_macros ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Authenticated users can view usernames" ON usernames;
DROP POLICY IF EXISTS "Users can insert own username" ON usernames;
DROP POLICY IF EXISTS "Users can update own username" ON usernames;
DROP POLICY IF EXISTS "Users can delete own username" ON usernames;
DROP POLICY IF EXISTS "Users can view own daily logs" ON daily_logs;
DROP POLICY IF EXISTS "Users can insert own daily logs" ON daily_logs;
DROP POLICY IF EXISTS "Users can update own daily logs" ON daily_logs;
DROP POLICY IF EXISTS "Users can delete own daily logs" ON daily_logs;
DROP POLICY IF EXISTS "Users can view own onboarding data" ON onboarding_data;
DROP POLICY IF EXISTS "Users can insert own onboarding data" ON onboarding_data;
DROP POLICY IF EXISTS "Users can update own onboarding data" ON onboarding_data;
DROP POLICY IF EXISTS "Users can delete own onboarding data" ON onboarding_data;
DROP POLICY IF EXISTS "Users can view own target macros" ON target_macros;
DROP POLICY IF EXISTS "Users can insert own target macros" ON target_macros;
DROP POLICY IF EXISTS "Users can update own target macros" ON target_macros;
DROP POLICY IF EXISTS "Users can delete own target macros" ON target_macros;
DROP POLICY IF EXISTS "Users can view own daily tasks" ON daily_tasks;
DROP POLICY IF EXISTS "Users can insert own daily tasks" ON daily_tasks;
DROP POLICY IF EXISTS "Users can update own daily tasks" ON daily_tasks;
DROP POLICY IF EXISTS "Users can delete own daily tasks" ON daily_tasks;
DROP POLICY IF EXISTS "Users can view own daily summaries" ON daily_summaries;
DROP POLICY IF EXISTS "Users can insert own daily summaries" ON daily_summaries;
DROP POLICY IF EXISTS "Users can update own daily summaries" ON daily_summaries;
DROP POLICY IF EXISTS "Users can delete own daily summaries" ON daily_summaries;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================
-- Users can only read/write their own profile data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- USERNAMES TABLE POLICIES
-- ============================================================================
-- All authenticated users can read usernames (needed for availability checks)
CREATE POLICY "Authenticated users can view usernames" ON usernames
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Users can only insert/update/delete their own username
CREATE POLICY "Users can insert own username" ON usernames
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own username" ON usernames
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own username" ON usernames
    FOR DELETE 
    USING (auth.uid() = user_id);

-- ============================================================================
-- DAILY_LOGS TABLE POLICIES
-- ============================================================================
-- Users can only access their own daily logs
CREATE POLICY "Users can view own daily logs" ON daily_logs
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily logs" ON daily_logs
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily logs" ON daily_logs
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily logs" ON daily_logs
    FOR DELETE 
    USING (auth.uid() = user_id);

-- ============================================================================
-- ONBOARDING_DATA TABLE POLICIES
-- ============================================================================
CREATE POLICY "Users can view own onboarding data" ON onboarding_data
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding data" ON onboarding_data
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding data" ON onboarding_data
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own onboarding data" ON onboarding_data
    FOR DELETE 
    USING (auth.uid() = user_id);

-- ============================================================================
-- TARGET_MACROS TABLE POLICIES
-- ============================================================================
CREATE POLICY "Users can view own target macros" ON target_macros
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own target macros" ON target_macros
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own target macros" ON target_macros
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own target macros" ON target_macros
    FOR DELETE 
    USING (auth.uid() = user_id);

-- ============================================================================
-- DAILY_TASKS TABLE POLICIES
-- ============================================================================
CREATE POLICY "Users can view own daily tasks" ON daily_tasks
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily tasks" ON daily_tasks
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily tasks" ON daily_tasks
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily tasks" ON daily_tasks
    FOR DELETE 
    USING (auth.uid() = user_id);

-- ============================================================================
-- DAILY_SUMMARIES TABLE POLICIES
-- ============================================================================
CREATE POLICY "Users can view own daily summaries" ON daily_summaries
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily summaries" ON daily_summaries
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily summaries" ON daily_summaries
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily summaries" ON daily_summaries
    FOR DELETE 
    USING (auth.uid() = user_id);

