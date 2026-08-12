import {Component, computed, inject, input, LOCALE_ID} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {MatDialog} from '@angular/material/dialog';
import {BaseChartDirective} from 'ng2-charts';
import {TooltipItem} from 'chart.js';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowDown, faArrowUp, faMinus, faUpRightAndDownLeftFromCenter} from '@fortawesome/free-solid-svg-icons';
import {StatisticsDetailData} from '../../../api/statistics-api.service';
import {computeDelta, formatStatisticsValue} from './statistics-comparison';
import {StatisticsDetailDialogComponent} from './statistics-detail-dialog.component';

@Component({
  selector: 'tafel-statistics-panel',
  templateUrl: 'statistics-panel.component.html',
  imports: [
    CommonModule,
    MatCardModule,
    BaseChartDirective,
    FaIconComponent,
  ]
})
export class StatisticsPanelComponent {
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
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          display: false
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

  private formatValue(value: number): string {
    return formatStatisticsValue(value, this.data()?.unit, this.locale);
  }

  protected readonly faArrowUp = faArrowUp;
  protected readonly faArrowDown = faArrowDown;
  protected readonly faMinus = faMinus;
  protected readonly faUpRightAndDownLeftFromCenter = faUpRightAndDownLeftFromCenter;
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
