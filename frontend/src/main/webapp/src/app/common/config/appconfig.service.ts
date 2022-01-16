import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private appConfig: AppConfig;

  constructor(private http: HttpClient) { }

  loadAppConfig() {
    return this.http.get<AppConfig>('/config.json')
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
