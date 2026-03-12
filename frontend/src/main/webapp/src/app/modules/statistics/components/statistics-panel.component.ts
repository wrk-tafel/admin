import {Component, computed, input} from '@angular/core';
import {TemplateIdDirective, WidgetStatAComponent} from '@coreui/angular';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {cilArrowTop} from '@coreui/icons';
import {ChartjsComponent} from '@coreui/angular-chartjs';
import {getStyle} from "@coreui/utils";
import {StatisticsDetailData} from "../../../api/statistics-api.service";

@Component({
  selector: 'tafel-statistics-panel',
  templateUrl: 'statistics-panel.component.html',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    WidgetStatAComponent,
    ChartjsComponent,
    TemplateIdDirective,
  ]
})
export class StatisticsPanelComponent {
  title = input<string>();
  subTitle = input.required<string>();
  data = input<StatisticsDetailData>();

  icons = {cilArrowTop};

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
    pointBackgroundColor: getStyle('--cui-primary'),
    pointHoverBorderColor: getStyle('--cui-primary'),
  };

  chartData = computed(() => {
    const statisticsData = this.data();
    return {
      labels: statisticsData.labels,
      datasets: [
        {
          ...this.datasetOptionsDefault,
          data: statisticsData.dataPoints
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
