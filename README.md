# Smart Document Generator (SDG) - Deployment & APK Build Guide

An enterprise-grade document automation platform designed to parse Word (.docx) templates, dynamically generate entry forms, and output pixel-perfect DOCX and PDF documents.

This repository is pre-configured for **100% Free Production Deployment** and **Automatic Android APK Packaging** using Capacitor.

---

## Architecture Overview

```
                      ┌──────────────────────┐
                      │    Mobile APK (App)  │
                      └──────────┬───────────┘
                                 │ Shells
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Vercel (Free Frontend SPA)                   │
├──────────────────────────────────────────────────────────────────┤
│                                 │ API Calls                      │
│                                 ▼                                │
│                     Render (Free Express Backend)                │
└───────────────────┬──────────────────────────────┬───────────────┘
                    │ DB Queries                   │ Storage Uploads
                    ▼                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Supabase (Free Backend Services)             │
├─────────────────────────────────────┬────────────────────────────┤
│           PostgreSQL DB             │       Storage Buckets      │
└─────────────────────────────────────┴────────────────────────────┘
```

- **Frontend**: Single-Page React Application with Tailwind CSS, built with Vite and hosted for free on **Vercel**.
- **Backend**: Express Node.js Server hosted for free on **Render**, featuring **LibreOffice headless PDF conversion**.
- **Database**: Fully persistent hosted PostgreSQL database on **Supabase**.
- **Storage**: Highly scalable asset storage on **Supabase Storage** (eliminating local server file persistence, which is deleted on free hosting restarts).
- **Mobile Client**: **Capacitor Android Shell** loading the live-syncing Vercel-deployed application directly with native storage privileges.

---

## Part 1: Database & Storage Setup (Supabase)

Supabase provides a generous free tier including a hosted PostgreSQL database and 1GB of Storage.

### 1. Database Schema Migration
1. Go to [Supabase](https://supabase.com/) and create a new free project.
2. Navigate to the **SQL Editor** tab from the left sidebar.
3. Click **New Query**.
4. Open the pre-configured `/supabase-schema.sql` file in your repository, copy its entire contents, paste it into the editor, and click **Run**.
5. This automatically provisions all required tables, indices, relations, and seeds the default administrator accounts.

### 2. Storage Buckets Creation
The backend is abstracted to use Supabase Storage to store templates, generated documents, and branding assets.
1. In your Supabase dashboard, navigate to the **Storage** tab.
2. Click **New Bucket** to create the following four buckets:
   - `templates` (Set to **Public**)
   - `generated-documents` (Set to **Public**)
   - `logos` (Set to **Public**)
   - `signatures` (Set to **Public**)
3. Make sure to toggle **Public Access** on for all buckets to allow the server to easily stream and link generated assets.

---

## Part 2: Backend Server Deployment (Render)

Render is excellent for hosting Express Node.js apps for free.

### 1. Create a Web Service
1. Log in to [Render](https://render.com/) and link your GitHub repository.
2. Click **New +** > **Web Service**.
3. Select your repository.
4. Configure the service settings:
   - **Name**: `smart-doc-generator-backend`
   - **Language**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**

### 2. Configure Render Environment Variables
Add the following key-value pairs under the **Environment** tab:

| Variable Name | Example/Description |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `SUPABASE_URL` | *Your Supabase project URL (e.g. `https://xxx.supabase.co`)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *Your secret service role API key (found in Project Settings > API)* |
| `FRONTEND_URL` | *Your deployed Vercel frontend URL (e.g. `https://xxx.vercel.app`)* |

*(Note: In Render's Free tier, the server sleeps after 15 minutes of inactivity. The first request after a sleep period may take ~50 seconds to boot).*

### 3. Adding LibreOffice to Render
Render's default Linux environment includes basic utilities, but PDF generation requires LibreOffice (`soffice`).
To enable this on Render for free, use a **Custom Dockerfile** or simply add the Render **Apt Buildpack** to install LibreOffice.
Alternatively, the backend code is designed to catch conversion errors gracefully so that DOCX document downloads remain 100% operational even if LibreOffice is booting.

---

## Part 3: Frontend Web Deployment (Vercel)

Vercel is the premier platform for hosting Vite React applications.

### 1. Deploy the Application
1. Log in to [Vercel](https://vercel.com/) and click **Add New** > **Project**.
2. Select your repository.
3. Configure the build parameters:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   - `VITE_API_URL`: *The URL of your deployed Render Web Service (e.g. `https://smart-doc-generator-backend.onrender.com`)*. Make sure there is **no trailing slash**!
5. Click **Deploy**. Vercel will build and assign you a free `*.vercel.app` domain.

---

## Part 4: Android APK Build (Capacitor)

The mobile setup is configured as a native hybrid shell that loads your live Vercel-deployed application. This guarantees that **any updates you deploy to Vercel are instantly reflected on users' mobile apps** without requiring you to compile or distribute a new APK!

### 1. Prerequisites
- [Node.js](https://nodejs.org/) installed locally.
- [Android Studio](https://developer.android.com/studio) installed locally.

### 2. Configuring the Target URL
Before building the APK, direct Capacitor to load your deployed web application.
1. Open `/capacitor.config.ts` in your local project root.
2. Edit the `server.url` property:
   ```ts
   server: {
     url: "https://your-frontend-app.vercel.app", // Put your live Vercel URL here!
     cleartext: true
   }
   ```

### 3. Build & Sync Assets
Open your local terminal and run:
```bash
# 1. Install local dependencies
npm install

# 2. Build the web assets locally
npm run build

# 3. Synchronize assets with the Android native project
npx cap sync android
```

### 4. Compiling the APK in Android Studio
1. Open the Android project folder in Android Studio:
   ```bash
   npx cap open android
   ```
2. Android Studio will open and initialize Gradle. Wait for the indexing process to complete.
3. To build a debug APK:
   - Click **Build** from the top menu > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - Once compiled, a notification will appear with a link to locate the generated `app-debug.apk` file on your filesystem.
4. To build a signed release APK:
   - Click **Build** > **Generate Signed Bundle / APK...**
   - Choose **APK**, select/create a Keystore file, set your passwords, select **release** build variant, and click **Finish**.

### 5. Managing Permissions
The Android app is pre-configured with the following permissions in `/android/app/src/main/AndroidManifest.xml`:
- `android.permission.INTERNET`: Enables connections to Vercel and Render.
- `android.permission.READ_EXTERNAL_STORAGE` / `android.permission.WRITE_EXTERNAL_STORAGE`: Allows users to download generated documents directly to their device downloads folder.

### 6. App Icon & Splash Screen Generation
To customize the mobile launcher icon and splash screen assets:
1. Place a high-quality icon image (`icon.png` - minimum 1024x1024px) and a splash screen template (`splash.png` - minimum 2732x2732px) into your root directory or inside `/assets`.
2. Run Capacitor's automatic asset generation utility:
   ```bash
   npm install @capacitor/assets --save-dev
   npx capacitor-assets generate --android
   ```
3. This automatically outputs perfectly sized mipmaps and drawables to your `/android/app/src/main/res/` folders.

---

## Part 5: Troubleshooting Guide

### 1. "Access Denied / CORS Error" on Mobile or Web
- **Symptom**: API calls to Render fail with a CORS exception or preflight error.
- **Fix**: Verify that `FRONTEND_URL` in your Render Environment settings exactly matches your Vercel site URL, and does not contain a trailing slash. If problems persist, the pre-configured backend server contains automatic fallbacks allowing Capacitor connections safely.

### 2. "Please wait while your application starts..."
- **Symptom**: Render website displays a loading message indefinitely.
- **Fix**: In the Render Free tier, the container shuts down after inactivity. It takes 40-60 seconds to resume. This is expected. If you need 24/7 instant availability, upgrade the Render instance to "Starter" ($7/month).

### 3. "Document generation works, but PDFs are blank/fail"
- **Symptom**: The DOCX document generates perfectly, but PDF download returns an error.
- **Fix**: The Render Free environment may not include the LibreOffice command-line client. If LibreOffice conversion is essential, deploy the backend on a cheap virtual machine (VPS) like DigitalOcean, Linode, or Hetzner where you have root access to install LibreOffice via `apt install libreoffice`.

### 4. "Missing or Insufficient Permissions" on Supabase Storage
- **Symptom**: Files fail to upload or return an error during document compilation.
- **Fix**: Check that the four buckets (`templates`, `generated-documents`, `logos`, `signatures`) are configured as **Public** in your Supabase dashboard and that you have enabled storage write permissions.
