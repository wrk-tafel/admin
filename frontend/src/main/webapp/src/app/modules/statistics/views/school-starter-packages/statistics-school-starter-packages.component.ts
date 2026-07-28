import {Component, inject, signal} from '@angular/core';
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
import {HttpResponse} from '@angular/common/http';
import {SchoolStarterPackageSearchResult, StatisticsApiService} from '../../../../api/statistics-api.service';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faSave} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'tafel-statistics-school-starter-packages',
  templateUrl: 'statistics-school-starter-packages.component.html',
  imports: [
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
export class StatisticsSchoolStarterPackagesComponent {
  private readonly statisticsApiService = inject(StatisticsApiService);
  private readonly fileHelperService = inject(FileHelperService);

  schoolStarterPackageAgeMin = signal<number>(6);
  schoolStarterPackageAgeMax = signal<number>(10);
  schoolStarterPackageData = signal<SchoolStarterPackageSearchResult | undefined>(undefined);
  schoolStarterPackageColumns = ['householdId', 'firstname', 'lastname', 'age'];

  constructor() {
    this.loadSchoolStarterPackageData();
  }

  onAgeMinChange(value: number) {
    // A cleared input reports null/NaN while the user is mid-edit (e.g. retyping a digit) -
    // ageMin/ageMax are required backend query params, so skip firing a request until a full
    // number is entered again rather than sending an invalid value.
    if (value == null || isNaN(value)) {
      return;
    }
    this.schoolStarterPackageAgeMin.set(value);
    this.loadSchoolStarterPackageData();
  }

  onAgeMaxChange(value: number) {
    if (value == null || isNaN(value)) {
      return;
    }
    this.schoolStarterPackageAgeMax.set(value);
    this.loadSchoolStarterPackageData();
  }

  onPageChange(event: PageEvent) {
    this.loadSchoolStarterPackageData(event.pageIndex + 1);
  }

  private loadSchoolStarterPackageData(page?: number) {
    this.statisticsApiService.getSchoolStarterPackageData(
      this.schoolStarterPackageAgeMin(),
      this.schoolStarterPackageAgeMax(),
      page
    ).subscribe((response) => this.schoolStarterPackageData.set(response));
  }

  protected generateSchoolStarterPackageCsv() {
    this.statisticsApiService.generateSchoolStarterPackageCsv(
      this.schoolStarterPackageAgeMin(),
      this.schoolStarterPackageAgeMax()
    ).subscribe((response) => this.processCsvResponse(response));
  }

  private processCsvResponse(response: HttpResponse<Blob>) {
    const contentDisposition = response.headers.get('content-disposition')!;
    const filename = contentDisposition.split(';')[1].split('filename')[1].split('=')[1].trim();
    this.fileHelperService.downloadFile(filename, response.body!);
  }

  protected readonly faSave = faSave;
}
