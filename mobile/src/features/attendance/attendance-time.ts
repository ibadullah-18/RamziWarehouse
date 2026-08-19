export function parseAttendanceUtcDate(
  value?: string | null,
): Date | null {
  if (!value?.trim()) {
    return null;
  }

  const trimmedValue = value.trim();

  const hasTimeZone =
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(
      trimmedValue,
    );

  const normalizedValue = hasTimeZone
    ? trimmedValue
    : `${trimmedValue}Z`;

  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function formatAttendanceTime(
  value?: string | null,
): string {
  const date = parseAttendanceUtcDate(value);

  if (!date) {
    return '—';
  }

  return new Intl.DateTimeFormat('az-AZ', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Baku',
  }).format(date);
}

export function formatWorkedDuration(
  checkedInAtUtc?: string | null,
  checkedOutAtUtc?: string | null,
): string | null {
  const checkedIn =
    parseAttendanceUtcDate(checkedInAtUtc);

  const checkedOut =
    parseAttendanceUtcDate(checkedOutAtUtc);

  if (!checkedIn || !checkedOut) {
    return null;
  }

  const difference =
    checkedOut.getTime() - checkedIn.getTime();

  if (difference <= 0) {
    return null;
  }

  const totalMinutes = Math.floor(
    difference / 60000,
  );

  const hours = Math.floor(
    totalMinutes / 60,
  );

  const minutes = totalMinutes % 60;

  return `${hours} saat ${minutes} dəqiqə`;
}