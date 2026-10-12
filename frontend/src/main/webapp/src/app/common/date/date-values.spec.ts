import {formatIsoDate, formatTimeOfDay, parseIsoDate, parseTimeOfDay} from './date-values';

describe('date-values', () => {
  it('formats a time of day as HH:mm', () => {
    expect(formatTimeOfDay(new Date(2026, 0, 5, 9, 5))).toEqual('09:05');
  });

  it('reads a time of day with or without seconds', () => {
    expect(formatTimeOfDay(parseTimeOfDay('14:00:00')!)).toEqual('14:00');
    expect(formatTimeOfDay(parseTimeOfDay('07:45')!)).toEqual('07:45');
  });

  it('reads a missing time of day as none', () => {
    expect(parseTimeOfDay('')).toBeNull();
    expect(parseTimeOfDay(null)).toBeNull();
    expect(parseTimeOfDay(undefined)).toBeNull();
  });

  it('formats a date from the local calendar', () => {
    expect(formatIsoDate(new Date(2026, 0, 5, 0, 30))).toEqual('2026-01-05');
  });

  it('reads an ISO date as local midnight', () => {
    expect(parseIsoDate('2026-12-24')).toEqual(new Date(2026, 11, 24));
  });

  it('reads anything but an ISO date as none', () => {
    expect(parseIsoDate(null)).toBeNull();
    expect(parseIsoDate('')).toBeNull();
    expect(parseIsoDate('24.12.2026')).toBeNull();
    expect(parseIsoDate('2026-13-45')).toBeNull();
  });
});
