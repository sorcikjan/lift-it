/** Jednotné rozhraní nad Postgresem: PGlite (vývoj, testy) nebo Supabase (produkce). */
export interface Tx {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

export interface Db extends Tx {
  /**
   * Spustí fn v transakci pod rolí `authenticated` s auth.uid() = userId,
   * takže platí RLS. userId = null znamená roli `anon`.
   */
  asUser<T>(userId: string | null, fn: (tx: Tx) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export function claims(userId: string | null) {
  return JSON.stringify(userId ? { sub: userId, role: 'authenticated' } : { role: 'anon' });
}
