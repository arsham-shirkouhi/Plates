-- Finished sessions, saved routines, and exercise favorites.
-- Exercise ids are WorkoutX ids (text). There is no local exercises catalog.

CREATE TABLE IF NOT EXISTS public.workout_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL DEFAULT 'workout',
    started_at timestamptz,
    completed_at timestamptz NOT NULL DEFAULT now(),
    duration_seconds integer NOT NULL DEFAULT 0,
    volume numeric NOT NULL DEFAULT 0,
    set_count integer NOT NULL DEFAULT 0,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workout_session_exercises (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id text NOT NULL DEFAULT '',
    name text NOT NULL,
    body_part text,
    note text,
    rest_seconds integer NOT NULL DEFAULT 60,
    position integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.workout_session_sets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_exercise_id uuid NOT NULL REFERENCES public.workout_session_exercises(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    position integer NOT NULL DEFAULT 0,
    set_type text NOT NULL DEFAULT 'normal',
    weight numeric NOT NULL DEFAULT 0,
    reps integer NOT NULL DEFAULT 0,
    rpe numeric,
    completed boolean NOT NULL DEFAULT false,
    CONSTRAINT workout_session_sets_type_check
        CHECK (set_type IN ('normal', 'warmup', 'failure', 'drop'))
);

CREATE TABLE IF NOT EXISTS public.workout_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL DEFAULT 'my workout',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workout_template_exercises (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id text NOT NULL DEFAULT '',
    name text NOT NULL,
    body_part text,
    rest_seconds integer NOT NULL DEFAULT 60,
    position integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.workout_template_sets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_exercise_id uuid NOT NULL REFERENCES public.workout_template_exercises(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    position integer NOT NULL DEFAULT 0,
    set_type text NOT NULL DEFAULT 'normal',
    weight numeric NOT NULL DEFAULT 0,
    reps integer NOT NULL DEFAULT 0,
    CONSTRAINT workout_template_sets_type_check
        CHECK (set_type IN ('normal', 'warmup', 'failure', 'drop'))
);

CREATE TABLE IF NOT EXISTS public.user_exercise_favorites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id text NOT NULL,
    exercise_name text,
    body_part text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS workout_sessions_user_completed_idx
    ON public.workout_sessions (user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS workout_session_exercises_session_idx
    ON public.workout_session_exercises (session_id, position);
CREATE INDEX IF NOT EXISTS workout_session_exercises_user_exercise_idx
    ON public.workout_session_exercises (user_id, exercise_id);
CREATE INDEX IF NOT EXISTS workout_session_sets_exercise_idx
    ON public.workout_session_sets (session_exercise_id, position);
CREATE INDEX IF NOT EXISTS workout_templates_user_idx
    ON public.workout_templates (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workout_template_exercises_template_idx
    ON public.workout_template_exercises (template_id, position);
CREATE INDEX IF NOT EXISTS workout_template_sets_exercise_idx
    ON public.workout_template_sets (template_exercise_id, position);
CREATE INDEX IF NOT EXISTS user_exercise_favorites_user_idx
    ON public.user_exercise_favorites (user_id, created_at DESC);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_session_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_template_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_exercise_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own workout sessions" ON public.workout_sessions;
DROP POLICY IF EXISTS "Users manage own session exercises" ON public.workout_session_exercises;
DROP POLICY IF EXISTS "Users manage own session sets" ON public.workout_session_sets;
DROP POLICY IF EXISTS "Users manage own workout templates" ON public.workout_templates;
DROP POLICY IF EXISTS "Users manage own template exercises" ON public.workout_template_exercises;
DROP POLICY IF EXISTS "Users manage own template sets" ON public.workout_template_sets;
DROP POLICY IF EXISTS "Users manage own exercise favorites" ON public.user_exercise_favorites;

CREATE POLICY "Users manage own workout sessions"
    ON public.workout_sessions FOR ALL
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users manage own session exercises"
    ON public.workout_session_exercises FOR ALL
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users manage own session sets"
    ON public.workout_session_sets FOR ALL
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users manage own workout templates"
    ON public.workout_templates FOR ALL
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users manage own template exercises"
    ON public.workout_template_exercises FOR ALL
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users manage own template sets"
    ON public.workout_template_sets FOR ALL
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users manage own exercise favorites"
    ON public.user_exercise_favorites FOR ALL
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_session_exercises TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_session_sets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_template_exercises TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_template_sets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_exercise_favorites TO authenticated;

CREATE OR REPLACE FUNCTION public.save_completed_workout(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    uid uuid := auth.uid();
    session_id uuid := gen_random_uuid();
    exercise jsonb;
    set_row jsonb;
    exercise_row_id uuid;
    exercise_pos integer := 0;
    set_pos integer;
    set_type text;
BEGIN
    IF uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    INSERT INTO public.workout_sessions (
        id, user_id, title, started_at, completed_at, duration_seconds, volume, set_count, notes
    ) VALUES (
        session_id,
        uid,
        COALESCE(NULLIF(btrim(payload->>'title'), ''), 'workout'),
        NULLIF(payload->>'started_at', '')::timestamptz,
        COALESCE(NULLIF(payload->>'completed_at', '')::timestamptz, now()),
        COALESCE((payload->>'duration_seconds')::integer, 0),
        COALESCE((payload->>'volume')::numeric, 0),
        COALESCE((payload->>'set_count')::integer, 0),
        NULLIF(payload->>'notes', '')
    );

    FOR exercise IN
        SELECT value FROM jsonb_array_elements(COALESCE(payload->'exercises', '[]'::jsonb))
    LOOP
        exercise_row_id := gen_random_uuid();
        INSERT INTO public.workout_session_exercises (
            id, session_id, user_id, exercise_id, name, body_part, note, rest_seconds, position
        ) VALUES (
            exercise_row_id,
            session_id,
            uid,
            COALESCE(exercise->>'exercise_id', ''),
            COALESCE(NULLIF(btrim(exercise->>'name'), ''), 'exercise'),
            NULLIF(exercise->>'body_part', ''),
            NULLIF(exercise->>'note', ''),
            COALESCE((exercise->>'rest_seconds')::integer, 60),
            exercise_pos
        );
        exercise_pos := exercise_pos + 1;
        set_pos := 0;

        FOR set_row IN
            SELECT value FROM jsonb_array_elements(COALESCE(exercise->'sets', '[]'::jsonb))
        LOOP
            set_type := set_row->>'set_type';
            IF set_type IS NULL OR set_type NOT IN ('normal', 'warmup', 'failure', 'drop') THEN
                set_type := 'normal';
            END IF;

            INSERT INTO public.workout_session_sets (
                session_exercise_id, user_id, position, set_type, weight, reps, rpe, completed
            ) VALUES (
                exercise_row_id,
                uid,
                set_pos,
                set_type,
                COALESCE((set_row->>'weight')::numeric, 0),
                COALESCE((set_row->>'reps')::integer, 0),
                NULLIF(set_row->>'rpe', '')::numeric,
                COALESCE((set_row->>'completed')::boolean, false)
            );
            set_pos := set_pos + 1;
        END LOOP;
    END LOOP;

    RETURN session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_workout_template(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    uid uuid := auth.uid();
    template_id uuid := gen_random_uuid();
    exercise jsonb;
    set_row jsonb;
    exercise_row_id uuid;
    exercise_pos integer := 0;
    set_pos integer;
    set_type text;
BEGIN
    IF uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    INSERT INTO public.workout_templates (id, user_id, title)
    VALUES (
        template_id,
        uid,
        COALESCE(NULLIF(btrim(payload->>'title'), ''), 'my workout')
    );

    FOR exercise IN
        SELECT value FROM jsonb_array_elements(COALESCE(payload->'exercises', '[]'::jsonb))
    LOOP
        exercise_row_id := gen_random_uuid();
        INSERT INTO public.workout_template_exercises (
            id, template_id, user_id, exercise_id, name, body_part, rest_seconds, position
        ) VALUES (
            exercise_row_id,
            template_id,
            uid,
            COALESCE(exercise->>'exercise_id', ''),
            COALESCE(NULLIF(btrim(exercise->>'name'), ''), 'exercise'),
            NULLIF(exercise->>'body_part', ''),
            COALESCE((exercise->>'rest_seconds')::integer, 60),
            exercise_pos
        );
        exercise_pos := exercise_pos + 1;
        set_pos := 0;

        FOR set_row IN
            SELECT value FROM jsonb_array_elements(COALESCE(exercise->'sets', '[]'::jsonb))
        LOOP
            set_type := COALESCE(set_row->>'set_type', set_row->>'type');
            IF set_type IS NULL OR set_type NOT IN ('normal', 'warmup', 'failure', 'drop') THEN
                set_type := 'normal';
            END IF;

            INSERT INTO public.workout_template_sets (
                template_exercise_id, user_id, position, set_type, weight, reps
            ) VALUES (
                exercise_row_id,
                uid,
                set_pos,
                set_type,
                COALESCE((set_row->>'weight')::numeric, 0),
                COALESCE((set_row->>'reps')::integer, 0)
            );
            set_pos := set_pos + 1;
        END LOOP;
    END LOOP;

    RETURN template_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_completed_workout(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_workout_template(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_completed_workout(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_workout_template(jsonb) TO authenticated;
