import {Component, computed, inject, input, signal} from '@angular/core';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {
  StatisticsApiService,
  StatisticsData,
  StatisticsDetailData,
  StatisticsDistribution,
  StatisticsSettings
} from '../../../../api/statistics-api.service';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import dayjs from 'dayjs';
import {CommonModule, DatePipe} from '@angular/common';
import {catchError, filter, forkJoin, map, Observable, of, switchMap, tap} from 'rxjs';
import {takeUntilDestroyed, toObservable} from '@angular/core/rxjs-interop';
import {StatisticsPanelComponent} from '../../components/statistics-panel.component';
import {
  COMPARISON_LABELS,
  DateRange,
  DateRangeMode,
  previousDateRange
} from '../../components/statistics-comparison';
import {HttpResponse} from '@angular/common/http';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {parseContentDispositionFilename} from '../../../../common/util/content-disposition.util';
import {MatIcon} from '@angular/material/icon';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import saveIcon from '@material-symbols/svg-400/outlined/save-fill.svg';

const DATE_FORMAT = 'DD.MM.YYYY';

@Component({
  selector: 'tafel-statistics-general',
  templateUrl: 'statistics-general.component.html',
  providers: [DatePipe],
  imports: [
    CommonModule,
    MatCardModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    StatisticsPanelComponent,
    MatIcon
  ]
})
export class StatisticsGeneralComponent {
  private readonly registerIcons = registerSvgIcons({save: saveIcon});

  readonly settings = input<StatisticsSettings>();
  private readonly statisticsApiService = inject(StatisticsApiService);
  private readonly fileHelperService = inject(FileHelperService);
  private readonly datePipe = inject(DatePipe);

  _dateRangeFrom = signal<Date>(dayjs().startOf('year').toDate());
  _dateRangeTo = signal<Date>(dayjs().toDate());
  dateRange = computed<DateRange>(() => ({
    from: this._dateRangeFrom(),
    to: this._dateRangeTo()
  }));

  selectedMode = signal<DateRangeMode>('currentYear');
  selectedYear = signal<number>(dayjs().year());
  selectedDistribution = signal<StatisticsDistribution | undefined>(undefined);

  /**
   * Free-typed override text for the distribution autocomplete - present only while the user is
   * actively narrowing the list; absent (falling back to the selected distribution's label) once a
   * selection commits, on blur without one, or on initial load - same pattern as the customer form's
   * country autocomplete, so a half-typed search never overwrites the actual selection.
   */
  private readonly distributionFilterOverride = signal<string | null>(null);

  distributionDisplayText = computed(() =>
    this.distributionFilterOverride() ?? this.distributionLabel(this.selectedDistribution()));

  /**
   * The distributions list grows by one every week the app runs, so - unlike the small, static
   * dropdowns elsewhere on this screen - it gets an autocomplete rather than a plain select. The
   * leading `undefined` entry mirrors the select's blank option, so the field can be cleared back to
   * "no distribution chosen" the same way it always could.
   */
  distributionOptions = computed(() => {
    const options: (StatisticsDistribution | undefined)[] = [undefined, ...(this.settings()?.distributions ?? [])];
    const term = this.distributionDisplayText().trim().toLowerCase();
    return term ? options.filter(distribution => this.distributionLabel(distribution).toLowerCase().includes(term)) : options;
  });

  distributionLabel(distribution: StatisticsDistribution | undefined): string {
    return distribution ? this.datePipe.transform(distribution.startDate, 'EEEE, dd.MM.yyyy') ?? '' : '';
  }

  /**
   * `MatAutocompleteTrigger` fires its `ControlValueAccessor` onChange - wired to `(ngModelChange)`
   * - with a selected option's raw value on selection, not just with typed text; that runs *before*
   * `(optionSelected)` (see `_setValueAndClose` in Angular Material's autocomplete source), so a
   * selection would otherwise briefly overwrite the filter override with a `StatisticsDistribution`
   * object instead of a string. `distributionOptions` calls `.trim()` on that override to build the
   * filtered list, so a non-string override throws there - which can leave the panel showing no
   * options at all if anything reads the computed signal in that window (#3654). Only genuinely
   * typed text narrows the list; a selection is `onDistributionSelected`'s job.
   */
  onDistributionInput(value: string | StatisticsDistribution): void {
    if (typeof value !== 'string') {
      return;
    }
    this.distributionFilterOverride.set(value);
  }

  onDistributionBlur(): void {
    this.distributionFilterOverride.set(null);
  }

  /**
   * `MatAutocompleteTrigger` writes a selected option's raw value straight into the native input
   * itself - bypassing `distributionDisplayText` - whenever the bound value changes, and also
   * whenever it doesn't (e.g. re-picking the already-selected option): Angular's own template
   * binding then skips the write-back because `distributionDisplayText()` didn't change, leaving
   * the raw value's `toString()` ("[object Object]") stuck in the field. `displayWith` is what
   * `MatAutocompleteTrigger` itself calls to render any value, selection included, so routing it
   * through the same label function closes that gap. Our own writes already pass a formatted
   * string through unchanged.
   */
  distributionAutocompleteDisplay = (value: StatisticsDistribution | string | undefined): string =>
    typeof value === 'string' ? value : this.distributionLabel(value);

  /**
   * A range read "von 01.06. bis 01.01." matches nothing, and a date input cleared mid-edit holds
   * no date at all - both are rejected here rather than sent, so the last valid answer stays on
   * screen while the second date is still being typed.
   */
  dateRangeInverted = computed(() => this.dateRangeComplete()
    && dayjs(this._dateRangeFrom()).isAfter(dayjs(this._dateRangeTo()), 'day'));
  dateRangeInvalid = computed(() => !this.dateRangeComplete() || this.dateRangeInverted());

  private dateRangeComplete = computed(() => dayjs(this._dateRangeFrom()).isValid() && dayjs(this._dateRangeTo()).isValid());

  /** The period every key figure is compared against - see `previousDateRange`. */
  comparisonRange = computed(() => previousDateRange(
    this.selectedMode(),
    this.dateRange(),
    this.settings()?.distributions ?? [],
    this.selectedDistribution()
  ));
  comparisonLabel = computed(() => COMPARISON_LABELS[this.selectedMode()]);

  statisticsData = signal<StatisticsData | undefined>(undefined);
  comparisonData = signal<StatisticsData | undefined>(undefined);
  loading = signal<boolean>(true);
  loadFailed = signal<boolean>(false);

  /**
   * The range the numbers on screen actually belong to, and the one they are compared against.
   * Reading the picker instead would relabel them the moment someone changes it, before the
   * matching response has arrived.
   */
  appliedRange = signal<DateRange>(this.dateRange());
  appliedComparisonRange = signal<DateRange | undefined>(undefined);

  rangeLabel = computed(() => this.formatRange(this.appliedRange()));
  comparisonRangeLabel = computed(() => {
    const range = this.appliedComparisonRange();
    return range ? this.formatRange(range) : '';
  });

  yearOptions = computed(() => {
    const years = new Set(this.settings()?.availableYears ?? []);
    years.add(dayjs().year());
    return Array.from(years).sort((a, b) => b - a);
  });

  currentYear = computed(() => dayjs().year());
  previousYear = computed(() => this.currentYear() - 1);

  /**
   * The distributions the applied range covers. Shelters and logistics are recorded per
   * distribution, so a range without any is why those key figures read zero - which is worth saying
   * outright instead of leaving ten empty cards to be interpreted.
   */
  distributionsInRange = computed(() => {
    const range = this.appliedRange();
    const from = dayjs(range.from);
    const to = dayjs(range.to);

    return (this.settings()?.distributions ?? []).filter(distribution => {
      const startDate = dayjs(distribution.startDate);
      return !startDate.isBefore(from, 'day') && !startDate.isAfter(to, 'day');
    }).length;
  });

  /**
   * The ten key figures in the three groups they are read in. Building them here rather than
   * repeating the same panel ten times in the template is what keeps the comparison, the period
   * labels and the loading state identical across all of them - a new key figure is one entry in
   * this list.
   */
  panelGroups = computed<StatisticsPanelGroup[]>(() => {
    const current = this.statisticsData();
    const previous = this.comparisonData();
    const group = (title: string, keys: (keyof StatisticsData)[]): StatisticsPanelGroup => ({
      title: title,
      panels: keys.map(key => ({
        key: key,
        data: current?.[key],
        comparison: previous?.[key]
      }))
    });

    return [
      group('Kunden und Personen', [
        'beneficiaryCustomers',
        'beneficiaryPersons',
        'beneficiaryCustomersWithChildren',
        'singleParentHouseholds'
      ]),
      group('Transport- / Logistik', ['shopsCount', 'shopItemsTotal', 'shopItemsAverage']),
      group('Notschlafstellen', ['sheltersCount', 'sheltersAverage', 'sheltersPersonsCount'])
    ];
  });

  constructor() {
    toObservable(computed(() => ({range: this.dateRange(), comparison: this.comparisonRange()})))
      .pipe(
        filter(() => !this.dateRangeInvalid()),
        tap(() => {
          this.loading.set(true);
          this.loadFailed.set(false);
        }),
        switchMap(query => this.loadData(query.range, query.comparison)),
        takeUntilDestroyed()
      )
      .subscribe(result => {
        this.loading.set(false);
        if (result) {
          this.statisticsData.set(result.current);
          this.comparisonData.set(result.previous);
          this.appliedRange.set(result.range);
          this.appliedComparisonRange.set(result.comparison);
        }
      });
  }

  /**
   * Both periods are fetched at once from the same endpoint with shifted dates - the comparison is
   * the second answer to the same question, not a second endpoint. A failing comparison alone
   * leaves the key figures themselves standing; they are what the screen is for.
   */
  private loadData(range: DateRange, comparison: DateRange | undefined): Observable<LoadedStatistics | undefined> {
    return forkJoin({
      current: this.statisticsApiService.getData(range.from, range.to),
      previous: comparison
        ? this.statisticsApiService.getData(comparison.from, comparison.to).pipe(catchError(() => of(undefined)))
        : of(undefined)
    }).pipe(
      map(response => ({
        range: range,
        comparison: response.previous ? comparison : undefined,
        current: response.current,
        previous: response.previous
      })),
      catchError(() => {
        this.loadFailed.set(true);
        return of(undefined);
      })
    );
  }

  onModeChange(mode: DateRangeMode): void {
    this.selectedMode.set(mode);
    if (mode === 'year') {
      this.applyYear(this.selectedYear());
    } else if (mode === 'currentYear') {
      this.applyYear(this.currentYear());
    } else if (mode === 'previousYear') {
      this.applyYear(this.previousYear());
    } else if (mode === 'currentMonth') {
      this._dateRangeFrom.set(dayjs().startOf('month').toDate());
      this._dateRangeTo.set(dayjs().toDate());
    }
  }

  onYearSelected(year: number): void {
    this.selectedYear.set(year);
    this.applyYear(year);
  }

  private applyYear(year: number): void {
    const isCurrentYear = year === dayjs().year();
    this._dateRangeFrom.set(dayjs().year(year).startOf('year').toDate());
    this._dateRangeTo.set(isCurrentYear ? dayjs().toDate() : dayjs().year(year).endOf('year').toDate());
  }

  onDistributionSelected(distribution: StatisticsDistribution | undefined): void {
    this.selectedDistribution.set(distribution);
    this.distributionFilterOverride.set(null);
    if (distribution) {
      this._dateRangeFrom.set(new Date(distribution.startDate));
      this._dateRangeTo.set(new Date(distribution.endDate));
    }
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
    const range = this.appliedRange();
    this.statisticsApiService.generateCsv(range.from, range.to)
      .subscribe((response) => this.processCsvResponse(response));
  }

  private processCsvResponse(response: HttpResponse<Blob>) {
    const filename = parseContentDispositionFilename(response.headers.get('content-disposition')!);
    this.fileHelperService.downloadFile(filename, response.body!);
  }

  private formatRange(range: DateRange): string {
    return `${dayjs(range.from).format(DATE_FORMAT)} - ${dayjs(range.to).format(DATE_FORMAT)}`;
  }

}

export interface StatisticsPanelGroup {
  title: string;
  panels: {
    key: keyof StatisticsData;
    data?: StatisticsDetailData;
    comparison?: StatisticsDetailData;
  }[];
}

interface LoadedStatistics {
  range: DateRange;
  comparison?: DateRange;
  current: StatisticsData;
  previous?: StatisticsData;
}
