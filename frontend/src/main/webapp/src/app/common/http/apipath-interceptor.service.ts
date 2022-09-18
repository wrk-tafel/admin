import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiPathInterceptor implements HttpInterceptor {

  constructor(
    private window: Window,
    private router: Router) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const baseUrl = `${this.window.location.pathname.replace(this.router.url, '')}/`;
    const apiPath = `${baseUrl}api${req.url}`.replaceAll('//', '/');
    const modRequest = req.clone({url: apiPath});
    return next.handle(modRequest);
  }

}
