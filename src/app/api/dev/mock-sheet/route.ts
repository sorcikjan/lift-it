import { devAuthAllowed, env } from '@/server/env';
import { mockWrites, setMockSheet } from '@/integrations/google-sheets/mock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Jen e2e s mocky: přepíše obsah mock sheetu (test opětovného importu). V produkci 404. */
export async function POST(req: Request) {
  if (!devAuthAllowed() || !env.mockIntegrations) return new Response('not found', { status: 404 });
  const { key, csv } = await req.json();
  setMockSheet(String(key), String(csv));
  return Response.json({ ok: true });
}

/** Jen e2e: co appka zapsala do mock sheetu (A9). */
export async function GET(req: Request) {
  if (!devAuthAllowed() || !env.mockIntegrations) return new Response('not found', { status: 404 });
  const tab = new URL(req.url).searchParams.get('tab') ?? '';
  return Response.json({ cells: mockWrites.get(tab) ?? [] });
}
