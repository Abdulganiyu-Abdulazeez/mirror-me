# MirrorMe 🪞

MirrorMe is an anonymous constructive feedback platform designed to give and receive honest reflections with full user privacy and control. It supports both written messages and voice recordings with AI-powered insights.

---

## ✨ Recent Features & Updates

- **Profile Management (`/#/profile`):** Customizable display usernames and profile pictures with live previews and avatar uploads directly into Supabase Storage (`avatars` bucket).
- **Real-Time Username Availability:** Live, debounced username checking verifying handle availability across all user accounts in real time.
- **Password Visibility Toggle:** Eye icon toggle in password input fields for both sign-in and account registration.
- **Fixed Solid Navigation Bar:** Solid background header overlaying page content smoothly on scroll with profile dropdown and current user handle.
- **Supabase Master Migration (`SUPABASE_MASTER_FIX.sql`):** Consolidated, 100% idempotent SQL migration with robust RLS policies, storage bucket configurations (`avatars` & `voice-notes`), and an automatic `handle_new_user()` trigger for both Email & Google OAuth signups.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Backend:** Node.js, Express, TypeScript, Supabase Service Role
- **Database & Auth:** Supabase PostgreSQL, Row Level Security (RLS), Supabase Auth (Email + Google OAuth)
- **Storage:** Supabase Storage (`avatars` & `voice-notes` buckets)
- **AI / LLM:** Google Gemini API (transcription & analysis)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or pnpm
- Supabase account & project

---

### 2. Database & Supabase Setup
Run [`SUPABASE_MASTER_FIX.sql`](./SUPABASE_MASTER_FIX.sql) in your Supabase SQL Editor. This single script:
1. Creates `profiles`, `links`, and `messages` tables with all columns safely.
2. Applies Row-Level Security (RLS) policies allowing anonymous feedback submissions and authenticated link/profile management.
3. Sets up the public `avatars` and `voice-notes` storage buckets.
4. Registers the `handle_new_user()` trigger on `auth.users` to automatically populate `public.profiles` on signup.
5. Sets `haypexdev@gmail.com` as the primary administrator.

---

### 3. Backend Setup
1. Navigate into the backend folder:
   ```bash
   cd backend
   ```
2. Copy the sample environment file:
   ```bash
   cp .env.example .env
   ```
3. Fill in your environment variables in `backend/.env`:
   - `PORT`: Server port (default `5000`)
   - `SUPABASE_URL`: Your Supabase Project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role secret
   - `SUPABASE_ANON_KEY`: Your Supabase anon public key
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `FRONTEND_URL`: URL of the client app (`http://localhost:3000`)
4. Install dependencies and start the dev server:
   ```bash
   npm install
   npm run dev
   ```

---

### 4. Frontend Setup
1. In a separate terminal, navigate into the frontend folder:
   ```bash
   cd frontend
   ```
2. Copy the sample environment file:
   ```bash
   cp .env.example .env.local
   ```
3. Fill in your environment variables in `frontend/.env.local`:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon public key
   - `VITE_API_BASE_URL`: `http://localhost:5000/api/v1`
4. Install dependencies and start the Vite dev server:
   ```bash
   npm install
   npm run dev
   ```
5. Open your browser at `http://localhost:3000`.

---

## 🔒 Security & Privacy
- **Row Level Security (RLS):** All database tables have strict RLS policies enabled.
- **Credential Protection:** All private keys and credentials are kept out of source control. Use `.env.example` templates to configure local environments.
