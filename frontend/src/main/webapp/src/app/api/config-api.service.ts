import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {merge, Observable, of} from 'rxjs';
import {catchError, shareReplay} from 'rxjs/operators';
import {SseService} from '../common/sse/sse.service';

/**
 * Deployment-wide configuration of the backend this frontend is talking to - the running release
 * and which optional features this environment has switched on. Anything a user can change at
 * runtime belongs in SettingsApiService instead.
 */
@Service()
export class ConfigApiService {
  private readonly http = inject(HttpClient);
  private readonly sseService = inject(SseService);

  // Falls back to null rather than propagating - config is used for a footer detail and for hiding
  // optional controls, neither of which should break rendering just because the endpoint is
  // unreachable. Callers treat null as "assume nothing optional is available".
  private readonly config$ = merge(
    this.http.get<AppConfig>('/config').pipe(catchError(() => of(null))),
    this.sseService.listen<AppConfig>('/sse/config')
  ).pipe(
    // One request and one SSE connection for the whole session no matter how many components read
    // the config, and a component created later starts from the value already known instead of
    // fetching it again. refCount stays false so the stream survives the last subscriber going
    // away - a dialog closing shouldn't tear down the app's config connection.
    shareReplay({bufferSize: 1, refCount: false})
  );

  /**
   * The current config, re-emitted whenever it changes in the backend. The deployment's config file
   * can be edited while the app is open (see the backend's `ConfigFileReloadService`), so a feature
   * being switched off has to reach an already-open session - components must follow this stream
   * rather than reading it once at construction.
   */
  observeConfig(): Observable<AppConfig | null> {
    return this.config$;
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
   * (`tafeladmin.storage.scannerPath` / `tafeladmin.features.scannerFolderEnabled`). False means the "Scanner" document
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
  /**
   * How long an account stays locked after too many failed logins, mirroring the backend's
   * `security.loginAttempts.lockoutDurationInSeconds`. Shown in the login page's lockout message so
   * it tells the user something true rather than a hardcoded guess.
   */
  accountLockoutDurationInSeconds: number;
}
