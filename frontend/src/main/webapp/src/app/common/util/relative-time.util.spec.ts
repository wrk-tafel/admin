import {describe, expect, it} from 'vitest';
import dayjs from 'dayjs';
import {relativeTimeLabel} from './relative-time.util';

describe('relativeTimeLabel', () => {

  it('returns null without a value', () => {
    expect(relativeTimeLabel(null)).toBeNull();
    expect(relativeTimeLabel(undefined)).toBeNull();
    expect(relativeTimeLabel('')).toBeNull();
  });

  it('returns null for an unparseable value', () => {
    expect(relativeTimeLabel('not-a-date')).toBeNull();
  });

  it('reads a timestamp within the last minute as "gerade eben"', () => {
    expect(relativeTimeLabel(dayjs().subtract(20, 'second').toDate())).toEqual('gerade eben');
  });

  // A browser running ahead of the server must not produce "vor -3 Minuten".
  it('reads a timestamp in the future as "gerade eben"', () => {
    expect(relativeTimeLabel(dayjs().add(5, 'minute').toDate())).toEqual('gerade eben');
  });

  it('uses minutes, hours, days, weeks, months and years in turn', () => {
    expect(relativeTimeLabel(dayjs().subtract(5, 'minute').toDate())).toEqual('vor 5 Minuten');
    expect(relativeTimeLabel(dayjs().subtract(3, 'hour').toDate())).toEqual('vor 3 Stunden');
    expect(relativeTimeLabel(dayjs().subtract(4, 'day').toDate())).toEqual('vor 4 Tagen');
    expect(relativeTimeLabel(dayjs().subtract(3, 'week').toDate())).toEqual('vor 3 Wochen');
    expect(relativeTimeLabel(dayjs().subtract(7, 'month').toDate())).toEqual('vor 7 Monaten');
    expect(relativeTimeLabel(dayjs().subtract(2, 'year').toDate())).toEqual('vor 2 Jahren');
  });

  it('uses the German singular article per unit', () => {
    expect(relativeTimeLabel(dayjs().subtract(1, 'minute').toDate())).toEqual('vor einer Minute');
    expect(relativeTimeLabel(dayjs().subtract(1, 'hour').toDate())).toEqual('vor einer Stunde');
    expect(relativeTimeLabel(dayjs().subtract(1, 'day').toDate())).toEqual('vor einem Tag');
    expect(relativeTimeLabel(dayjs().subtract(1, 'week').toDate())).toEqual('vor einer Woche');
    expect(relativeTimeLabel(dayjs().subtract(1, 'year').toDate())).toEqual('vor einem Jahr');
  });

  it('accepts an ISO string as it comes from the backend', () => {
    expect(relativeTimeLabel(dayjs().subtract(2, 'day').toISOString())).toEqual('vor 2 Tagen');
  });

});
