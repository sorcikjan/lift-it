import { devAuthAllowed, env } from '@/server/env';
import { sentPushes } from '@/integrations/push/mock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Jen e2e s mocky: odeslaná upozornění. V produkci 404. */
export async function GET() {
  if (!devAuthAllowed() || !env.mockIntegrations) return new Response('not found', { status: 404 });
  return Response.json({ sent: sentPushes });
}
