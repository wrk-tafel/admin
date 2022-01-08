import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiPathInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // TODO works for now but with a proxy in front and different configurations this maybe doesn't work
    const apiUrl = window.location.origin + "/api"
    let modRequest = req.clone({ url: apiUrl + req.url });
    return next.handle(modRequest);
  }

}
