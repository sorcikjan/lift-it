import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { devAuthAllowed, env } from './env';

/** AES-256-GCM pro tokeny integrací. Klíč je jen na serveru (TOKEN_ENCRYPTION_KEY). */
function key(): Buffer {
  if (env.tokenKey) {
    const k = Buffer.from(env.tokenKey, 'base64');
    if (k.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY musí mít 32 bajtů (base64)');
    return k;
  }
  if (devAuthAllowed()) return createHash('sha256').update('lift-it-dev-only').digest();
  throw new Error('Chybí TOKEN_ENCRYPTION_KEY');
}

export function encrypt(data: unknown): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(data), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.');
}

export function decrypt<T>(s: string): T {
  const [iv, tag, enc] = s.split('.').map((x) => Buffer.from(x, 'base64url'));
  const d = createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return JSON.parse(Buffer.concat([d.update(enc), d.final()]).toString('utf8'));
}
