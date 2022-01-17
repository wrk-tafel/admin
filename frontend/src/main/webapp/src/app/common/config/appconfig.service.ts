import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private appConfig: AppConfig;

  constructor(private http: HttpClient) { }

  loadAppConfig() {
    let contextPath = window.location.pathname
    contextPath = contextPath.length > 1 && contextPath.endsWith('/') ? contextPath.slice(0, -1) : contextPath;
    return this.http.get<AppConfig>(`${contextPath}config.json`)
      .toPromise()
      .then(data => {
        this.appConfig = data;
      });
  }

  getConfig() {
    return this.appConfig;
  }

}

type AppConfig = {
  apiBaseUrl: string
}
