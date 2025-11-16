export function getProgress(step: number, total: number = 9): string {
  const percentage = Math.round((step / total) * 100);
  const filled = '█'.repeat(Math.round(percentage / 10));
  const empty = '░'.repeat(10 - filled.length);
  return `[${filled}${empty}] ${step}/${total} кроків`;
}
