import {Component, computed, inject, input} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {MatDialog} from '@angular/material/dialog';
import {BaseChartDirective} from 'ng2-charts';
import {TooltipItem} from 'chart.js';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowDown, faArrowUp, faMinus, faUpRightAndDownLeftFromCenter} from '@fortawesome/free-solid-svg-icons';
import {StatisticsDetailData} from '../../../api/statistics-api.service';
import {computeDelta} from './statistics-comparison';
import {StatisticsDetailDialogComponent} from './statistics-detail-dialog.component';

@Component({
  selector: 'tafel-statistics-panel',
  templateUrl: 'statistics-panel.component.html',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    BaseChartDirective,
    FaIconComponent,
  ]
})
export class StatisticsPanelComponent {
  private readonly dialog = inject(MatDialog);

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

    const direction = delta.direction === 'up' ? 'mehr' : delta.direction === 'down' ? 'weniger' : 'unverändert';
    const amount = delta.percentage !== undefined
      ? `${this.formatNumber(Math.abs(delta.percentage), 1)} %`
      : this.formatValue(Math.abs(delta.difference));

    return delta.direction === 'flat'
      ? `unverändert ${this.comparisonLabel()}`
      : `${amount} ${direction} ${this.comparisonLabel()}`;
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

  openDetails() {
    const detail = this.data();
    if (!detail) {
      return;
    }

    this.dialog.open(StatisticsDetailDialogComponent, {
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
    const formatted = this.formatNumber(value, 2);
    const unit = this.data()?.unit;
    return unit ? `${formatted} ${unit}` : formatted;
  }

  private formatNumber(value: number, maximumFractionDigits: number): string {
    return new Intl.NumberFormat('de-AT', {maximumFractionDigits: maximumFractionDigits}).format(value);
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
