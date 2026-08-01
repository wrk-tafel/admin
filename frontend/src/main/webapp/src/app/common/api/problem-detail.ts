import {HttpErrorResponse} from '@angular/common/http';

/** Mirrors Spring's RFC 7807 `ProblemDetail` (see the backend's `GenericExceptionHandler`). */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: { field: string; message: string }[];
}

export function isProblemDetail(body: unknown): body is ProblemDetail {
  return !!body && typeof body === 'object' && (body as object).constructor === Object;
}

const GENERIC_FALLBACK_MESSAGE = 'Es ist ein unerwarteter Fehler aufgetreten.';

/**
 * Statuses whose body typically carries no useful `detail`. Covers both statuses the backend
 * writes itself without going through `GenericExceptionHandler` (security-filter-level responses
 * like 403/423) and statuses that never reach the backend at all - `0` (no connection: offline,
 * DNS failure, CORS rejection) and `502`/`503`/`504` (reverse proxy / gateway responses emitted
 * when the backend process itself is unreachable, not something any controller ever sends).
 */
const STATUS_MESSAGE_OVERRIDES: Partial<Record<number, string>> = {
  0: 'Keine Verbindung zum Server!',
  403: 'Zugriff nicht erlaubt!',
  423: 'Konto vorübergehend gesperrt!',
  500: 'Interner Serverfehler!',
  502: 'Server nicht verfügbar!',
  503: 'Server nicht verfügbar!',
  504: 'Server nicht verfügbar!',
};

/**
 * User-safe message for an `HttpErrorResponse` - never returns Angular's raw technical
 * `error.message` (e.g. "Http failure response for /x: 500 Internal Server Error").
 */
export function extractErrorMessage(error: HttpErrorResponse): string {
  if (isProblemDetail(error.error) && error.error.detail) {
    return error.error.detail;
  }
  return STATUS_MESSAGE_OVERRIDES[error.status] ?? GENERIC_FALLBACK_MESSAGE;
}
