import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, throwError} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {AuthenticationService} from '../security/authentication.service';
import {ToastOptions, ToastService, ToastType} from '../views/default-layout/toasts/toast.service';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerInterceptor implements HttpInterceptor {

  constructor(private auth: AuthenticationService,
              private toastService: ToastService) {
  }

  private ERROR_CODES_WHITELIST = [401];

  /* eslint-disable @typescript-eslint/no-explicit-any */
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req)
      .pipe(catchError((error) => this.handleAuthError(error)))
      .pipe(catchError((error) => this.handleErrorMessage(error)));
  }

  private handleAuthError(error: HttpErrorResponse): Observable<any> {
    if (this.auth.isAuthenticated() && error.status === 401) {
      this.auth.redirectToLogin('abgelaufen');
    }
    return throwError(() => error);
  }

  private handleErrorMessage(error: HttpErrorResponse): Observable<any> {
    if (this.ERROR_CODES_WHITELIST.indexOf(error.status) === -1) {
      if (error.error) {
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
    const toastOptions: ToastOptions = {
      type: ToastType.ERROR,
      title: `HTTP ${error.status} - ${error.statusText}`,
      message: error.message
    };
    return toastOptions;
  }

  private createToastFromErrorBody(errorBody: TafelErrorResponse): ToastOptions {
    const toastOptions: ToastOptions = {
      type: ToastType.ERROR,
      title: `HTTP ${errorBody.status} - ${errorBody.error}`,
      message: errorBody.message
    };
    return toastOptions;
  }

}

export interface TafelErrorResponse {
  status: number;
  error: string;
  message: string;
}
