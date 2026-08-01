import {HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest} from '@angular/common/http';
import {inject} from '@angular/core';
import {from, Observable, throwError} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {AuthenticationService} from '../security/authentication.service';
import {TafelToastrService} from '../components/tafel-toastr/tafel-toastr.service';
import {extractErrorMessage} from '../api/problem-detail';
import {SUPPRESS_ERROR_TOAST} from './suppress-error-toast.token';

/**
 * Central HTTP error handling, applied to every request. Three independent stages are chained
 * with `catchError`, each re-throwing so the next stage (and finally the caller) still sees the
 * error - this interceptor never swallows an error, it only reacts to it:
 *
 * 1. {@link handleAuthError} - force a logout redirect on a `401` while already authenticated
 *    (an expired session), so a stale session doesn't silently keep failing requests.
 * 2. {@link remapErrorBodyOnByteArrayResponseType} - works around
 *    {@link https://github.com/angular/angular/issues/19148 angular#19148}: for `responseType:
 *    'blob'` requests (PDF downloads), Angular still delivers a JSON error body as a `Blob`
 *    instead of parsing it, so this reads the blob as text and re-parses it into the same shape a
 *    non-blob request would have gotten.
 * 3. {@link handleErrorMessage} - shows a toast with the backend's error message by default,
 *    unless the request opted out via the {@link SUPPRESS_ERROR_TOAST} context (callers that
 *    fully own presenting the error themselves).
 */
export const errorHandlerInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authenticationService = inject(AuthenticationService);
  const toastr = inject(TafelToastrService);

  const handleAuthError = (error: HttpErrorResponse): Observable<any> => {
    if (authenticationService.isAuthenticated() && error.status === 401) {
      authenticationService.redirectToLogin('abgelaufen');
    }
    return throwError(() => error);
  };

  const remapErrorBodyOnByteArrayResponseType = (request: HttpRequest<any>, error: HttpErrorResponse): Observable<any> => {
    if (request.responseType === 'blob' && error.error instanceof Blob) {
      return from(Promise.resolve(error).then(async x => {
        const remappedData = {
          error: JSON.parse(await x.error.text()),
          headers: x.headers,
          status: x.status,
          statusText: x.statusText,
          url: x.url ?? undefined
        };
        throw new HttpErrorResponse(remappedData);
      }));
    }
    return throwError(() => error);
  };

  const handleErrorMessage = (error: HttpErrorResponse): Observable<any> => {
    if (!request.context.get(SUPPRESS_ERROR_TOAST)) {
      toastr.error(extractErrorMessage(error), `HTTP ${error.status} - ${error.statusText}`);
    }
    return throwError(() => error);
  };

  return next(request)
    .pipe(catchError((error) => handleAuthError(error)))
    // Workaround for this open angular issue: https://github.com/angular/angular/issues/19148
    .pipe(catchError((error: HttpErrorResponse) => remapErrorBodyOnByteArrayResponseType(request, error)))
    .pipe(catchError((error) => handleErrorMessage(error)));
};
