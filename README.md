# MirrorMe 🪞 — Anonymous Review & Voice Note Platform

MirrorMe is a modern, cross-platform anonymous feedback and voice note platform designed to collect honest reflections with complete user privacy and control. It supports written reflections, voice note recordings with custom audio playback, recipient dashboards, public submission forms, and a restricted administrative workstation.

---

## 📋 Architectural Overview & Specifications

This repository strictly complies with the **Mirror Me Feature Specification** and **Context Engineering Standards**:
- **Rules Files:** [`.geminirules`](./.geminirules) and [`.cursorrules`](./.cursorrules) enforce zero `any` types, mobile-first Tailwind design, isolated API services, and strict error handling.
- **Database & RLS Migration:** [`SUPABASE_MASTER_FIX.sql`](./SUPABASE_MASTER_FIX.sql) provides a 100% idempotent PostgreSQL migration for Supabase.

---

## 🛠️ Tech Stack

- **Web Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Backend API:** Node.js, Express, TypeScript, Supabase Service Role
- **Database & Auth:** Supabase PostgreSQL with Row-Level Security (RLS), Supabase Auth (Email + Google OAuth)
- **Storage:** Supabase Storage (`avatars` and `voice-notes` buckets)
- **AI Intelligence:** Google Gemini API (transcription & vibe analysis)

---

## 🗄️ Database Schema & Supabase Architecture

### 1. Table: `profiles`
| Column Name | Data Type | Constraints / Purpose |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key, references `auth.users(id)` ON DELETE CASCADE |
| `username` | TEXT | Unique, Not Null |
| `email` | TEXT | Unique, Not Null |
| `role` | TEXT | Default `'user'` (`'user'`, `'admin'`) |
| `avatar_url` | TEXT | Nullable, references Supabase Storage `avatars` bucket |
| `is_active` | BOOLEAN | Default `true` (Disabling user terminates session & blocks mirrors) |
| `last_active_at` | TIMESTAMPTZ | Default `now()` (For 1d, 7d, 30d activity metrics) |
| `created_at` | TIMESTAMPTZ | Default `now()` |
| `updated_at` | TIMESTAMPTZ | Default `now()` |

### 2. Table: `links`
| Column Name | Data Type | Constraints / Purpose |
| :--- | :--- | :--- |
| `id` | TEXT / UUID | Primary Key, unique mirror identifier |
| `user_id` | UUID | Foreign Key -> `profiles(id)` ON DELETE CASCADE |
| `slug` | TEXT | Unique, base62/clean slug for URL routing `/u/[slug]` |
| `title` | TEXT | Mirror prompt title |
| `prompt` | TEXT | Custom mirror reflection question |
| `type` | TEXT | Category: `'general'`, `'advice'`, `'confession'`, `'first-impression'` |
| `is_active` | BOOLEAN | Default `true` |
| `created_at` | TIMESTAMPTZ | Default `now()` |

### 3. Table: `reviews` (and backward-compatible `messages`)
| Column Name | Data Type | Constraints / Purpose |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key, Default `gen_random_uuid()` |
| `link_id` | TEXT / UUID | Foreign Key -> `links(id)` ON DELETE CASCADE |
| `type` | TEXT | Not Null (`'text'` or `'vn'`) |
| `content` | TEXT | Not Null (Text string or Supabase Storage public URL for voice notes) |
| `created_at` | TIMESTAMPTZ | Default `now()` |

### 4. Table: `broadcasts`
| Column Name | Data Type | Constraints / Purpose |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key, Default `gen_random_uuid()` |
| `title` | TEXT | Not Null (Announcement headline) |
| `message` | TEXT | Not Null (Announcement content) |
| `created_at` | TIMESTAMPTZ | Default `now()` |

---

## 🌟 Core Features & Workflows

### 1. Recipient Dashboard (`/#/dashboard`)
- **Active Mirrors:** Quick copy and share action for user mirror links.
- **Unified Reflections Feed:** Automatically fetches and displays all responses across the user's active links, rendering text reflections as cards and voice notes with an interactive HTML5 audio player.
- **Broadcast Announcements:** Displays active platform-wide banners published by administrators.
- **AI Vibe Analysis:** Single-click Gemini API vibe analysis summarizing peer reflections.

### 2. Public Submission Flow (`/#/u/:slug` & `/#/u/:username/:linkId`)
- No account or sign-in required for senders.
- Seamless toggle: **"Send Text"** vs **"Send Voice Note"**.
- Built with browser `MediaRecorder` Web Audio API (record, preview, re-record).
- Uploads audio directly to Supabase Storage (`voice-notes` bucket) and stores the reference in `reviews`.

### 3. User Profile Management (`/#/profile`)
- Update username with real-time debounced availability check across all accounts.
- Upload, preview, or remove custom avatar pictures with instant Supabase Storage sync.

### 4. Admin Workstation (`/#/admin` and `/#/admin/workspace`)
- Guarded strictly by email verification (`ADMIN_AUTHORIZED_EMAIL` / `haypexdev@gmail.com`) and admin role flags.
- **User Directory Table:** Full user table with live status badges (`Active` / `Suspended`).
- **Activity Metrics Filter:** Instant filtering for users active within the **Past 1 Day**, **Past 7 Days**, **Past 30 Days**, or **All Time** based on `last_active_at`.
- **User Moderation:** One-click toggle to suspend or reactivate accounts (`is_active`).
- **Broadcast Management:** Publish global announcements that instantly render as banners on all user dashboards, with deletion controls.
- **Platform Analytics & Logs:** High-level metrics for user count, reflections, voice note count, and active mirror links.

---

## 🚀 Getting Started

### 1. Database Setup
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** $\rightarrow$ **+ New query**.
3. Copy and run [`SUPABASE_MASTER_FIX.sql`](./SUPABASE_MASTER_FIX.sql).
   - Automatically establishes all 4 tables (`profiles`, `links`, `reviews`, `broadcasts`).
   - Configures strict Row-Level Security (RLS) policies.
   - Configures `avatars` and `voice-notes` storage buckets.
   - Attaches `handle_new_user()` trigger for automated Google OAuth and Email signup onboarding.
   - Syncs and migrates existing responses from `messages` into `reviews`.

### 2. Backend Setup
```bash
cd backend
npm install
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🔒 Security & Privacy Rules
- **RLS Guardrails:** Anonymous users can insert reviews *only* if the mirror `link_id` exists; public reads of other people's reviews are strictly blocked.
- **Zero Exposed Keys:** Admin privileges and API secrets are never hardcoded on the client.
