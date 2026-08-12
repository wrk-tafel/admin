import dayjs from 'dayjs';
import {formatNumber} from '@angular/common';
import {StatisticsDetailData, StatisticsDistribution} from '../../../api/statistics-api.service';

/**
 * The ways the period is picked. Each one implies what "the period before this one" is - which is
 * what every key figure is compared against, see {@link previousDateRange}.
 *
 * `currentYear` and `previousYear` are the running year and the one before it in a single click;
 * `year` is the same range for any other year, and is the only one of the three that needs a
 * control of its own.
 */
export type DateRangeMode = 'currentYear' | 'previousYear' | 'year' | 'currentMonth' | 'distribution' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * The delta of a key figure between the shown period and the one before it. `percentage` is absent
 * when the previous period's value was 0 - "+3 where there were none" is a real change, but not one
 * a percentage can express (it would be infinite), so the difference is what gets shown then.
 */
export interface StatisticsDelta {
  difference: number;
  percentage?: number;
  direction: 'up' | 'down' | 'flat';
}

export function computeDelta(
  current: StatisticsDetailData | undefined,
  previous: StatisticsDetailData | undefined
): StatisticsDelta | undefined {
  if (!current || !previous) {
    return undefined;
  }

  const difference = current.value - previous.value;
  const rounded = Math.round(difference * 100) / 100;

  return {
    difference: rounded,
    percentage: previous.value === 0 ? undefined : (difference / Math.abs(previous.value)) * 100,
    direction: rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'
  };
}

/**
 * The period the shown one is measured against: the equivalent range immediately before it. What
 * "equivalent" means is the mode's business - a year is compared to the year before, the running
 * month to the same days of the month before, a distribution to the distribution before it - so
 * that the compared range answers the same question the shown one does.
 *
 * `distributions` is the list of closed distributions (newest first) the settings hold; it is only
 * read in `distribution` mode, where the previous period is the neighbouring entry rather than an
 * arithmetic shift of the dates. Several distributions can share a date, so the selected one is
 * located by identity - it is one of the very objects the list holds.
 */
export function previousDateRange(
  mode: DateRangeMode,
  range: DateRange,
  distributions: StatisticsDistribution[] = [],
  selectedDistribution?: StatisticsDistribution
): DateRange | undefined {
  const from = dayjs(range.from);
  const to = dayjs(range.to);

  switch (mode) {
    case 'currentYear':
    case 'year':
    case 'previousYear':
      return {from: from.subtract(1, 'year').toDate(), to: to.subtract(1, 'year').toDate()};
    case 'currentMonth':
      // dayjs clamps an overflowing day of month (31.03. - 1 month = 29.02. in a leap year), which
      // is what keeps the compared range inside the previous month instead of spilling into this one
      return {from: from.subtract(1, 'month').toDate(), to: to.subtract(1, 'month').toDate()};
    case 'distribution': {
      const index = selectedDistribution ? distributions.indexOf(selectedDistribution) : -1;
      const previous = index >= 0 ? distributions[index + 1] : undefined;
      return previous ? {from: new Date(previous.startDate), to: new Date(previous.endDate)} : undefined;
    }
    case 'custom': {
      // the same number of days, ending the day before the shown range starts
      const previousTo = from.subtract(1, 'day');
      return {from: previousTo.subtract(to.diff(from, 'day'), 'day').toDate(), to: previousTo.toDate()};
    }
  }
}

/**
 * A number this screen computes itself - the min/max of a course, a difference between two periods,
 * the value under a chart's pointer - formatted the way the `number` pipe formats the ones in the
 * templates beside it, with the unit the key figure is measured in appended.
 */
export function formatStatisticsValue(
  value: number,
  unit: string | undefined,
  locale: string,
  digitsInfo = '1.0-2'
): string {
  const formatted = formatNumber(value, locale, digitsInfo);
  return unit ? `${formatted} ${unit}` : formatted;
}

export const COMPARISON_LABELS: Record<DateRangeMode, string> = {
  currentYear: 'ggü. Vorjahr',
  previousYear: 'ggü. Vorjahr',
  year: 'ggü. Vorjahr',
  currentMonth: 'ggü. Vormonat',
  distribution: 'ggü. voriger Ausgabe',
  custom: 'ggü. Vorperiode'
};
