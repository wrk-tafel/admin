import {effect, inject, Service} from '@angular/core';
import {AuthenticationService} from '../security/authentication.service';
import {SseService} from './sse.service';

/**
 * Ties the tab's event stream to its session. `SseService` keeps a stream open for as long as
 * anything subscribes to a topic, and some subscribers live as long as the page does (the config
 * stream of `ConfigApiService`) - so without this a tab that was logged out, or that still owes its
 * second factor, asks every 30 seconds for a stream the server can only refuse, for as long as it
 * stays open.
 *
 * - The stream exists only while the login is complete ({@link AuthenticationService#hasCompletedLogin}).
 * - A stream the server refuses is the one sign a tab nobody touches gets that its session ran
 *   out: it makes no other request an expired session could answer. So a refusal asks the server,
 *   and a `401` there ends the session in the tab too - which is what stops the retries.
 *
 * `init()` is called once at startup (see `app.config.ts`).
 */
@Service()
export class SseSessionService {
  private readonly sseService = inject(SseService);
  private readonly authenticationService = inject(AuthenticationService);

  constructor() {
    effect(() => this.sseService.setEnabled(this.authenticationService.hasCompletedLogin()));
  }

  init() {
    this.sseService.refused.subscribe(() => {
      if (this.authenticationService.isAuthenticated()) {
        this.authenticationService.checkSessionStillValid();
      }
    });
  }
}
