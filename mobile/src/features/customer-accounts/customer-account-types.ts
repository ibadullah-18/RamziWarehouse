export enum CustomerAccountEntryType {
  OpeningBalance = 1,
  Debt = 2,
  Payment = 3,
  AdjustmentIncrease = 4,
  AdjustmentDecrease = 5,
  DailyIncrease = 6,
  DailyDecrease = 7,
  ReturnCredit = 8,
  Bonus = 9,
  CreditReversal = 10,
  DailyToOld = 11,
}

export type AccountDayState = 'notStarted' | 'open' | 'closed';

/** One customer on one açot day. */
export type AccountDayCustomer = {
  customerId: string;
  customerName: string;
  phoneNumber: string | null;
  /** Köhnə borc owed when the day began. */
  oldDebt: number;
  /** "Günlük köhnə": yesterday's daily debt that was kept for tomorrow (zero otherwise). */
  carriedDebt: number;
  /** Bu günkü günlük borc: the new debt written today. */
  todayDebt: number;
  due: number;
  cash: number;
  card: number;
  paid: number;
  bonus: number;
  returnCredit: number;
  remainingOld: number;
  remainingCarried: number;
  remainingToday: number;
  remaining: number;
  advance: number;
  isDone: boolean;
  carryToTomorrow: boolean;
  hasOldDebtRecord: boolean;
};

export type AccountDay = {
  businessDate: string;
  state: AccountDayState;
  isToday: boolean;
  isLocked: boolean;
  startedByFullName: string | null;
  startedAtUtc: string | null;
  closedByFullName: string | null;
  closedAtUtc: string | null;
  collected: number;
  cash: number;
  card: number;
  bonus: number;
  returnCredit: number;
  newDailyDebt: number;
  customerCount: number;
  doneCount: number;
  customers: AccountDayCustomer[];
};

export type CustomerAccountSummary = {
  customerId: string;
  customerName: string;
  phoneNumber: string | null;
  isActive: boolean;
  isAccountCustomer: boolean;
  oldDebt: number;
  carriedDebt: number;
  todayDebt: number;
  advance: number;
  remainingDebt: number;
  hasOldDebtRecord: boolean;
};

export type CustomerAccountList = {
  items: CustomerAccountSummary[];
  businessDate: string;
  pageNumber: number;
  pageSize: number;
  totalCount: number;
};

export type CustomerAccountQuery = {
  search?: string;
  date?: string;
  pageNumber?: number;
  pageSize?: number;
};

export type CustomerAccountEntry = {
  id: string;
  customerId: string;
  entryType: CustomerAccountEntryType;
  paymentMethod: 'cash' | 'card' | null;
  amount: number;
  businessDate: string;
  note: string | null;
  recordedByFullName: string;
  createdAtUtc: string;
};

export type CustomerAccountDay = {
  businessDate: string;
  oldDebt: number;
  carriedDebt: number;
  todayDebt: number;
  cash: number;
  card: number;
  bonus: number;
  returnCredit: number;
  remainingDebt: number;
  isLocked: boolean;
  entries: CustomerAccountEntry[];
};

export type CustomerAccountDetails = {
  customerId: string;
  customerName: string;
  phoneNumber: string | null;
  isActive: boolean;
  oldDebt: number;
  carriedDebt: number;
  todayDebt: number;
  advance: number;
  remainingDebt: number;
  hasOldDebtRecord: boolean;
  audit: {
    entryId: string;
    userName: string;
    description: string;
    createdAtUtc: string;
  }[];
  days: CustomerAccountDay[];
};

export type AccountHistoryDay = {
  businessDate: string;
  collected: number;
  cash: number;
  card: number;
  customerCount: number;
  closed: boolean;
};

export type AccountHistoryMonth = {
  month: string;
  collected: number;
  cash: number;
  card: number;
  days: AccountHistoryDay[];
};

export type CustomerMonthDay = {
  businessDate: string;
  oldDebt: number;
  carriedDebt: number;
  todayDebt: number;
  cash: number;
  card: number;
  bonus: number;
  returnCredit: number;
  remaining: number;
};

export type CustomerMonth = {
  customerId: string;
  customerName: string;
  month: string;
  collected: number;
  cash: number;
  card: number;
  bonus: number;
  returnCredit: number;
  remaining: number;
  days: CustomerMonthDay[];
};

export type AdjustDebtRequest = {
  customerId: string;
  target: 'old' | 'daily';
  mode: 'add' | 'set';
  amount: number;
  reason: string;
};

export type DailyDebtItem = {
  customerId: string;
  dailyDebt: number;
  oldDebt?: number | null;
};

export type SettlementRequest = {
  operationId: string;
  customerId: string;
  cash: number;
  card: number;
  bonus: number;
  returns: { returnId: string; amount: number }[];
  carryToTomorrow: boolean;
  note: string | null;
};
