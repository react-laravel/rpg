export const DIFFICULTY_OPTIONS: { tier: number; label: string }[] = [
  { tier: 0, label: '普通' },
  { tier: 1, label: '困难' },
  { tier: 2, label: '高手' },
  { tier: 3, label: '大师' },
  ...Array.from({ length: 6 }, (_, i) => ({ tier: i + 4, label: `痛苦${i + 1}` })),
]

export const DIFFICULTY_COLORS: Record<number, string> = {
  0: 'bg-green-600',
  1: 'bg-blue-600',
  2: 'bg-yellow-600',
  3: 'bg-orange-600',
  4: 'bg-red-600',
  5: 'bg-rose-700',
  6: 'bg-pink-700',
  7: 'bg-fuchsia-700',
  8: 'bg-purple-800',
  9: 'bg-violet-900',
}

export function getDifficultyLabel(tier?: number | null): string {
  const normalized = tier ?? 0
  return DIFFICULTY_OPTIONS.find(option => option.tier === normalized)?.label ?? '普通'
}
