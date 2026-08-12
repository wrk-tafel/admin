import {Component, computed, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {DecimalPipe} from '@angular/common';
import {BaseChartDirective} from 'ng2-charts';
import {TooltipItem} from 'chart.js';
import {StatisticsDetailData} from '../../../api/statistics-api.service';
import {TafelDialogComponent} from '../../../common/components/tafel-dialog/tafel-dialog.component';
import {computeDelta} from './statistics-comparison';

export interface StatisticsDetailDialogData {
  detail: StatisticsDetailData;
  comparison?: StatisticsDetailData;
  comparisonLabel: string;
  rangeLabel: string;
  comparisonRangeLabel?: string;
}

/**
 * The enlarged view of one key figure's course: the same data points the card's sparkline draws,
 * but with axes, gridlines and every label readable - a sparkline shows the shape of a development,
 * this answers "how much, and when".
 */
@Component({
  selector: 'tafel-statistics-detail-dialog',
  imports: [TafelDialogComponent, MatDialogModule, MatButtonModule, BaseChartDirective, DecimalPipe],
  templateUrl: 'statistics-detail-dialog.component.html'
})
export class StatisticsDetailDialogComponent {
  readonly dialogRef = inject(MatDialogRef<StatisticsDetailDialogComponent>);
  readonly data: StatisticsDetailDialogData = inject(MAT_DIALOG_DATA);

  delta = computed(() => computeDelta(this.data.detail, this.data.comparison));

  dataPoints = computed(() => this.data.detail.dataPoints ?? []);

  summary = computed(() => {
    const dataPoints = this.dataPoints();
    if (dataPoints.length === 0) {
      return undefined;
    }

    return {
      minimum: Math.min(...dataPoints),
      maximum: Math.max(...dataPoints),
      average: dataPoints.reduce((sum, value) => sum + value, 0) / dataPoints.length
    };
  });

  chartData = computed(() => ({
    labels: this.data.detail.labels ?? [],
    datasets: [
      {
        label: this.data.detail.subTitle,
        data: this.dataPoints(),
        borderColor: '#5856d6',
        backgroundColor: 'rgba(88,86,214,.12)',
        pointBackgroundColor: '#5856d6',
        fill: true,
        tension: 0.3
      }
    ]
  }));

  /**
   * A canvas carries no text, so the whole course is spelled out as the chart's accessible name -
   * without it the enlarged chart says no more to a screen reader than the sparkline did.
   */
  chartLabel = computed(() => {
    const labels = this.data.detail.labels ?? [];
    const course = labels.map((label, index) => `${label}: ${this.dataPoints()[index]}`).join(', ');
    return `${this.data.detail.subTitle} im Zeitverlauf - ${course}`;
  });

  chartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {display: false},
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'line'>) => this.withUnit(context.parsed.y ?? 0)
        }
      }
    },
    scales: {
      x: {grid: {display: false}},
      y: {beginAtZero: true}
    }
  };

  private withUnit(value: number): string {
    const formatted = new Intl.NumberFormat('de-AT', {maximumFractionDigits: 2}).format(value);
    return this.data.detail.unit ? `${formatted} ${this.data.detail.unit}` : formatted;
  }
}
