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
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {switchMap, tap} from 'rxjs';
import {toObservable, toSignal} from '@angular/core/rxjs-interop';
import {HttpResponse} from '@angular/common/http';
import {StatisticsApiService} from '../../../../api/statistics-api.service';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faSave} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'tafel-statistics-misc',
  templateUrl: 'statistics-misc.component.html',
  imports: [
    CommonModule,
    MatCardModule,
    FormsModule,
    MatButtonModule,
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
    MatPaginatorModule
  ]
})
export class StatisticsMiscComponent {
  private readonly statisticsApiService = inject(StatisticsApiService);
  private readonly fileHelperService = inject(FileHelperService);

  schoolStarterPackageAgeMin = signal<number>(6);
  schoolStarterPackageAgeMax = signal<number>(10);
  schoolStarterPackageAgeRange = computed(() => ({
    min: this.schoolStarterPackageAgeMin(),
    max: this.schoolStarterPackageAgeMax()
  }));
  schoolStarterPackageData = toSignal(
    toObservable(this.schoolStarterPackageAgeRange).pipe(
      tap(() => this.pageIndex.set(0)),
      switchMap(range => this.statisticsApiService.getSchoolStarterPackageData(range.min, range.max))
    )
  );
  schoolStarterPackageColumns = ['householdId', 'firstname', 'lastname', 'age'];

  pageIndex = signal(0);
  pageSize = signal(10);
  pagedSchoolStarterPackageData = computed(() => {
    const data = this.schoolStarterPackageData() ?? [];
    const start = this.pageIndex() * this.pageSize();
    return data.slice(start, start + this.pageSize());
  });

  onPageChange(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  protected generateSchoolStarterPackageCsv() {
    const range = this.schoolStarterPackageAgeRange();
    this.statisticsApiService.generateSchoolStarterPackageCsv(range.min, range.max)
      .subscribe((response) => this.processCsvResponse(response));
  }

  private processCsvResponse(response: HttpResponse<Blob>) {
    const contentDisposition = response.headers.get('content-disposition')!;
    const filename = contentDisposition.split(';')[1].split('filename')[1].split('=')[1].trim();
    this.fileHelperService.downloadFile(filename, response.body!);
  }

  protected readonly faSave = faSave;
}
