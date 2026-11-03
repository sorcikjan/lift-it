import type { PushPayload, Pusher } from './types';

/** Mock pro vývoj a e2e: upozornění se jen zapíšou, test je přečte přes /api/dev/push. */
export const sentPushes: { endpoint: string; payload: PushPayload }[] = [];
export function mockPusher(): Pusher {
  return { async send(sub, payload) { sentPushes.push({ endpoint: sub.endpoint, payload }); return !sub.endpoint.includes('gone'); } };
}
