import type { StravaActivity, StravaClient } from './types';

/**
 * Mock Stravy pro vývoj a e2e (INTEGRATIONS_MOCK=1): k jakémukoli oknu „najde“ silový trénink
 * z hodinek 5 min po začátku okna + 3 h, s tepem a kaloriemi. Popisy si pamatuje, aby je test zkontroloval.
 */
export const mockDescriptions = new Map<number, string>();
let mockEmpty = false;
export function setMockStravaEmpty(v: boolean) { mockEmpty = v; }

function activityFor(after: number): StravaActivity {
  const start = (after + 3 * 3600 - 60) * 1000;
  const id = Math.floor(start / 1000);
  return {
    id, name: 'Silový trénink', sport_type: 'WeightTraining', start_date: new Date(start).toISOString(), elapsed_time: 50 * 60,
    average_heartrate: 118, max_heartrate: 156, calories: 342, description: mockDescriptions.get(id) ?? 'Garmin Forerunner',
  };
}

export function mockStrava(): StravaClient {
  return {
    async listActivities(after) { return mockEmpty ? [] : [activityFor(after)]; },
    async getActivity(id) {
      const a = activityFor(id + 60 - 3 * 3600);
      return { ...a, description: mockDescriptions.get(id) ?? a.description };
    },
    async updateDescription(id, description) { mockDescriptions.set(id, description); },
  };
}
