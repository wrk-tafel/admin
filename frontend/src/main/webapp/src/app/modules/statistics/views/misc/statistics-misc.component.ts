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
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {switchMap} from 'rxjs';
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
    MatTable
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
      switchMap(range => this.statisticsApiService.getSchoolStarterPackageData(range.min, range.max))
    )
  );
  schoolStarterPackageColumns = ['householdId', 'firstname', 'lastname', 'age'];

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
