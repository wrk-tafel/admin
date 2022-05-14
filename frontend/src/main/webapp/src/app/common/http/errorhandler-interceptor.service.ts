import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerInterceptor implements HttpInterceptor {

  constructor(private window: Window) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(catchError(response => {
      if (response.status !== 404) {
        // TODO better ui element to show
        const errorDetail = response.error as ErrorResponseData;

        const msg = 'FEHLER:\nHTTP - ' + response.status
          + ' - ' + response.statusText
          + '\nMESSAGE:\n'
          + response?.message
          + '\nDETAILS:\n'
          + errorDetail?.message;
        this.window.alert(msg);
      }
      return throwError(response);
    }));
  }
}

interface ErrorResponseData {
  error: string;
  message: string;
  status: number;
}
