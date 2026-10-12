import {TestBed} from '@angular/core/testing';
import {DateAdapter, MAT_DATE_FORMATS, MatDateFormats} from '@angular/material/core';
import {MatDatepickerIntl} from '@angular/material/datepicker';
import {parseGermanDate, provideTafelDateAdapter, TafelDateAdapter} from './tafel-date-adapter';

describe('TafelDateAdapter', () => {
  let adapter: DateAdapter<Date>;
  let formats: MatDateFormats;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideTafelDateAdapter()]});
    adapter = TestBed.inject(DateAdapter);
    formats = TestBed.inject(MAT_DATE_FORMATS);
  });

  it('is the adapter every date and time field gets', () => {
    expect(adapter).toBeInstanceOf(TafelDateAdapter);
    expect(TestBed.inject(MatDatepickerIntl).openCalendarLabel).toEqual('Kalender öffnen');
  });

  it('writes a date as dd.MM.yyyy, whatever the locale of the browser', () => {
    expect(adapter.format(new Date(2026, 11, 24), formats.display.dateInput)).toEqual('24.12.2026');
    expect(adapter.format(new Date(2026, 0, 5), formats.display.dateInput)).toEqual('05.01.2026');
  });

  it('writes a time as 24-hour HH:mm', () => {
    expect(adapter.format(new Date(2026, 0, 5, 14, 5), formats.display.timeInput)).toEqual('14:05');
    expect(adapter.format(new Date(2026, 0, 5, 9, 30), formats.display.timeOptionLabel)).toEqual('09:30');
  });

  it('leaves the calendar labels to the application locale', () => {
    expect(adapter.format(new Date(2026, 11, 24), formats.display.monthYearA11yLabel)).toEqual('Dezember 2026');
    expect(adapter.getFirstDayOfWeek()).toEqual(1);
  });

  it.each([
    ['24.12.2026', new Date(2026, 11, 24)],
    ['1.2.2026', new Date(2026, 1, 1)],
    ['24122026', new Date(2026, 11, 24)],
    ['24/12/2026', new Date(2026, 11, 24)],
    ['24-12-2026', new Date(2026, 11, 24)],
    ['2026-12-24', new Date(2026, 11, 24)],
    [' 24.12.2026 ', new Date(2026, 11, 24)],
    ['29.02.2024', new Date(2024, 1, 29)]
  ])('reads %s', (text, expected) => {
    expect(adapter.parse(text, formats.parse.dateInput)).toEqual(expected);
  });

  it.each(['32.01.2026', '29.02.2026', '01.13.2026', '12/24/2026', '24.12.', '24.12.202', 'morgen', '2412'])(
    'rejects %s', text => {
      const parsed = adapter.parse(text, formats.parse.dateInput);

      expect(parsed).not.toBeNull();
      expect(adapter.isValid(parsed!)).toBe(false);
    });

  it('reads an empty field as no date rather than as an invalid one', () => {
    expect(adapter.parse('', formats.parse.dateInput)).toBeNull();
    expect(adapter.parse('   ', formats.parse.dateInput)).toBeNull();
  });

  it('reads a two-digit year as the nearest one that is not far in the future', () => {
    const today = new Date(2026, 9, 12);

    expect(parseGermanDate('01.02.26', today)).toEqual(new Date(2026, 1, 1));
    expect(parseGermanDate('010236', today)).toEqual(new Date(2036, 1, 1));
    expect(parseGermanDate('01.02.37', today)).toEqual(new Date(1937, 1, 1));
    expect(parseGermanDate('01.02.85', today)).toEqual(new Date(1985, 1, 1));
  });

  it.each([
    ['14:30', 14, 30],
    ['9:05', 9, 5],
    ['14.30', 14, 30],
    ['1430', 14, 30],
    ['930', 9, 30],
    ['14', 14, 0],
    ['0000', 0, 0]
  ])('reads the time %s', (text, hours, minutes) => {
    const parsed = adapter.parseTime(text, formats.parse.timeInput)!;

    expect(parsed.getHours()).toEqual(hours);
    expect(parsed.getMinutes()).toEqual(minutes);
  });

  it.each(['25:00', '14:60', '2460', 'mittags'])('rejects the time %s', text => {
    const parsed = adapter.parseTime(text, formats.parse.timeInput);

    expect(parsed).not.toBeNull();
    expect(adapter.isValid(parsed!)).toBe(false);
  });
});
