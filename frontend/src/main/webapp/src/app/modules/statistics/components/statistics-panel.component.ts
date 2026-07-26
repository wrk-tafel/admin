import {Component, computed, input} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {BaseChartDirective} from 'ng2-charts';
import {StatisticsDetailData} from '../../../api/statistics-api.service';

@Component({
  selector: 'tafel-statistics-panel',
  templateUrl: 'statistics-panel.component.html',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    BaseChartDirective,
  ]
})
export class StatisticsPanelComponent {
  data = input<StatisticsDetailData>();

  optionsDefault = {
    plugins: {
      legend: {
        display: false
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
