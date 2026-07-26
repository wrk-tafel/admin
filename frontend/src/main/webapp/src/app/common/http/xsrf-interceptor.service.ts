import {HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest} from '@angular/common/http';
import {inject} from '@angular/core';
import {Observable} from 'rxjs';
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

  const token = cookieService.get('XSRF-TOKEN');
  if (!token) {
    return next(request);
  }

  return next(request.clone({headers: request.headers.set('X-XSRF-TOKEN', token)}));
};
