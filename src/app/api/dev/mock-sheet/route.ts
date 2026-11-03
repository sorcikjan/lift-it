import { devAuthAllowed, env } from '@/server/env';
import { setMockSheet } from '@/integrations/google-sheets/mock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Jen e2e s mocky: přepíše obsah mock sheetu (test opětovného importu). V produkci 404. */
export async function POST(req: Request) {
  if (!devAuthAllowed() || !env.mockIntegrations) return new Response('not found', { status: 404 });
  const { key, csv } = await req.json();
  setMockSheet(String(key), String(csv));
  return Response.json({ ok: true });
}
