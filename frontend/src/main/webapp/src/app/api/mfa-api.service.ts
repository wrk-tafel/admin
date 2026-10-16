import {HttpClient, HttpContext} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {PasskeyCredential, PasskeyOptions} from '../common/security/passkey.service';

/**
 * Two-factor authentication - the caller's own account only, see `MfaController` on the backend. A user can have
 * three methods side by side - a code from an authenticator app (`TOTP`), a code sent by e-mail (`EMAIL`) and
 * passkeys - and any one completes a login. A rejected code comes back as a `400` carrying a message, so every
 * call that takes one is best made with the generic error toast suppressed and the message shown next to the
 * field instead.
 *
 * The browser's side of the passkey calls - talking to the authenticator - is `PasskeyService`; the options and
 * credentials pass through here as the JSON the browser produces.
 *
 * Changing a method takes proof of one the user already has ({@link MfaProof}); `null` for the first one.
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
   * Switches the app on. A user who already has a method also hands in proof of it - a session that was left
   * open cannot put a second factor of its own next to the user's.
   */
  enable(code: string, proof: MfaProof | null = null, context?: HttpContext): Observable<void> {
    return this.http.post<void>('/mfa/enable', {code, ...current(proof)}, {context});
  }

  /** Sends the code that proves the address works, as the first step of switching the e-mail method on. */
  setupEmail(context?: HttpContext): Observable<void> {
    return this.http.post<void>('/mfa/email/setup', null, {context});
  }

  /** Like {@link enable}, for the e-mail method. */
  enableEmail(code: string, proof: MfaProof | null = null, context?: HttpContext): Observable<void> {
    return this.http.post<void>('/mfa/email/enable', {code, ...current(proof)}, {context});
  }

  /**
   * Sends the e-mailed code for a login that owes one, or - from a completed session - for switching a method off or
   * on, or for changing the address on the account. `429` inside the cooldown.
   */
  sendEmailCode(context?: HttpContext): Observable<void> {
    return this.http.post<void>('/mfa/email/send', null, {context});
  }

  /** Switches a method off; the proof may be of any method the user has. */
  disable(method: MfaMethod, proof: MfaProof, context?: HttpContext): Observable<void> {
    return this.http.post<void>('/mfa/disable', {method, ...given(proof)}, {context});
  }

  /** The second step of a login: hands in the code, and the answer replaces the session cookie. */
  verify(code: string, context?: HttpContext): Observable<void> {
    return this.http.post<void>('/mfa/verify', {code}, {context});
  }

  /** Hands out the options the browser creates a passkey from; nothing counts until {@link enablePasskey}. */
  setupPasskey(context?: HttpContext): Observable<MfaPasskeyOptions> {
    return this.http.post<MfaPasskeyOptions>('/mfa/passkey/setup', null, {context});
  }

  /** Adds the passkey the browser created, under `name`; like {@link enable}, the answer replaces the session cookie. */
  enablePasskey(credential: PasskeyCredential, name: string, proof: MfaProof | null = null, context?: HttpContext): Observable<void> {
    return this.http.post<void>('/mfa/passkey/enable', {credential, name, ...current(proof)}, {context});
  }

  /** Removes one passkey; the proof may be of any method the user has. */
  disablePasskey(passkeyId: number, proof: MfaProof, context?: HttpContext): Observable<void> {
    return this.http.post<void>(`/mfa/passkey/${passkeyId}/disable`, given(proof), {context});
  }

  /**
   * Hands out the options one of the user's passkeys is asked with - for a login that owes its second step, or as
   * proof of an existing method ({@link MfaProof}).
   */
  passkeyOptions(context?: HttpContext): Observable<MfaPasskeyOptions> {
    return this.http.post<MfaPasskeyOptions>('/mfa/passkey/options', null, {context});
  }

  /** The second step of a login with a passkey; the answer replaces the session cookie. */
  verifyPasskey(credential: PasskeyCredential, context?: HttpContext): Observable<void> {
    return this.http.post<void>('/mfa/passkey/verify', {credential}, {context});
  }
}

function given(proof: MfaProof) {
  return {code: proof.code ?? null, credential: proof.credential ?? null};
}

function current(proof: MfaProof | null) {
  return {currentCode: proof?.code ?? null, currentCredential: proof?.credential ?? null};
}

export type MfaMethod = 'TOTP' | 'EMAIL';

/**
 * Proof of a method the user already has: a code of the app or the e-mail method, or what one of the user's
 * passkeys answered to {@link MfaApiService.passkeyOptions}.
 */
export interface MfaProof {
  code?: string;
  credential?: PasskeyCredential;
}

export interface MfaStatus {
  totpEnabled: boolean;
  emailEnabled: boolean;
  /** The deployment requires every user to have a second factor. */
  required: boolean;
  /** A mail can be sent at all, so the e-mail method can be offered. */
  emailAvailable: boolean;
  /** Where a code by e-mail goes - the address on the account; null when none is on record. */
  emailAddress?: string | null;
  passkeys?: MfaPasskeyItem[];
}

export interface MfaPasskeyItem {
  id: number;
  /** What the user called it. */
  name: string;
  /** What holds it, as far as the authenticator said when it was added. */
  kind?: MfaPasskeyKind;
  createdAt?: string | null;
  lastUsedAt?: string | null;
}

export type MfaPasskeyKind = 'DEVICE' | 'SECURITY_KEY' | 'UNKNOWN';

export interface MfaPasskeyOptions {
  options: PasskeyOptions;
}

export interface MfaSetup {
  /** The shared secret, for typing into an authenticator app by hand. */
  secret: string;
  /** The `otpauth://` address the QR code is drawn from. */
  otpauthUri: string;
}
