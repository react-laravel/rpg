const ACT_NAMES: Record<number, string> = {
  1: '大地边境',
  2: '青藤秘境',
  3: '沧澜水境',
  4: '烈阳火域',
  5: '鎏金古国',
  6: '天空群岛',
  7: '雷霆天域',
  8: '七曜终境',
}

export function getActName(actNum: number): string {
  return ACT_NAMES[actNum] ?? `第${actNum}幕`
}
