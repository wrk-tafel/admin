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

  constructor(private window: Window,
              private auth: AuthenticationService,
              private toastService: ToastService) {
  }

  private ERRORCODES_WHITELIST = [401, 404, 422];

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
    return throwError(error);
  }

  private handleErrorMessage(error: HttpErrorResponse): Observable<any> {
    if (this.ERRORCODES_WHITELIST.indexOf(error.status) === -1) {
      const toast: ToastOptions = {
        type: ToastType.ERROR,
        title: `HTTP ${error.status} - ${error.statusText}`,
        message: error?.message ?? '-'
      };
      this.toastService.showToast(toast);
    }
    return throwError(error);
  }

}

interface ErrorResponseData {
  error: string;
  message: string;
  status: number;
}
