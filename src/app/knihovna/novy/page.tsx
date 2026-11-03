'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/client/db';
import { photoToDataUrl } from '@/client/photo';
import { saveCustomExercise } from '@/client/repo';
import { BottomNav } from '@/components/BottomNav';
import { Camera } from '@/components/icons';
import { Button, Field, Page, PageTitle, inputCls } from '@/components/ui';
import type { ExerciseType } from '@/domain/types';
import { t } from '@/i18n/t';

export default function NewExercisePage() {
  return <Suspense><NewExercise /></Suspense>;
}

/** Vlastní cvik a vlastní fotka stroje z posilovny (C4). */
function NewExercise() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('id');
  const back = params.get('back');
  const [name, setName] = useState(params.get('name') ?? '');
  const [type, setType] = useState<ExerciseType>('weight_reps');
  const [steps, setSteps] = useState('');
  const [video, setVideo] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!editId) return;
    void db().exercises.get(editId).then((e) => {
      if (!e) return;
      setName(e.name_cs); setType(e.type); setSteps(e.steps_cs.join('\n')); setVideo(e.video_url ?? ''); setPhoto(e.images[0] ?? null);
    });
  }, [editId]);

  const save = async () => {
    if (!name.trim()) return;
    const id = await saveCustomExercise({
      id: editId ?? undefined, name_cs: name.trim(), type,
      steps_cs: steps.split('\n').map((s) => s.trim()).filter(Boolean),
      images: photo ? [photo] : [], video_url: video.trim() || null,
    });
    router.replace(back ? `${back}${back.includes('?') ? '&' : '?'}created=${encodeURIComponent(id)}` : `/knihovna/cvik?id=${encodeURIComponent(id)}`);
  };

  return (
    <Page>
      <PageTitle title={editId ? t('library.upravitCvik') : t('library.novyCvik')} back={back ?? '/knihovna'} />
      <div className="flex flex-col gap-4">
        <Field label={t('library.nazev')}><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
        <Field label={t('library.typ')}>
          <select value={type} onChange={(e) => setType(e.target.value as ExerciseType)} className={inputCls}>
            {(['weight_reps', 'reps', 'time'] as const).map((x) => <option key={x} value={x}>{t(`library.typy.${x}`)}</option>)}
          </select>
        </Field>
        <div>
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={name} className="mb-2 h-48 w-full rounded-2xl object-cover" />
          )}
          <label className="tap flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-linka text-[18px] font-semibold">
            <Camera size={24} />{photo ? t('library.fotkaZmenit') : t('library.fotka')}
            <input type="file" accept="image/*" capture="environment" className="sr-only"
              onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPhoto(await photoToDataUrl(f)); }} />
          </label>
        </div>
        <Field label={t('library.kroky')}><textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={4} className="w-full rounded-2xl border border-linka bg-guma p-3 text-[18px]" /></Field>
        <Field label={t('library.video')}><input type="url" value={video} onChange={(e) => setVideo(e.target.value)} className={inputCls} /></Field>
        <Button big onClick={save} disabled={!name.trim()}>{t('common.ulozit')}</Button>
      </div>
      <BottomNav />
    </Page>
  );
}
