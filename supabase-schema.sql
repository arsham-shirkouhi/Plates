-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.daily_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  calories numeric DEFAULT 0,
  protein numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  fats numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT daily_logs_pkey PRIMARY KEY (id),
  CONSTRAINT daily_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.daily_summaries (
  user_id uuid NOT NULL,
  log_date date NOT NULL,
  tasks_total integer DEFAULT 0,
  tasks_completed integer DEFAULT 0,
  completion_rate numeric DEFAULT 0,
  streak_value integer,
  notes text,
  generated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT daily_summaries_pkey PRIMARY KEY (user_id, log_date),
  CONSTRAINT daily_summaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.daily_tasks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  log_date date NOT NULL,
  title text NOT NULL,
  is_completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  is_daily boolean DEFAULT false,
  CONSTRAINT daily_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT daily_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.onboarding_data (
  user_id uuid NOT NULL,
  name text NOT NULL,
  age integer NOT NULL,
  sex text CHECK (sex = ANY (ARRAY['male'::text, 'female'::text, 'other'::text, ''::text])),
  height numeric NOT NULL,
  height_unit text CHECK (height_unit = ANY (ARRAY['cm'::text, 'ft'::text])),
  weight numeric NOT NULL,
  weight_unit text CHECK (weight_unit = ANY (ARRAY['kg'::text, 'lbs'::text])),
  goal text CHECK (goal = ANY (ARRAY['lose'::text, 'maintain'::text, 'build'::text, ''::text])),
  activity_level text CHECK (activity_level = ANY (ARRAY['sedentary'::text, 'lightly'::text, 'moderate'::text, 'very'::text, ''::text])),
  diet_preference text CHECK (diet_preference = ANY (ARRAY['regular'::text, 'high-protein'::text, 'vegetarian'::text, 'vegan'::text, 'keto'::text, 'halal'::text, ''::text])),
  allergies ARRAY DEFAULT '{}'::text[],
  goal_intensity text CHECK (goal_intensity = ANY (ARRAY['mild'::text, 'moderate'::text, 'aggressive'::text, ''::text])),
  unit_preference jsonb,
  purpose text CHECK (purpose = ANY (ARRAY['meals'::text, 'workouts'::text, 'both'::text, 'discipline'::text, ''::text])),
  macros_setup text CHECK (macros_setup = ANY (ARRAY['auto'::text, 'manual'::text, ''::text])),
  custom_macros jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT onboarding_data_pkey PRIMARY KEY (user_id),
  CONSTRAINT onboarding_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.target_macros (
  user_id uuid NOT NULL,
  calories numeric NOT NULL,
  protein numeric NOT NULL,
  carbs numeric NOT NULL,
  fats numeric NOT NULL,
  base_tdee numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT target_macros_pkey PRIMARY KEY (user_id),
  CONSTRAINT target_macros_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.usernames (
  username text NOT NULL,
  user_id uuid NOT NULL,
  display_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT usernames_pkey PRIMARY KEY (username),
  CONSTRAINT usernames_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  onboarding_completed boolean DEFAULT false,
  streak integer DEFAULT 0,
  last_meal_log_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_login_at timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);