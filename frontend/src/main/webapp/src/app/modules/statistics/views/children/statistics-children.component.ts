import {Component, computed, inject, signal} from '@angular/core';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable
} from '@angular/material/table';
import {MatPaginatorModule, PageEvent} from '@angular/material/paginator';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators} from '@angular/forms';
import {HttpResponse} from '@angular/common/http';
import {DatePipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {BaseChartDirective} from 'ng2-charts';
import dayjs from 'dayjs';
import {
  ChildrenAgeDistribution,
  ChildrenFilter,
  ChildrenSearchResult,
  StatisticsApiService
} from '../../../../api/statistics-api.service';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {AuthenticationService} from '../../../../common/security/authentication.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faSave} from '@fortawesome/free-solid-svg-icons';
import {PAGE_SIZE_OPTIONS} from '../../../../common/api/paged-response';

export const SCHOOL_AGE_PRESET = {ageMin: 6, ageMax: 15};
export const MIN_AGE = 0;
export const MAX_AGE = 120;

/**
 * Cross-field rule for the age range - a range read "von 10 bis 6" matches nothing at all, so it's
 * rejected on the group rather than sent to the backend (which rejects it too, see
 * `StatisticsService.validateAgeRange`).
 */
export function ageRangeValidator(group: AbstractControl): ValidationErrors | null {
  const ageMin = group.get('ageMin')!.value;
  const ageMax = group.get('ageMax')!.value;

  if (ageMin == null || ageMax == null) {
    return null;
  }

  return ageMin <= ageMax ? null : {ageRange: true};
}

@Component({
  selector: 'tafel-statistics-children',
  templateUrl: 'statistics-children.component.html',
  styleUrl: 'statistics-children.component.scss',
  imports: [
    DatePipe,
    MatCardModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FaIconComponent,
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderCellDef,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRow,
    MatRowDef,
    MatTable,
    MatPaginatorModule,
    BaseChartDirective,
    RouterLink
  ]
})
export class StatisticsChildrenComponent {
  private readonly statisticsApiService = inject(StatisticsApiService);
  private readonly fileHelperService = inject(FileHelperService);
  private readonly authenticationService = inject(AuthenticationService);
  private readonly formBuilder = inject(FormBuilder);

  filterForm = this.formBuilder.group({
    ageMin: [6, [Validators.required, Validators.min(MIN_AGE), Validators.max(MAX_AGE)]],
    ageMax: [10, [Validators.required, Validators.min(MIN_AGE), Validators.max(MAX_AGE)]],
    referenceDate: [dayjs().format('YYYY-MM-DD'), Validators.required]
  }, {validators: ageRangeValidator});

  childrenData = signal<ChildrenSearchResult | undefined>(undefined);
  ageDistribution = signal<ChildrenAgeDistribution | undefined>(undefined);
  /**
   * The filter the data on screen was actually loaded with - what the headline and the export hint
   * describe. Reading the form instead would relabel the numbers the moment someone types, before
   * the matching response has arrived.
   */
  appliedFilter = signal<ChildrenFilter>(this.currentFilter());

  childrenColumns = ['householdId', 'firstname', 'lastname', 'age'];

  /**
   * Results come back ordered by household, so a household that sends more than one child appears
   * as consecutive rows - `firstOfHousehold` is what lets the template group them visually instead
   * of repeating the same household number down the column. Note a household can still be split
   * across two pages; the flag then simply marks the first row of the page.
   */
  rows = computed(() => {
    const items = this.childrenData()?.items ?? [];
    return items.map((entry, index) => ({
      ...entry,
      firstOfHousehold: index === 0 || items[index - 1].householdId !== entry.householdId
    }));
  });

  totalCount = computed(() => this.childrenData()?.totalCount ?? 0);

  canOpenHousehold = computed(() => this.authenticationService.hasPermission('CUSTOMER'));

  chartData = computed(() => {
    const items = this.ageDistribution()?.items ?? [];
    return {
      labels: items.map(item => `${item.age}`),
      datasets: [
        {
          label: 'Kinder',
          data: items.map(item => item.count),
          backgroundColor: '#5856d6',
          hoverBackgroundColor: '#5856d6',
          borderRadius: 4
        }
      ]
    };
  });

  /**
   * A canvas is invisible to a screen reader, so the same split is spelled out as the chart's
   * accessible name - the only way the age breakdown is readable without sight.
   */
  chartLabel = computed(() => {
    const items = this.ageDistribution()?.items ?? [];
    const breakdown = items.map(item => `${item.age} Jahre: ${item.count}`).join(', ');
    return `Verteilung nach Alter - ${breakdown}`;
  });

  chartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {display: false}
    },
    scales: {
      x: {
        title: {display: true, text: 'Alter in Jahren'},
        grid: {display: false}
      },
      y: {
        beginAtZero: true,
        ticks: {precision: 0}
      }
    }
  };

  constructor() {
    this.filterForm.valueChanges.subscribe(() => this.loadChildrenData());
    this.loadChildrenData();
  }

  applySchoolAgePreset() {
    this.filterForm.patchValue(SCHOOL_AGE_PRESET);
  }

  onPageChange(event: PageEvent) {
    this.loadChildrenData(event.pageIndex + 1, event.pageSize);
  }

  protected generateChildrenCsv() {
    this.statisticsApiService.generateChildrenCsv(this.appliedFilter())
      .subscribe((response) => this.processCsvResponse(response));
  }

  /**
   * An incomplete or inverted range (a cleared input while retyping a digit, "von 10 bis 6") is
   * left on screen without a request - the backend requires all three values and would answer with
   * an error the operator can't act on mid-edit.
   */
  private loadChildrenData(page?: number, pageSize?: number) {
    if (this.filterForm.invalid) {
      return;
    }

    const filter = this.currentFilter();
    this.appliedFilter.set(filter);

    this.statisticsApiService.getChildrenData(filter, page, pageSize)
      .subscribe((response) => this.childrenData.set(response));
    this.statisticsApiService.getChildrenAgeDistribution(filter)
      .subscribe((response) => this.ageDistribution.set(response));
  }

  private currentFilter(): ChildrenFilter {
    const value = this.filterForm.getRawValue();
    return {
      ageMin: value.ageMin!,
      ageMax: value.ageMax!,
      referenceDate: dayjs(value.referenceDate!).toDate()
    };
  }

  private processCsvResponse(response: HttpResponse<Blob>) {
    const contentDisposition = response.headers.get('content-disposition')!;
    const filename = contentDisposition.split(';')[1].split('filename')[1].split('=')[1].trim();
    this.fileHelperService.downloadFile(filename, response.body!);
  }

  protected readonly faSave = faSave;
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  protected readonly schoolAgePreset = SCHOOL_AGE_PRESET;
  protected readonly minAge = MIN_AGE;
  protected readonly maxAge = MAX_AGE;
}
