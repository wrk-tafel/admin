import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(catchError(this.handleError));
  }

  private handleError(response: HttpErrorResponse): Observable<any> {
    // TODO better ui element to show
    const errorDetail = response.error as ErrorResponseData
    alert("FEHLER:\nHTTP - " + errorDetail.status + " - " + errorDetail.error + "\nDETAILS:\n" + errorDetail.message);
    return throwError(response);
  }
}

interface ErrorResponseData {
  error: string;
  message: string;
  status: number;
}
