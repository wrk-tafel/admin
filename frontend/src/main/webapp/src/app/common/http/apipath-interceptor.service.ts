import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {PlatformLocation} from "@angular/common";

@Injectable({
  providedIn: 'root'
})
export class ApiPathInterceptor implements HttpInterceptor {

  constructor(
    private location: PlatformLocation
  ) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const apiPath = this.getBaseUrl() + '/api/' + req.url;
    const modRequest = req.clone({url: apiPath});
    return next.handle(modRequest);
  }

  private getBaseUrl() {
    return this.location.protocol + '//' + this.location.hostname + ':' + this.location.port;
  }

}
