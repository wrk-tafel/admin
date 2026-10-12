import {Injectable, LOCALE_ID, Provider} from '@angular/core';
import {DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatDateFormats, NativeDateAdapter} from '@angular/material/core';
import {MatDatepickerIntl} from '@angular/material/datepicker';
import {getGermanDatepickerIntl} from './german-datepicker-intl';

const DATE_INPUT = 'tafelDate';
const TIME_INPUT = 'tafelTime';

/**
 * What the date and time fields read and write. The two input formats are names rather than
 * `Intl.DateTimeFormat` options because `TafelDateAdapter` produces them itself; everything the
 * calendar popup labels (month names, weekdays) is still left to `Intl` and the application locale.
 */
export const TAFEL_DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: DATE_INPUT,
    timeInput: TIME_INPUT
  },
  display: {
    dateInput: DATE_INPUT,
    timeInput: TIME_INPUT,
    timeOptionLabel: TIME_INPUT,
    monthYearLabel: {year: 'numeric', month: 'short'},
    dateA11yLabel: {year: 'numeric', month: 'long', day: 'numeric'},
    monthYearA11yLabel: {year: 'numeric', month: 'long'}
  }
};

/** A two-digit year this far ahead of today still means this century; anything later means the last one. */
const TWO_DIGIT_YEAR_LOOKAHEAD = 10;

const SEPARATED_DATE = /^(\d{1,2})[./\-\s](\d{1,2})[./\-\s](\d{2}|\d{4})$/;
const COMPACT_DATE = /^(\d{2})(\d{2})(\d{2}|\d{4})$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DIGITS_ONLY_TIME = /^(\d{1,2}?)(\d{2})?$/;

/**
 * Reads a date the way it is written here - `24.12.2026`, `1.2.26`, or just the digits
 * (`24122026`) for fast keyboard entry - plus `2026-12-24`, which is what gets pasted from
 * elsewhere. Returns `undefined` for anything that is not a real calendar day.
 */
export function parseGermanDate(text: string, today: Date = new Date()): Date | undefined {
  let day: number, month: number, year: number;

  const iso = ISO_DATE.exec(text);
  const dayFirst = SEPARATED_DATE.exec(text) ?? COMPACT_DATE.exec(text);
  if (iso) {
    [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (dayFirst) {
    [day, month] = [Number(dayFirst[1]), Number(dayFirst[2])];
    year = dayFirst[3].length === 2 ? expandTwoDigitYear(Number(dayFirst[3]), today) : Number(dayFirst[3]);
  } else {
    return undefined;
  }

  // setFullYear rather than the Date constructor, which reads a year below 100 as 19xx.
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  const isRealDay = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return isRealDay ? date : undefined;
}

function expandTwoDigitYear(twoDigitYear: number, today: Date): number {
  const century = Math.floor(today.getFullYear() / 100) * 100;
  const year = century + twoDigitYear;
  return year > today.getFullYear() + TWO_DIGIT_YEAR_LOOKAHEAD ? year - 100 : year;
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * The date adapter behind every `matDatepicker` and `matTimepicker`: `dd.MM.yyyy` and 24-hour
 * `HH:mm`, whatever language the browser itself runs in. A native `<input type="date">` leaves
 * that format to the browser's own display language, which is why those are not used.
 */
@Injectable()
export class TafelDateAdapter extends NativeDateAdapter {

  override parse(value: unknown, parseFormat?: unknown): Date | null {
    if (parseFormat !== DATE_INPUT || typeof value !== 'string') {
      return super.parse(value, parseFormat);
    }

    const text = value.trim();
    if (!text) {
      return null;
    }
    return parseGermanDate(text, this.today()) ?? this.invalid();
  }

  override format(date: Date, displayFormat: object | string): string {
    if (displayFormat === DATE_INPUT && this.isValid(date)) {
      return `${twoDigits(date.getDate())}.${twoDigits(date.getMonth() + 1)}.${date.getFullYear()}`;
    }
    if (displayFormat === TIME_INPUT && this.isValid(date)) {
      return `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
    }
    return super.format(date, displayFormat as object);
  }

  /** `1430`, `930` and a bare hour (`14`) on top of what the native adapter reads (`14:30`, `14.30`). */
  override parseTime(userValue: unknown, parseFormat?: unknown): Date | null {
    if (typeof userValue === 'string') {
      const digits = DIGITS_ONLY_TIME.exec(userValue.trim());
      if (digits?.[1]) {
        return super.parseTime(`${digits[1]}:${digits[2] ?? '00'}`, parseFormat);
      }
    }
    return super.parseTime(userValue, parseFormat);
  }

}

/**
 * Everything a screen with a date or time field needs. `shell.routes.ts` provides it for every
 * routed screen; a dialog component has to list it in its own `providers`, since `MatDialog`
 * creates dialogs under the root injector, where a route-level provider is not visible.
 *
 * A component imports `MatDatepicker`, `MatDatepickerInput` and `MatDatepickerToggle` themselves,
 * not `MatDatepickerModule`: the module provides `MatDatepickerIntl` again, and that copy - with
 * the English labels - is the one the component would then get instead of the German one from here.
 */
export function provideTafelDateAdapter(): Provider[] {
  return [
    {provide: MAT_DATE_LOCALE, useExisting: LOCALE_ID},
    {provide: DateAdapter, useClass: TafelDateAdapter},
    {provide: MAT_DATE_FORMATS, useValue: TAFEL_DATE_FORMATS},
    {provide: MatDatepickerIntl, useFactory: getGermanDatepickerIntl}
  ];
}
