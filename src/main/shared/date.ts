import { compareAsc, compareDesc, isValid, parse, format } from 'date-fns';

const DATE_FORMAT = "dd/MM/yyyy HH:mm:ss";

export function formatDate(date: Date | string): string {
  return format(date, DATE_FORMAT)
}

export function compareDate(
  date1: Date | string,
  date2: Date | string,
  order: "asc" | "desc" = "desc"
): number {
  const dateA = typeof date1 === "string" ? parse(date1, DATE_FORMAT, new Date()) : date1;
  const dateB = typeof date2 === "string" ? parse(date2, DATE_FORMAT, new Date()) : date2;

  const isValidA = isValid(dateA);
  const isValidB = isValid(dateB);

  // Both dates are NOT valid → Consider them equal
  if (!isValidA && !isValidB) return 0;

  // dateA is NOT valid → dateB is considered earlier (or vice versa)
  if (!isValidA) return order === "asc" ? -1 : 1;

  // dateB is NOT valid → dateA is considered earlier (or vice versa)
  if (!isValidB) return order === "asc" ? 1 : -1;

  // Both dates are valid, perform the comparison based on the order
  const comparator = order === "asc" ? compareAsc : compareDesc;
  return comparator(dateA, dateB);
}
