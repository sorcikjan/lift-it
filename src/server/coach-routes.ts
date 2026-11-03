import { CoachError } from './coach';

export function coachErrorResponse(e: unknown) {
  if (e instanceof CoachError) {
    const status = e.code === 'not_client' ? 403 : e.code === 'bad_request' ? 400 : 409;
    return Response.json({ error: e.code }, { status });
  }
  if (String((e as Error)?.message).includes('row-level security')) return Response.json({ error: 'forbidden' }, { status: 403 });
  return Response.json({ error: 'unavailable' }, { status: 500 });
}
