import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable, of} from 'rxjs';
import {catchError} from 'rxjs/operators';

/**
 * Deployment-wide configuration of the backend this frontend is talking to - the running release
 * and which optional features this environment has switched on. Everything here is fixed for the
 * lifetime of a deployment; anything a user can change at runtime belongs in SettingsApiService.
 */
@Service()
export class ConfigApiService {
  private readonly http = inject(HttpClient);

  // Falls back to null rather than propagating - config is used for a footer detail and for hiding
  // optional controls, neither of which should break rendering just because the endpoint is
  // unreachable. Callers treat null as "assume nothing optional is available".
  getConfig(): Observable<AppConfig | null> {
    return this.http.get<AppConfig>('/config').pipe(
      catchError(() => of(null))
    );
  }

  // The only part of the config readable before logging in - everything else stays behind
  // authentication, so the login page can ask for this and nothing more.
  getPublicConfig(): Observable<PublicAppConfig | null> {
    return this.http.get<PublicAppConfig>('/config/public').pipe(
      catchError(() => of(null))
    );
  }
}

export interface AppConfig {
  version: string;
  buildTime: string;
  /**
   * Whether this environment has the scanner folder configured and switched on
   * (`tafeladmin.storage.scannerPath` / `scannerEnabled`). False means the "Scanner" document
   * source must not be offered - it could never list anything.
   */
  scannerFolderEnabled: boolean;
}

export interface PublicAppConfig {
  /**
   * Which environment this deployment is ("DEV", "TEST"), empty on production. Shown on the login
   * page so it's obvious which one is being logged into.
   */
  environmentLabel: string;
}
