/* ─────────────────────────────────────────────
 *  Report View-Model Service
 *  Pure calculation helpers extracted from the
 *  reports page to eliminate duplication.
 * ───────────────────────────────────────────── */

/**
 * Calculates the percentage share of a value relative to a total.
 * Returns 0 when the total is zero to avoid division by zero.
 */
export function calculateSharePercent(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

/**
 * Returns the maximum value from chart data, with a minimum floor of 1
 * so that bar widths are always computable.
 */
export function getChartMaxValue(data: { value: number }[]): number {
  return Math.max(...data.map((d) => d.value), 1);
}

/**
 * Calculates the width percentage for a chart bar.
 * Ensures a minimum visible width of 4 % when the value is non-zero,
 * so small values are still visible in the bar chart.
 */
export function calculateChartBarWidth(value: number, maxValue: number): number {
  return Math.max((value / maxValue) * 100, value > 0 ? 4 : 0);
}
