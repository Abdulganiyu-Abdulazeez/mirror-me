# Google Gemini API: Step-by-Step Setup Guide

This guide walks you through obtaining a **free Google Gemini API key**, configuring it in MirrorMe, and understanding how it powers the AI features.

---

## 1. What is the Gemini API in MirrorMe?

MirrorMe uses Google's Gemini models (`gemini-2.5-flash`) for two features:
1. **Mirror Analysis (AI Vibe Check):** Summarizes the anonymous reflections you receive, finding common positive themes, social perceptions, and offering gentle constructive advice.
2. **Creative Prompt Suggestions:** Generates catchy anonymous prompt ideas (e.g. *"What's my biggest green flag?"*) when you create a new mirror link.

> **Privacy & Security Note:** The API key is stored securely on the **backend server** (`backend/.env`). Visitors and users never see your key.
> If you don't have an API key yet, MirrorMe includes a **smart fallback** that generates simulated responses so you can still test everything without errors.

---

## 2. Step-by-Step: How to Get Your Free Gemini API Key

Getting a Gemini API key is **100% free** and takes less than 60 seconds with any Google account.

### Click-by-Click Instructions:

1. **Open Google AI Studio:**
   - Go to 👉 **[https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)**
   - Sign in with your Google account (Gmail / Google Workspace).

2. **Create the Key:**
   - In the top-left or center of the page, click the blue button: **"Create API key"** (or **"Get API key"**).
   - A modal will pop up asking for a Google Cloud project:
     - If you don't have a project, click **"Create API key in new project"**.
     - If you already have one, select your project and click **"Generate API key"**.

3. **Copy the Key:**
   - Your API key will appear in a popup window. It looks like:
     ```
     AIzaSyB1234567890abcdefghijklmnopqrstuv
     ```
   - Click the **Copy** button.

---

## 3. Where to Put the API Key in the Codebase

Open your project files and paste your key into both `.env` files:

### File 1: `backend/.env` (Primary)
Open [`c:\Users\USER\mirror-me\backend\.env`](file:///c:/Users/USER/mirror-me/backend/.env):
```env
PORT=5000
SUPABASE_URL=https://jjjjelglerjoekishnjw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_giaEtYFysl0PUo_CvOPn1w_jjhlY-d4
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqamplbGdsZXJqb2VraXNobmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMDU3MDEsImV4cCI6MjEwODU4MTcwMX0.wxkmkhSAnFfwyZ8khMvjz113MqVjt6Dvn-jp2gQr5K8

# PASTE YOUR GEMINI API KEY HERE:
GEMINI_API_KEY=AIzaSyYourActualGeminiKeyHere
FRONTEND_URL=http://localhost:3000
```

---

### File 2: `frontend/.env.local` (Client Fallback)
Open [`c:\Users\USER\mirror-me\frontend\.env.local`](file:///c:/Users/USER/mirror-me/frontend/.env.local):
```env
VITE_SUPABASE_URL=https://jjjjelglerjoekishnjw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqamplbGdsZXJqb2VraXNobmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMDU3MDEsImV4cCI6MjEwODU4MTcwMX0.wxkmkhSAnFfwyZ8khMvjz113MqVjt6Dvn-jp2gQr5K8
VITE_API_BASE_URL=http://localhost:5000/api/v1

# PASTE YOUR GEMINI API KEY HERE (OPTIONAL):
GEMINI_API_KEY=AIzaSyYourActualGeminiKeyHere
```

---

## 4. How to Test the AI Features in MirrorMe

1. Make sure your backend is running:
   ```powershell
   cd c:\Users\USER\mirror-me\backend
   npm run dev
   ```
2. Open your frontend on `http://localhost:3000` and go to your **Dashboard**.
3. **Test Prompt Suggestions:**
   - Click **"+ Create New Mirror"**.
   - Click the **"AI Suggestions"** button with the magic wand icon (`Wand2`).
   - You will see 5 creative suggestions pop up as clickable chips. Clicking any chip fills in the prompt box!
4. **Test Mirror Vibe Analysis:**
   - Once you have received 1 or more text reflections, click the purple **"Analyze Vibe with Gemini"** button at the top of your feed.
   - The backend sends the text messages to Gemini and returns a tailored summary card analyzing what your friends think of you!

---

## 5. Free Tier Limits & Best Practices

| Metric | Google AI Studio Free Tier |
| :--- | :--- |
| **Cost** | **$0.00** (Free forever for personal/testing projects) |
| **Rate Limit** | Up to **15 Requests Per Minute (RPM)** |
| **Token Limit** | **1,000,000 Tokens Per Minute (TPM)** |
| **Daily Limit** | Up to **1,500 Requests Per Day** |

> **Tip:** The free tier is more than enough for testing and running MirrorMe with friends and small communities. If you ever hit rate limits, the backend automatically falls back to an encouraging offline analysis response so users never see an error.
