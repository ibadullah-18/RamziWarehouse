import type { AccountDayCustomer } from './customer-account-types';

export type SettlementPreview = {
  /** Everything credited to the debt: cash, card, bonus and returns. */
  credit: number;
  paidFromDaily: number;
  paidFromOld: number;
  /** Money beyond all debt, kept as an advance. */
  advance: number;
  /** What is left of the daily debt after the credit. */
  remainingDaily: number;
  remainingOld: number;
  /** Balances after the unpaid daily rest was moved to the old debt (or kept for tomorrow). */
  finalOld: number;
  finalDaily: number;
};

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Mirrors the server: the credit pays the daily debt first, then the old debt, and
 * whatever is left over becomes an advance. The unpaid daily rest either stays for
 * tomorrow or joins the old debt.
 */
export function previewSettlement(
  row: Pick<AccountDayCustomer, 'remainingOld' | 'remainingDaily'>,
  credit: number,
  carryToTomorrow: boolean,
): SettlementPreview {
  const paidFromDaily = Math.min(credit, row.remainingDaily);
  const paidFromOld = Math.min(round(credit - paidFromDaily), row.remainingOld);
  const advance = Math.max(0, round(credit - paidFromDaily - paidFromOld));
  const remainingDaily = round(row.remainingDaily - paidFromDaily);
  const remainingOld = round(row.remainingOld - paidFromOld);
  return {
    credit,
    paidFromDaily,
    paidFromOld,
    advance,
    remainingDaily,
    remainingOld,
    finalOld: carryToTomorrow ? remainingOld : round(remainingOld + remainingDaily),
    finalDaily: carryToTomorrow ? remainingDaily : 0,
  };
}

/** Accepts 150, 150,5 and 150.50; returns null for anything else. */
export function parseMoney(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '') return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Number(normalized);
}

/** Keeps digits and one decimal separator, at most two decimals. */
export function cleanMoneyInput(text: string): string {
  const value = text.replace(/[^0-9.,]/g, '').replace(',', '.');
  const [whole, ...rest] = value.split('.');
  return rest.length === 0 ? whole : `${whole}.${rest.join('').slice(0, 2)}`;
}

/** Product codes and batches: digits and hyphens only (1019, 340-1). */
export function cleanCodeInput(text: string): string {
  return text.replace(/[^0-9-]/g, '').replace(/-{2,}/g, '-');
}
