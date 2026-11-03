/** Serverová konfigurace. Bez klíčů běží appka lokálně proti PGlite s vývojovým uživatelem. */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET ?? '',
  databaseUrl: process.env.DATABASE_URL ?? '',
  dbMode: process.env.LIFTIT_DB ?? '.data/pglite', // „memory“ pro testy
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  tokenKey: process.env.TOKEN_ENCRYPTION_KEY ?? '',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  stravaClientId: process.env.STRAVA_CLIENT_ID ?? '',
  stravaClientSecret: process.env.STRAVA_CLIENT_SECRET ?? '',
  vapidPublic: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
  vapidPrivate: process.env.VAPID_PRIVATE_KEY ?? '',
  vapidSubject: process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
  mockIntegrations: process.env.INTEGRATIONS_MOCK === '1',
};

export const supabaseConfigured = () => !!(env.supabaseUrl && env.supabaseAnonKey);

/** Vývojové přihlášení: jen bez Supabase a nikdy v produkci, pokud ho výslovně nezapneme (e2e). */
export const devAuthAllowed = () =>
  !supabaseConfigured() && (process.env.NODE_ENV !== 'production' || process.env.LIFTIT_DEV_AUTH === '1');
