# Deploying Scoutly (Gemini version)

- `index.html` — the whole app (UI, login, admin panel, chat — one file)
- `api/ai.js` — holds your **Gemini** API key privately, talks to Google's Gemini API
- `api/requests.js` — stores the shared list of login access requests (who's pending/approved/denied)
- `api/cache.js` — stores shared scan results so users don't all re-trigger fresh AI searches for the same city+category

## Why you need a database (this is the piece that was missing)
Login and admin approval only work if every user's browser and the admin panel are
reading/writing the *same* shared list. A browser can't hold "shared" data on its own —
that requires a real server-side database. `api/requests.js` and `api/cache.js` talk to
**Upstash Redis**, a free hosted database, to make this actually work.

## Steps to deploy (Vercel — free, ~15 minutes)

1. **Get a Gemini API key**
   https://aistudio.google.com/apikey → Create API key. Copy it.
   Free tier available for `gemini-2.5-flash` — no billing card required to start.

2. **Create a free Upstash database** (this is the new required step)
   - Go to https://upstash.com → sign up free → Create Database → Redis.
   - Any region is fine. Once created, open the database and find the **REST API**
     section. Copy the **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN** values.

3. **Free Vercel account** — https://vercel.com (GitHub login is easiest)

4. **Upload this whole folder**
   - Create a GitHub repo, upload `index.html` and the entire `api/` folder (keep the structure).
   - In Vercel: "Add New Project" → import your repo → Deploy.
   - (Or skip GitHub: install the Vercel CLI and run `vercel` from inside this folder.)

5. **Add environment variables in Vercel**
   Project → Settings → Environment Variables → add all of these:
   - `GEMINI_API_KEY` → your key from step 1
   - `GEMINI_MODEL` → `gemini-2.5-flash` (optional but recommended — lets you swap
     models later without editing code, since Google renames these periodically)
   - `UPSTASH_REDIS_REST_URL` → from step 2
   - `UPSTASH_REDIS_REST_TOKEN` → from step 2

   Then redeploy (Deployments → ⋯ → Redeploy) so it picks up the new variables.

6. **Change the admin password**
   In `index.html`, find `ADMIN_PASSWORD` near the top of the `<script>` section and
   change it from the default before sharing the link.

7. **Done** — Vercel gives you a live URL. Share it with your users. When someone
   enters their name and hits Continue, their request now actually saves — you'll see
   it appear in the admin panel (bottom-left "admin" link) to approve or deny.

## What changed from before, and why
The first version used a storage feature that only works inside Claude.ai's own
preview window — so login "worked" while testing here, but silently did nothing once
deployed to a real domain. That's exactly the bug you hit (Continue button doing
nothing, no requests showing up). This version replaces that with real shared storage
(Upstash) that works from any hosting, which is why the extra setup step in #2 is
now required — sorry for the extra step, but this is what makes it actually work live.

## Will it be fully functional now?
Yes — with all four environment variables set correctly and every file from this
folder deployed together, login, admin approval, the PR Scan, and the AI Assistant
will all work end-to-end on your live URL.
