import {HttpContextToken} from '@angular/common/http';

/**
 * Per-request opt-out from the generic error toast in `errorHandlerInterceptor`. Set on a request
 * when the caller fully owns presenting the error to the user (e.g. an inline form validation
 * message, a custom confirm-dialog, or a deliberately-swallowed background request) - the
 * interceptor still re-throws the error either way, this only silences its own toast.
 *
 * Does NOT affect the unconditional 401 "session expired" redirect - that remains cross-cutting.
 */
export const SUPPRESS_ERROR_TOAST = new HttpContextToken<boolean>(() => false);
