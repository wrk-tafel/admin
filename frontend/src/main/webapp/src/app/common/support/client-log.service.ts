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
      timestamp: new Date().toISOString(),
      message: message.slice(0, MAX_MESSAGE_LENGTH)
    };
    this.entries = [...this.entries, entry].slice(-MAX_ENTRIES);
  }

  getEntries(): ClientLogEntry[] {
    return [...this.entries];
  }
}
