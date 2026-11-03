import { devAuthAllowed, env } from '@/server/env';
import { mockDescriptions, setMockStravaEmpty } from '@/integrations/strava/mock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Jen e2e s mocky: co appka zapsala do popisu aktivit (G4). V produkci 404. */
export async function GET() {
  if (!devAuthAllowed() || !env.mockIntegrations) return new Response('not found', { status: 404 });
  return Response.json({ descriptions: Object.fromEntries(mockDescriptions) });
}

/** Jen e2e: simulace „hodinky ještě nesynchronizovaly“. */
export async function POST(req: Request) {
  if (!devAuthAllowed() || !env.mockIntegrations) return new Response('not found', { status: 404 });
  const { empty } = await req.json();
  setMockStravaEmpty(!!empty);
  return Response.json({ ok: true });
}
