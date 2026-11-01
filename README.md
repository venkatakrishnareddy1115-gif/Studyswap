# StudyConnect

A responsive student learning platform starter built with React, TypeScript, Vite, Supabase, and a Gemini API study assistant. It is designed to be approachable in VS Code and costs nothing to try locally. With no credentials set, it opens in a local demo mode; demo content lives in that browser's local storage. Connect Supabase to enable verified email sign-in and shared cloud tasks, groups, and notes.

Project overview image: [`public/studyconnect-problem-framing.svg`](public/studyconnect-problem-framing.svg).

## What works in this starter

- Responsive dashboard, task planner, progress summaries, and a short practice quiz.
- Create and browse study groups, with membership records for signed-in users.
- Browse and share note listings, with optional PDF/JPG/PNG uploads (up to 10 MB) stored in a private Supabase Storage bucket. Signed-in students can open uploaded files using short-lived links.
- Peer directory has fictional preview profiles in demo mode. With Supabase connected, students can opt in to list their display name and subjects; email is never listed. Signed-in students can submit a private profile report.
- Email magic-link sign-in through Supabase Auth. When connected, tasks, group listings, and note listings use the Supabase database.
- Optional AI study buddy served through a Supabase Edge Function. The API key is kept on the server, requests require sign-in, and prompt length is capped.
- Demo mode stores changes in the current browser only. It is useful for trying the interface; use Supabase for accounts and shared data.

## Run it in VS Code

1. Install the current Node.js LTS release from [nodejs.org](https://nodejs.org/).
2. Open this folder in VS Code. Select **Terminal → New Terminal**.
3. Install dependencies and start the app:

   ```powershell
   npm install
   npm run dev
   ```

4. Open the local address Vite prints (usually `http://localhost:5173`). Changes you save in VS Code appear in the browser automatically.
5. To build a deployable copy later, run `npm run build`; the files are written to `dist/`.

## Connect email login and shared data

1. Create a free Supabase project at [supabase.com](https://supabase.com/). Keep the project region, database password, and API credentials private.
2. In the project dashboard, open **SQL Editor**, paste all of [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the private `notes` file bucket too. The tables and files have row-level security policies so tasks and uploaded files are protected; group and note listings are available to signed-in students.
3. In **Project Settings → API**, copy the Project URL and publishable key (older projects may call this the `anon` key). Copy [`.env.example`](.env.example) to `.env.local` in the project root and fill in those two values. Never add a `service_role` key to browser code or commit `.env.local`.
4. In **Authentication → URL Configuration**, add `http://localhost:5173` to the allowed redirect URLs. Keep email confirmation enabled.
5. Supabase's built-in mailer has tight testing limits and is not intended for general student sign-ups. Configure a custom SMTP provider in **Authentication → SMTP Settings** before inviting students; check that provider's free-plan limits and email-sending rules. Test sign-up with an address you control.
6. Restart the Vite dev server after changing `.env.local`.

## Turn on the AI study buddy

Gemini's API offers a free tier for eligible models and regions, with quotas that can change. Review [current model access and limits](https://ai.google.dev/gemini-api/docs/rate-limits) and [pricing and data use](https://ai.google.dev/gemini-api/docs/pricing) before enabling it. Free-tier prompts may be used to improve Google's products, so don't send student records, private notes, or personal information to the AI.

1. Create an API key in [Google AI Studio](https://aistudio.google.com/). Do not place it in a `VITE_` variable or in the browser.
2. Install the Supabase CLI by following [Supabase's official CLI guide](https://supabase.com/docs/guides/cli). Sign in and link this local project to your Supabase project from the VS Code terminal.
3. Set the secret on your Supabase project and deploy the function:

   ```powershell
   supabase secrets set GEMINI_API_KEY=your-key-here
   supabase functions deploy study-buddy
   ```

4. Sign in to StudyConnect and open **AI study buddy**. The Edge Function checks for a valid signed-in account and keeps the Gemini key server-side.

## Before real students use it

This is an early, working starter rather than a finished public community platform. Direct messaging, blocking, moderator review tools for reports, quizzes beyond the sample practice set, and account-level data export/deletion are not implemented. Reports are saved privately in the database, but there is no moderator dashboard to review them yet. Add and test those workflows before using the app with real students. Configure a custom email sender and review applicable privacy, child-safety, copyright, and campus requirements for your audience. Use a deployment host only after checking its current free plan and terms. Never publish private API keys.

## Project layout

```text
src/
  App.tsx                 Screens and interactive demo/cloud flows
  main.tsx                React entry point
  styles.css              Responsive design
  lib/supabase.ts         Supabase client and demo-mode detection
supabase/
  schema.sql              Tables, indexes, and row-level security
  functions/study-buddy/  Authenticated Gemini API proxy
.env.example              Browser-safe configuration template
```

Useful references: [Supabase email login](https://supabase.com/docs/guides/auth/auth-email-passwordless), [Supabase Edge Functions](https://supabase.com/docs/guides/functions), [Gemini API models](https://ai.google.dev/gemini-api/docs/models).
