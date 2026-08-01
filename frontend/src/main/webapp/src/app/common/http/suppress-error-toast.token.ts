import {HttpContext, HttpContextToken} from '@angular/common/http';

/**
 * Per-request opt-out from the generic error toast in `errorHandlerInterceptor`. Set on a request
 * when the caller fully owns presenting the error to the user (e.g. an inline form validation
 * message, a custom confirm-dialog, or a deliberately-swallowed background request) - the
 * interceptor still re-throws the error either way, this only silences its own toast.
 *
 * Does NOT affect the unconditional 401 "session expired" redirect - that remains cross-cutting.
 */
export const SUPPRESS_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

/**
 * Ready-made context for the common case of opting a request out of the generic toast and nothing
 * else - pass it straight as `{context: SUPPRESS_ERROR_TOAST_CONTEXT}` instead of building a new
 * `HttpContext` per call site. Shared across all callers, so never call `.set()` on it: `HttpContext`
 * mutates in place, and doing so would leak extra context into every other request using this
 * constant. Build a request-local `HttpContext` instead if a call site ever needs to combine this
 * opt-out with other context data.
 */
export const SUPPRESS_ERROR_TOAST_CONTEXT = new HttpContext().set(SUPPRESS_ERROR_TOAST, true);
