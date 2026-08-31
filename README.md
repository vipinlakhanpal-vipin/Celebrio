# Celebrio

A mobile-first (and desktop-friendly) app that tracks birthdays, anniversaries, and holidays (Diwali, Valentine's Day, Halloween, and more) for your contacts, drafts a greeting message + card 2 days in advance, and waits for your approval before sending it by email and/or WhatsApp/SMS. Includes **Aria**, a built-in AI chat assistant.

Built with Next.js (App Router) + Supabase (auth, database, storage) + Tailwind CSS, ready to deploy on Vercel.

## What's included

- **Auth** — email/password sign-up and sign-in via Supabase Auth.
- **Contacts** — add manually or import a CSV/XLS/XLSX file (auto-detects Name, Date of Birth, Anniversary, Relationship, Email, Phone columns). Relationship is a free-text field with suggestions (Friend, Mother, Colleague, Spouse, ...).
- **Birthdays & anniversaries** — each contact can have both; both feed the same approval pipeline.
- **Occasions & holidays** — a catalog of 12 occasions (Valentine's Day, Mother's/Father's Day, Friendship Day, Halloween, Diwali, Holi, Eid al-Fitr, Eid al-Adha, Thanksgiving, Christmas, New Year). Subscribe to the ones you care about in Settings; 2 days before, you'll get a prompt to pick which contacts to send greetings to.
- **Greeting cards** — generated server-side (SVG → PNG, no external image API, no per-image cost), with a different icon/headline per occasion (cake, heart, diya, pumpkin, moon, gift, tree, ...).
- **Approvals** — every draft greeting sits in the Approvals tab until you approve, edit, reject, or ask **Aria to rewrite** it. Nothing sends without your approval.
- **Sending** — email via [Resend](https://resend.com), WhatsApp/SMS via [Twilio](https://www.twilio.com). Both are optional — the app works without them, it just won't be able to send until configured.
- **Aria** — an AI chat assistant (bottom nav tab on mobile, top tab on desktop) that can answer questions about upcoming dates and help draft/rewrite messages, powered by the Anthropic API.
- **Settings** — light/dark/system theme, a user-selectable accent color, per-channel notification toggles, occasion subscriptions, and your own sign-in/usage history.
- **Admin view** — if your account has `profiles.is_admin = true`, Settings also shows sign-ins and usage across *all* users.
- **Responsive design** — bottom navigation bar on mobile, top tab bar on desktop; every screen is built mobile-first and scales up.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Once it's ready, open **SQL Editor** → New query, paste the entire contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates every table, Row Level Security policy, the `greeting-cards` storage bucket, and seeds the default card templates + occasion catalog.
3. Under **Project Settings → API**, copy the **Project URL**, **anon public key**, and **service_role key** — you'll need all three below.

> **Note on holiday dates:** `occasion_dates` is seeded with 2026 dates. Fixed-date holidays (Valentine's Day, Halloween, Christmas, New Year) are exact and repeat every year. Lunar/variable-date ones (Diwali, Holi, Eid al-Fitr, Eid al-Adha) and "Nth weekday" ones (Mother's/Father's Day, Thanksgiving, Friendship Day) are **best-effort estimates** — double-check them against a reliable calendar, and add next year's rows before the current ones run out (a simple `insert into occasion_dates (...)` — see the seed section of `schema.sql` for the pattern). The app has no way to calculate these automatically.

## 2. Configure environment variables

Copy `.env.example` to `.env.local` for local development, and add the same variables in **Vercel → Project → Settings → Environment Variables** for production.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | From Supabase API settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | From Supabase API settings — **server-only secret**, never exposed to the browser |
| `NEXT_PUBLIC_APP_URL` | Yes | Your deployed URL, used in email links |
| `CRON_SECRET` | Yes | Any long random string — protects the cron endpoints |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Optional | Enables sending greetings + notifications by email |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_FROM` or `TWILIO_SMS_FROM` | Optional | Enables sending greetings by WhatsApp or SMS |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Optional | Powers Aria and personalized ("regenerate") message rewriting; without it, greetings still use the built-in templates |

## 3. Run it locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`, sign up, and you're in.

## 4. Deploy

1. Push this repo to GitHub.
2. In Vercel, **Import Project** from that GitHub repo.
3. Add the environment variables from step 2.
4. Deploy. `vercel.json` already defines the three scheduled jobs Vercel Cron needs:
   - `/api/approvals/generate` — daily, drafts birthday/anniversary greetings 2 days out
   - `/api/occasions/generate` — daily, creates "want to send greetings for X?" prompts 2 days before subscribed holidays
   - `/api/approvals/send` — daily, sends everything you've approved whose date is today

   (Vercel's free Hobby plan allows daily cron schedules; on Hobby, cron jobs run once a day at the specified time in UTC, which is what's configured here.)

## 5. Make yourself an admin (optional)

To see the "Admin — all users" section in Settings (sign-ins and usage across everyone, not just your own account), run this once in the Supabase SQL Editor after you've signed up:

```sql
update public.profiles set is_admin = true where email = 'you@example.com';
```

## How the approval flow works

1. Every day, `/api/approvals/generate` looks for contacts whose birthday or anniversary is exactly 2 days away, drafts a message (template-based by default, or via Aria if `ANTHROPIC_API_KEY` is set) and a card, and creates a `pending` approval. You're notified by email and it shows up in the Approvals tab.
2. For subscribed holidays, `/api/occasions/generate` instead creates a one-time prompt ("Diwali is in 2 days — send greetings?"); from Settings or the Dashboard banner, you pick which contacts to draft greetings for.
3. In Approvals, you can **Approve**, **Edit** the message, **Ask Aria to rewrite** it, or **Reject** it.
4. `/api/approvals/send` runs daily and sends every approved/edited greeting whose date is today, over whichever channels are available (email if the contact has an email address and you've enabled email; WhatsApp/SMS if they have a phone number and you've enabled it).

## Known limitations / things to revisit

- **Timezones**: sends are scheduled for 9am UTC on the occasion date. If your contacts span timezones, you may want to adjust `send_at` logic in `app/api/approvals/generate/route.ts` and `app/api/occasions/prompts/[id]/generate/route.ts`.
- **xlsx package**: the `xlsx` (SheetJS) npm package has a known advisory (prototype pollution / ReDoS) with no patched release on npm; this only matters for maliciously crafted upload files. Upload is capped at 5MB/5000 rows. For extra safety, consider switching to SheetJS's own CDN-hosted patched build (see their docs) before accepting uploads from untrusted users.
- **Holiday dates** need periodic manual verification/updates (see note in step 1).
- **Card templates** are procedurally generated SVG (no external image-generation API/cost). If you'd like AI-generated art per card instead, that's a natural next step — say the word and I'll wire it in.
