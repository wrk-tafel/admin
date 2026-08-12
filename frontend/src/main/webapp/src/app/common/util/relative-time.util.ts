import dayjs from 'dayjs';

/**
 * How long ago a timestamp was, in German and in the coarsest unit that still says something -
 * "vor 3 Wochen" rather than "vor 23 Tagen". Used where the exact timestamp is secondary to the
 * "how old is this?" question (e.g. the registration date in the push-notification device list),
 * so the precise value belongs next to it (a tooltip) rather than being replaced by this.
 *
 * A timestamp in the future - a clock skew between the browser and the server - reads as
 * "gerade eben" instead of a negative age.
 */
export function relativeTimeLabel(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const then = dayjs(value);
  if (!then.isValid()) {
    return null;
  }

  const now = dayjs();
  const minutes = now.diff(then, 'minute');
  if (minutes < 1) {
    return 'gerade eben';
  }
  if (minutes < 60) {
    return ago(minutes, 'einer', 'Minute', 'Minuten');
  }

  const hours = now.diff(then, 'hour');
  if (hours < 24) {
    return ago(hours, 'einer', 'Stunde', 'Stunden');
  }

  const days = now.diff(then, 'day');
  if (days < 7) {
    return ago(days, 'einem', 'Tag', 'Tagen');
  }

  const weeks = now.diff(then, 'week');
  if (weeks < 5) {
    return ago(weeks, 'einer', 'Woche', 'Wochen');
  }

  const months = now.diff(then, 'month');
  if (months < 12) {
    return ago(months, 'einem', 'Monat', 'Monaten');
  }

  return ago(now.diff(then, 'year'), 'einem', 'Jahr', 'Jahren');
}

function ago(count: number, singularArticle: string, singular: string, plural: string): string {
  return count === 1 ? `vor ${singularArticle} ${singular}` : `vor ${count} ${plural}`;
}
