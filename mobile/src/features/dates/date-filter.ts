const BAKU_UTC_OFFSET_MILLISECONDS =
  4 * 60 * 60 * 1000;

type DateParts = {
  year: number;
  month: number;
  day: number;
};

export type UtcDayRange = {
  fromDateUtc: string;
  toDateUtc: string;
};

function padNumber(value: number): string {
  return value.toString().padStart(2, '0');
}

function createDateKey(
  year: number,
  month: number,
  day: number,
): string {
  return [
    year.toString(),
    padNumber(month),
    padNumber(day),
  ].join('-');
}

function parseDateKey(
  dateKey: string,
): DateParts | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      dateKey,
    );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const validationDate = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  );

  const isValid =
    validationDate.getUTCFullYear() === year &&
    validationDate.getUTCMonth() ===
      month - 1 &&
    validationDate.getUTCDate() === day;

  if (!isValid) {
    return null;
  }

  return {
    year,
    month,
    day,
  };
}

export function getTodayDateKey(
  currentDate = new Date(),
): string {
  const bakuDate = new Date(
    currentDate.getTime() +
      BAKU_UTC_OFFSET_MILLISECONDS,
  );

  return createDateKey(
    bakuDate.getUTCFullYear(),
    bakuDate.getUTCMonth() + 1,
    bakuDate.getUTCDate(),
  );
}

export function normalizeDateKey(
  dateKey?: string | null,
): string {
  if (
    dateKey &&
    parseDateKey(dateKey)
  ) {
    return dateKey;
  }

  return getTodayDateKey();
}

export function dateKeyToPickerDate(
  dateKey: string,
): Date {
  const parts =
    parseDateKey(dateKey);

  if (!parts) {
    return new Date();
  }

  return new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    12,
    0,
    0,
    0,
  );
}

export function pickerDateToDateKey(
  date: Date,
): string {
  return createDateKey(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
}

export function shiftDateKey(
  dateKey: string,
  dayCount: number,
): string {
  const parts =
    parseDateKey(dateKey);

  if (!parts) {
    return getTodayDateKey();
  }

  const shiftedDate = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day + dayCount,
    ),
  );

  return createDateKey(
    shiftedDate.getUTCFullYear(),
    shiftedDate.getUTCMonth() + 1,
    shiftedDate.getUTCDate(),
  );
}

export function formatDateKey(
  dateKey: string,
): string {
  const parts =
    parseDateKey(dateKey);

  if (!parts) {
    return 'Tarix düzgün deyil';
  }

  return [
    padNumber(parts.day),
    padNumber(parts.month),
    parts.year.toString(),
  ].join('.');
}

export function getBakuUtcDayRange(
  dateKey: string,
): UtcDayRange {
  const normalizedDateKey =
    normalizeDateKey(dateKey);

  const parts =
    parseDateKey(normalizedDateKey)!;

  const startUtcMilliseconds =
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
    ) -
    BAKU_UTC_OFFSET_MILLISECONDS;

  const endUtcMilliseconds =
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day + 1,
    ) -
    BAKU_UTC_OFFSET_MILLISECONDS -
    1;

  return {
    fromDateUtc: new Date(
      startUtcMilliseconds,
    ).toISOString(),

    toDateUtc: new Date(
      endUtcMilliseconds,
    ).toISOString(),
  };
}