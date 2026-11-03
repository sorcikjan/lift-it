/** Rozhraní modulu Strava (G1–G5). Výpadek Stravy rozbije jen párování s hodinkami, nic jiného. */
export interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;          // WeightTraining, Workout, Run…
  start_date: string;          // ISO UTC
  elapsed_time: number;        // s
  average_heartrate?: number | null;
  max_heartrate?: number | null;
  calories?: number | null;
  description?: string | null;
}

export interface StravaClient {
  /** Aktivity v okně (Unix sekundy). Seznam nemá kalorie ani popis, ty má až detail. */
  listActivities(after: number, before: number): Promise<StravaActivity[]>;
  getActivity(id: number): Promise<StravaActivity>;
  updateDescription(id: number, description: string): Promise<void>;
}

export interface StravaToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;          // Unix s
  athlete_id?: number;
  write_description?: boolean; // G4, výchozí zapnuto
}

export class StravaError extends Error {
  constructor(public code: 'not_connected' | 'auth' | 'rate_limited' | 'unavailable', message?: string) { super(message ?? code); }
}
