import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable, of} from 'rxjs';
import {catchError} from 'rxjs/operators';

@Service()
export class VersionApiService {
  private readonly http = inject(HttpClient);

  // Falls back to null rather than propagating - this footer detail shouldn't ever break
  // rendering the sidebar just because the version endpoint is unreachable.
  getVersion(): Observable<VersionInfo | null> {
    return this.http.get<VersionInfo>('/version').pipe(
      catchError(() => of(null))
    );
  }
}

export interface VersionInfo {
  version: string;
  buildTime: string;
}
