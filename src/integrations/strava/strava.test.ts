import { describe, expect, it, vi } from 'vitest';
import { activityDescription } from './describe';
import { matchActivity, searchWindow } from './match';
import { authorizeUrl, exchangeCode, refreshToken, stravaApi } from './api';
import { mockStrava } from './mock';
import type { StravaActivity } from './types';

const act = (id: number, start: string, min: number, sport = 'WeightTraining'): StravaActivity =>
  ({ id, name: 'x', sport_type: sport, start_date: start, elapsed_time: min * 60 });
const session = { started_at: '2026-11-02T17:00:00Z', ended_at: '2026-11-02T18:05:00Z' };

describe('G2: párování podle časového překryvu', () => {
  it('vybere aktivitu s největším překryvem', () => {
    const a = matchActivity(session, [act(1, '2026-11-02T15:00:00Z', 40), act(2, '2026-11-02T16:58:00Z', 62), act(3, '2026-11-02T18:00:00Z', 30)]);
    expect(a?.id).toBe(2);
  });
  it('bez překryvu nic', () => {
    expect(matchActivity(session, [act(1, '2026-11-02T12:00:00Z', 60), act(2, '2026-11-02T19:00:00Z', 30)])).toBeNull();
    expect(matchActivity(session, [])).toBeNull();
  });
  it('tolerance 10 min na rozdílné hodiny', () => {
    expect(matchActivity(session, [act(1, '2026-11-02T18:12:00Z', 20)])?.id).toBe(1);
    expect(matchActivity(session, [act(1, '2026-11-02T18:20:00Z', 20)])).toBeNull();
  });
  it('při stejném překryvu vyhraje silový trénink', () => {
    const a = matchActivity(session, [act(1, '2026-11-02T17:00:00Z', 65, 'Walk'), act(2, '2026-11-02T17:00:00Z', 65, 'WeightTraining')]);
    expect(a?.id).toBe(2);
  });
  it('okno dotazu ±3 h', () => {
    const w = searchWindow(session);
    expect(w.after).toBe(Date.parse('2026-11-02T14:00:00Z') / 1000);
    expect(w.before).toBe(Date.parse('2026-11-02T21:05:00Z') / 1000);
  });
});

describe('G4: popis aktivity', () => {
  const lines = ['Leg press 4 × 10, 45 kg', 'Plank 3 × 30 s'];
  it('původní text zůstane, náš blok se přidá', () => {
    expect(activityDescription('Garmin Forerunner', 'Odcvičeno v Lift It', lines)).toBe('Garmin Forerunner\n\nOdcvičeno v Lift It\nLeg press 4 × 10, 45 kg\nPlank 3 × 30 s');
  });
  it('opakovaný zápis blok nahradí, nezdvojí', () => {
    const once = activityDescription('Garmin Forerunner', 'Odcvičeno v Lift It', lines);
    expect(activityDescription(once, 'Odcvičeno v Lift It', ['Leg press 4 × 10, 50 kg'])).toBe('Garmin Forerunner\n\nOdcvičeno v Lift It\nLeg press 4 × 10, 50 kg');
    expect(activityDescription(null, 'Odcvičeno v Lift It', lines)).toBe('Odcvičeno v Lift It\nLeg press 4 × 10, 45 kg\nPlank 3 × 30 s');
    expect(activityDescription(activityDescription(null, 'Odcvičeno v Lift It', lines), 'Odcvičeno v Lift It', lines)).toBe(activityDescription(null, 'Odcvičeno v Lift It', lines));
  });
});

describe('G1: Strava API a OAuth', () => {
  it('autorizační odkaz s čtením aktivit a zápisem popisu', () => {
    const u = new URL(authorizeUrl('123', 'https://lift-it.vercel.app/api/strava/callback', 'st'));
    expect(u.searchParams.get('scope')).toBe('read,activity:read_all,activity:write');
    expect(u.searchParams.get('state')).toBe('st');
  });
  it('výměna kódu a obnova tokenu', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ access_token: 'a', refresh_token: 'r', expires_at: 999, athlete: { id: 7 } })));
    expect(await exchangeCode('1', 's', 'code', f as unknown as typeof fetch)).toEqual({ access_token: 'a', refresh_token: 'r', expires_at: 999, athlete_id: 7 });
    await refreshToken('1', 's', 'r', f as unknown as typeof fetch);
    expect(String((f.mock.calls[1] as unknown as [string, RequestInit])[1].body)).toContain('grant_type=refresh_token');
  });
  it('neplatný token = auth, limit = rate_limited', async () => {
    await expect(stravaApi('t', (async () => new Response('', { status: 401 })) as unknown as typeof fetch).listActivities(0, 1)).rejects.toMatchObject({ code: 'auth' });
    await expect(stravaApi('t', (async () => new Response('', { status: 429 })) as unknown as typeof fetch).getActivity(1)).rejects.toMatchObject({ code: 'rate_limited' });
  });
  it('zápis popisu přes PUT', async () => {
    const f = vi.fn(async () => new Response('{}'));
    await stravaApi('t', f as unknown as typeof fetch).updateDescription(5, 'ahoj');
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://www.strava.com/api/v3/activities/5');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toEqual({ description: 'ahoj' });
  });
  it('mock najde trénink s tepem a kaloriemi a spáruje se', async () => {
    const m = mockStrava();
    const w = searchWindow(session);
    const found = matchActivity(session, await m.listActivities(w.after, w.before));
    expect(found).not.toBeNull();
    const detail = await m.getActivity(found!.id);
    expect(detail).toMatchObject({ average_heartrate: 118, max_heartrate: 156, calories: 342 });
  });
});
