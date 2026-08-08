import {HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest} from '@angular/common/http';
import {inject} from '@angular/core';
import {Observable, throwError} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {CookieService} from 'ngx-cookie-service';

/**
 * Adds the CSRF token from the XSRF-TOKEN cookie as X-XSRF-TOKEN header on mutating requests.
 * Angular's built-in XSRF interceptor cannot be used here: it skips absolute URLs, and the
 * apiPathInterceptor turns every API request into an absolute URL.
 */
export const xsrfInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const cookieService = inject(CookieService);

  if (request.method === 'GET' || request.method === 'HEAD') {
    return next(request);
  }

  const send = (token: string | undefined): Observable<HttpEvent<unknown>> =>
    next(token ? request.clone({headers: request.headers.set('X-XSRF-TOKEN', token)}) : request);

  const initialToken = cookieService.get('XSRF-TOKEN');

  return send(initialToken).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 403) {
        return throwError(() => error);
      }

      // The XSRF-TOKEN cookie is only set once some backend response has come back (it can't be
      // primed by the initial page load, since that's served by the frontend dev server / static
      // hosting, not the backend). A mutating request fired concurrently with the app's other
      // bootstrap calls - e.g. the scanner page's registration call right after login - can race
      // ahead of the response that would have set the cookie and go out with no token at all, or
      // with one the cookie has moved on from by the time the request reaches the server.
      // Retry once with whatever the cookie is now before treating this as a genuine failure - the
      // value read here can equal the one just sent and still be the one the server accepts, so
      // this deliberately doesn't require the cookie to have changed. A 403 means the request was
      // rejected before it reached its controller, so repeating it has no side effect.
      const freshToken = cookieService.get('XSRF-TOKEN');
      if (!freshToken) {
        return throwError(() => error);
      }
      return send(freshToken);
    })
  );
};
