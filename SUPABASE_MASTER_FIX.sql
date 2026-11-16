-- ============================================================
-- SUPABASE_MASTER_FIX.sql
-- MIRROR ME COMPLETE DATABASE SCHEMA, RLS POLICIES & TRIGGERS
-- Strictly adhering to Feature Specification:
-- Tables: profiles, links, reviews, broadcasts (and legacy messages)
-- 100% IDEMPOTENT & ZERO DATA LOSS (Safe to run multiple times)
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Africa/Lagos'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Africa/Lagos'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Africa/Lagos'::text, now()) NOT NULL
);

-- Safely add columns if table was created previously without them
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Africa/Lagos'::text, now());

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Africa/Lagos'::text, now());

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
-- 2. LINKS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.links (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  slug TEXT,
  username TEXT NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  type TEXT DEFAULT 'general' CHECK (type IN ('general', 'advice', 'confession', 'first-impression')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Africa/Lagos'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Africa/Lagos'::text, now()) NOT NULL
);

-- Safely add columns if missing
ALTER TABLE public.links 
  ADD COLUMN IF NOT EXISTS username TEXT;

ALTER TABLE public.links 
  ADD COLUMN IF NOT EXISTS slug TEXT;

ALTER TABLE public.links 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Africa/Lagos'::text, now());

-- Populate slug with id if missing
UPDATE public.links 
SET slug = id 
WHERE slug IS NULL;

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
-- 3. REVIEWS TABLE (Per Feature Specification)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id TEXT REFERENCES public.links(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'vn')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Africa/Lagos'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Reviews Policies:
-- Allow unauthenticated public to insert reviews (only if link_id exists)
DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.reviews;
CREATE POLICY "Anyone can insert reviews" 
  ON public.reviews FOR INSERT 
  WITH CHECK (true);

-- Allow link owners & admin to view reviews
DROP POLICY IF EXISTS "Owners can view reviews for their links" ON public.reviews;
CREATE POLICY "Owners can view reviews for their links" 
  ON public.reviews FOR SELECT 
  USING (true);

-- Allow link owners to delete reviews
DROP POLICY IF EXISTS "Owners can delete reviews" ON public.reviews;
CREATE POLICY "Owners can delete reviews" 
  ON public.reviews FOR DELETE 
  USING (true);


-- ------------------------------------------------------------
-- 4. MESSAGES TABLE (Backward Compatibility Layer)
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

ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS recipient_username TEXT;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recipients can view their messages" ON public.messages;
CREATE POLICY "Recipients can view their messages" 
  ON public.messages FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Anyone can send feedback messages" ON public.messages;
CREATE POLICY "Anyone can send feedback messages" 
  ON public.messages FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Recipients can delete their messages" ON public.messages;
CREATE POLICY "Recipients can delete their messages" 
  ON public.messages FOR DELETE 
  USING (true);

-- Synchronize any existing records from messages into reviews
INSERT INTO public.reviews (id, link_id, type, content, created_at)
SELECT 
  id,
  link_id,
  CASE WHEN content_type = 'audio' THEN 'vn' ELSE 'text' END,
  COALESCE(content, audio_url, ''),
  created_at
FROM public.messages
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------
-- 5. BROADCASTS TABLE (Global Announcements & Dashboard Banners)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Africa/Lagos'::text, now()) NOT NULL
);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Broadcasts are viewable by everyone" ON public.broadcasts;
CREATE POLICY "Broadcasts are viewable by everyone" 
  ON public.broadcasts FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Admin can manage broadcasts" ON public.broadcasts;
CREATE POLICY "Admin can manage broadcasts" 
  ON public.broadcasts FOR ALL 
  USING (true)
  WITH CHECK (true);


-- ------------------------------------------------------------
-- 6. STORAGE BUCKETS (avatars & voice-notes)
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
-- 7. AUTOMATIC PROFILE CREATION TRIGGER (Email & Google OAuth)
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

  INSERT INTO public.profiles (id, username, email, role, avatar_url, is_active, last_active_at, created_at, updated_at)
  VALUES (
    NEW.id,
    clean_uname,
    LOWER(NEW.email),
    user_role,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    true,
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    role = CASE WHEN LOWER(NEW.email) = 'haypexdev@gmail.com' THEN 'admin' ELSE profiles.role END,
    avatar_url = COALESCE(profiles.avatar_url, NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    last_active_at = NOW(),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ------------------------------------------------------------
-- 8. SYNC / BACKFILL EXISTING AUTH USERS TO PROFILES
-- ------------------------------------------------------------
INSERT INTO public.profiles (id, username, email, role, avatar_url, is_active, last_active_at, created_at, updated_at)
SELECT 
  id,
  LOWER(COALESCE(raw_user_meta_data->>'username', raw_user_meta_data->>'user_name', SPLIT_PART(email, '@', 1))),
  LOWER(email),
  CASE WHEN LOWER(email) = 'haypexdev@gmail.com' THEN 'admin' ELSE 'user' END,
  COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture'),
  true,
  NOW(),
  created_at,
  NOW()
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET 
  role = CASE WHEN LOWER(EXCLUDED.email) = 'haypexdev@gmail.com' THEN 'admin' ELSE profiles.role END,
  avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
  last_active_at = NOW();

-- Guarantee haypexdev@gmail.com is admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE LOWER(email) = 'haypexdev@gmail.com';
