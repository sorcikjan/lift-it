'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { parseDelimited } from '@/domain/plan/csv';
import { guessMapping, parseSheet, type Field, type SheetMapping } from '@/domain/plan/parse-sheet';
import { matchExercise, type MatchIndex } from '@/domain/plan/match';
import { fmtKg } from '@/domain/format';
import { db } from '@/client/db';
import { exerciseName } from '@/client/library';
import { loadMatchIndex, resolveAll } from '@/client/importer';
import { mondayOf, reimportWeek, saveAlias, saveWeek } from '@/client/repo';
import { SheetLinkInput } from '@/components/SheetLinkInput';
import { BottomNav } from '@/components/BottomNav';
import { ExercisePicker } from '@/components/ExercisePicker';
import { Check } from '@/components/icons';
import { Button, Card, Field as FormField, Page, PageTitle, Toast, inputCls } from '@/components/ui';
import { t } from '@/i18n/t';

const FIELDS: Field[] = ['exercise', 'sets', 'reps', 'weight', 'rest', 'note', 'workout', 'blok', 'ignore'];

export default function ImportPage() {
  return <Suspense><Import /></Suspense>;
}

interface Source { rows: string[][]; kind: 'paste' | 'sheet'; sheetUrl?: string; sheetTab?: string | null; spreadsheetId?: string }

/** Import týdne (A1–A5, A7): vložit odkaz nebo tabulku → mapování → náhled → uložit. */
function Import() {
  const router = useRouter();
  const params = useSearchParams();
  const history = params.get('historie') === '1';
  const [paste, setPaste] = useState('');
  const [source, setSource] = useState<Source | null>(null);
  const [mapping, setMapping] = useState<SheetMapping | null>(null);
  const [showMapping, setShowMapping] = useState(false);
  const [index, setIndex] = useState<MatchIndex | null>(null);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [picking, setPicking] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(mondayOf());
  const [done, setDone] = useState<string | null>(null);
  const created = params.get('created');

  useEffect(() => { void loadMatchIndex().then(setIndex); }, []);
  const exercises = useLiveQuery(() => db().exercises.toArray(), []);
  const exById = useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e])), [exercises]);

  // Návrat ze založení vlastního cviku
  useEffect(() => {
    const key = sessionStorage.getItem('import:picking');
    const saved = sessionStorage.getItem('import:state');
    if (created && key && saved) {
      const st = JSON.parse(saved);
      setSource(st.source); setMapping(st.mapping); setPicks({ ...st.picks, [key]: created }); setWeekStart(st.weekStart);
      sessionStorage.removeItem('import:picking');
      void loadMatchIndex().then(setIndex);
    }
  }, [created]);

  const draft = useMemo(() => (source && mapping ? parseSheet(source.rows, mapping) : null), [source, mapping]);

  const load = (rows: string[][], extra: Omit<Source, 'rows'>, savedMapping?: SheetMapping | null) => {
    setSource({ rows, ...extra });
    setMapping(savedMapping ?? guessMapping(rows));
    setShowMapping(!savedMapping && guessMapping(rows).headerRow == null);
    setPicks({});
  };

  const pick = async (key: string, sourceName: string, exerciseId: string) => {
    setPicks((p) => ({ ...p, [key]: exerciseId }));
    setPicking(null);
    await saveAlias(sourceName, exerciseId); // A3: potvrzení se uloží jako alias
    setIndex(await loadMatchIndex());
  };

  const save = async () => {
    if (!draft || !index || !source) return;
    const resolved = resolveAll(draft.workouts, index, picks);
    if (!resolved) return;
    if (source.spreadsheetId && mapping) await saveMappingFor(source.spreadsheetId, mapping);
    if (history) {
      const { saveBaselineWeek } = await import('@/client/baseline');
      await saveBaselineWeek(resolved, weekStart, source.rows);
      setDone(t('common.hotovo'));
      return;
    }
    if (source.kind === 'sheet' && source.sheetUrl) {
      const n = await reimportWeek(source.sheetUrl, source.sheetTab ?? null, resolved, source.rows);
      if (n != null) { setDone(t('import.aktualizovano', { n })); return; }
    }
    await saveWeek({ workouts: resolved, weekStart, source: source.kind === 'sheet' ? 'sheet' : 'paste', sheetUrl: source.sheetUrl, sheetTab: source.sheetTab, raw: source.rows });
    setDone(t('import.ulozeno'));
  };

  if (done) {
    return (
      <Page>
        <PageTitle title={history ? t('import.historie') : t('import.nadpis')} back="/" />
        <Toast><span className="flex items-center gap-2"><Check size={20} />{done}</span></Toast>
        <div className="mt-auto pt-6"><Button big onClick={() => router.push('/')}>{t('home.zacit')}</Button></div>
        <BottomNav />
      </Page>
    );
  }

  const allResolved = !!(draft && index && resolveAll(draft.workouts, index, picks));
  return (
    <Page>
      <PageTitle title={history ? t('import.historie') : t('import.nadpis')} back="/" sub={history ? t('import.historieText') : undefined} />

      {!source && (
        <div className="flex flex-col gap-5">
          <SheetLinkInput onRows={(rows, meta) => load(rows, { kind: 'sheet', ...meta }, meta.mapping)} />
          <Card>
            <h2 className="font-display text-[24px] font-bold">{t('import.vlozit')}</h2>
            <p className="mt-1 text-[15px] text-ocel">{t('import.vlozitNavod')}</p>
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={6} aria-label={t('import.vlozit')} placeholder={t('import.vlozitPlaceholder')}
              className="mt-3 w-full rounded-2xl border border-linka bg-guma p-3 font-mono text-[14px]" />
            <Button className="mt-3 w-full" disabled={!paste.trim()} onClick={() => load(parseDelimited(paste), { kind: 'paste' })}>{t('import.zpracovat')}</Button>
          </Card>
          {!history && <a href="/plan?novy=1" className="tap flex items-center justify-center rounded-2xl border border-linka text-[17px] text-ocel">{t('import.rucne')}</a>}
        </div>
      )}

      {source && mapping && (
        <section className="mb-4">
          <button type="button" onClick={() => setShowMapping((s) => !s)} aria-expanded={showMapping} className="tap w-full rounded-2xl bg-grafit px-4 text-left text-[17px] font-semibold">
            {t('import.mapovani')}
          </button>
          {showMapping && (
            <div className="mt-2 flex flex-col gap-2">
              <p className="text-[14px] text-ocel">{t('import.mapovaniText')}</p>
              {Array.from({ length: Math.max(...source.rows.map((r) => r.length)) }, (_, c) => (
                <label key={c} className="flex items-center gap-2">
                  <span className="w-28 flex-none truncate text-[15px] text-ocel">{source.rows[mapping.headerRow ?? 0]?.[c] || t('import.sloupec', { n: c + 1 })}</span>
                  <select value={mapping.columns[c] ?? 'ignore'} onChange={(e) => setMapping({ ...mapping, columns: { ...mapping.columns, [c]: e.target.value as Field } })} className={inputCls}>
                    {FIELDS.map((f) => <option key={f} value={f}>{t(`import.pole.${f}`)}</option>)}
                  </select>
                </label>
              ))}
            </div>
          )}
        </section>
      )}

      {draft && index && (
        <>
          <h2 className="font-display text-[26px] font-bold">{t('import.nahled')}</h2>
          <p className="mb-3 text-[15px] text-ocel">{t('import.nahledText')}</p>
          {!draft.workouts.length && <p className="text-zluta">{t('import.zadnyTrenink')}</p>}
          {draft.workouts.map((w, wi) => (
            <section key={wi} className="mb-4" aria-label={t('import.trenink', { label: w.label })}>
              <h3 className="font-display text-[24px] font-bold">{t('import.trenink', { label: w.label })} {w.title && <span className="text-[17px] font-semibold text-ocel">{w.title}</span>}</h3>
              <ul className="mt-1 flex flex-col gap-2">
                {w.exercises.map((e, ei) => {
                  const key = `${wi}:${ei}`;
                  const m = matchExercise(index, e.sourceName);
                  const id = picks[key] ?? m.exerciseId;
                  const ex = id ? exById.get(id) : undefined;
                  return (
                    <li key={key} data-testid="preview-row" className={`rounded-[18px] p-3 ${!id || e.issues.length ? 'bg-zluta/15 ring-2 ring-zluta' : 'bg-grafit'}`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="min-w-0 truncate text-[18px] font-semibold">{ex ? exerciseName(ex) : e.sourceName}</p>
                        <span className="flex-none text-[13px] text-ocel">{t(`blok.${e.blok ?? 'hlavni'}`)}{e.group ? ` · ${t('run.superserie', { group: e.group })}` : ''}</span>
                      </div>
                      {ex && normalizeEq(exerciseName(ex), e.sourceName) === false && <p className="text-[14px] text-ocel">„{e.sourceName}“</p>}
                      <p className="font-display text-[19px] font-semibold tabular">{e.sets.length} × {e.sets[0].timeS != null ? `${e.sets[0].timeS} s` : e.sets[0].toFailure ? t('common.max') : e.sets[0].repsMin !== e.sets[0].repsMax ? `${e.sets[0].repsMin}–${e.sets[0].repsMax}` : e.sets[0].repsMax ?? '?'}
                        {e.sets.some((s) => s.weightKg) ? ` · ${[...new Set(e.sets.map((s) => s.weightKg).filter((x) => x != null))].map((x) => fmtKg(x!)).join('/')} kg` : ''}</p>
                      {e.issues.map((iss, k) => <p key={k} className="text-[15px] text-zluta">{t('import.nejasne', { raw: iss.raw })}</p>)}
                      {!id && (
                        <div className="mt-2 flex flex-col gap-2">
                          <p className="text-[15px] font-semibold text-zluta">{t('import.neznamy')}</p>
                          {m.suggestions.map((s) => (
                            <button key={s.exerciseId} type="button" onClick={() => pick(key, e.sourceName, s.exerciseId)}
                              className="tap rounded-2xl bg-modra-akce px-4 text-left text-[17px] font-semibold">{t('import.navrh', { name: exerciseName(exById.get(s.exerciseId)) })}</button>
                          ))}
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setPicking(picking === key ? null : key)} className="tap flex-1 rounded-2xl border border-linka text-[15px]">{t('import.vybratJiny')}</button>
                            <button type="button" onClick={() => {
                              sessionStorage.setItem('import:picking', key);
                              sessionStorage.setItem('import:state', JSON.stringify({ source, mapping, picks, weekStart }));
                              router.push(`/knihovna/novy?name=${encodeURIComponent(e.sourceName)}&back=${encodeURIComponent('/import' + (history ? '?historie=1' : ''))}`);
                            }} className="tap flex-1 rounded-2xl border border-linka text-[15px]">{t('import.vytvoritVlastni')}</button>
                          </div>
                        </div>
                      )}
                      {picking === key && <ExercisePicker initial={e.sourceName} onPick={(pid) => pick(key, e.sourceName, pid)} />}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <FormField label={history ? t('import.historieDatum') : t('import.tydenOd')}>
            <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className={inputCls} />
          </FormField>
          <Button big className="mt-4" disabled={!allResolved || !draft.workouts.length} onClick={save}>
            <Check size={28} />{history ? t('import.historieUlozit') : t('import.ulozitTyden')}
          </Button>
        </>
      )}
      <BottomNav />
    </Page>
  );
}

function normalizeEq(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

async function saveMappingFor(spreadsheetId: string, mapping: SheetMapping) {
  const { saveImportMapping } = await import('@/client/sheets');
  await saveImportMapping(spreadsheetId, mapping);
}
