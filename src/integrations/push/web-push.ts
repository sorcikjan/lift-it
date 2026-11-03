import webpush from 'web-push';
import type { Pusher } from './types';

/** Web push s klíči VAPID (funguje v appce přidané na plochu, iOS 16.4+). */
export function webPusher(keys: { publicKey: string; privateKey: string; subject: string }): Pusher {
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  return {
    async send(sub, payload) {
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 24 * 3600 });
        return true;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) return false;
        throw e;
      }
    },
  };
}
