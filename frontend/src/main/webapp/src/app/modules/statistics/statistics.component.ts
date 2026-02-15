import {Component, computed, input, signal} from '@angular/core';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  ColComponent,
  FormSelectDirective,
  RowComponent
} from '@coreui/angular';
import {StatisticsDistribution, StatisticsSettings} from '../../api/statistics-api.service';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import moment from 'moment';
import {CommonModule} from '@angular/common';

@Component({
    selector: 'tafel-statistics',
    templateUrl: 'statistics.component.html',
    imports: [
        CommonModule,
        RowComponent,
        ColComponent,
        CardHeaderComponent,
        CardBodyComponent,
        CardComponent,
        FormsModule,
        ReactiveFormsModule,
        FormSelectDirective,
        ButtonDirective
    ]
})
export class StatisticsComponent {
  // Signal input from resolver - reactive!
  readonly settings = input<StatisticsSettings>();

  currentYear: number = moment().year();
  _dateRangeFrom = signal<Date>(moment().startOf('year').toDate());
  _dateRangeTo = signal<Date>(moment().endOf('year').toDate());
  statisticsData = computed(() => this.loadData(this._dateRangeFrom(), this._dateRangeTo()));

  onYearSelected(year: number | undefined): void {
    if (year) {
      this._dateRangeFrom.set(moment().year(year).startOf('year').toDate());
      this._dateRangeTo.set(moment().year(year).endOf('year').toDate());
    }
  }

  onDistributionSelected(distribution: StatisticsDistribution | undefined): void {
    if (distribution) {
      this._dateRangeFrom.set(distribution.startDate);
      this._dateRangeTo.set(distribution.endDate);
    }
  }

  trackByYear(index: number, year: any): number {
    return year;
  }

  trackByDistributionDate(index: number, distributionDate: any): number {
    return distributionDate;
  }

  loadData(fromDate: Date, toDate: Date): string {
    return 'Loading data from ' + moment(fromDate).format('YYYY-MM-DD') + ' to ' + moment(toDate).format('YYYY-MM-DD');
  }

  get dateRangeFrom(): string {
    return moment(this._dateRangeFrom()).format('YYYY-MM-DD');
  }

  set dateRangeFrom(value: string) {
    this._dateRangeFrom.set(new Date(value));
  }

  get dateRangeTo(): string {
    return moment(this._dateRangeTo()).format('YYYY-MM-DD');
  }

  set dateRangeTo(value: string) {
    this._dateRangeTo.set(new Date(value));
  }

}
