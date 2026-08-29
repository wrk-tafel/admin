import {inject, Service} from '@angular/core';
import {ClientLogService} from './client-log.service';
import {SupportClientContext} from '../../api/support-api.service';

/**
 * What the browser can say about the situation a support request was written in. Sent with the
 * request so the answer to "which screen, which browser, what went wrong just before" is already in
 * the mail instead of costing a round of questions - see the backend's `SupportService`.
 *
 * Every value is read at the moment the request is sent, which is the state the reporter is
 * describing.
 */
@Service()
export class SupportContextService {
  private readonly clientLogService = inject(ClientLogService);
  private readonly window = inject(Window);

  /**
   * @param screenshot the page as a JPEG data URL, or null when none was taken or the reporter
   * chose not to send it - see `ScreenshotService`.
   */
  collect(screenshot: string | null = null): SupportClientContext {
    return {
      screenshot,
      // Deliberately not `location.href`: a search screen's query string is, in practice, a
      // customer's name, and `page` ends up in `mail_outbox` and the support mailbox - see GDPR
      // gap G25, issue #3506.
      page: this.window.location.origin + this.window.location.pathname,
      userAgent: this.window.navigator.userAgent,
      viewport: `${this.window.innerWidth}x${this.window.innerHeight}`,
      screen: `${this.window.screen.width}x${this.window.screen.height}`,
      language: this.window.navigator.language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      recentErrors: this.clientLogService.getEntries()
    };
  }
}
