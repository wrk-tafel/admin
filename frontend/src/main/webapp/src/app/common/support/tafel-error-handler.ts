import {ErrorHandler, inject, Service} from '@angular/core';
import {ClientLogService, describeError} from './client-log.service';

/**
 * Angular's own error handling, plus a note in {@link ClientLogService} so an uncaught error is
 * still around when the user gets as far as writing a support request about it. Everything Angular
 * did before still happens - this only observes.
 *
 * Angular's default `ErrorHandler.handleError` itself logs `error` via `console.error`, which
 * `ClientLogService` also captures (see `captureGlobalErrors`) - forwarding to it under
 * {@link ClientLogService.runWithConsoleCaptureSuppressed} is what keeps that from recording the
 * same error a second time right after the explicit `record()` below.
 */
@Service()
export class TafelErrorHandler extends ErrorHandler {
  private readonly clientLogService = inject(ClientLogService);

  override handleError(error: unknown): void {
    this.clientLogService.record(describeError(error));
    this.clientLogService.runWithConsoleCaptureSuppressed(() => super.handleError(error));
  }
}
