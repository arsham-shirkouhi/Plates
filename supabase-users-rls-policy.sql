-- Fix RLS for the Plates user-profile table.
-- Run this once in Supabase Dashboard → SQL Editor.
-- It is safe to re-run and never deletes table data.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- The mobile app uses the signed-in user's auth UUID as users.id.
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.users;

CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
    ON public.users FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can delete own profile"
    ON public.users FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = id);
