import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';

@Service()
export class SupportApiService {
  private readonly http = inject(HttpClient);

  createSupportRequest(text: string): Observable<void> {
    return this.http.post<void>('/support', {text});
  }
}
