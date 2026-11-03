'use client';
import type { Measurement } from '@/domain/types';
import { db } from './db';
import { localUserId, save } from './repo';
import { uuid } from './uuid';

export type MeasurementValues = Pick<Measurement, 'weight_kg' | 'waist_cm' | 'chest_cm' | 'hips_cm' | 'arm_cm' | 'thigh_cm'>;

/** D6: jedno měření na den; další zápis ve stejný den ho přepíše. */
export async function saveMeasurement(measuredOn: string, values: MeasurementValues): Promise<void> {
  const existing = (await db().measurements.where('measured_on').equals(measuredOn).toArray()).find((m) => !m.archived);
  const row: Measurement = { id: existing?.id ?? uuid(), user_id: await localUserId(), measured_on: measuredOn, ...values, archived: false };
  await save('measurements', [row as unknown as { id: string }]);
}

export async function archiveMeasurement(m: Measurement) {
  await save('measurements', [{ ...m, archived: true } as unknown as { id: string }]);
}
