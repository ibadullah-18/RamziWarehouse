import type { PriceRule } from './customer-account-types';

export type PricedItem = { productCode: string; quantity: number; isShowcase: boolean };

/** Same rule as the server: the longest matching code prefix gives the price. */
export function priceFor(productCode: string, rules: PriceRule[]): number | null {
  const code = productCode.trim();
  const match = rules
    .filter((rule) => rule.codePrefix && code.startsWith(rule.codePrefix))
    .sort((a, b) => b.codePrefix.length - a.codePrefix.length)[0];
  return match ? match.price : null;
}

/** Wallpaper lines priced by quantity; showcase (vitrin) lines are never charged. */
export function priceReturn(items: PricedItem[], rules: PriceRule[]) {
  const lines = items
    .filter((item) => !item.isShowcase)
    .map((item) => {
      const unit = priceFor(item.productCode, rules);
      return { ...item, unit, total: unit === null ? 0 : Math.round(unit * item.quantity * 100) / 100 };
    });
  return {
    lines,
    total: Math.round(lines.reduce((sum, line) => sum + line.total, 0) * 100) / 100,
    unpriced: lines.filter((line) => line.unit === null).map((line) => line.productCode),
  };
}
