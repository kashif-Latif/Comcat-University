# Vercel Deployment Guide — COMCAT University

> A complete, step-by-step guide to deploy COMCAT University on Vercel.

---

## Prerequisites

Before deploying, you need:

- [ ] A **GitHub** account — [github.com](https://github.com)
- [ ] A **Vercel** account — [vercel.com](https://vercel.com) (free)
- [ ] An active **Supabase** project with all tables configured
- [ ] The project source code (downloaded archive or Git clone)

---

## Phase 1: Prepare Your Local Project

### Step 1.1 — Extract the Project

If you have the archive file:

```bash
tar xzf comcat-university-project.tar.gz
cd my-project
```

### Step 1.2 — Install Dependencies

```bash
npm install
```

> **Important:** Use `npm`, not `bun`. Vercel uses npm by default.

### Step 1.3 — Verify It Works Locally

```bash
npm run dev
```

Open http://localhost:3000 and confirm:
- [ ] The homepage loads correctly
- [ ] You can navigate between sections
- [ ] The login page appears
- [ ] No errors in the browser console

Then stop the server (`Ctrl+C`).

---

## Phase 2: Push to GitHub

### Step 2.1 — Create a New Repository

1. Go to [github.com/new](https://github.com/new)
2. **Repository name:** `comcat-university`
3. **Description:** `COMCAT University — Official Web Portal & LMS`
4. **Visibility:** Private (recommended) or Public
5. **Do NOT** check "Initialize with README"
6. Click **Create repository**

### Step 2.2 — Push Your Code

```bash
cd my-project

# Initialize Git
git init
git branch -M main

# Stage all files
git add .

# Commit
git commit -m "Initial commit — COMCAT University Portal"

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/comcat-university.git

# Push to GitHub
git push -u origin main
```

### Step 2.3 — Verify on GitHub

Go to your repository page on GitHub. You should see all the project files.

---

## Phase 3: Deploy to Vercel

### Step 3.1 — Import the Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Sign in with your **GitHub** account
3. Under **"Import Git Repository"**, find `comcat-university`
4. Click **Import**

### Step 3.2 — Configure Project Settings

| Setting | Value |
|---|---|
| **Project Name** | `comcat-university` (or any name you prefer) |
| **Framework Preset** | Next.js (auto-detected) |
| **Root Directory** | `.` (leave default) |
| **Build Command** | `npm run build` |
| **Output Directory** | Leave blank |
| **Install Command** | `npm install` |
| **Node.js Version** | 18.x (or higher) |

### Step 3.3 — Add Environment Variables

Before clicking **Deploy**, expand the **"Environment Variables"** section and add these 5 variables:

#### Variable 1: NEXT_PUBLIC_SUPABASE_URL
```
Name:  NEXT_PUBLIC_SUPABASE_URL
Value: https://vednmmjioipjimlsjdmz.supabase.co
```

#### Variable 2: NEXT_PUBLIC_SUPABASE_ANON_KEY
```
Name:  NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: sb_publishable_ZOLcYGovWZaBaWEUe3R5qg_9vZxlCcS
```

#### Variable 3: SUPABASE_SERVICE_KEY
```
Name:  SUPABASE_SERVICE_KEY
Value: sb_secret_eKtc57sWm7QDDCA6v1xtRA_rKe6e6qv
```

#### Variable 4: NEXTAUTH_SECRET
```
Name:  NEXTAUTH_SECRET
Value: 9f3c8a7e6b2d4f1a8c9e0d7b6a5f4e3c2b1a0d9e8f7c6b5a4d3e2f1c0b9a8e7
```

#### Variable 5: NEXTAUTH_URL
```
Name:  NEXTAUTH_URL
Value: http://localhost:3000
```
> We'll update this after the first deployment (see Step 3.6).

For each variable:
1. Enter the **Name**
2. Enter the **Value**
3. Select **Production**, **Preview**, and **Development** environments
4. Click **Add**

### Step 3.4 — Deploy

Click the **Deploy** button.

Vercel will now:
1. Install all npm dependencies
2. Build the Next.js application
3. Deploy to its global CDN

This takes about **2-3 minutes**.

### Step 3.5 — Verify First Deployment

Once complete, Vercel shows a success page with your URL:

```
https://comcat-university-abc123.vercel.app
```

Click the link to visit your live site. Verify:
- [ ] Homepage loads
- [ ] Navigation works
- [ ] Contact form can be submitted
- [ ] Admission form can be submitted

> **Note:** Login will NOT work yet — we need to update `NEXTAUTH_URL` first.

### Step 3.6 — Update NEXTAUTH_URL (Critical!)

NextAuth requires the exact URL to issue secure cookies. After first deployment:

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click your **comcat-university** project
3. Go to **Settings** tab
4. Click **Environment Variables** in the left sidebar
5. Find `NEXTAUTH_URL` in the list
6. Click the **pencil icon** to edit
7. Change the value from `http://localhost:3000` to your actual Vercel URL:
   ```
   https://comcat-university-abc123.vercel.app
   ```
   > Make sure to include `https://` — no trailing slash.
8. Click **Save**
9. Select all environments (Production, Preview, Development)

### Step 3.7 — Redeploy

After updating `NEXTAUTH_URL`, you must redeploy:

1. Go to the **Deployments** tab
2. Find the latest deployment (top of the list)
3. Click the **three dots (⋯)** menu on the right
4. Click **Redeploy**
5. Confirm by clicking **Redeploy** again

Wait for the deployment to complete.

### Step 3.8 — Final Verification

Visit your live URL and test everything:

- [ ] Homepage loads with all sections
- [ ] About, Programs, News, History pages work
- [ ] Contact form submits (check Supabase for data)
- [ ] Admission form submits (check Supabase for data)
- [ ] **Login works** with all three demo accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@comcat.edu.pk` | `Admin@123456` |
| Teacher | `prof.qasim@comcat.edu.pk` | `Teacher@123456` |
| Student | `hassan.ali@student.comcat.edu.pk` | `Student@123456` |

- [ ] Admin dashboard loads with statistics
- [ ] Teacher dashboard shows assigned subjects
- [ ] Student dashboard shows enrolled subjects
- [ ] AI chatbot responds

---

## Phase 4: Custom Domain (Optional)

### Step 4.1 — Add Domain

1. Go to your Vercel project → **Settings** → **Domains**
2. Enter your domain (e.g., `comcat.edu.pk`)
3. Click **Add**

### Step 4.2 — Configure DNS

Add these DNS records at your domain registrar:

| Type | Name | Value |
|---|---|---|
| `A` | `@` | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

### Step 4.3 — Update NEXTAUTH_URL

After DNS propagates (can take up to 48 hours):

1. Update `NEXTAUTH_URL` to `https://your-domain.com`
2. Redeploy

---

## Phase 5: Ongoing Maintenance

### Automatic Deployments

Every time you push to the `main` branch on GitHub, Vercel automatically:
1. Builds the latest code
2. Deploys to production

No manual steps needed — just `git push`!

### Checking Build Logs

If a deployment fails:
1. Go to Vercel → **Deployments** tab
2. Click the failed deployment
3. Read the **Build Logs** to find the error

### Checking Runtime Logs

For production errors:
1. Go to Vercel → **Logs** tab
2. Select **Runtime Logs**
3. Filter by route or status code

---

## Troubleshooting

### Build Fails

| Error | Solution |
|---|---|
| `npm ERR! code ELIFECYCLE` | Check the build log for the specific error |
| `Module not found` | Run `npm install` locally and push the updated `package-lock.json` |
| `TypeScript error` | The project has `ignoreBuildErrors: true` — if you see TS errors, check `next.config.ts` |

### Login Doesn't Work

| Symptom | Solution |
|---|---|
| Login button does nothing | Check browser console for errors |
| "CSRF token" error | `NEXTAUTH_URL` doesn't match your actual URL |
| Session not persisting | `NEXTAUTH_SECRET` is missing or changed |
| 401 on API calls | User session expired — log in again |

> **Most common cause:** Forgetting to update `NEXTAUTH_URL` after deployment or changing it incorrectly.

### API / Database Errors

| Error | Solution |
|---|---|
| `500` on API calls | Check Supabase credentials in env vars |
| `401 Unauthorized` | `SUPABASE_SERVICE_KEY` is wrong or missing |
| "permission denied" | RLS is enabled — disable it in Supabase SQL Editor |
| Connection refused | Supabase project is paused (free plans pause after 7 days of inactivity) — unpause at [supabase.com/dashboard](https://supabase.com/dashboard) |

### Blank Page / White Screen

| Cause | Solution |
|---|---|
| Missing `NEXT_PUBLIC_*` vars | Variables must start with `NEXT_PUBLIC_` to be available in the browser |
| JavaScript error | Check browser console (F12 → Console tab) |
| Build didn't complete | Check Vercel build logs |

---

## Environment Variables Reference

| Variable | Example Value | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vednmmjioipjimlsjdmz.supabase.co` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_xxxxx` | Yes |
| `SUPABASE_SERVICE_KEY` | `sb_secret_xxxxx` | Yes |
| `NEXTAUTH_SECRET` | `9f3c8a7e6b2d4f1a...` | Yes |
| `NEXTAUTH_URL` | `https://comcat-university.vercel.app` | Yes |

---

## Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Repository imported on Vercel
- [ ] All 5 environment variables added
- [ ] First deployment successful
- [ ] `NEXTAUTH_URL` updated to production URL
- [ ] Second deployment (redeploy) completed
- [ ] Homepage loads on production URL
- [ ] Login works for all 3 roles
- [ ] Contact form submits successfully
- [ ] Admissions form submits successfully
- [ ] Admin dashboard functional
- [ ] Teacher dashboard functional
- [ ] Student dashboard functional
- [ ] AI chatbot responds
- [ ] Custom domain configured (optional)

---

*Last updated: April 2026*
