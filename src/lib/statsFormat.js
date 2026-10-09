/**
 * Change versus the previous period, for the KPI cards.
 * @returns {{ kind: 'none'|'new'|'up'|'down'|'same', percent?: number }}
 */
export function compareToPrevious(current, previous) {
  const now = Number(current) || 0;
  const before = Number(previous) || 0;
  if (now === 0 && before === 0) return { kind: 'none' };
  if (before === 0) return { kind: 'new' }; // no baseline, so a percentage would be meaningless
  if (now === before) return { kind: 'same', percent: 0 };
  const percent = Math.round(((now - before) / before) * 100);
  return { kind: percent > 0 ? 'up' : 'down', percent: Math.abs(percent) };
}

export const compareLabel = (cmp) => {
  switch (cmp.kind) {
    case 'new': return 'חדש';
    case 'up': return `▲ ${cmp.percent}%`;
    case 'down': return `▼ ${cmp.percent}%`;
    case 'same': return 'ללא שינוי';
    default: return '';
  }
};
