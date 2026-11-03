'use client';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/client/db';
import { archiveMeasurement, saveMeasurement, type MeasurementValues } from '@/client/measurements';
import { BottomNav } from '@/components/BottomNav';
import { TimeChart } from '@/components/charts/TimeChart';
import { Check } from '@/components/icons';
import { Button, Card, Field, Page, PageTitle, Toast, inputCls } from '@/components/ui';
import { fullDate } from '@/domain/dates';
import { fmtNum, parseCzNumber } from '@/domain/format';
import { t } from '@/i18n/t';

const FIELDS = [
  ['weight_kg', 'hmotnost'], ['waist_cm', 'pas'], ['chest_cm', 'hrudnik'], ['hips_cm', 'boky'], ['arm_cm', 'paze'], ['thigh_cm', 'stehno'],
] as const satisfies readonly (readonly [keyof MeasurementValues, string])[];

const today = () => new Date().toLocaleDateString('sv-SE');

/** D6: tělesná měření (hmotnost, obvody), nepovinné. Seznam slouží i jako tabulkové zobrazení grafu. */
export default function MeasurementsPage() {
  const list = useLiveQuery(async () => (await db().measurements.toArray()).filter((m) => !m.archived).sort((a, b) => (a.measured_on < b.measured_on ? 1 : -1)), []);
  const [date, setDate] = useState(today());
  const [vals, setVals] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const submit = async () => {
    const values = Object.fromEntries(FIELDS.map(([k]) => [k, parseCzNumber(vals[k] ?? '')])) as MeasurementValues;
    if (Object.values(values).every((v) => v == null)) return;
    await saveMeasurement(date, values);
    setVals({});
    setSaved(true);
  };

  const weights = (list ?? []).filter((m) => m.weight_kg != null).map((m) => ({ date: m.measured_on, value: Number(m.weight_kg) })).reverse();

  return (
    <Page>
      <PageTitle title={t('mereni.nadpis')} back="/progres" />
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label={t('mereni.datum')}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
          </div>
          {FIELDS.map(([k, label]) => (
            <Field key={k} label={t(`mereni.${label}`)}>
              <input inputMode="decimal" value={vals[k] ?? ''} onChange={(e) => { setSaved(false); setVals((v) => ({ ...v, [k]: e.target.value })); }} className={inputCls} />
            </Field>
          ))}
        </div>
        <Button className="mt-4 w-full" onClick={submit}><Check size={24} />{t('mereni.pridat')}</Button>
        {saved && <div className="mt-3"><Toast>{t('common.ulozeno')}</Toast></div>}
      </Card>

      {weights.length >= 2 && (
        <section className="mt-5 rounded-[20px] bg-[#1C2024] py-3">
          <h2 className="px-3 text-[17px] font-semibold">{t('mereni.graf')}</h2>
          <TimeChart points={weights} unit={t('common.kg')} label={t('mereni.graf')} />
        </section>
      )}

      <ul aria-label={t('mereni.nadpis')} className="mt-5 flex flex-col">
        {(list ?? []).map((m) => (
          <li key={m.id} className="flex items-start gap-3 border-b border-linka py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-semibold">{fullDate(m.measured_on)}</p>
              <p className="text-[15px] text-ocel tabular">
                {FIELDS.filter(([k]) => m[k] != null).map(([k, label]) => `${t(`mereni.${label}`)} ${fmtNum(Number(m[k]), 1)}`).join(' · ')}
              </p>
            </div>
            <button type="button" onClick={() => archiveMeasurement(m)} className="tap px-2 text-[15px] text-ocel underline underline-offset-4">{t('common.smazat')}</button>
          </li>
        ))}
      </ul>
      <BottomNav />
    </Page>
  );
}
