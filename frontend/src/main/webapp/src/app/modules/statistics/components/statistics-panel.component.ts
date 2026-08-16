import {Component, computed, inject, input, LOCALE_ID} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {MatDialog} from '@angular/material/dialog';
import {BaseChartDirective} from 'ng2-charts';
import {TooltipItem} from 'chart.js';
import {MatIcon} from '@angular/material/icon';
import {StatisticsDetailData} from '../../../api/statistics-api.service';
import {computeDelta, formatStatisticsValue} from './statistics-comparison';
import {StatisticsDetailDialogComponent} from './statistics-detail-dialog.component';
import {registerSvgIcons} from '../../../common/util/svg-icon.util';
import openInFullIcon from '@material-symbols/svg-400/outlined/open_in_full.svg';
import arrowUpwardIcon from '@material-symbols/svg-400/outlined/arrow_upward.svg';
import arrowDownwardIcon from '@material-symbols/svg-400/outlined/arrow_downward.svg';
import removeIcon from '@material-symbols/svg-400/outlined/remove.svg';

/**
 * Roughly what a card's sparkline has to name its periods in: the width of its chart area, and what
 * one character and the gap beside a 10px label take up in it. Together they decide how many of the
 * periods get a name rather than only a gridline (see `axisLabel`).
 */
const SPARKLINE_LABEL_AREA_PX = 240;
const AXIS_LABEL_CHARACTER_PX = 6;
const AXIS_LABEL_GAP_PX = 8;

/**
 * A period label cut down to the part that tells it apart from its neighbours: the month of
 * `2026-03`, the calendar week of `2026-KW12`. The year they share is already in the period
 * heading above the cards, and dropping it is what lets every period on a course be named instead
 * of every third one. A yearly course is left alone - there the year *is* the distinguishing part.
 */
function shortenPeriodLabel(label: string | undefined): string {
  return (label ?? '').replace(/^\d{4}-/, '');
}

@Component({
  selector: 'tafel-statistics-panel',
  templateUrl: 'statistics-panel.component.html',
  imports: [
    CommonModule,
    MatCardModule,
    BaseChartDirective,
    MatIcon,
  ]
})
export class StatisticsPanelComponent {
  private readonly registerIcons = registerSvgIcons({
    open_in_full: openInFullIcon,
    arrow_upward: arrowUpwardIcon,
    arrow_downward: arrowDownwardIcon,
    remove: removeIcon
  });

  private readonly dialog = inject(MatDialog);
  private readonly locale = inject(LOCALE_ID);

  data = input<StatisticsDetailData>();
  /**
   * The same key figure over the period before the shown one - what the delta on the card is
   * measured against. Absent while it is still loading, or when there is no comparable period
   * (the oldest recorded distribution has none before it).
   */
  comparison = input<StatisticsDetailData>();
  comparisonLabel = input<string>('');
  /** The shown and the compared period as text, for the enlarged view's header. */
  rangeLabel = input<string>('');
  comparisonRangeLabel = input<string>('');
  loading = input<boolean>(false);
  testId = input<string>('');

  delta = computed(() => computeDelta(this.data(), this.comparison()));

  /**
   * What the sparkline's shape stands for. An axis-less line shows a course but withholds its
   * scale, so the three numbers that bound it are written out beside it.
   */
  scale = computed(() => {
    const dataPoints = this.data()?.dataPoints ?? [];
    if (dataPoints.length === 0) {
      return undefined;
    }

    return {
      minimum: this.formatValue(Math.min(...dataPoints)),
      maximum: this.formatValue(Math.max(...dataPoints)),
      last: this.formatValue(dataPoints[dataPoints.length - 1])
    };
  });

  /**
   * The delta as one sentence, so the arrow beside it stays decoration a screen reader can skip
   * (an up arrow alone reads as nothing at all).
   */
  deltaLabel = computed(() => {
    const delta = this.delta();
    if (!delta) {
      return '';
    }

    if (delta.direction === 'flat') {
      return `unverändert ${this.comparisonLabel()}`;
    }

    const amount = delta.percentage !== undefined
      ? `${formatStatisticsValue(Math.abs(delta.percentage), undefined, this.locale, '1.0-1')} %`
      : this.formatValue(Math.abs(delta.difference));

    return `${amount} ${delta.direction === 'up' ? 'mehr' : 'weniger'} ${this.comparisonLabel()}`;
  });

  detailsLabel = computed(() => `${this.data()?.subTitle ?? ''} vergrößert anzeigen`);

  optionsDefault = {
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        // the point nearest the pointer's x position, so a value can be read off the line without
        // having to hit a 4px dot exactly
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: TooltipItem<'line'>) => this.formatValue(context.parsed.y ?? 0)
        }
      }
    },
    maintainAspectRatio: true,
    scales: {
      /**
       * The one axis the sparkline keeps: which stretch of time a point stands for. Without it the
       * line has a shape but no "when" - the same question the enlarged view answers with full
       * axes, asked here in the space a card has. Every period is a gridline; which of them are
       * named is [axisLabel]'s business, and the labels are full white because anything dimmer
       * misses the contrast minimum on this card's background.
       */
      x: {
        grid: {
          display: true,
          color: 'rgba(255,255,255,.2)',
          drawTicks: false
        },
        border: {
          display: false
        },
        ticks: {
          display: true,
          color: '#ffffff',
          font: {
            size: 10
          },
          autoSkip: false,
          maxRotation: 0,
          padding: 2,
          callback: (_value: string | number, index: number, ticks: unknown[]) => this.axisLabel(index, ticks.length)
        }
      },
      y: {
        display: false,
        grid: {
          display: false
        },
        ticks: {
          display: false
        }
      }
    },
    elements: {
      line: {
        borderWidth: 1,
        tension: 0.4
      },
      point: {
        radius: 4,
        hitRadius: 10,
        hoverRadius: 4
      }
    }
  };
  private datasetOptionsDefault = {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,.55)',
    pointBackgroundColor: '#ffffff',
    pointHoverBorderColor: '#ffffff',
  };

  chartData = computed(() => {
    const statisticsData = this.data();
    return {
      labels: statisticsData?.labels ?? [],
      datasets: [
        {
          ...this.datasetOptionsDefault,
          data: statisticsData?.dataPoints ?? []
        }
      ]
    } as StatisticsPanelData;
  });

  /**
   * Not while the card is loading: what it holds then is the period before the one being fetched,
   * and enlarging numbers the card itself no longer shows is worse than nothing happening.
   */
  openDetails() {
    const detail = this.data();
    if (!detail || this.loading()) {
      return;
    }

    this.dialog.open(StatisticsDetailDialogComponent, {
      // A dialog is sized by its content by default, which on a phone left the enlarged chart
      // barely wider than the sparkline it was opened from - and reading the course off it is the
      // whole reason the dialog exists. It takes what the viewport has instead, and stops growing
      // once the chart is comfortably readable on a desktop.
      width: '95vw',
      maxWidth: '42rem',
      data: {
        detail: detail,
        comparison: this.comparison(),
        comparisonLabel: this.comparisonLabel(),
        rangeLabel: this.rangeLabel(),
        comparisonRangeLabel: this.comparisonRangeLabel()
      }
    });
  }

  /**
   * Which of the course's periods get named under the sparkline. Every one of them when they fit -
   * which is what shortening the label to the part that actually differs is for - and otherwise as
   * many as do, but always the first and the last, so the line's span can be read off it whatever
   * the resolution is. The one before the last is dropped when it would land right next to it.
   *
   * The full label stays on the tooltip, which reads the data's own labels rather than these.
   */
  private axisLabel(index: number, count: number): string {
    const label = shortenPeriodLabel(this.data()?.labels?.[index]);
    const last = count - 1;
    if (index === 0 || index === last) {
      return label;
    }

    const stride = Math.ceil(count / this.maxAxisLabels());
    return index % stride === 0 && last - index >= stride ? label : '';
  }

  /** How many labels of this course's length fit side by side under a card's sparkline. */
  private maxAxisLabels(): number {
    const longest = (this.data()?.labels ?? [])
      .reduce((max, label) => Math.max(max, shortenPeriodLabel(label).length), 1);

    return Math.max(2, Math.floor(SPARKLINE_LABEL_AREA_PX / (longest * AXIS_LABEL_CHARACTER_PX + AXIS_LABEL_GAP_PX)));
  }

  private formatValue(value: number): string {
    return formatStatisticsValue(value, this.data()?.unit, this.locale);
  }

}

export interface StatisticsPanelData {
  labels: string[];
  datasets: {
    backgroundColor: string;
    borderColor: string;
    pointBackgroundColor: string;
    pointHoverBorderColor: string;
    data: number[];
  }[];
}
