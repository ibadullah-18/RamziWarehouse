import { UserRole } from '../../auth/auth-types';

export enum CustomerAccountEntryType {
  OpeningBalance = 1,
  Debt = 2,
  Payment = 3,
  AdjustmentIncrease = 4,
  AdjustmentDecrease = 5,
  DailyIncrease = 6,
  DailyDecrease = 7,
}

export type CustomerAccountQuery = {
  search?: string;
  date?: string;
  pageNumber?: number;
  pageSize?: number;
};

export type CreateCustomerAccountRequest = {
  customerId: string;
  initialPreviousDebt: number | null;
  todayDebt: number;
  note: string | null;
};

export type RecordCustomerPaymentRequest = {
  paymentMethod: 'cash' | 'card';
  customerId: string;
  amount: number;
  note: string | null;
};

export type CorrectPreviousDebtRequest = {
  customerId: string;
  correctedPreviousDebt: number;
  reason: string;
};

export type CustomerAccountEntry = {
  paymentMethod: 'cash' | 'card' | null;
  id: string;
  customerId: string;
  entryType: CustomerAccountEntryType;
  amount: number;
  businessDate: string;
  note: string | null;
  recordedByUserId: string;
  recordedByFullName: string;
  recordedByRole: UserRole;
  createdAtUtc: string;
};

export type CustomerAccountSummary = {
  carriedDailyDebt: number;
  hasUnpaidDailyDebt: boolean;
  customerId: string;
  customerName: string;
  phoneNumber: string | null;
  isActive: boolean;
  businessDate: string;
  previousDebt: number;
  todayDebt: number;
  todayPayment: number;
  paidFromPreviousDebt: number;
  paidFromTodayDebt: number;
  previousDebtRemaining: number;
  todayDebtRemaining: number;
  remainingDebt: number;
};

export type CustomerAccountList = {
  items: CustomerAccountSummary[];
  businessDate: string;
  pageNumber: number;
  pageSize: number;
  totalCount: number;
};

export type CustomerAccountDay = {
  oldDebtRemaining: number;
  carriedDailyDebt: number;
  todayDebtRemaining: number;
  businessDate: string;
  openingDebt: number;
  adjustmentAmount: number;
  addedDebt: number;
  paidAmount: number;
  closingDebt: number;
  entries: CustomerAccountEntry[];
};

export type CustomerDeferredDebt = {
  businessDate: string;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  isOpeningBalance: boolean;
};
export type CustomerAccountDetails = {
  oldDebtRemaining: number;
  carriedDailyDebt: number;
  todayDebtRemaining: number;
  customerId: string;
  customerName: string;
  phoneNumber: string | null;
  isActive: boolean;
  previousDebt: number;
  totalNewDebt: number;
  totalDebt: number;
  totalPaid: number;
  remainingDebt: number;
  deferredDebts: CustomerDeferredDebt[];
  days: CustomerAccountDay[];
};

export type AccountDayReport = { businessDate: string; cash: number; card: number; unspecified: number; total: number; closure: { recordedByFullName: string; closedAtUtc: string } | null; customers: CustomerAccountSummary[] };

export type AccountReportHistory = {businessDate: string; paidAmount: number; closed: boolean};
