import {HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest} from '@angular/common/http';
import {inject} from '@angular/core';
import {from, Observable, throwError} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {AuthenticationService} from '../security/authentication.service';
import {ToastOptions, ToastService, ToastType} from '../views/default-layout/toasts/toast.service';

export const errorHandlerInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authenticationService = inject(AuthenticationService);
  const toastService = inject(ToastService);
  const ERROR_CODES_WHITELIST = [401, 404];

  const handleAuthError = (error: HttpErrorResponse): Observable<any> => {
    if (authenticationService.isAuthenticated() && error.status === 401) {
      authenticationService.redirectToLogin('abgelaufen');
    }
    return throwError(() => error);
  }

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
  }

  const handleErrorMessage = (error: HttpErrorResponse): Observable<any> => {
    if (ERROR_CODES_WHITELIST.indexOf(error.status) === -1) {
      if (error.error?.constructor === Object) {
        const errorBody: TafelErrorResponse = error.error;
        const toastOptions = createToastFromErrorBody(error, errorBody);
        toastService.showToast(toastOptions);
      } else {
        const toastOptions = createToastFromGenericHttpError(error);
        toastService.showToast(toastOptions);
      }
    }
    return throwError(() => error);
  }

  const createToastFromGenericHttpError = (error: HttpErrorResponse): ToastOptions => {
    let message = error.message;
    if (error.status === 504) {
      message = 'Server nicht verfügbar!';
    } else if (error.status == 403) {
      message = 'Zugriff nicht erlaubt!';
    }

    return {
      type: ToastType.ERROR,
      title: `HTTP ${error.status} - ${error.statusText}`,
      message: message
    };
  }

  const createToastFromErrorBody = (error: HttpErrorResponse, errorBody: TafelErrorResponse): ToastOptions => {
    return {
      type: ToastType.ERROR,
      title: `HTTP ${error.status} - ${error.statusText}`,
      message: errorBody.message
    };
  }

  return next(request)
    .pipe(catchError((error) => handleAuthError(error)))
    // Workaround for this open angular issue: https://github.com/angular/angular/issues/19148
    .pipe(catchError((error: HttpErrorResponse) => remapErrorBodyOnByteArrayResponseType(request, error)))
    .pipe(catchError((error) => handleErrorMessage(error)));
};

export interface TafelErrorResponse {
  message: string;
}
