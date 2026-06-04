# COMCAT University - Local Setup Guide

## Prerequisites
- **Node.js** (v18+) or **Bun** runtime
- Your Supabase project must be running with the required tables

## Step 1: Extract
```bash
tar xzf comcat-university-project.tar.gz
cd my-project
```

## Step 2: Install Dependencies
```bash
bun install
# OR if using npm:
npm install
```

## Step 3: Environment Variables
The `.env` file is already included with your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public/anon key
- `SUPABASE_SERVICE_KEY` - Supabase service key
- `NEXTAUTH_SECRET` - NextAuth secret key
- `NEXTAUTH_URL` - Set to `http://localhost:3000` for local

## Step 4: Run the Project
```bash
bun run dev
```
Open **http://localhost:3000** in your browser.

## Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@comcat.edu.pk | Admin@123456 |
| **Teacher** | prof.qasim@comcat.edu.pk | Teacher@123456 |
| **Student** | hassan.ali@student.comcat.edu.pk | Student@123456 |

## Supabase Tables Required
Your Supabase project should have these tables:
- `users`, `admissions`, `contact_messages`, `subjects`, `teachers`
- `announcements`, `enrollments`, `fees`, `attendance_records`

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: Supabase (REST API)
- **Auth**: NextAuth.js v4
- **AI**: z-ai-web-dev-sdk (chatbot)

## Port
Default: **3000** (can be changed via `PORT` env var)
