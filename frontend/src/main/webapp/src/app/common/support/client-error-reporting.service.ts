import {inject, Service} from '@angular/core';
import {ClientLogEntry, ClientLogService} from './client-log.service';
import {ClientErrorApiService} from '../../api/client-error-api.service';

/**
 * No more than this many reports go out per session, regardless of how many distinct messages are
 * seen - a hard ceiling under {@link reportedMessages}'s per-message dedup, for a message that
 * embeds something that differs on every occurrence (e.g. a household id) and would otherwise
 * dodge that dedup entirely. The backend's own per-IP rate limit (`RateLimitFilter`, scope
 * `clientError`) is the actual backstop shared across every session; this just keeps one broken
 * session from leaning on it.
 */
const MAX_REPORTS_PER_SESSION = 20;

/**
 * Sends every entry {@link ClientLogService} records on to the backend log as it happens, so a
 * client-side failure is discoverable without a user first noticing it and writing a support
 * request about it (issue #3512). Best-effort: a failed report is neither retried nor surfaced to
 * the user, since it is not itself something the reporter caused or can act on.
 *
 * An identical message is only ever reported once per session - a render loop throwing the same
 * error every frame must not turn into a request storm - on top of the hard cap above.
 *
 * `init()` is called once at startup (see `app.config.ts`), same as
 * `ClientLogService.captureGlobalErrors`.
 */
@Service()
export class ClientErrorReportingService {
  private readonly clientLogService = inject(ClientLogService);
  private readonly clientErrorApiService = inject(ClientErrorApiService);
  private readonly window = inject(Window);

  private readonly reportedMessages = new Set<string>();
  private reportCount = 0;

  init() {
    this.clientLogService.onRecord.subscribe(entry => this.report(entry));
  }

  private report(entry: ClientLogEntry) {
    if (this.reportCount >= MAX_REPORTS_PER_SESSION || this.reportedMessages.has(entry.message)) {
      return;
    }
    this.reportedMessages.add(entry.message);
    this.reportCount++;

    this.clientErrorApiService.reportClientError(
      entry.message,
      // Deliberately not `location.href`: a search screen's query string is, in practice, a
      // customer's name - see GDPR gap G25, issue #3506, and `SupportContextService.collect`.
      this.window.location.origin + this.window.location.pathname,
      this.window.navigator.userAgent
    ).subscribe({error: () => { /* best-effort; a failed report is not itself worth reporting */ }});
  }
}
