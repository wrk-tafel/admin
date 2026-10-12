import {MatDatepickerIntl} from '@angular/material/datepicker';

/**
 * German-language `MatDatepickerIntl` - the names a screen reader announces for the calendar
 * button and the controls inside the calendar popup, none of which have a visible text.
 */
export function getGermanDatepickerIntl(): MatDatepickerIntl {
  const datepickerIntl = new MatDatepickerIntl();

  datepickerIntl.calendarLabel = 'Kalender';
  datepickerIntl.openCalendarLabel = 'Kalender öffnen';
  datepickerIntl.closeCalendarLabel = 'Kalender schließen';
  datepickerIntl.prevMonthLabel = 'Vorheriger Monat';
  datepickerIntl.nextMonthLabel = 'Nächster Monat';
  datepickerIntl.prevYearLabel = 'Vorheriges Jahr';
  datepickerIntl.nextYearLabel = 'Nächstes Jahr';
  datepickerIntl.prevMultiYearLabel = 'Vorherige 24 Jahre';
  datepickerIntl.nextMultiYearLabel = 'Nächste 24 Jahre';
  datepickerIntl.switchToMonthViewLabel = 'Datum auswählen';
  datepickerIntl.switchToMultiYearViewLabel = 'Monat und Jahr auswählen';
  datepickerIntl.startDateLabel = 'Startdatum';
  datepickerIntl.endDateLabel = 'Enddatum';
  datepickerIntl.comparisonDateLabel = 'Vergleichszeitraum';
  datepickerIntl.formatYearRangeLabel = (start: string, end: string) => `${start} bis ${end}`;

  return datepickerIntl;
}
