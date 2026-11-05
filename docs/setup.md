# Nastavení účtů (krok za krokem)

Appka běží lokálně i bez účtů: `pnpm install && pnpm dev` spustí PGlite (Postgres ve WASM) s vývojovým uživatelem.
Pro produkci na telefonu je potřeba založit čtyři věci. Pořadí: Supabase → Google Cloud → Vercel → Strava.
Hodnoty ukládej do Vercelu (Settings → Environment Variables), **nikdy do gitu**. Seznam proměnných je v `.env.example`.

## 1. Supabase (databáze a přihlášení)

1. Na https://supabase.com založ projekt (region Frankfurt, free tier). Heslo k databázi si ulož.
2. **SQL Editor → New query:** postupně vlož a spusť soubory `supabase/migrations/001_schema.sql`, `002_rls.sql`
   a další v pořadí čísel. Soubor `supabase/dev/auth-stub.sql` **nespouštěj**, je jen pro lokální vývoj.
3. **Settings → API:** zkopíruj `Project URL` → `NEXT_PUBLIC_SUPABASE_URL` a `anon public` klíč → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. **Settings → Database → Connection string → Transaction pooler** (port 6543): zkopíruj URI, doplň heslo → `DATABASE_URL`.
5. Naplň knihovnu cviků (jednou, z počítače): `DATABASE_URL='…' pnpm seed:exercises`.
   Adresu produkční databáze drž lokálně jen v `.env.seed.local` (git ho ignoruje a Next.js ho nenačítá),
   **nikdy v `.env.local`**: ten si načte i `pnpm start` a e2e testy by pak mířily na ostrou databázi.
   Použití: `set -a; . ./.env.seed.local; set +a; pnpm seed:exercises`.
6. **Authentication → URL Configuration:** Site URL = adresa z Vercelu (např. `https://lift-it.vercel.app`),
   Redirect URLs přidej `https://lift-it.vercel.app/**` a `http://localhost:3000/**`.
7. **Authentication → Providers → Google:** zapni, vlož Client ID a Secret z kroku 2.6. Zkopíruj odtud *Callback URL*
   (`https://<projekt>.supabase.co/auth/v1/callback`), budeš ji potřebovat v Google Cloud.

## 2. Google Cloud (přihlášení Googlem a čtení sheetu)

1. Na https://console.cloud.google.com založ projekt „Lift It“.
2. **APIs & Services → Library:** zapni **Google Sheets API**.
3. **OAuth consent screen:** typ *External*, název Lift It, tvůj e-mail.
4. **Scopes:** přidej `openid`, `email`, `profile`, `https://www.googleapis.com/auth/spreadsheets.readonly` (čtení tabulek)
   a `https://www.googleapis.com/auth/spreadsheets` (jen pro zápis odcvičených hodnot do trenérova sheetu, A9; appka o něj požádá až při prvním zápisu).
5. **Test users:** přidej svůj Google účet a účet trenéra. Appka zůstane v testovacím režimu, ověření Googlem není potřeba.
6. **Credentials → Create credentials → OAuth client ID → Web application:**
   - Authorized JavaScript origins: `https://lift-it.vercel.app`, `http://localhost:3000`
   - Authorized redirect URIs: Callback URL ze Supabase (krok 1.7)
   - Client ID a Secret vlož do Supabase (krok 1.7) a do Vercelu jako `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

Pozn.: v testovacím režimu Google platnost obnovovacího tokenu omezuje na 7 dní. Když import sheetu ohlásí,
že se máš přihlásit, stačí se v appce znovu přihlásit (trvá pár sekund).

## 3. Vercel (hosting)

1. Na https://vercel.com → *Add New Project* → importuj repozitář `sorcikjan/lift-it`. Framework Next.js se pozná sám.
2. Build command nech výchozí (`pnpm build`), Install command `pnpm install`.
3. **Environment Variables:** vlož všechno z `.env.example` kromě sekce „Jen vývoj a testy“.
   - `NEXT_PUBLIC_APP_URL` = produkční adresa
   - `TOKEN_ENCRYPTION_KEY` = výstup `openssl rand -base64 32`
   - VAPID klíče = výstup `npx web-push generate-vapid-keys`
4. Deploy. Každý push do `main` pak nasadí novou verzi.

## 4. Strava (data z hodinek, fáze 3)

1. Na https://www.strava.com/settings/api vytvoř aplikaci: název Lift It, kategorie Training,
   **Authorization Callback Domain** = `lift-it.vercel.app` (bez https). Appka se vrací na `/api/strava/callback`.
2. `Client ID` → `STRAVA_CLIENT_ID`, `Client Secret` → `STRAVA_CLIENT_SECRET`.
3. V appce: Účet → Propojit Stravu. Každý cvičenec si Stravu propojuje sám.

## Instalace na plochu iPhonu

1. Otevři produkční adresu v **Safari** (ne v Chromu).
2. Ťukni na Sdílet → **Přidat na plochu** → Přidat. Ikona se jmenuje Lift It.
3. Appku spouštěj z plochy. Poprvé ji otevři se signálem, aby se uložila pro offline použití.
4. Displej drží rozsvícený jen v iOS 18.4 a novějším. Stav ukazuje ikonka slunce vpravo nahoře v tréninku.
