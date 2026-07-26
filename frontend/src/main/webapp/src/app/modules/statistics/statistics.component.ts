import {Component, computed, inject, input, signal} from '@angular/core';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {StatisticsApiService, StatisticsDistribution, StatisticsSettings} from '../../api/statistics-api.service';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import dayjs from 'dayjs';
import {CommonModule} from '@angular/common';
import {switchMap} from 'rxjs';
import {toObservable, toSignal} from '@angular/core/rxjs-interop';
import {StatisticsPanelComponent} from './components/statistics-panel.component';
import {HttpResponse} from '@angular/common/http';
import {FileHelperService} from '../../common/util/file-helper.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faSave} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'tafel-statistics',
  templateUrl: 'statistics.component.html',
  imports: [
    CommonModule,
    MatCardModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    StatisticsPanelComponent,
    FaIconComponent
  ]
})
export class StatisticsComponent {
  readonly settings = input<StatisticsSettings>();
  private readonly statisticsApiService = inject(StatisticsApiService);
  private readonly fileHelperService = inject(FileHelperService);

  _dateRangeFrom = signal<Date>(dayjs().startOf('year').toDate());
  _dateRangeTo = signal<Date>(dayjs().toDate());
  dateRange = computed(() => ({
    from: this._dateRangeFrom(),
    to: this._dateRangeTo()
  }));
  statisticsData = toSignal(
    toObservable(this.dateRange).pipe(
      switchMap(range => this.statisticsApiService.getData(range.from, range.to))
    )
  );

  onYearSelected(year: number | undefined) {
    if (year) {
      this._dateRangeFrom.set(dayjs().year(year).startOf('year').toDate());
      this._dateRangeTo.set(dayjs().year(year).endOf('year').toDate());
    }
  }

  onDistributionSelected(distribution: StatisticsDistribution | undefined): void {
    if (distribution) {
      this._dateRangeFrom.set(distribution.startDate);
      this._dateRangeTo.set(distribution.endDate);
    }
  }

  onSelectCurrentYear(): void {
    this._dateRangeFrom.set(dayjs().startOf('year').toDate());
    this._dateRangeTo.set(dayjs().toDate());
  }

  onSelectCurrentMonth(): void {
    this._dateRangeFrom.set(dayjs().startOf('month').toDate());
    this._dateRangeTo.set(dayjs().toDate());
  }

  get dateRangeFrom(): string {
    return dayjs(this._dateRangeFrom()).format('YYYY-MM-DD');
  }

  set dateRangeFrom(value: string) {
    this._dateRangeFrom.set(new Date(value));
  }

  get dateRangeTo(): string {
    return dayjs(this._dateRangeTo()).format('YYYY-MM-DD');
  }

  set dateRangeTo(value: string) {
    this._dateRangeTo.set(new Date(value));
  }

  protected generateCsv() {
    this.statisticsApiService.generateCsv(this.dateRange().from, this.dateRange().to)
      .subscribe((response) => this.processCsvResponse(response));
  }

  private processCsvResponse(response: HttpResponse<Blob>) {
    const contentDisposition = response.headers.get('content-disposition')!;
    const filename = contentDisposition.split(';')[1].split('filename')[1].split('=')[1].trim();
    this.fileHelperService.downloadFile(filename, response.body!);
  }

  protected readonly faSave = faSave;
}
