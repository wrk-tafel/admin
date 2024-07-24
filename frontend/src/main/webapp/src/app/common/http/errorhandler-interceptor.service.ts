import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {from, Observable, throwError} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {AuthenticationService} from '../security/authentication.service';
import {ToastOptions, ToastService, ToastType} from '../views/default-layout/toasts/toast.service';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerInterceptor implements HttpInterceptor {
  private authenticationService = inject(AuthenticationService);
  private toastService = inject(ToastService);

  private ERROR_CODES_WHITELIST = [401];

  /* eslint-disable @typescript-eslint/no-explicit-any */
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request)
      .pipe(catchError((error) => this.handleAuthError(error)))
      // Workaround for this open angular issue: https://github.com/angular/angular/issues/19148
      .pipe(catchError((error: HttpErrorResponse) => this.remapErrorBodyOnByteArrayResponseType(request, error)))
      .pipe(catchError((error) => this.handleErrorMessage(error)));
  }

  private handleAuthError(error: HttpErrorResponse): Observable<any> {
    if (this.authenticationService.isAuthenticated() && error.status === 401) {
      this.authenticationService.redirectToLogin('abgelaufen');
    }
    return throwError(() => error);
  }

  private remapErrorBodyOnByteArrayResponseType(request: HttpRequest<any>, error: HttpErrorResponse): Observable<any> {
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

  private handleErrorMessage(error: HttpErrorResponse): Observable<any> {
    if (this.ERROR_CODES_WHITELIST.indexOf(error.status) === -1) {
      if (error.error?.constructor === Object) {
        const errorBody: TafelErrorResponse = error.error;
        const toastOptions = this.createToastFromErrorBody(errorBody);
        this.toastService.showToast(toastOptions);
      } else {
        const toastOptions = this.createToastFromGenericHttpError(error);
        this.toastService.showToast(toastOptions);
      }
    }
    return throwError(() => error);
  }

  private createToastFromGenericHttpError(error: HttpErrorResponse): ToastOptions {
    let message = error.message;
    if (error.status === 504) {
      message = 'Server nicht verfügbar!';
    }

    return {
      type: ToastType.ERROR,
      title: `HTTP ${error.status} - ${error.statusText}`,
      message: message
    };
  }

  private createToastFromErrorBody(errorBody: TafelErrorResponse): ToastOptions {
    return {
      type: ToastType.ERROR,
      title: `HTTP ${errorBody.status} - ${errorBody.error}`,
      message: errorBody.message
    };
  }

}

export interface TafelErrorResponse {
  status: number;
  error: string;
  message: string;
}
