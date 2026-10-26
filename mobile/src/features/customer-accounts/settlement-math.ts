import type { AccountDayCustomer } from './customer-account-types';

export type SettlementPreview = {
  /** Everything credited to the debt: cash, card, bonus and returns. */
  credit: number;
  paidFromToday: number;
  paidFromCarried: number;
  paidFromOld: number;
  /** Money beyond all debt, kept as an advance. */
  advance: number;
  /** What is left of each debt after the credit. */
  remainingOld: number;
  remainingCarried: number;
  remainingToday: number;
  /** Balances after finishing, as they will be at the start of tomorrow. */
  finalOld: number;
  finalCarried: number;
};

type Balances = Pick<AccountDayCustomer, 'remainingOld' | 'remainingCarried' | 'remainingToday'>;

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Mirrors the server: the credit pays today's debt first, then yesterday's kept debt, then the
 * old debt, and what is left over becomes an advance. Finishing moves the unpaid rest:
 * yesterday's kept debt always joins the old debt; today's unpaid debt either stays for
 * tomorrow (as the carried "günlük köhnə") or joins the old debt too.
 */
export function previewSettlement(
  row: Balances,
  credit: number,
  carryToTomorrow: boolean,
): SettlementPreview {
  const paidFromToday = Math.min(credit, row.remainingToday);
  const paidFromCarried = Math.min(round(credit - paidFromToday), row.remainingCarried);
  const paidFromOld = Math.min(round(credit - paidFromToday - paidFromCarried), row.remainingOld);
  const advance = Math.max(0, round(credit - paidFromToday - paidFromCarried - paidFromOld));
  const remainingToday = round(row.remainingToday - paidFromToday);
  const remainingCarried = round(row.remainingCarried - paidFromCarried);
  const remainingOld = round(row.remainingOld - paidFromOld);
  return {
    credit,
    paidFromToday,
    paidFromCarried,
    paidFromOld,
    advance,
    remainingOld,
    remainingCarried,
    remainingToday,
    finalOld: round(remainingOld + remainingCarried + (carryToTomorrow ? 0 : remainingToday)),
    finalCarried: carryToTomorrow ? remainingToday : 0,
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
