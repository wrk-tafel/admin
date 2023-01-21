import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, throwError} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {AuthenticationService} from '../security/authentication.service';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerInterceptor implements HttpInterceptor {

  constructor(private window: Window,
              private auth: AuthenticationService) {
  }

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
    if (error.status !== 404 && error.status !== 422) {
      // TODO better ui element to show
      const errorDetail = error.error as ErrorResponseData;

      const msg = 'FEHLER:\nHTTP - ' + error.status
        + ' - ' + error.statusText
        + '\nMESSAGE:\n'
        + error?.message
        + '\nDETAILS:\n'
        + errorDetail?.message;
      this.window.alert(msg);
    }
    return throwError(error);
  }

}

interface ErrorResponseData {
  error: string;
  message: string;
  status: number;
}
