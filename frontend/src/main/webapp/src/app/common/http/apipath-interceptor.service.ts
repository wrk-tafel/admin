import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {UrlHelperService} from '../util/url-helper.service';

@Injectable({
  providedIn: 'root'
})
export class ApiPathInterceptor implements HttpInterceptor {
  private urlHelper = inject(UrlHelperService);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const baseUrl = this.urlHelper.getBaseUrl();
    const apiPath = `/api/${req.url}`.replaceAll('//', '/');
    const absoluteUrl = baseUrl + apiPath;
    const modRequest = req.clone({url: absoluteUrl});
    return next.handle(modRequest);
  }

}
