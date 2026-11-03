/**
 * G4: odcvičené série do popisu aktivity. Původní text (třeba z Garminu) zůstane,
 * náš blok začíná nadpisem a při opakovaném zápisu se nahradí, nezdvojí.
 */
export function activityDescription(existing: string | null | undefined, heading: string, lines: string[]): string {
  const base = (existing ?? '').split(`\n\n${heading}\n`)[0].split(`${heading}\n`)[0].trimEnd();
  const block = `${heading}\n${lines.join('\n')}`;
  return base ? `${base}\n\n${block}` : block;
}
