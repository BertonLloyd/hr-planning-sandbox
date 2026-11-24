// Number formatting utilities
// All numbers follow: right-aligned, thousand separator, tabular-nums

export function formatNumber(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatCurrency(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '-';
  if (Math.abs(n) >= 100000000) {
    return `${(n / 100000000).toFixed(2)} 亿`;
  }
  if (Math.abs(n) >= 10000) {
    return `${(n / 10000).toFixed(1)} 万`;
  }
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '-';
  return `${n.toFixed(digits)}%`;
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
