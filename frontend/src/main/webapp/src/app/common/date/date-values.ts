import dayjs from 'dayjs';

/** `HH:mm` - a time of day as it is sent to the backend and shown, as opposed to the `Date` a `matTimepicker` holds. */
export function formatTimeOfDay(time: Date): string {
  return dayjs(time).format('HH:mm');
}

/** The `Date` (today, at that time) a `matTimepicker` needs for an `HH:mm` or `HH:mm:ss` time of day. */
export function parseTimeOfDay(time: string | null | undefined): Date | null {
  const parts = /^(\d{1,2}):(\d{2})/.exec(time ?? '');
  if (!parts) {
    return null;
  }
  return dayjs().hour(Number(parts[1])).minute(Number(parts[2])).startOf('minute').toDate();
}

/** `yyyy-MM-dd` from the local calendar rather than UTC - the form a plain date is sent to the backend in. */
export function formatIsoDate(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}

/** The local-midnight `Date` a `matDatepicker` needs for a `yyyy-MM-dd` date; `null` for anything else. */
export function parseIsoDate(date: string | null | undefined): Date | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }
  // dayjs rolls an impossible day over into the next month instead of rejecting it
  const parsed = dayjs(date);
  return parsed.isValid() && parsed.format('YYYY-MM-DD') === date ? parsed.startOf('day').toDate() : null;
}
