import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfigService } from '../config/appconfig.service';

@Injectable({
  providedIn: 'root'
})
export class ApiPathInterceptor implements HttpInterceptor {

  constructor(private appConfigService: AppConfigService) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const apiUrl = this.appConfigService.getConfig().apiBaseUrl + "/api"
    let modRequest = req.clone({ url: apiUrl + req.url });
    return next.handle(modRequest);
  }

}
