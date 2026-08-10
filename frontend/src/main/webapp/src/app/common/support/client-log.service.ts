import {Service} from '@angular/core';

export interface ClientLogEntry {
  timestamp: string;
  message: string;
}

/**
 * The tail of this browser session's errors, kept so a support request can carry it along - the
 * one thing a report is usually missing and the reporter can never supply, because the failure they
 * describe has by then scrolled out of a console nobody opened.
 *
 * In memory only and deliberately short: it exists to be attached to a request the user chose to
 * send, not to become a second log of its own. The caps match what the backend accepts for a
 * support request's `recentErrors`, so a long session can't grow a payload that gets rejected.
 */
const MAX_ENTRIES = 20;
const MAX_MESSAGE_LENGTH = 1000;

@Service()
export class ClientLogService {
  private entries: ClientLogEntry[] = [];

  record(message: string) {
    const entry: ClientLogEntry = {
      timestamp: formatTimestamp(new Date()),
      message: message.slice(0, MAX_MESSAGE_LENGTH)
    };
    this.entries = [...this.entries, entry].slice(-MAX_ENTRIES);
  }

  getEntries(): ClientLogEntry[] {
    return [...this.entries];
  }

  /**
   * Everything that fails outside the two paths that report themselves - the HTTP error
   * interceptor and `TafelErrorHandler`. Without this, an error thrown in a plain browser event
   * handler, a promise nobody awaited, or a script/image/stylesheet that never loaded is in the
   * console the reporter is not looking at and in no support mail at all.
   *
   * Registered once at startup (see `app.config.ts`) and never removed - the log lives as long as
   * the page does. The global `window` rather than the injected one on purpose: this service hangs
   * off the HTTP error interceptor, so every component test that lets a request through would
   * otherwise have to provide a `Window` it has no other use for.
   */
  captureGlobalErrors() {
    // capture phase: a failed subresource fires `error` at the element itself and the event does
    // not bubble, so a listener on the window only sees it on the way down.
    window.addEventListener('error', event => this.recordErrorEvent(event), true);
    window.addEventListener('unhandledrejection', event =>
      this.record(`Unbehandelter Promise-Fehler: ${describeError(event.reason)}`));
  }

  private recordErrorEvent(event: ErrorEvent) {
    const target = event.target;
    if (target && target !== window) {
      const element = target as HTMLElement & {src?: string, href?: string};
      this.record(`Ressource nicht geladen: ${element.tagName?.toLowerCase()} ${element.src ?? element.href ?? ''}`.trim());
      return;
    }
    this.record(event.error ? describeError(event.error) : event.message);
  }
}

/**
 * The reporter's own clock, in the format the support mail states the report's time in - so "when
 * did this fail" and "when was this reported" can be read against each other. A UTC timestamp reads
 * as an hour or two off in the mail, which is worse than no timestamp at all.
 */
function formatTimestamp(date: Date): string {
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** An error as one line, whatever was actually thrown - not everything thrown is an `Error`. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return `Fehler: ${String(error)}`;
}
