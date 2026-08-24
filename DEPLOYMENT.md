# 🚀 SevaMitraAI Deployment Guide

This guide explains how to deploy the frontend to **Vercel** or **Netlify**, and the FastAPI AI backend to **Render / Railway / Hugging Face Spaces**.

---

## 🌐 1. Deploy Frontend to Vercel (Recommended)

The repository is pre-configured with `vercel.json` for seamless Single Page Application (SPA) routing.

### Steps:
1. Push your repository to your GitHub account (`ankitxvx/SevaMitraAI`).
2. Go to **[Vercel Dashboard](https://vercel.com/new)** and click **"Add New Project"** → **Import** your repository.
3. In **Project Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Select `frontend` (or leave default if using root `vercel.json`)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables**:
   - Add `VITE_API_URL`: `https://your-backend-url.onrender.com/api` (or your deployed backend URL).
5. Click **Deploy**.

---

## ⚡ 2. Deploy Frontend to Netlify

The repository is pre-configured with `frontend/public/_redirects` for Netlify client-side routing.

### Steps:
1. Go to **[Netlify Dashboard](https://app.netlify.com)** and select **"Add new site" → "Import an existing project"**.
2. Connect your GitHub repository.
3. Set configuration:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
4. In **Environment Variables**, add:
   - `VITE_API_URL`: `https://your-backend-url.onrender.com/api`
5. Click **Deploy site**.

---

## 🐍 3. Deploy FastAPI AI Backend (Free on Render / Railway)

Because Python Whisper and Torch require a persistent Python runtime with FFmpeg, deploy the backend to **Render**:

1. Go to **[Render.com](https://dashboard.render.com/)** and click **New + → Web Service**.
2. Connect your GitHub repository (`SevaMitraAI`).
3. Set the following:
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4. Add Environment Variable:
   - `PYTHONPATH`: `.`
5. Once deployed, copy your Render web service URL (e.g. `https://sevamitra-backend.onrender.com`) and paste it as `VITE_API_URL` on Vercel/Netlify!
