import {HttpClient, HttpResponse} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';

@Service()
export class ReportingApiService {
  private readonly http = inject(HttpClient);

  generateSchoolStarterPackageCsv(): Observable<HttpResponse<Blob>> {
    return this.http.get('/reporting/school-starter-package/generate-csv',
      {
        responseType: 'blob',
        observe: 'response'
      });
  }

}
