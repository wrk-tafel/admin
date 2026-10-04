import {HttpContext, HttpContextToken} from '@angular/common/http';
import {SUPPRESS_ERROR_TOAST} from './suppress-error-toast.token';

/**
 * Per-request opt-out from `errorHandlerInterceptor` recording a failure in `ClientLogService`.
 * Set on the client-error-reporting request itself (`ClientErrorApiService`) - without it, a
 * failed report (e.g. rate-limited with a `429`) would be recorded as a new client-log entry,
 * which `ClientErrorReportingService` would then try to report in turn.
 */
export const SUPPRESS_CLIENT_LOG_RECORD = new HttpContextToken<boolean>(() => false);

/**
 * The error statuses a request's caller treats as an ordinary answer rather than a failure - a
 * lookup by number that finds nothing (`404`), a wrong code (`400`), the session check of a visitor
 * who is not logged in (`401`). `errorHandlerInterceptor` does not record those in
 * `ClientLogService`: nothing went wrong, and recorded they end up in the backend log as a client
 * error on every mistyped customer number. Any other status of the same request is still recorded.
 */
export const EXPECTED_ERROR_STATUSES = new HttpContextToken<readonly number[]>(() => []);

/**
 * Context for a request whose caller presents the error itself (no generic toast, see
 * `SUPPRESS_ERROR_TOAST`) and expects the given statuses as a normal outcome. A new `HttpContext`
 * per call, so it is safe to pass on and extend.
 */
export function expectedErrorContext(...statuses: number[]): HttpContext {
  return new HttpContext().set(SUPPRESS_ERROR_TOAST, true).set(EXPECTED_ERROR_STATUSES, statuses);
}
