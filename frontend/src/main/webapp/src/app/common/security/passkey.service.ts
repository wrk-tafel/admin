import {Service} from '@angular/core';

/**
 * The browser's half of a passkey ceremony (WebAuthn): turns the options the backend hands out into a call to the
 * authenticator, and the answer back into JSON for the backend - see `MfaApiService` for the calls around it.
 *
 * The options travel as JSON in both directions, converted by the browser itself
 * (`PublicKeyCredential.parseCreationOptionsFromJSON()` / `parseRequestOptionsFromJSON()` / `toJSON()`), so no
 * base64 handling lives here. A browser without those is treated as one without passkeys ({@link isSupported}).
 */
@Service()
export class PasskeyService {

  isSupported(): boolean {
    return typeof PublicKeyCredential !== 'undefined'
      && typeof PublicKeyCredential.parseCreationOptionsFromJSON === 'function'
      && typeof PublicKeyCredential.parseRequestOptionsFromJSON === 'function';
  }

  /** Creates a passkey for the registration options; rejects when the user cancels or the authenticator refuses. */
  async create(options: PasskeyOptions): Promise<PasskeyCredential> {
    const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(options as unknown as PublicKeyCredentialCreationOptionsJSON);
    return this.toJson(await navigator.credentials.create({publicKey}));
  }

  /** Asks one of the passkeys the login options allow for an assertion; rejects when the user cancels. */
  async get(options: PasskeyOptions): Promise<PasskeyCredential> {
    const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(options as unknown as PublicKeyCredentialRequestOptionsJSON);
    return this.toJson(await navigator.credentials.get({publicKey}));
  }

  private toJson(credential: Credential | null): PasskeyCredential {
    if (credential === null) {
      throw new Error('No credential returned');
    }
    return (credential as PublicKeyCredential).toJSON();
  }
}

/** WebAuthn options in their JSON form, as the backend sends them - opaque to everything but the browser. */
export type PasskeyOptions = Record<string, unknown>;

/** A `PublicKeyCredential` in its JSON form, as the backend verifies it - opaque to everything but the two ends. */
export type PasskeyCredential = object;
