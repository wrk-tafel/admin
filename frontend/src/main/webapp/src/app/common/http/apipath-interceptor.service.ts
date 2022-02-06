import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiPathInterceptor implements HttpInterceptor {

  constructor(private window: Window) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let apiPath = `${this.window.location.pathname}api${req.url}`.replaceAll("//", "/")
    let modRequest = req.clone({ url: apiPath });
    return next.handle(modRequest);
  }

}
