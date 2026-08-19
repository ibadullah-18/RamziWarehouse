export type AttendanceRecord = {
  id: string;
  userId: string;
  userFullName: string;
  workDate: string;
  checkedInAtUtc: string;
  checkedOutAtUtc: string | null;
  completedAtUtc: string | null;
  deleteAfterUtc: string | null;
  isCurrentlyAtWork: boolean;
};

export type AttendanceList = {
  items: readonly AttendanceRecord[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type AttendanceQuery = {
  search?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  pageNumber?: number;
  pageSize?: number;
};
