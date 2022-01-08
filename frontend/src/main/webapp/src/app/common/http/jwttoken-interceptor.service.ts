import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthenticationService } from '../security/authentication.service';

@Injectable({
  providedIn: 'root'
})
export class JwtTokenInterceptor implements HttpInterceptor {

  constructor(
    private auth: AuthenticationService
  ) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let token = this.auth.getToken()
    if (token !== null) {
      let request = req.clone({
        headers: req.headers.set("Authorization", token)
      });
      return next.handle(request);
    }
    else {
      return next.handle(req);
    }
  }

}
