import {HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest} from '@angular/common/http';
import {inject} from '@angular/core';
import {Observable} from 'rxjs';
import {UrlHelperService} from '../util/url-helper.service';

export const apiPathInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const urlHelperService = inject(UrlHelperService);

  const baseUrl = urlHelperService.getBaseUrl();
  const apiPath = `/api/${request.url}`.replaceAll('//', '/');
  const absoluteUrl = baseUrl + apiPath;
  const modRequest = request.clone({url: absoluteUrl});

  return next(modRequest);
};
