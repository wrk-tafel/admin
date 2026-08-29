import {HttpContextToken} from '@angular/common/http';

/**
 * Per-request opt-out from `errorHandlerInterceptor` recording a failure in `ClientLogService`.
 * Set on the client-error-reporting request itself (`ClientErrorApiService`) - without it, a
 * failed report (e.g. rate-limited with a `429`) would be recorded as a new client-log entry,
 * which `ClientErrorReportingService` would then try to report in turn.
 */
export const SUPPRESS_CLIENT_LOG_RECORD = new HttpContextToken<boolean>(() => false);
