# Profiles and accounts

Everyone who opens KAIRO passes through the entry page. There are two
kinds of profile:

| | Guest (always available) | Account (optional, needs Supabase) |
|---|---|---|
| How | A name, an emblem, an experience level and a start language | Google, GitHub, Microsoft, a phone number (code by SMS), or email and password; **Create account** for a new email account |
| Where it lives | This browser (`localStorage`) | Supabase Auth; the app keeps the session in the browser |
| Drafts, badges, streaks | This browser, per profile | This browser, per account id (syncing them to a database is the next milestone) |
| Switching | Profile card → **Switch profile**; the entry page offers to continue recent guests | Profile card → **Sign out** |

Guests need nothing on the server. Account sign-in stays switched off (the
buttons are disabled with an explanation and a "continue as a guest" button)
until the web app is built with a Supabase project's URL and publishable key.

The entry page's sign-in card has three tabs:

* **Guest**: name, emblem, experience and start language; recent guests on
  this browser can be continued with one click.
* **Sign in**: Google, GitHub and Microsoft buttons (OAuth with PKCE); **phone**:
  pick the country code (+91 India first), get a 6-digit code by SMS, enter it;
  **email and password**, with **Forgot password?** (Supabase emails a reset
  link; opening it brings the student back to KAIRO with a "Choose a new
  password" dialog).
* **Create account**: name, email, password and confirmation. When the
  Supabase project asks for email confirmation, the card says to open the
  link in the email first.

After any sign-in (and after a new guest enters), Saarthi jumps out big and
says **"Welcome, <name>!"**, then shrinks back to its corner.

> **Status:** the account flow is written against the official
> `@supabase/supabase-js` client (email/password and sign-up, Google, GitHub
> and Microsoft OAuth with PKCE, phone one-time codes, password reset, session
> restore), type-checked and covered by browser tests of the card itself, but
> it has **not yet been tested against a real Supabase project**. The first
> person to connect one should try each sign-in method once.

## Turning on accounts

1. Create a project at [supabase.com](https://supabase.com) (the free plan is enough).
2. **Authentication → Sign In / Providers**: email is on by default. To add
   Google or GitHub, create an OAuth app with that provider and paste its
   client id and secret; the callback URL to register with the provider is
   shown on the same Supabase page (`https://<project-ref>.supabase.co/auth/v1/callback`).
3. **Authentication → URL Configuration**: set the *Site URL* to where KAIRO
   is opened (for example `http://localhost:5173` for `make web`,
   `http://localhost:8080` for Docker Compose, or your Codespaces or server
   address) and add the other addresses you use under *Redirect URLs*.
4. **Settings → API Keys** (or the **Connect** dialog): copy the project URL
   and the **publishable** key (`sb_publishable_...`). Both are meant to be
   public. The legacy `anon` key also works (set it as
   `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`), but Supabase
   is retiring legacy keys. Never use a secret or `service_role` key in the
   web app.
5. Give them to the web app at build time:
   * `make web` (development): create `apps/web/.env.local` from
     `apps/web/.env.example` and restart `make web`;
   * Docker Compose: set `VITE_SUPABASE_URL` and
     `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`, then
     `docker compose build api && docker compose up -d`.
6. Open the entry page: the Google, GitHub, Microsoft, phone and email options are now active.

Optional providers:

* **Microsoft**: in Supabase it is called *Azure*. Register an app in the
  Microsoft Entra admin center (supported account types: personal and work
  accounts), add Supabase's callback URL as a redirect URI, and paste the
  application (client) id and a client secret into Supabase.
* **Phone**: turn on the *Phone* provider and connect an SMS service that
  Supabase supports (Twilio, MessageBird, Vonage or Textlocal). SMS costs money
  on those services; Supabase also lets you add test numbers with a fixed code
  for development.
* **Password reset**: add KAIRO's address to *Redirect URLs* (step 3) so the
  reset link can return to it.

## What is stored where

* **Supabase** stores the account: email address, the provider's identity
  and the metadata the provider returns (for example the display name).
* **The browser** stores the session token (managed by `supabase-js`), the
  emblem and experience choice per account, drafts, inputs and progress
  (XP, badges, streaks), all under keys starting with `cd.`.
* **The KAIRO API** does not see or need the account yet: runs and
  Saarthi work the same for guests and accounts. Rate limits are per IP
  address until the API checks accounts (planned with persistence).

## Progress: XP, levels, badges, streaks

Only things the platform observed count, never self-reported ones
(`apps/web/src/profile/achievements.ts`, unit-tested):

| Event | XP |
|---|---|
| Any run | 2 |
| A clean run (finished, no errors) | +10 |
| First clean run in a language | +15 |
| A clean run in a language whose previous run failed ("fixed an error") | +10 |
| First clean run of the day | +5 × the day streak (up to 7) |
| An explanation from Saarthi | 5 |
| A Saarthi fix verified by a real run | 20 |
| Opening an example | 3 |

Levels: Initiate, Syntax Scout, Bug Hunter, Builder, Debugger, Optimizer,
Architect, Compiler Whisperer, Systems Master, KAIRO Legend. There are 14
badges (First Build, Bug Squasher, Curious Mind, Input Handler, Explorer, On a
Roll, Polyglot, Verified Fix, Three-Day Uptime, Night Owl, Unstoppable,
Toolchain Master, Week of Code, Century); the profile card lists each with how
to earn it, next to the language matrix (one cell per language, lit after a
clean run in it). A day streak
counts local calendar days with at least one clean run and is broken when a
whole day passes without one.
