import {HttpClient, HttpContext} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {PasskeyCredential, PasskeyOptions} from '../common/security/passkey.service';

/**
 * Two-factor authentication - the caller's own account only, see `MfaController` on the backend. A user can have
 * two methods side by side, a code from an authenticator app (`TOTP`) and a code sent by e-mail (`EMAIL`), and
 * either completes a login. A rejected code comes back as a `400` carrying a message, so every call that takes one
 * is best made with the generic error toast suppressed and the message shown next to the field instead.
 *
 * On top of a method a user can have passkeys, each of which completes a login in place of a code. The browser's
 * side of those calls - talking to the authenticator - is `PasskeyService`; the options and credentials pass
 * through here as the JSON the browser produces.
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

  /** Hands out the options the browser creates a passkey from; nothing counts until {@link enablePasskey}. */
  setupPasskey(context?: HttpContext): Observable<MfaPasskeyOptions> {
    return this.http.post<MfaPasskeyOptions>('/mfa/passkey/setup', null, {context});
  }

  /** Adds the passkey the browser created, under `name` - with `currentCode` of a method the user has. */
  enablePasskey(credential: PasskeyCredential, name: string, currentCode: string, context?: HttpContext): Observable<void> {
    return this.http.post<void>('/mfa/passkey/enable', {credential, name, currentCode}, {context});
  }

  /** Removes one passkey; the code comes from a method the user has. */
  disablePasskey(passkeyId: number, code: string, context?: HttpContext): Observable<void> {
    return this.http.post<void>(`/mfa/passkey/${passkeyId}/disable`, {code}, {context});
  }

  /** Hands out the options a login that owes its second step asks a passkey with. */
  passkeyLoginOptions(context?: HttpContext): Observable<MfaPasskeyOptions> {
    return this.http.post<MfaPasskeyOptions>('/mfa/passkey/login-options', null, {context});
  }

  /** The second step of a login with a passkey instead of a code; the answer replaces the session cookie. */
  verifyPasskey(credential: PasskeyCredential, context?: HttpContext): Observable<void> {
    return this.http.post<void>('/mfa/passkey/verify', {credential}, {context});
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
  /** The deployment has passkeys set up, so they can be offered. */
  passkeyAvailable?: boolean;
  passkeys?: MfaPasskeyItem[];
}

export interface MfaPasskeyItem {
  id: number;
  /** What the user called it. */
  name: string;
  createdAt?: string | null;
  lastUsedAt?: string | null;
}

export interface MfaPasskeyOptions {
  options: PasskeyOptions;
}

export interface MfaSetup {
  /** The shared secret, for typing into an authenticator app by hand. */
  secret: string;
  /** The `otpauth://` address the QR code is drawn from. */
  otpauthUri: string;
}
