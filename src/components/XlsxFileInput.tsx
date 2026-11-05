'use client';
import { useState } from 'react';
import { filesToRows } from '@/domain/plan/xlsx-import';
import { Card } from './ui';
import { t } from '@/i18n/t';

/** Import z přílohy: trenér posílá každý trénink jako soubor XLSX. Víc souborů = víc tréninků týdne. */
export function XlsxFileInput({ onRows }: { onRows: (rows: string[][]) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const read = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true); setError(null);
    try {
      const files = await Promise.all([...list].map(async (f) => ({ name: f.name, data: await f.arrayBuffer() })));
      files.sort((a, b) => a.name.localeCompare(b.name, 'cs', { numeric: true }));
      onRows(await filesToRows(files));
    } catch {
      setError(t('import.chybaSoubor'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <h2 className="font-display text-[24px] font-bold">{t('import.soubor')}</h2>
      <p className="mt-1 text-[15px] text-ocel">{t('import.souborNavod')}</p>
      <label className={`tap mt-3 flex w-full cursor-pointer items-center justify-center rounded-2xl bg-modra-akce px-4 text-[17px] font-semibold ${busy ? 'opacity-50' : ''}`}>
        {t('import.vybratSoubor')}
        <input type="file" multiple disabled={busy} aria-label={t('import.vybratSoubor')} className="sr-only"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => { void read(e.target.files); e.target.value = ''; }} />
      </label>
      {error && <p role="alert" className="mt-3 text-[15px] text-zluta">{error}</p>}
    </Card>
  );
}
