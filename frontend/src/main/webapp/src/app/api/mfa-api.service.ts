import {HttpClient, HttpContext} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';

/**
 * Two-factor authentication - the caller's own account only, see `MfaController` on the backend. A user can have
 * two methods side by side, a code from an authenticator app (`TOTP`) and a code sent by e-mail (`EMAIL`), and
 * either completes a login. A rejected code comes back as a `400` carrying a message, so every call that takes one
 * is best made with the generic error toast suppressed and the message shown next to the field instead.
 */
@Service()
export class MfaApiService {
  private readonly http = inject(HttpClient);

  getStatus(): Observable<MfaStatus> {
    return this.http.get<MfaStatus>('/mfa');
  }

  /** Hands out a new secret for the authenticator app; it does not count until {@link enable} has seen a valid code. */
  setup(): Observable<MfaSetup> {
    return this.http.post<MfaSetup>('/mfa/setup', null);
  }

  /**
   * Switches the app on. A user who already has a method also hands in `currentCode` of it - a session that was left
   * open cannot put a second factor of its own next to the user's.
   */
  enable(code: string, currentCode: string | null = null, context?: HttpContext): Observable<void> {
    return this.http.post<void>('/mfa/enable', {code, currentCode}, {context});
  }

  /** Sends the code that proves the address works, as the first step of switching the e-mail method on. */
  setupEmail(context?: HttpContext): Observable<void> {
    return this.http.post<void>('/mfa/email/setup', null, {context});
  }

  /** Like {@link enable}, for the e-mail method: `currentCode` comes from a method the user has already. */
  enableEmail(code: string, currentCode: string | null = null, context?: HttpContext): Observable<void> {
    return this.http.post<void>('/mfa/email/enable', {code, currentCode}, {context});
  }

  /**
   * Sends the e-mailed code for a login that owes one, or - from a completed session - for switching a method off or
   * on, or for changing the address on the account. `429` inside the cooldown.
   */
  sendEmailCode(context?: HttpContext): Observable<void> {
    return this.http.post<void>('/mfa/email/send', null, {context});
  }

  /** Switches a method off; the code may come from either method the user has. */
  disable(method: MfaMethod, code: string, context?: HttpContext): Observable<void> {
    return this.http.post<void>('/mfa/disable', {method, code}, {context});
  }

  /** The second step of a login: hands in the code, and the answer replaces the session cookie. */
  verify(code: string, context?: HttpContext): Observable<void> {
    return this.http.post<void>('/mfa/verify', {code}, {context});
  }
}

export type MfaMethod = 'TOTP' | 'EMAIL';

export interface MfaStatus {
  totpEnabled: boolean;
  emailEnabled: boolean;
  /** The deployment requires every user to have a second factor. */
  required: boolean;
  /** A mail can be sent at all, so the e-mail method can be offered. */
  emailAvailable: boolean;
  /** Where a code by e-mail goes - the address on the account; null when none is on record. */
  emailAddress?: string | null;
}

export interface MfaSetup {
  /** The shared secret, for typing into an authenticator app by hand. */
  secret: string;
  /** The `otpauth://` address the QR code is drawn from. */
  otpauthUri: string;
}
