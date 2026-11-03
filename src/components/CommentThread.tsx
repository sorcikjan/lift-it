'use client';
import { useState } from 'react';
import { addComment, type CommentView } from '@/client/coach';
import { uuid } from '@/client/uuid';
import { shortDate } from '@/domain/dates';
import { t } from '@/i18n/t';

/** E5: komentáře k tréninku nebo ke cviku, obousměrně (trenér ↔ cvičenec). */
export function CommentThread({ clientId, targetType, targetId, match, all, onAdded, label }: {
  clientId: string; targetType: 'session' | 'logged_set' | 'workout'; targetId: string; all: CommentView[]; onAdded: () => void; label?: string;
  /** Komentář ke cviku visí na jeho první sérii; ukáže se i když se pořadí sérií změní. */
  match?: string[];
}) {
  const ids = new Set(match ?? [targetId]);
  const list = all.filter((c) => c.target_type === targetType && ids.has(c.target_id));
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState(false);
  const send = async () => {
    if (!text.trim()) return;
    try {
      await addComment({ id: uuid(), clientId, targetType, targetId, text });
      setText(''); setOpen(false); setError(false); onAdded();
    } catch { setError(true); }
  };
  return (
    <div className="mt-2" data-testid="comments">
      {list.length > 0 && (
        <ul aria-label={t('coach.komentare')} className="flex flex-col gap-1.5">
          {list.map((c) => (
            <li key={c.id} className="rounded-xl bg-guma px-3 py-2 text-[16px]">
              <span className="text-[13px] text-ocel">{c.author_name} · {shortDate(c.created_at)}</span>
              <p className="whitespace-pre-wrap">{c.text}</p>
            </li>
          ))}
        </ul>
      )}
      {open ? (
        <div className="mt-2 flex flex-col gap-2">
          <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={t('coach.komentarPlaceholder')}
            aria-label={label ? `${t('coach.komentar')}: ${label}` : t('coach.komentar')} className="w-full rounded-2xl border border-linka bg-guma p-3 text-[17px]" />
          {error && <p role="alert" className="text-[15px] text-zluta">{t('coach.offline')}</p>}
          <button type="button" onClick={send} className="tap rounded-2xl bg-modra-akce font-display text-[20px] font-bold">{t('coach.odeslat')}</button>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} aria-label={label ? `${t('coach.pridatKomentar')}: ${label}` : t('coach.pridatKomentar')}
          className="tap mt-1 text-[15px] font-semibold text-ocel underline underline-offset-4">{t('coach.pridatKomentar')}</button>
      )}
    </div>
  );
}
