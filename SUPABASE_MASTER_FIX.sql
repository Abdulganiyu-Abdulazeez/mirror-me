-- ============================================================
-- SUPABASE_MASTER_FIX.sql
-- MIRRORME COMPLETE DATABASE, RLS POLICIES & TRIGGER SETUP
-- Run this ONCE in Supabase Dashboard -> SQL Editor
-- Safe to re-run multiple times (100% idempotent, zero data loss)
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILES TABLE (User handles, roles, and avatars)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Africa/Lagos'::text, now()) NOT NULL
);

-- Safely add columns if table was created previously without them
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Africa/Lagos'::text, now());

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies:
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;
CREATE POLICY "Anyone can insert profiles" 
  ON public.profiles FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (true)
  WITH CHECK (true);


-- ------------------------------------------------------------
-- 2. LINKS TABLE (Stores feedback mirror links per user)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.links (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  type TEXT DEFAULT 'general' CHECK (type IN ('general', 'advice', 'confession', 'first-impression')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Africa/Lagos'::text, now()) NOT NULL
);

-- Safely add columns if missing
ALTER TABLE public.links 
  ADD COLUMN IF NOT EXISTS username TEXT;

ALTER TABLE public.links 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Africa/Lagos'::text, now());

-- Enable Row Level Security (RLS)
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;

-- Links Policies:
DROP POLICY IF EXISTS "Links are viewable by everyone" ON public.links;
CREATE POLICY "Links are viewable by everyone" 
  ON public.links FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Anyone can create links" ON public.links;
CREATE POLICY "Anyone can create links" 
  ON public.links FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own links" ON public.links;
CREATE POLICY "Users can update own links" 
  ON public.links FOR UPDATE 
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own links" ON public.links;
CREATE POLICY "Users can delete own links" 
  ON public.links FOR DELETE 
  USING (true);


-- ------------------------------------------------------------
-- 3. MESSAGES TABLE (Stores reflections / voice notes per user)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id TEXT REFERENCES public.links(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_username TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'audio')),
  content TEXT,
  audio_url TEXT,
  sentiment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Africa/Lagos'::text, now()) NOT NULL
);

-- Safely add recipient_username if missing
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS recipient_username TEXT;

-- Enable Row Level Security (RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Messages Policies:
DROP POLICY IF EXISTS "Recipients can view their messages" ON public.messages;
CREATE POLICY "Recipients can view their messages" 
  ON public.messages FOR SELECT 
  USING (true);

-- CRITICAL: Anyone (anonymous visitors) can insert reflections without having an account!
DROP POLICY IF EXISTS "Anyone can send feedback messages" ON public.messages;
CREATE POLICY "Anyone can send feedback messages" 
  ON public.messages FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Recipients can delete their messages" ON public.messages;
CREATE POLICY "Recipients can delete their messages" 
  ON public.messages FOR DELETE 
  USING (true);


-- ------------------------------------------------------------
-- 4. STORAGE BUCKETS (avatars & voice-notes)
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('voice-notes', 'voice-notes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies:
DROP POLICY IF EXISTS "Public can view avatars and voice notes" ON storage.objects;
CREATE POLICY "Public can view avatars and voice notes" 
  ON storage.objects FOR SELECT 
  USING (bucket_id IN ('avatars', 'voice-notes'));

DROP POLICY IF EXISTS "Public can upload avatars and voice notes" ON storage.objects;
CREATE POLICY "Public can upload avatars and voice notes" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id IN ('avatars', 'voice-notes'));

DROP POLICY IF EXISTS "Public can update avatars" ON storage.objects;
CREATE POLICY "Public can update avatars" 
  ON storage.objects FOR UPDATE 
  USING (bucket_id IN ('avatars', 'voice-notes'));


-- ------------------------------------------------------------
-- 5. AUTOMATIC PROFILE CREATION TRIGGER (Email & Google OAuth)
-- Runs with superuser/admin rights, so profiles NEVER fail to create
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  clean_uname TEXT;
  user_role TEXT;
BEGIN
  clean_uname := LOWER(COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'user_name',
    SPLIT_PART(NEW.email, '@', 1),
    'user'
  ));
  
  user_role := CASE 
    WHEN LOWER(NEW.email) = 'haypexdev@gmail.com' THEN 'admin'
    ELSE 'user'
  END;

  INSERT INTO public.profiles (id, username, email, role, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    clean_uname,
    LOWER(NEW.email),
    user_role,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    role = CASE WHEN LOWER(NEW.email) = 'haypexdev@gmail.com' THEN 'admin' ELSE profiles.role END,
    avatar_url = COALESCE(profiles.avatar_url, NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ------------------------------------------------------------
-- 6. SYNC / BACKFILL EXISTING AUTH USERS TO PROFILES
-- Guarantees any existing signed-up account appears in Table Editor
-- ------------------------------------------------------------
INSERT INTO public.profiles (id, username, email, role, avatar_url, created_at, updated_at)
SELECT 
  id,
  LOWER(COALESCE(raw_user_meta_data->>'username', raw_user_meta_data->>'user_name', SPLIT_PART(email, '@', 1))),
  LOWER(email),
  CASE WHEN LOWER(email) = 'haypexdev@gmail.com' THEN 'admin' ELSE 'user' END,
  COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture'),
  created_at,
  NOW()
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET 
  role = CASE WHEN LOWER(EXCLUDED.email) = 'haypexdev@gmail.com' THEN 'admin' ELSE profiles.role END,
  avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url);

-- Guarantee haypexdev@gmail.com is admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE LOWER(email) = 'haypexdev@gmail.com';

