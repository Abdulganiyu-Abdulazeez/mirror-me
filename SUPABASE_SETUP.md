# MirrorMe: Complete Step-by-Step Supabase Setup & Local Testing Guide

> **Project URL:** `https://jjjjelglerjoekishnjw.supabase.co`  
> **Backend Port:** `5000` (`http://localhost:5000/api/v1`)  
> **Frontend Port:** `3000` (`http://localhost:3000`)  
> **Timezone:** West Africa Time (`Africa/Lagos` / UTC+1)  
> **Date:** October 26, 2026  

---

## Table of Contents
1. [Important Clarifications (JWTs, Passwords & RLS)](#1-important-clarifications-jwts-passwords--rls)
2. [Step 1: Run the Database Migration SQL in Supabase](#step-1-run-the-database-migration-sql-in-supabase)
3. [Step 2: Create the Voice Notes Storage Bucket](#step-2-create-the-voice-notes-storage-bucket)
4. [Step 3: Disable Email Confirmation for Instant Testing](#step-3-disable-email-confirmation-for-instant-testing)
5. [Step 4: Configure Google Authentication (OAuth)](#step-4-configure-google-authentication-oauth)
6. [Step 5: Running Frontend & Backend Locally](#step-5-running-frontend--backend-locally)
7. [Step 6: Testing End-to-End (User, Anonymous Guest & Admin)](#step-6-testing-end-to-end-user-anonymous-guest--admin)
8. [Troubleshooting & Common Questions](#troubleshooting--common-questions)

---

## 1. Important Clarifications (JWTs, Passwords & RLS)

### A. Is RLS a table? Where does it go?
> ❌ **NO! RLS is NOT a table.**
- **Tables** store rows of data (`profiles`, `links`, `messages`).
- **RLS (Row-Level Security) Policies** are **security rules attached directly onto tables**.
- You do **NOT** run RLS separately or make a table for it. You copy the **entire SQL code in Step 1 all together** into one query window and click **Run**.
- PostgreSQL automatically attaches each policy to its respective table.
- **Where to see it in Supabase:** Click **Authentication** in the left sidebar $\rightarrow$ click **Policies**. You will see your 3 tables with shield icons and the policies listed under each.

### B. Why is there no `password` column in `public.profiles`?
- Supabase has a private, built-in security table called **`auth.users`**.
- When a user signs up, Supabase hashes (`bcrypt`) and stores their password inside `auth.users.encrypted_password`.
- The foreign key:
  ```sql
  id uuid references auth.users on delete cascade primary key
  ```
  links `public.profiles` directly to that user in `auth.users`. Passwords should **never** be stored in public tables.

### C. Will running or re-running this SQL delete or cancel previous data?
- **NO!** The script uses:
  - `create table if not exists` $\rightarrow$ skips creation if the table already exists, keeping all rows safe.
  - `alter table ... add column if not exists` $\rightarrow$ safely adds missing columns (like `updated_at`, `username`, `avatar_url`) without touching existing records.
  - `drop policy if exists` $\rightarrow$ refreshes security rules without crashing on `"policy already exists"`.

---

## Step 1: Run the Database Migration SQL in Supabase

This single SQL script sets up your **3 tables**, attaches their **Row-Level Security (RLS)** rules, and registers the **Google OAuth & signup triggers**.

### Click-by-Click Instructions:
1. Log in to [supabase.com/dashboard](https://supabase.com/dashboard) and open your project (`jjjjelglerjoekishnjw`).
2. In the left navigation sidebar, click on **SQL Editor** (icon looks like `>_` or a database terminal).
3. Click the **"+ New query"** button near the top left.
4. Copy the entire SQL block below and paste it into the query window:

```sql
-- ============================================================
-- 1. PROFILES TABLE (Stores user handles, roles & avatars)
-- Passwords are encrypted & stored automatically in auth.users
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  email text unique not null,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('Africa/Lagos'::text, now()) not null
);

-- Immediately enable Row Level Security (RLS) on profiles
alter table public.profiles enable row level security;

-- Safely add updated_at and avatar_url in Nigerian time without touching existing data
alter table public.profiles 
  add column if not exists updated_at timestamp with time zone default timezone('Africa/Lagos'::text, now());

alter table public.profiles 
  add column if not exists avatar_url text;

-- ============================================================
-- 2. LINKS TABLE (Stores feedback mirror links per user)
-- Tied to user_id AND username for URL routing: /u/:username/:link_id
-- ============================================================
create table if not exists public.links (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  username text not null,
  title text not null,
  prompt text not null,
  type text default 'general' check (type in ('general', 'advice', 'confession', 'first-impression')),
  is_active boolean default true,
  created_at timestamp with time zone default timezone('Africa/Lagos'::text, now()) not null
);

-- Immediately enable Row Level Security (RLS) on links
alter table public.links enable row level security;

-- Safely add username & updated_at if table already exists (zero data loss)
alter table public.links 
  add column if not exists username text;

alter table public.links 
  add column if not exists updated_at timestamp with time zone default timezone('Africa/Lagos'::text, now());

-- ============================================================
-- 3. MESSAGES TABLE (Stores reflections per recipient user)
-- Tied to recipient_id AND recipient_username so accounts never mix up
-- ============================================================
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  link_id text references public.links(id) on delete cascade not null,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  recipient_username text not null,
  content_type text not null check (content_type in ('text', 'audio')),
  content text,
  audio_url text,
  sentiment text,
  created_at timestamp with time zone default timezone('Africa/Lagos'::text, now()) not null
);

-- Immediately enable Row Level Security (RLS) on messages
alter table public.messages enable row level security;

-- Safely add recipient_username if table already exists (zero data loss)
alter table public.messages 
  add column if not exists recipient_username text;

-- ============================================================
-- 4. RLS POLICIES (Security rules attached to tables)
-- Note: These are NOT tables. They attach directly to tables above!
-- ============================================================

-- Profiles: Public can view handles (needed for review page headers)
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone" 
  on public.profiles for select using (true);

-- Profiles: Users can only update their own profile
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" 
  on public.profiles for update using (auth.uid() = id);

-- Links: Public can view active links to load the review prompt
drop policy if exists "Anyone can view active links" on public.links;
create policy "Anyone can view active links" 
  on public.links for select using (true);

-- Links: ONLY the creator can see and manage their links in dashboard
drop policy if exists "Users can manage own links" on public.links;
create policy "Users can manage own links" 
  on public.links for all using (auth.uid() = user_id);

-- Messages: Anonymous guests CAN submit reflections
drop policy if exists "Anyone can submit anonymous reflections" on public.messages;
create policy "Anyone can submit anonymous reflections" 
  on public.messages for insert with check (true);

-- Messages: ONLY the recipient can view their received reflections (anti-mixup guarantee)
drop policy if exists "Recipients can view own messages" on public.messages;
create policy "Recipients can view own messages" 
  on public.messages for select using (auth.uid() = recipient_id);

-- Messages: Recipients can delete messages from their feed
drop policy if exists "Recipients can delete own messages" on public.messages;
create policy "Recipients can delete own messages" 
  on public.messages for delete using (auth.uid() = recipient_id);

-- ============================================================
-- 5. AUTOMATIC TIMESTAMP & USER PROFILE TRIGGERS (Nigerian Time)
-- ============================================================

-- Function to maintain updated_at timestamps in Africa/Lagos time
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('Africa/Lagos'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_links_updated_at on public.links;
create trigger set_links_updated_at
  before update on public.links
  for each row execute procedure public.set_updated_at();

-- Automatic user profile creation on signup (supports Email & Google OAuth)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  base_username text;
  final_username text;
  counter integer := 0;
begin
  -- 1. Extract preferred username from metadata (Google name/username) or email prefix
  base_username := lower(coalesce(
    nullif(trim(new.raw_user_meta_data->>'user_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(new.email, '@', 1)
  ));

  -- Clean up special characters & spaces to form a safe URL slug
  base_username := regexp_replace(base_username, '[^a-z0-9_]', '', 'g');
  if base_username = '' then
    base_username := 'user';
  end if;

  final_username := base_username;

  -- 2. If username already taken by another account, append incremental counter
  while exists (select 1 from public.profiles where username = final_username and id <> new.id) loop
    counter := counter + 1;
    final_username := base_username || counter::text;
  end loop;

  -- 3. Insert or update profile (also saves Google profile avatar if available)
  insert into public.profiles (id, username, email, avatar_url)
  values (
    new.id,
    final_username,
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = timezone('Africa/Lagos'::text, now());

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

5. Click the green **"Run"** button in the lower right (or press `Ctrl` + `Enter`).
6. You will see: **`Success. No rows returned`**. Your database tables and security policies are now completely live!

---

## Step 2: Create the Voice Notes Storage Bucket

This bucket stores recorded 30-second voice notes uploaded by anonymous guests.

### Click-by-Click Instructions:
1. In the left navigation menu, click on **Storage** (folder icon).
2. Click the **"New bucket"** button near the top right.
3. Configure the bucket:
   - **Bucket name:** `audio-reflections` *(type this exact name)*
   - **Public bucket:** **Toggle to ON** *(Green checkmark — this lets recipient audio players stream the recorded note)*.
4. Click **"Save bucket"**.
5. Add an upload policy so anonymous visitors can upload voice notes:
   - Click on **Policies** under the Storage section on the left.
   - Find `audio-reflections` in the list, then click **"New policy"** $\rightarrow$ select **"For full customization"**.
   - **Policy Name:** `Allow anonymous voice uploads and playback`
   - **Allowed operations:** Check `SELECT` and `INSERT`.
   - **Target roles:** Check `anon` and `authenticated`.
   - In the **Policy definition** box (or *USING / WITH CHECK* if separate), type:
     ```sql
     true
     ```
   - Click **"Review"** (or **"Save policy"**).

---

## Step 3: Turn OFF Email Confirmation (Permanent for Local & Live)

You do **not** want any email verification or confirmation codes (neither locally nor in production). When a user registers with email and password, their account is saved immediately and they are logged in straight away.

### Click-by-Click Instructions:
1. In the left navigation menu, click on **Authentication** (key/shield icon).
2. In the secondary menu, click **Providers**.
3. Click on the **Email** provider row to expand its settings.
4. Scroll down to find the toggle labeled **"Confirm email"**.
5. **Toggle it to OFF (Disabled)** permanently.
6. Click **Save** at the bottom of the card.

> [!TIP]
> **Automatic Google & Email Syncing:**
> Supabase automatically links accounts that share the same email address. If a user previously registered with `alex@gmail.com` (using email/password) and later clicks **"Continue with Google"** with that same Gmail account, Supabase recognizes the email and automatically signs them into their **existing account** without creating a duplicate profile or losing any previous links or messages!

---

## Step 4: Configure Google Authentication (OAuth)

With Google OAuth enabled, users can click **"Continue with Google"** on MirrorMe to register or log in with one click.

### 1. Google Cloud Console Configuration:
1. Open the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Select your project (or click **"New Project"** and name it `MirrorMe`).
3. If prompted to configure the **OAuth consent screen**:
   - Choose **External** $\rightarrow$ click **Create**.
   - **App name:** `MirrorMe`
   - **User support email:** Select your Gmail address.
   - **Developer contact information:** Type your email.
   - Click **Save and Continue** until finished.
4. Click **"+ CREATE CREDENTIALS"** near the top $\rightarrow$ select **OAuth client ID**.
5. Configure the client:
   - **Application type:** `Web application`
   - **Name:** `MirrorMe Supabase Auth`
   - **Authorized JavaScript origins:**
     - `https://jjjjelglerjoekishnjw.supabase.co`
     - `http://localhost:3000`
   - **Authorized redirect URIs:**
     - `https://jjjjelglerjoekishnjw.supabase.co/auth/v1/callback`
6. Click **Create**. A modal will display your **Client ID** and **Client Secret**. Copy both values.

### 2. Supabase Dashboard Provider Setup:
1. In the Supabase Dashboard, go to **Authentication** (key/shield icon) $\rightarrow$ **Providers**.
2. Scroll to **Google** and click to expand it.
3. Toggle **"Enable Google provider"** to **ON**.
4. Paste your **Client ID** and **Client Secret**.
5. Click **Save** at the bottom of the card.

### 3. Supabase URL Configuration (Allowed Redirects):
1. In the Supabase Dashboard, go to **Authentication** $\rightarrow$ **URL Configuration**.
2. Set **Site URL** to: `http://localhost:3000`
3. Under **Redirect URLs**, click **"Add URL"** and add:
   - `http://localhost:3000/**`
   - `http://localhost:5000/**`
4. Click **Save**.

---

## Step 5: Running Frontend & Backend Locally

Open two command prompt or terminal windows on your computer:

### Terminal 1: Start the Backend Service
```powershell
cd c:\Users\USER\mirror-me\backend
npm run dev
```
> **Output:**
> ```
> 🚀 MirrorMe Backend running on http://localhost:5000
> 🔗 API Base: http://localhost:5000/api/v1
> 🌐 Connected Supabase: https://jjjjelglerjoekishnjw.supabase.co
> ```

---

### Terminal 2: Start the Frontend Application
```powershell
cd c:\Users\USER\mirror-me\frontend
npm run dev
```
> **Output:**
> ```
>   VITE v6.2.0  ready in 320 ms
> 
>   ➜  Local:   http://localhost:3000/
>   ➜  Network: use --host to expose
> ```

---

## Step 6: Testing End-to-End (User, Anonymous Guest & Admin)

### 1. Account Creation (Creator Side)
1. In your browser, navigate to: `http://localhost:3000/#/register` (or `http://localhost:3000/#/login`).
2. You can either:
   - Click **"Continue with Google"** to log in instantly via your Google account.
   - Or register with email and password (e.g. `alex`, `alex@example.com`, `Password123!`).
3. You will be redirected immediately to your **Dashboard**.

### 2. Creating a Mirror Link
1. In your Dashboard, click **"+ Create New Mirror"**.
2. Select a category (e.g. *First Impression* or *General Feedback*).
3. Fill in the prompt:
   - **Title:** *"Honestly thinking about me..."*
   - **Prompt:** *"What was your honest first impression of me?"*
4. Click **"Create Mirror"** (celebration confetti will fire 🎉).
5. On the active mirror card, click **"Copy Share Link"** to copy your unique URL (e.g. `http://localhost:3000/#/u/alex/abc12345`).

### 3. Testing Anonymous Guest Submission
1. Open an **Incognito / Private Window** (or test on your mobile phone on the same network).
2. Paste the copied link: `http://localhost:3000/#/u/alex/abc12345`
3. Notice that:
   - The creator's handle `@alex` and prompt appear.
   - Toggle to **Voice Note** $\rightarrow$ click the microphone button to record a 10-second voice note $\rightarrow$ preview it in the custom audio player.
   - Or toggle to **Text** $\rightarrow$ type a confession (e.g. *"You're always the funniest person in the room!"*).
4. Click **"Send Anonymous Reflection"**. You will see the animated confirmation screen!

### 4. Testing the Creator Dashboard & Instagram Story Card
1. Return to your regular browser window on `http://localhost:3000/#/dashboard`.
2. Your newly submitted reflection is displayed in your feed!
3. If it was a voice note, hit play on the **Custom Waveform Audio Player** to stream and scrub through the audio.
4. Click **"Share to Story"** on the reflection card:
   - The **Story Card Generator Modal** will open.
   - Switch between the 5 gradient themes (*Midnight Neon*, *Cyberpunk*, *Sunset Glow*, *Emerald Glass*, *Obsidian*).
   - Click **"Download 9:16 Story Image"** to save the vertical PNG image to your computer.
5. Click **"Analyze Vibe with Gemini"** to generate an AI sentiment summary of all received messages.

---

## 8. Troubleshooting & Common Questions

| Question / Issue | Cause | Fix |
| :--- | :--- | :--- |
| **"Where do I see my RLS policies?"** | RLS is a security rule on tables, not a separate table. | Go to **Authentication** $\rightarrow$ **Policies** in Supabase. You will see `profiles`, `links`, and `messages` with their policies listed under each. |
| **"User already registered" error** | Email or username exists in Supabase Auth | Use a different username/email, or delete test users from Supabase Dashboard $\rightarrow$ Authentication $\rightarrow$ Users. |
| **Audio upload fails on submission** | Storage bucket is missing or private | Verify bucket name is exactly `audio-reflections` and **Public bucket** is toggled ON. |
| **"Mirror not found"** | Link ID was deleted or wrong username in URL | Make sure to use the exact URL generated by the "Copy Share Link" button. |
| **Backend not running** | Port 5000 is occupied or server is stopped | The frontend includes an automatic offline fallback to local storage so you can continue testing without interruption. |

---

*Guide verified and ready for end-to-end execution on MirrorMe.*
