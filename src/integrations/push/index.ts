import type { Db } from '@/server/db/types';
import { env } from '@/server/env';
import { mockPusher } from './mock';
import { webPusher } from './web-push';
import type { PushPayload, PushSubscriptionRow, Pusher } from './types';

export * from './types';

let pusher: Pusher | null | undefined;
function getPusher(): Pusher | null {
  if (pusher !== undefined) return pusher;
  pusher = env.mockIntegrations ? mockPusher()
    : env.vapidPublic && env.vapidPrivate ? webPusher({ publicKey: env.vapidPublic, privateKey: env.vapidPrivate, subject: env.vapidSubject })
    : null; // bez klíčů VAPID upozornění tiše vypnutá
  return pusher;
}

/**
 * Upozornění všem zařízením uživatele. Odběry čte server mimo RLS (patří jinému uživateli než odesílateli).
 * Chyba upozornění nikdy neshodí akci, která ho vyvolala.
 */
export async function notifyUser(db: Db, userId: string, payload: PushPayload): Promise<number> {
  const p = getPusher();
  if (!p) return 0;
  try {
    const subs = await db.query<PushSubscriptionRow & { id: string }>(`select id, endpoint, keys from push_subscriptions where user_id = $1`, [userId]);
    let sent = 0;
    for (const s of subs) {
      try {
        if (await p.send(s, payload)) sent++;
        else await db.query(`delete from push_subscriptions where id = $1`, [s.id]);
      } catch { /* jedno zařízení nevadí */ }
    }
    return sent;
  } catch {
    return 0;
  }
}
