import {HttpClient, HttpContext} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';

/**
 * "Passwort vergessen?" - both calls are made without a session. The request is always answered with
 * `202`, whether an account was found or not; a confirm answers `204`, `400` (the password policy
 * refused the password) or `410` (the link is unknown, expired or used).
 */
@Service()
export class PasswordResetApiService {
  private readonly http = inject(HttpClient);

  requestReset(identifier: string, context?: HttpContext): Observable<void> {
    return this.http.post<void>('/password-reset/request', {identifier} satisfies PasswordResetRequest, {context});
  }

  confirmReset(token: string, newPassword: string, context?: HttpContext): Observable<void> {
    return this.http.post<void>('/password-reset/confirm', {token, newPassword} satisfies PasswordResetConfirmRequest, {context});
  }
}

interface PasswordResetRequest {
  identifier: string;
}

interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

/** The body of a refused confirm. */
export interface PasswordResetConfirmResponse {
  message: string;
  details?: string[];
}
